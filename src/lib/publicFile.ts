import fs from "node:fs";
import path from "node:path";

type AssetsBinding = { fetch(input: URL | string): Promise<Response> };

/**
 * Reads a file under public/ on the server.
 * Node (next build / dev / start): straight from disk.
 * Cloudflare Workers: public/ is not in the Worker bundle, it is served by the
 * static-assets binding, so the same file is fetched from there instead.
 */
export async function readPublicText(relPath: string): Promise<string | null> {
  const local = path.join(process.cwd(), "public", relPath);
  if (fs.existsSync(local)) return fs.readFileSync(local, "utf8");

  const { getCloudflareContext } = await import("@opennextjs/cloudflare");
  const { env } = await getCloudflareContext({ async: true });
  const assets = (env as { ASSETS?: AssetsBinding }).ASSETS;
  if (!assets) return null;
  const res = await assets.fetch(new URL(`/${relPath}`, "https://assets.local"));
  return res.ok ? res.text() : null;
}

export async function readPublicJson<T>(relPath: string): Promise<T | null> {
  const text = await readPublicText(relPath);
  return text === null ? null : (JSON.parse(text) as T);
}
