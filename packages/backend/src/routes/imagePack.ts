import { Hono } from "hono";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

export const imagePackRouter = new Hono();

const ASSET_DIR = join(process.cwd(), "packages", "backend", "assets", "image-pack");
const IMAGES = ["rocket.svg", "shield.svg"] as const;

function pickRandom<T>(arr: readonly T[]): T {
  const v = arr[Math.floor(Math.random() * arr.length)];
  if (v === undefined) throw new Error("Empty image pack");
  return v;
}

/**
 * GET /api/image-pack/random
 * Returns a random image URL (no external API cost).
 */
imagePackRouter.get("/random", async (c) => {
  const file = pickRandom(IMAGES);
  return c.json({ success: true, file, url: `/api/image-pack/${file}` });
});

/**
 * GET /api/image-pack/:file
 * Serves a demo SVG image.
 */
imagePackRouter.get("/:file", async (c) => {
  const file = c.req.param("file");
  if (!IMAGES.includes(file as (typeof IMAGES)[number])) {
    return c.json({ success: false, error: "not_found" }, 404);
  }

  const buf = await readFile(join(ASSET_DIR, file));
  c.header("Content-Type", "image/svg+xml");
  c.header("Cache-Control", "public, max-age=3600");
  return c.body(buf);
});
