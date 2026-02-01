# A2A signed request client (demo)

This repo enforces Ed25519-signed HTTP requests for critical endpoints (see `docs/a2a-firewall.md`).

This doc shows how to generate a keypair and call the protected endpoint.

## 1) Generate an Ed25519 keypair

```bash
mkdir -p keys

# private key (PKCS8)
openssl genpkey -algorithm ED25519 -out keys/kid-001.ed25519

# public key (SPKI PEM)
openssl pkey -in keys/kid-001.ed25519 -pubout -out keys/kid-001.pub.pem
```

## 2) Configure backend env

Example (development):

```bash
export A2A_AUTH_ENABLED=true
export A2A_TIMESTAMP_WINDOW_SECONDS=300

export A2A_KEYS_JSON='[
  {
    "kid": "kid-001",
    "clientId": "zk-client-001",
    "publicKeyPem": "-----BEGIN PUBLIC KEY-----\n...\n-----END PUBLIC KEY-----\n"
  }
]'

export A2A_ALLOWLIST_JSON='[
  {"clientId":"zk-client-001","method":"POST","path":"/api/firewall/check"}
]'
```

Note:

- `publicKeyPem` must contain literal `\n` newlines inside the JSON string.

## 3) Run backend

```bash
pnpm dev:backend
```

## 4) Call `POST /api/firewall/check` with signature

```bash
pnpm tsx scripts/a2a-firewall-client.ts \
  --url http://localhost:3001/api/firewall/check \
  --client-id zk-client-001 \
  --kid kid-001 \
  --priv ./keys/kid-001.ed25519 \
  --body '{"chainId":84532,"from":"0x0000000000000000000000000000000000000000","to":"0x0000000000000000000000000000000000000000","value":"0"}'
```

You should see `status=200` and a JSON response.

If you get `401 invalid_signature`, confirm:

- your canonical string rules match `docs/a2a-firewall.md`
- `Content-Digest` is computed over _raw request body bytes_
- you used RFC4648 **standard** base64 with `=` padding
