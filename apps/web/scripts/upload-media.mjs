/**
 * Upload the gameplay clips to Vercel Blob so they're served from the Blob CDN.
 *
 *   BLOB_READ_WRITE_TOKEN=... pnpm --filter @zecminers/web media:upload
 *
 * Then set NEXT_PUBLIC_MEDIA_BASE_URL to the printed base URL in the Vercel project env.
 */
import { readdir, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { put } from "@vercel/blob";

if (!process.env.BLOB_READ_WRITE_TOKEN) {
  console.error("Set BLOB_READ_WRITE_TOKEN (Vercel → Storage → Blob → your store → .env.local)");
  process.exit(1);
}

const dir = fileURLToPath(new URL("../public/media", import.meta.url));
const files = (await readdir(dir)).filter((f) => f.endsWith(".mp4"));
let base = "";
for (const f of files) {
  const body = await readFile(join(dir, f));
  const blob = await put(`media/${f}`, body, {
    access: "public",
    contentType: "video/mp4",
    addRandomSuffix: false,
    allowOverwrite: true,
    cacheControlMaxAge: 31_536_000,
  });
  base = blob.url.slice(0, blob.url.lastIndexOf("/"));
  console.log(`uploaded ${f} → ${blob.url}`);
}
console.log(`\nNEXT_PUBLIC_MEDIA_BASE_URL=${base}`);
