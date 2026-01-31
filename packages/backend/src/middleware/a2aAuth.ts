import type { Context, Next } from "hono";
import { createHash, createPublicKey, timingSafeEqual, verify as cryptoVerify } from "node:crypto";

export type A2AKeyRecord = {
  kid: string;
  clientId: string;
  /** PEM (SPKI) encoded Ed25519 public key */
  publicKeyPem: string;
  status?: "active" | "disabled";
};

export type A2AAllowRule = {
  clientId: string;
  method: string; // e.g. POST
  path: string; // e.g. /api/firewall/check
};

export type A2AAuthOptions = {
  enabled: boolean;
  timestampWindowSeconds: number;
  keys: A2AKeyRecord[];
  allowlist: A2AAllowRule[];
};

type ParsedSignature = {
  keyId: string;
  alg: string;
  headers: string[];
  signatureB64: string;
};

const DEFAULT_REQUIRED_HEADERS = [
  "(request-target)",
  "host",
  "x-client-id",
  "x-timestamp",
  "x-nonce",
] as const;

type A2AHttpStatus = 400 | 401 | 403 | 500;

function jsonError(c: Context, status: A2AHttpStatus, error: string, message: string) {
  const requestId = (globalThis.crypto?.randomUUID?.() ?? undefined) as string | undefined;
  return c.json(
    {
      error,
      message,
      request_id: requestId,
    },
    status
  );
}

function parseSignatureHeader(value: string): ParsedSignature {
  // Very small, strict parser for: keyId="...",alg="...",headers="a b c",signature="..."
  const parts = value
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const kv: Record<string, string> = {};
  for (const p of parts) {
    const i = p.indexOf("=");
    if (i < 0) continue;
    const k = p.slice(0, i);
    let v = p.slice(i + 1);
    if (v.startsWith('"') && v.endsWith('"')) v = v.slice(1, -1);
    kv[k] = v;
  }

  if (!kv.keyId || !kv.alg || !kv.headers || !kv.signature) {
    throw new Error("invalid Signature header");
  }

  return {
    keyId: kv.keyId,
    alg: kv.alg,
    headers: kv.headers.split(/\s+/).filter(Boolean),
    signatureB64: kv.signature,
  };
}

function getHeader(c: Context, name: string): string | undefined {
  return c.req.header(name);
}

function buildRequestTarget(c: Context): string {
  // lower(method) + space + path[?rawQuery]
  const method = c.req.method.toLowerCase();
  const url = new URL(c.req.url);
  const path = url.pathname;
  const qs = url.search ? url.search.slice(1) : "";
  return `${method} ${path}${qs ? `?${qs}` : ""}`;
}

export function buildCanonicalString(c: Context, signedHeaders: string[]): string {
  const url = new URL(c.req.url);
  const host = url.host;

  const lines: string[] = [];
  for (const h of signedHeaders) {
    if (h === "(request-target)") {
      lines.push(`(request-target): ${buildRequestTarget(c)}`);
      continue;
    }

    if (h === "host") {
      lines.push(`host: ${host}`);
      continue;
    }

    const v = getHeader(c, h);
    if (v === undefined) throw new Error(`missing signed header: ${h}`);
    lines.push(`${h.toLowerCase()}: ${v}`);
  }

  return lines.join("\n");
}

function parseContentDigest(value: string): { alg: string; digestB64: string } {
  // Expect: sha-256=:<b64>:
  const m = /^([a-z0-9-]+)=:([^:]+):$/.exec(value.trim());
  if (!m) throw new Error("invalid Content-Digest format");
  return { alg: m[1]!, digestB64: m[2]! };
}

function sha256Base64(bytes: Uint8Array): string {
  const h = createHash("sha256");
  h.update(bytes);
  return h.digest("base64");
}

class NonceStore {
  private map = new Map<string, number>(); // key -> expiresAt(epoch ms)

  constructor(private ttlMs: number) {}

  seen(clientId: string, nonce: string, nowMs: number): boolean {
    const k = `${clientId}:${nonce}`;
    const exp = this.map.get(k);
    if (exp && exp > nowMs) return true;
    if (exp) this.map.delete(k);
    return false;
  }

  remember(clientId: string, nonce: string, nowMs: number) {
    const k = `${clientId}:${nonce}`;
    this.map.set(k, nowMs + this.ttlMs);
  }

  cleanup(nowMs: number) {
    // cheap occasional sweep
    for (const [k, exp] of this.map) {
      if (exp <= nowMs) this.map.delete(k);
    }
  }
}

const globalNonceStore = new NonceStore(300_000);

