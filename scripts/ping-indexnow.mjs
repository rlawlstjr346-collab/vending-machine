#!/usr/bin/env node
/**
 * Ping IndexNow (Naver Search Advisor + Global IndexNow) with all DISPENSER. sitemap URLs.
 * Supports CLI argument: `node scripts/ping-indexnow.mjs https://your-domain.com`
 * or env vars: SITE_URL / NEXT_PUBLIC_SITE_URL / VERCEL_PROJECT_PRODUCTION_URL
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

function resolveSiteUrl() {
  const cliArg = process.argv[2]?.trim();
  const raw =
    cliArg ||
    process.env.SITE_URL?.trim() ||
    process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
    (process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim()
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL.trim()}`
      : "") ||
    "https://vending-machine.vercel.app";
  const withProto = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  return withProto.replace(/\/+$/, "");
}

const SITE_URL = resolveSiteUrl();
const INDEXNOW_KEY = (
  process.env.INDEXNOW_KEY || "dispenser-indexnow-9f4c2a8e7b1d6e3a"
).trim();

const DISCOVER_SLUGS = [
  "ai-service-ideas",
  "side-project-mvp",
  "vibe-coding-topics",
  "startup-benchmarking",
  "opensource-product-ideas",
  "brand-digital-campaign",
  "media-art-cinema-web",
  "micro-saas-trends",
];

const DOMAINS = [
  "brand-commerce",
  "cinema-video",
  "photo-visual",
  "music-audio",
  "local-archive",
  "creator-tool",
];

function collectUrls() {
  const urls = [
    `${SITE_URL}/`,
    `${SITE_URL}/rss.xml`,
    ...DISCOVER_SLUGS.map((slug) => `${SITE_URL}/discover/${slug}`),
    ...DOMAINS.map((slug) => `${SITE_URL}/domain/${slug}`),
  ];
  const seedPath = path.join(ROOT, "public", "data", "treatments-seed.json");
  if (fs.existsSync(seedPath)) {
    const data = JSON.parse(fs.readFileSync(seedPath, "utf-8"));
    for (const item of data.items || []) {
      if (item?.id) urls.push(`${SITE_URL}/treatment/${item.id}`);
    }
  }
  return Array.from(new Set(urls));
}

async function pingEndpoint(endpoint, payload) {
  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "User-Agent": "DISPENSER-IndexNow/1.0",
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(10000),
    });
    console.log(`[IndexNow] ${endpoint} -> HTTP ${res.status}`);
  } catch (err) {
    console.warn(`[IndexNow] ${endpoint} skipped:`, err?.message || err);
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
  await Promise.all([
    pingEndpoint("https://searchadvisor.naver.com/indexnow", payload),
    pingEndpoint("https://api.indexnow.org/indexnow", payload),
  ]);
}

main().catch((err) => {
  console.warn("[IndexNow] Non-fatal error:", err?.message || err);
  process.exit(0);
});
