# A2A / Firewall Auth Spec (Draft)

This document defines the request authentication/authorization scheme for A2A calls across services.

## Goals

- **Integrity**: requests cannot be modified in transit
- **Replay protection**: recorded requests cannot be replayed within the acceptance window
- **Clear authorization**: which client can call which endpoint is explicit and auditable

## Non-goals

- Transport-level client auth (no mTLS)
- Full OAuth/JWT identity model

---

## 1. Transport

- **HTTPS required**.
- **mTLS is not used**.

---

## 2. Identity model

Two identifiers are used:

- **`X-Client-Id`**: stable client identity used for
  - authorization (allowlist)
  - audit logs
  - rate limiting
- **`kid`** (from `Signature.keyId`): selects which public key to use.
  - supports key rotation and multiple keys per client

Server MUST maintain a mapping:

- `kid -> { publicKey, clientId, status, createdAt, disabledAt }`

and MUST reject requests when `kid` is not owned by the provided `X-Client-Id`.

---

## 3. Required headers

### 3.1 Requests with a body (POST/PUT/PATCH)

Required:

- `Host: <hostname>`
- `X-Client-Id: <client_id>`
- `X-Timestamp: <epoch_seconds>`
- `X-Nonce: <base64(random)>`
- `Content-Digest: sha-256=:<base64(sha256(body_bytes))>:`
- `Signature: keyId="<kid>",alg="ed25519",headers="...",signature="<base64(sig)>"`

### 3.2 Requests without a body (GET/DELETE)

Required:

- `Host`
- `X-Client-Id`
- `X-Timestamp`
- `X-Nonce`
- `Signature`

`Content-Digest` is **optional** for body-less requests. If it is omitted, it MUST NOT appear in `Signature.headers`.

---

## 4. Timestamp + Nonce (replay protection)

### 4.1 Timestamp window

- Server accepts requests only if:

`abs(now - X-Timestamp) <= 300 seconds`

### 4.2 Nonce storage

- Server MUST reject reused nonces within the timestamp window.
- Store key: `(X-Client-Id, X-Nonce)`
- Implementation: TTL map / LRU with TTL is acceptable.

---

## 5. Authorization (Firewall rules)

Authorization is an explicit allowlist:

- key: `X-Client-Id`
- value: allowed `(METHOD, PATH)` pairs

Rules:

- Prefer **exact match**.
- For resource-ID routes, allow **parameterized** patterns aligned to the router (e.g. `/v1/transfers/{id}`).
- **Do not include query parameters** in authorization decisions.

---

## 6. Signature format

We use an HTTP Signatures-style header.

Example:

```
Signature: keyId="kid-001",alg="ed25519",headers="(request-target) host x-client-id x-timestamp x-nonce content-digest",signature="Base64(signatureBytes)"
```

- `alg` is fixed to `ed25519`.
- `keyId` is the `kid`.
- `headers` is a space-separated list of signed header names.

---

## 7. Canonical string

### 7.1 Line format

For each entry in `Signature.headers`, build one line.

- Regular header: `<lowercase-header-name>: <value>`
- Special pseudo-header `(request-target)`:

`(request-target): <lower(method)> <path>[?<rawQueryString>]`

### 7.2 Joining

- Join lines with `\n`.
- No trailing newline.

Example:

```
(request-target): post /v1/transfers
host: api.example.com
x-client-id: zk-client-001
x-timestamp: 1738312800
x-nonce: 9rjv2...==
content-digest: sha-256=:7sY0...=:
```

---

## 8. Server-side verification order (recommended)

1. Parse `Signature` into `(kid, alg, signedHeaders, signature)`
2. Validate `alg == ed25519`
3. Load public key by `kid` (401 if unknown)
4. Validate `kid` belongs to `X-Client-Id` (403 if mismatch)
5. Validate timestamp window (401)
6. Validate nonce uniqueness for `(clientId, nonce)` (401)
7. If body present: validate `Content-Digest` (401)
8. Rebuild canonical string and verify signature (401)
9. Apply allowlist `(clientId, method, path)` (403)

---

## 9. Error responses

### 9.1 HTTP status mapping

- **400 Bad Request**: malformed request / missing required headers / parse errors
- **401 Unauthorized**: authentication failure
  - `unknown_kid`
  - `invalid_signature`
  - `timestamp_skew`
  - `replay_detected`
  - `invalid_digest`
- **403 Forbidden**: authenticated but not permitted
  - `kid_not_owned`
  - `not_allowed`

### 9.2 Body format

JSON response:

```json
{
  "error": "not_allowed",
  "message": "client is not allowed to call this endpoint",
  "request_id": "req_abc123"
}
```

`request_id` is generated server-side for log correlation.

---

## 10. Key rotation policy

- Server supports multiple active `kid` for a client.
- Rotation procedure:
  1. Add new `kid` (active)
  2. Start signing with new `kid`
  3. Disable old `kid`
- Old key grace period: **up to 7 days** (can be disabled immediately if needed).

---

## Appendix A: Pseudocode

### A.1 Client signing

```pseudo
body_bytes = raw_http_body_bytes()

headers["X-Client-Id"] = client_id
headers["X-Timestamp"] = str(epoch_seconds_now())
headers["X-Nonce"] = base64(random_bytes(16))

signed_headers = ["(request-target)", "host", "x-client-id", "x-timestamp", "x-nonce"]

if body_bytes not empty:
  headers["Content-Digest"] = "sha-256=:" + base64(sha256(body_bytes)) + ":"
  signed_headers.append("content-digest")

canonical = build_canonical(method, path, rawQueryString, host, headers, signed_headers)

sig = ed25519_sign(private_key_for_kid, utf8_bytes(canonical))
headers["Signature"] =
  'keyId="' + kid + '",alg="ed25519",headers="' + join(signed_headers, " ") + '",signature="' + base64(sig) + '"'
```

### A.2 Server verification

```pseudo
(kid, alg, signed_headers, signature_b64) = parse_signature(headers["Signature"])
assert alg == "ed25519"

client_id = headers["X-Client-Id"]

pubkey = lookup_pubkey(kid)
if not pubkey: return 401 unknown_kid

if not kid_owned_by_client(kid, client_id): return 403 kid_not_owned

ts = int(headers["X-Timestamp"])
if abs(now_epoch() - ts) > 300: return 401 timestamp_skew

nonce = headers["X-Nonce"]
if nonce_seen_recently(client_id, nonce): return 401 replay_detected
remember_nonce(client_id, nonce, ttl=300)

if request_has_body:
  expected = "sha-256=:" + base64(sha256(body_bytes)) + ":"
  if headers["Content-Digest"] != expected: return 401 invalid_digest

canonical = build_canonical(method, path, rawQueryString, host, headers, signed_headers)

sig = base64_decode(signature_b64)
if not ed25519_verify(pubkey, sig, utf8_bytes(canonical)):
  return 401 invalid_signature

if not allowlist_allows(client_id, method, path):
  return 403 not_allowed

return 200
```