export function a2aAuth(opts: A2AAuthOptions) {
  return async (c: Context, next: Next) => {
    if (!opts.enabled) return next();

    // Required headers (base set)
    const clientId = c.req.header("X-Client-Id");
    const tsStr = c.req.header("X-Timestamp");
    const nonce = c.req.header("X-Nonce");
    const sigHeader = c.req.header("Signature");

    if (!clientId || !tsStr || !nonce || !sigHeader) {
      return jsonError(c, 400, "missing_header", "missing required auth headers");
    }

    let parsed: ParsedSignature;
    try {
      parsed = parseSignatureHeader(sigHeader);
    } catch {
      return jsonError(c, 400, "invalid_header_format", "invalid Signature header");
    }

    if (parsed.alg !== "ed25519") {
      return jsonError(c, 401, "invalid_signature", "unsupported signature algorithm");
    }

    // Key lookup
    const keyRec = opts.keys.find(
      (k) => k.kid === parsed.keyId && (k.status ?? "active") === "active"
    );
    if (!keyRec) {
      return jsonError(c, 401, "unknown_kid", "unknown key id");
    }

    if (keyRec.clientId !== clientId) {
      return jsonError(c, 403, "kid_not_owned", "kid is not owned by the provided client id");
    }

    // Timestamp window
    const ts = Number(tsStr);
    if (!Number.isFinite(ts)) {
      return jsonError(
        c,
        400,
        "invalid_header_format",
        "X-Timestamp must be an epoch seconds number"
      );
    }
    const nowSec = Math.floor(Date.now() / 1000);
    if (Math.abs(nowSec - ts) > opts.timestampWindowSeconds) {
      return jsonError(c, 401, "timestamp_skew", "timestamp outside allowed window");
    }

    // Nonce replay
    const nowMs = Date.now();
    if (globalNonceStore.seen(clientId, nonce, nowMs)) {
      return jsonError(c, 401, "replay_detected", "nonce already used");
    }
    globalNonceStore.remember(clientId, nonce, nowMs);
    if (Math.random() < 0.01) globalNonceStore.cleanup(nowMs);

    // Determine if request has body; verify digest when present.
    const hasBody = c.req.method !== "GET" && c.req.method !== "HEAD" && c.req.method !== "DELETE";

    if (hasBody) {
      const cd = c.req.header("Content-Digest");
      if (!cd)
        return jsonError(
          c,
          400,
          "missing_header",
          "Content-Digest required for requests with body"
        );

      let expectedB64: string;
      try {
        const { alg, digestB64 } = parseContentDigest(cd);
        if (alg !== "sha-256") throw new Error("unsupported digest");

        const buf = new Uint8Array(await c.req.raw.clone().arrayBuffer());
        expectedB64 = sha256Base64(buf);

        const provided = Buffer.from(digestB64, "base64");
        const expected = Buffer.from(expectedB64, "base64");
        if (provided.length !== expected.length || !timingSafeEqual(provided, expected)) {
          return jsonError(c, 401, "invalid_digest", "Content-Digest mismatch");
        }
      } catch {
        return jsonError(c, 401, "invalid_digest", "invalid Content-Digest");
      }

      // If body exists, ensure content-digest is in signed headers.
      if (!parsed.headers.includes("content-digest")) {
        return jsonError(
          c,
          401,
          "invalid_signature",
          "content-digest must be signed for requests with body"
        );
      }
    } else {
      // If no body, forbid including content-digest in signed headers unless actually present.
      if (parsed.headers.includes("content-digest") && !c.req.header("Content-Digest")) {
        return jsonError(
          c,
          400,
          "invalid_header_format",
          "content-digest signed but header missing"
        );
      }
    }

    // Ensure base required headers are signed
    for (const h of DEFAULT_REQUIRED_HEADERS) {
      if (!parsed.headers.includes(h)) {
        return jsonError(c, 401, "invalid_signature", `missing required signed header: ${h}`);
      }
    }

    // Canonicalize and verify signature
    let canonical: string;
    try {
      canonical = buildCanonicalString(c, parsed.headers);
    } catch {
      return jsonError(c, 401, "invalid_signature", "failed to build canonical string");
    }

    let ok = false;
    try {
      const pub = createPublicKey(keyRec.publicKeyPem);
      const sig = Buffer.from(parsed.signatureB64, "base64");
      ok = cryptoVerify(null, Buffer.from(canonical, "utf8"), pub, sig);
    } catch {
      ok = false;
    }

    if (!ok) {
      return jsonError(c, 401, "invalid_signature", "signature verification failed");
    }

    // Allowlist AuthZ
    const path = new URL(c.req.url).pathname;
    const method = c.req.method.toUpperCase();
    const allowed = opts.allowlist.some(
      (r) => r.clientId === clientId && r.method.toUpperCase() === method && r.path === path
    );
    if (!allowed) {
      return jsonError(c, 403, "not_allowed", "client is not allowed to call this endpoint");
    }

    return next();
  };
}
