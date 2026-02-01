import { describe, expect, it } from "vitest";
import { Hono } from "hono";
import { createHash, generateKeyPairSync, sign as cryptoSign } from "node:crypto";
import { a2aAuth, buildCanonicalString } from "./a2aAuth.js";

function sha256Base64(bytes: Uint8Array): string {
  const h = createHash("sha256");
  h.update(bytes);
  return h.digest("base64");
}

describe("a2aAuth middleware", () => {
  it("allows a valid signed request", async () => {
    const { publicKey, privateKey } = generateKeyPairSync("ed25519");
    const publicKeyPem = publicKey.export({ type: "spki", format: "pem" }).toString();

    const app = new Hono();

    app.use(
      "/x",
      a2aAuth({
        enabled: true,
        timestampWindowSeconds: 300,
        keys: [{ kid: "kid-001", clientId: "c1", publicKeyPem }],
        allowlist: [{ clientId: "c1", method: "POST", path: "/x" }],
      })
    );

    app.post("/x", async (c) => c.json({ ok: true }));

    const body = Buffer.from(JSON.stringify({ hello: "world" }), "utf8");
    const contentDigest = `sha-256=:${sha256Base64(body)}:`;

    const ts = Math.floor(Date.now() / 1000);
    const nonce = Buffer.from("nonce-123").toString("base64");

    const req = new Request("http://example.com/x", {
      method: "POST",
      headers: {
        Host: "example.com",
        "X-Client-Id": "c1",
        "X-Timestamp": String(ts),
        "X-Nonce": nonce,
        "Content-Digest": contentDigest,
      },
      body,
    });

    // Build signature
    const signedHeaders = [
      "(request-target)",
      "host",
      "x-client-id",
      "x-timestamp",
      "x-nonce",
      "content-digest",
    ];

    // Hono uses Request URL for canonicalization; create a minimal context by calling app.request
    // but we need Signature header set before.
    // We'll compute canonical by simulating a Hono Context using the middleware helper through app.request.

    // Temporary app to compute canonical with same logic
    const tmp = new Hono();
    tmp.post("/x", async (c) => {
      const canonical = buildCanonicalString(c, signedHeaders);
      const sig = cryptoSign(null, Buffer.from(canonical, "utf8"), privateKey);
      c.header(
        "X-Signature-Out",
        `keyId="kid-001",alg="ed25519",headers="${signedHeaders.join(
          " "
        )}",signature="${sig.toString("base64")}"`
      );
      return c.text("ok");
    });

    const tmpRes = await tmp.request(req);
    const sigHeader = tmpRes.headers.get("X-Signature-Out");
    expect(sigHeader).toBeTruthy();

    const res = await app.request(
      new Request("http://example.com/x", {
        method: "POST",
        headers: {
          Host: "example.com",
          "X-Client-Id": "c1",
          "X-Timestamp": String(ts),
          "X-Nonce": nonce,
          "Content-Digest": contentDigest,
          Signature: sigHeader!,
        },
        body,
      })
    );

    expect(res.status).toBe(200);
    const json = (await res.json()) as any;
    expect(json.ok).toBe(true);
  });

  it("rejects replayed nonce", async () => {
    const { publicKey, privateKey } = generateKeyPairSync("ed25519");
    const publicKeyPem = publicKey.export({ type: "spki", format: "pem" }).toString();

    const app = new Hono();
    app.use(
      "/x",
      a2aAuth({
        enabled: true,
        timestampWindowSeconds: 300,
        keys: [{ kid: "kid-001", clientId: "c1", publicKeyPem }],
        allowlist: [{ clientId: "c1", method: "POST", path: "/x" }],
      })
    );
    app.post("/x", async (c) => c.json({ ok: true }));

    const body = Buffer.from("{}", "utf8");
    const contentDigest = `sha-256=:${sha256Base64(body)}:`;
    const ts = Math.floor(Date.now() / 1000);
    const nonce = Buffer.from("nonce-REPLAY").toString("base64");

    const signedHeaders = [
      "(request-target)",
      "host",
      "x-client-id",
      "x-timestamp",
      "x-nonce",
      "content-digest",
    ];

    const tmp = new Hono();
    tmp.post("/x", async (c) => {
      const canonical = buildCanonicalString(c, signedHeaders);
      const sig = cryptoSign(null, Buffer.from(canonical, "utf8"), privateKey);
      return c.text(
        `keyId="kid-001",alg="ed25519",headers="${signedHeaders.join(
          " "
        )}",signature="${sig.toString("base64")}"`
      );
    });

    const baseReq = new Request("http://example.com/x", {
      method: "POST",
      headers: {
        Host: "example.com",
        "X-Client-Id": "c1",
        "X-Timestamp": String(ts),
        "X-Nonce": nonce,
        "Content-Digest": contentDigest,
      },
      body,
    });

    const sig = await (await tmp.request(baseReq)).text();

    const makeReq = () =>
      new Request("http://example.com/x", {
        method: "POST",
        headers: {
          Host: "example.com",
          "X-Client-Id": "c1",
          "X-Timestamp": String(ts),
          "X-Nonce": nonce,
          "Content-Digest": contentDigest,
          Signature: sig,
        },
        body,
      });

    const r1 = await app.request(makeReq());
    expect(r1.status).toBe(200);

    const r2 = await app.request(makeReq());
    expect(r2.status).toBe(401);
    const j2 = (await r2.json()) as any;
    expect(j2.error).toBe("replay_detected");
  });
});
