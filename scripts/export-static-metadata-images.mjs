#!/usr/bin/env node
/**
 * Post-build step for Cloudflare Workers (run after `opennextjs-cloudflare build`).
 *
 * Next prerenders the next/og metadata routes (opengraph-image, icon, apple-icon) at build time.
 * This copies those PNGs into the Workers Static Assets directory under the exact same URL paths,
 * so they are served by the asset CDN without invoking the Worker (zero CPU, no 1102 risk),
 * while every <meta>/<link> tag Next emits stays byte-for-byte identical.
 */
import fs from "node:fs";
import path from "node:path";

const APP_DIR = path.join(process.cwd(), ".next", "server", "app");
const ASSETS_DIR = path.join(process.cwd(), ".open-next", "assets");
const IMAGE_ROUTE = /^(opengraph-image|twitter-image|icon|apple-icon)$/;

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    return entry.isDirectory() ? walk(full) : [full];
  });
}

if (!fs.existsSync(ASSETS_DIR)) {
  console.error("export-static-metadata-images: .open-next/assets not found — run opennextjs-cloudflare build first.");
  process.exit(1);
}

// One header rule per image kind (root + any depth) keeps _headers far below its 100-rule limit.
const headerRules = new Map();
let count = 0;
for (const bodyFile of walk(APP_DIR)) {
  if (!bodyFile.endsWith(".body")) continue;
  const name = path.basename(bodyFile, ".body");
  if (!IMAGE_ROUTE.test(name)) continue;
  const metaFile = bodyFile.replace(/\.body$/, ".meta");
  const meta = fs.existsSync(metaFile) ? JSON.parse(fs.readFileSync(metaFile, "utf8")) : {};
  const headers = meta.headers ?? {};

  const routePath = "/" + path.relative(APP_DIR, bodyFile).replace(/\.body$/, "").split(path.sep).join("/");
  const target = path.join(ASSETS_DIR, ...routePath.split("/").filter(Boolean));
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.copyFileSync(bodyFile, target);

  if (!headerRules.has(name)) {
    const block = [
      `  Content-Type: ${headers["content-type"] ?? "image/png"}`,
      `  Cache-Control: ${headers["cache-control"] ?? "public, max-age=31536000, immutable"}`,
    ].join("\n");
    headerRules.set(name, `/${name}\n${block}\n\n/*/${name}\n${block}`);
  }
  count += 1;
}

const headersFile = path.join(ASSETS_DIR, "_headers");
const existing = fs.existsSync(headersFile) ? fs.readFileSync(headersFile, "utf8").trimEnd() + "\n\n" : "";
fs.writeFileSync(headersFile, existing + [...headerRules.values()].join("\n\n") + "\n");
console.log(`export-static-metadata-images: ${count} prerendered image routes -> static assets`);
