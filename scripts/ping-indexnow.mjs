#!/usr/bin/env node
/**
 * Ping IndexNow (Global + Naver Search Advisor) with updated BENCH. URLs.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://bench-workbench.vercel.app").replace(/\/+$/, "");
const INDEXNOW_KEY = (process.env.INDEXNOW_KEY || "bench-indexnow-9f4c2a8e7b1d6e3a").trim();

const DOMAINS = [
  "kream-commerce",
  "film-previs",
  "photo-lookbook",
  "music-sampling",
  "culture-map",
];

function collectUrls() {
  const urls = [
    `${SITE_URL}/`,
    `${SITE_URL}/rss.xml`,
    ...DOMAINS.map((slug) => `${SITE_URL}/domain/${slug}`),
  ];
  const seedPath = path.join(ROOT, "public", "data", "treatments-seed.json");
  if (fs.existsSync(seedPath)) {
    const data = JSON.parse(fs.readFileSync(seedPath, "utf-8"));
    for (const item of data.items || []) {
      if (item?.id) urls.push(`${SITE_URL}/treatment/${item.id}`);
    }
  }
  return urls;
}

async function pingEndpoint(endpoint, payload) {
  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "User-Agent": "BENCH-IndexNow/1.0",
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(10000),
    });
    console.log(`[IndexNow] ${endpoint} -> HTTP ${res.status}`);
  } catch (err) {
    console.warn(`[IndexNow] ${endpoint} failed:`, err?.message || err);
  }
}

async function main() {
  const host = new URL(SITE_URL).hostname;
  const urlList = collectUrls();
  const payload = {
    host,
    key: INDEXNOW_KEY,
    keyLocation: `${SITE_URL}/${INDEXNOW_KEY}.txt`,
    urlList,
  };

  console.log(`[IndexNow] Submitting ${urlList.length} URLs for ${host}`);
  await pingEndpoint("https://api.indexnow.org/indexnow", payload);
  await pingEndpoint("https://searchadvisor.naver.com/indexnow", payload);
}

main();
