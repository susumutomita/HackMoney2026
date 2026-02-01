#!/usr/bin/env tsx

/**
 * A2A Firewall signed request client (demo)
 *
 * Usage:
 *   pnpm tsx scripts/a2a-firewall-client.ts \
 *     --url http://localhost:3001/api/firewall/check \
 *     --client-id zk-client-001 \
 *     --kid kid-001 \
 *     --priv ./keys/kid-001.ed25519 \
 *     --body '{"chainId":84532,"from":"0x0000000000000000000000000000000000000000","to":"0x0000000000000000000000000000000000000000","value":"0"}'
 */

import { createHash, createPrivateKey, randomBytes, sign as cryptoSign } from "node:crypto";
import { readFileSync } from "node:fs";

type Args = {
  url: string;
  clientId: string;
  kid: string;
  privPath: string;
  body: string;
};

function parseArgs(argv: string[]): Args {
  const m: Record<string, string> = {};
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i]!;
    if (!a.startsWith("--")) continue;
    const k = a.slice(2);
    const v = argv[i + 1];
    if (v && !v.startsWith("--")) {
      m[k] = v;
      i++;
    } else {
      m[k] = "true";
    }
  }

  const url = m.url;
  const clientId = m["client-id"];
  const kid = m.kid;
  const privPath = m.priv;
  const body = m.body ?? "{}";

  if (!url || !clientId || !kid || !privPath) {
    throw new Error(
      "Missing required args. Need: --url --client-id --kid --priv (and optionally --body)."
    );
  }

  return { url, clientId, kid, privPath, body };
}

function sha256Base64(bytes: Uint8Array): string {
  const h = createHash("sha256");
  h.update(bytes);
  return h.digest("base64");
}

function buildRequestTarget(method: string, url: URL): string {
  const path = url.pathname;
  const qs = url.search ? url.search.slice(1) : "";
  return `${method.toLowerCase()} ${path}${qs ? `?${qs}` : ""}`;
}

function canonicalString(opts: {
  method: string;
  url: URL;
  host: string;
  headers: Record<string, string>;
  signedHeaders: string[];
}): string {
  const lines: string[] = [];
  for (const h of opts.signedHeaders) {
    if (h === "(request-target)") {
      lines.push(`(request-target): ${buildRequestTarget(opts.method, opts.url)}`);
      continue;
    }
    if (h === "host") {
      lines.push(`host: ${opts.host}`);
      continue;
    }
    const v = opts.headers[h];
    if (v === undefined) throw new Error(`missing header for canonicalization: ${h}`);
    lines.push(`${h}: ${v}`);
  }
  return lines.join("\n");
}

async function main() {
  const args = parseArgs(process.argv);

  const url = new URL(args.url);
  const host = url.host;

  const bodyBytes = Buffer.from(args.body, "utf8");
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const nonce = randomBytes(16).toString("base64"); // RFC4648 standard base64
  const contentDigest = `sha-256=:${sha256Base64(bodyBytes)}:`;

  const headers: Record<string, string> = {
    "x-client-id": args.clientId,
    "x-timestamp": timestamp,
    "x-nonce": nonce,
    "content-digest": contentDigest,
  };

  const signedHeaders = [
    "(request-target)",
    "host",
    "x-client-id",
    "x-timestamp",
    "x-nonce",
    "content-digest",
  ];

  const canonical = canonicalString({ method: "POST", url, host, headers, signedHeaders });

  const privPem = readFileSync(args.privPath, "utf8");
  const priv = createPrivateKey(privPem);
  const sig = cryptoSign(null, Buffer.from(canonical, "utf8"), priv).toString("base64");

  const signatureHeader = `keyId="${args.kid}",alg="ed25519",headers="${signedHeaders.join(
    " "
  )}",signature="${sig}"`;

  const res = await fetch(args.url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Client-Id": args.clientId,
      "X-Timestamp": timestamp,
      "X-Nonce": nonce,
      "Content-Digest": contentDigest,
      Signature: signatureHeader,
    },
    body: bodyBytes,
  });

  const text = await res.text();
  console.log(`status=${res.status}`);
  console.log(text);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
