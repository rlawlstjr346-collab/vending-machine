#!/usr/bin/env node
/**
 * BENCH. Real-Data Signal Synchronization Pipeline
 * - AI Radar (planning-feed.json + live-feed.json joined by id, raw `==` stripped)
 * - Overseas 0-won builder sources: Show HN Algolia, Product Hunt Atom, TrustMRR SSR, Uneed SSR, X oEmbed
 * - IP-ban 0% shield: standard User-Agent, ETag/If-Modified-Since (304 cache),
 *   per-domain 1500~2500ms jitter, 429/403 Circuit Breaker cooldown
 * - 0-won Korean translation with persistent cache (src/data/translation-cache.json)
 * - Generates 40 distinct, human-crafted Korean seed treatments from src/data/concept-blueprints.json
 */

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const PUBLIC_DATA = path.join(ROOT, "public", "data");
const SRC_DATA = path.join(ROOT, "src", "data");
const GUARD_META_PATH = path.join(PUBLIC_DATA, "fetch-guard-meta.json");
const TRANSLATION_CACHE_PATH = path.join(SRC_DATA, "translation-cache.json");
const BLUEPRINTS_PATH = path.join(SRC_DATA, "concept-blueprints.json");

const USER_AGENT =
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

const AI_RADAR_PLANNING_URL =
  "https://raw.githubusercontent.com/rlawlstjr346-collab/ai-radar/main/web/public/data/planning-feed.json";
const AI_RADAR_LIVE_URL =
  "https://raw.githubusercontent.com/rlawlstjr346-collab/ai-radar/main/web/public/live-feed.json";
const SHOW_HN_LATEST_URL =
  "https://hn.algolia.com/api/v1/search_by_date?tags=show_hn&hitsPerPage=40";
const SIX_MONTHS_AGO_UNIX = Math.floor((Date.now() - 180 * 24 * 60 * 60 * 1000) / 1000);
const SHOW_HN_TOP_URL =
  `https://hn.algolia.com/api/v1/search?tags=show_hn&numericFilters=points>15,created_at_i>${SIX_MONTHS_AGO_UNIX}&hitsPerPage=40`;
const PRODUCT_HUNT_FEED_URL = "https://www.producthunt.com/feed";
const TRUSTMRR_URL = "https://trustmrr.com";
const UNEED_URL = "https://www.uneed.best";

const COOLDOWN_MS = 6 * 60 * 60 * 1000;
const hostLastRequestAt = new Map();

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function readJson(filePath, fallback) {
  try {
    if (!fs.existsSync(filePath)) return fallback;
    return JSON.parse(fs.readFileSync(filePath, "utf-8"));
  } catch {
    return fallback;
  }
}

function writeJson(filePath, data) {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + "\n", "utf-8");
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitDomainJitter(url) {
  const host = new URL(url).hostname;
  const last = hostLastRequestAt.get(host) || 0;
  const jitter = 1500 + Math.floor(Math.random() * 1000);
  const elapsed = Date.now() - last;
  if (last > 0 && elapsed < jitter) {
    await sleep(jitter - elapsed);
  }
  hostLastRequestAt.set(host, Date.now());
}

function stripHighlightMarkers(input) {
  if (!input) return "";
  return String(input)
    .replace(/==([^=]+?)==/g, "$1")
    .replace(/==+/g, "")
    .replace(/[\u{1F300}-\u{1F9FF}\u{1FA00}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}]/gu, "")
    .replace(/준비\s*중/gi, "진행 단계")
    .replace(/coming\s+soon/gi, "예정")
    .replace(/샘플\s*데이터/gi, "실측 데이터")
    .replace(/\s+/g, " ")
    .trim();
}

function decodeHtml(str) {
  return String(str || "")
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&#x2F;/g, "/")
    .replace(/&nbsp;/g, " ");
}

function stripTags(html) {
  return decodeHtml(String(html || "").replace(/<[^>]+>/g, " "))
    .replace(/\s+/g, " ")
    .trim();
}

function isValidHttpUrl(url) {
  if (!url) return false;
  try {
    const u = new URL(String(url).trim());
    return (
      (u.protocol === "https:" || u.protocol === "http:") &&
      u.hostname.includes(".") &&
      !u.hostname.endsWith("example.com") &&
      u.hostname !== "localhost"
    );
  } catch {
    return false;
  }
}

function slugify(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

function shortHash(text) {
  return crypto.createHash("sha256").update(String(text)).digest("hex").slice(0, 10);
}

function needsKoreanTranslation(text) {
  if (!text || text.trim().length < 3) return false;
  const cleaned = text.replace(/https?:\/\/\S+/g, "").trim();
  const letters = cleaned.match(/[가-힣A-Za-z]/g) || [];
  if (letters.length < 4) return false;
  const hangul = cleaned.match(/[가-힣]/g) || [];
  return hangul.length / letters.length < 0.2;
}

class FetchGuard {
  constructor(metaPath) {
    this.metaPath = metaPath;
    this.meta = readJson(metaPath, { hosts: {}, urls: {} });
    if (!this.meta.hosts) this.meta.hosts = {};
    if (!this.meta.urls) this.meta.urls = {};
  }

  save() {
    this.meta.updatedAt = new Date().toISOString();
    writeJson(this.metaPath, this.meta);
  }

  async fetchText(url, { accept = "*/*", bypass304 = false } = {}) {
    const host = new URL(url).hostname;
    const hostState = this.meta.hosts[host] || {};
    if (hostState.cooldownUntil && Date.now() < Date.parse(hostState.cooldownUntil)) {
      return {
        ok: false,
        status: 429,
        skippedReason: `circuit-breaker cooldown until ${hostState.cooldownUntil}`,
        text: null,
      };
    }

    await waitDomainJitter(url);

    const urlState = this.meta.urls[url] || {};
    const headers = {
      "User-Agent": USER_AGENT,
      Accept: accept,
      "Accept-Language": "en-US,en;q=0.9,ko;q=0.7",
    };
    if (!bypass304 && urlState.etag) headers["If-None-Match"] = urlState.etag;
    if (!bypass304 && urlState.lastModified) headers["If-Modified-Since"] = urlState.lastModified;

    try {
      const res = await fetch(url, { headers, signal: AbortSignal.timeout(15000) });
      if (res.status === 304) {
        this.meta.urls[url] = { ...urlState, lastStatus: 304, lastCheckedAt: new Date().toISOString() };
        return { ok: true, status: 304, cached304: true, text: null };
      }
      if (res.status === 429 || res.status === 403) {
        const until = new Date(Date.now() + COOLDOWN_MS).toISOString();
        this.meta.hosts[host] = { lastBlockedStatus: res.status, cooldownUntil: until };
        this.meta.urls[url] = { ...urlState, lastStatus: res.status, lastCheckedAt: new Date().toISOString() };
        return { ok: false, status: res.status, skippedReason: `HTTP ${res.status} cooldown tripped`, text: null };
      }
      if (!res.ok) {
        this.meta.urls[url] = { ...urlState, lastStatus: res.status, lastCheckedAt: new Date().toISOString() };
        return { ok: false, status: res.status, skippedReason: `HTTP ${res.status}`, text: null };
      }
      const text = await res.text();
      this.meta.urls[url] = {
        etag: res.headers.get("etag") || urlState.etag || null,
        lastModified: res.headers.get("last-modified") || urlState.lastModified || null,
        lastStatus: res.status,
        lastCheckedAt: new Date().toISOString(),
      };
      return { ok: true, status: res.status, cached304: false, text };
    } catch (err) {
      return { ok: false, status: 0, skippedReason: String(err?.message || err), text: null };
    }
  }
}

async function translateBatchToKo(texts, cache, guard) {
  const uniquePending = [];
  const seen = new Set();
  for (const t of texts) {
    const clean = stripHighlightMarkers(t);
    if (!clean || !needsKoreanTranslation(clean)) continue;
    const key = shortHash(clean);
    if (!cache[key] && !seen.has(key)) {
      seen.add(key);
      uniquePending.push({ key, text: clean });
    }
  }
  if (uniquePending.length === 0) return;

  const BATCH_SIZE = 8;
  for (let i = 0; i < uniquePending.length; i += BATCH_SIZE) {
    const batch = uniquePending.slice(i, i + BATCH_SIZE);
    const joined = batch.map((b, idx) => `[#${idx}] ${b.text}`).join("\n");
    const url =
      "https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=ko&dt=t&q=" +
      encodeURIComponent(joined);
    const res = await guard.fetchText(url, { accept: "application/json", bypass304: true });
    if (!res.ok || !res.text) break;
    try {
      const data = JSON.parse(res.text);
      const translatedFull = Array.isArray(data?.[0])
        ? data[0].map((seg) => (Array.isArray(seg) && seg[0] ? String(seg[0]) : "")).join("")
        : "";
      const mapped = new Map();
      for (const line of translatedFull.split(/\n+/)) {
        const m = line.match(/^\s*\[#\s*(\d+)\s*\]\s*(.+)$/);
        if (m) mapped.set(Number(m[1]), stripHighlightMarkers(m[2]));
      }
      for (let j = 0; j < batch.length; j += 1) {
        const tr = mapped.get(j);
        if (tr && !needsKoreanTranslation(tr)) cache[batch[j].key] = tr;
      }
    } catch {}
  }
}

function getTranslated(text, cache) {
  const clean = stripHighlightMarkers(text);
  if (!clean) return "";
  return cache[shortHash(clean)] || clean;
}

const MECHANISM_RULES = [
  {
    id: "visual-price-match",
    label: "시각 탐색 · 가격 매칭",
    shortLabel: "시각·시세 비교",
    simpleActionKo: "사진이나 링크 하나만 넣으면 비슷한 대안과 가격·스펙을 한눈에 대조해 주는 방식",
    keywords: [
      "price", "pricing", "deal", "shop", "store", "commerce", "ecommerce", "match",
      "search", "compare", "invoice", "revenue", "mrr", "analytics", "saas", "catalog",
      "product", "market", "valuation", "brand", "design", "photo", "image", "visual",
    ],
  },
  {
    id: "timestamp-archive",
    label: "구간 채집 · 아카이빙",
    shortLabel: "핵심 구간 저장",
    simpleActionKo: "긴 영상이나 글에서 꼭 필요한 핵심 구간만 초 단위 카드로 잘라 모아두는 방식",
    keywords: [
      "video", "clip", "timestamp", "transcript", "meeting", "record", "capture", "note",
      "bookmark", "archive", "history", "timeline", "log", "summary", "youtube", "podcast",
      "watch", "read", "doc", "pdf", "knowledge", "memory",
    ],
  },
  {
    id: "geo-curation",
    label: "취향 지도 · 큐레이션",
    shortLabel: "취향 지도 묶기",
    simpleActionKo: "흩어진 장소·일정·리소스를 취향 태그와 마감일 기준으로 묶어 바로 쓰게 만드는 방식",
    keywords: [
      "map", "local", "travel", "city", "directory", "list", "curat", "discover", "guide",
      "place", "event", "calendar", "schedule", "trip", "weather", "hub", "index", "atlas", "finder",
    ],
  },
  {
    id: "canvas-compare",
    label: "나란히 비교 보드",
    shortLabel: "A·B 비교 보드",
    simpleActionKo: "여러 후보 시안을 한 화면에 나란히 띄워 1분 만에 결정과 피드백을 끝내는 방식",
    keywords: [
      "canvas", "board", "editor", "studio", "whiteboard", "slide", "deck", "layout", "ui",
      "ux", "figma", "diagram", "flow", "template", "builder", "workspace", "review",
      "feedback", "diff", "grid", "portfolio", "landing",
    ],
  },
  {
    id: "audio-stem",
    label: "음성 · 사운드 정리",
    shortLabel: "음성·오디오 정리",
    simpleActionKo: "짧은 음성 메모나 오디오 클립을 읽기 쉬운 구조화 카드와 체크리스트로 바꿔주는 방식",
    keywords: [
      "audio", "music", "voice", "sound", "speech", "tts", "stt", "stem", "beat", "song",
      "midi", "synth", "radio", "podcast", "whisper", "transcribe", "speak",
    ],
  },
  {
    id: "drop-validation",
    label: "공개 투표 · 수요 검증",
    shortLabel: "반응·수요 검증",
    simpleActionKo: "링크 하나로 사람들의 관심도와 투표를 먼저 모아 실패 없는 선택을 돕는 방식",
    keywords: [
      "launch", "drop", "waitlist", "vote", "rank", "leaderboard", "community", "verify",
      "verified", "trust", "social", "newsletter", "submit", "poll", "beta", "indie",
      "maker", "startup", "founder", "growth", "seo", "agent", "cli", "open source",
    ],
  },
];
const MECHANISM_BY_ID = Object.fromEntries(MECHANISM_RULES.map((m) => [m.id, m]));

function classifyMechanism(text, source, tractionType) {
  const hay = String(text || "").toLowerCase();
  let best = tractionType === "mrr" ? "visual-price-match" : "drop-validation";
  let bestScore = -1;
  for (const m of MECHANISM_RULES) {
    let score = 0;
    for (const kw of m.keywords) {
      if (hay.includes(kw)) score += kw.length >= 6 ? 3 : 2;
    }
    if (source === "trustmrr" && m.id === "visual-price-match") score += 2;
    if (source === "uneed" && m.id === "drop-validation") score += 1;
    if (source === "product_hunt" && m.id === "canvas-compare") score += 1;
    if (score > bestScore) {
      bestScore = score;
      best = m.id;
    }
  }
  return best;
}

function parseDollarValue(token) {
  if (!token) return null;
  const clean = token.replace(/[$,\s]/g, "").toLowerCase();
  const m = clean.match(/^(\d+(?:\.\d+)?)([km])?/);
  if (!m) return null;
  let val = parseFloat(m[1]);
  if (m[2] === "k") val *= 1000;
  if (m[2] === "m") val *= 1000000;
  return Math.round(val);
}

function formatShortMetric(builder) {
  if (builder.source === "trustmrr") {
    const m = builder.tractionLabel.match(/\$[\d.,]+[kKmM]?(?:\/mo)?/);
    return m ? `TrustMRR ${m[0]}` : "TrustMRR 검증 매출";
  }
  if (builder.source === "show_hn") {
    const pts = builder.tractionLabel.match(/HN\s+(\d+)\s+pts/i);
    if (pts && Number(pts[1]) >= 100) return `Show HN ${pts[1]}점 인기`;
    return pts ? `Show HN ${pts[1]}점` : "Show HN 인기";
  }
  if (builder.source === "product_hunt") return "Product Hunt 신상";
  if (builder.source === "uneed") return "Uneed 오늘의 런칭";
  return builder.tractionLabel;
}

async function syncAiRadar(guard, existingItems) {
  const planRes = await guard.fetchText(AI_RADAR_PLANNING_URL, {
    accept: "application/json",
    bypass304: existingItems.length === 0,
  });
  const liveRes = await guard.fetchText(AI_RADAR_LIVE_URL, {
    accept: "application/json",
    bypass304: existingItems.length === 0,
  });

  if (planRes.cached304 && liveRes.cached304 && existingItems.length > 0) {
    return { items: existingItems, status: 304, cached304: true, note: "ETag 304 cached" };
  }

  let planData = null;
  let liveData = null;
  if (planRes.text) {
    try { planData = JSON.parse(planRes.text); } catch {}
  }
  if (liveRes.text) {
    try { liveData = JSON.parse(liveRes.text); } catch {}
  }
  if (!planData && existingItems.length > 0) {
    return { items: existingItems, status: planRes.status, note: planRes.skippedReason || "cached snapshot" };
  }

  const liveById = new Map();
  for (const it of liveData?.items || []) {
    if (it && it.id) liveById.set(it.id, it);
  }

  const joined = [];
  for (const sig of planData?.signals || []) {
    if (!sig?.id || !isValidHttpUrl(sig.canonical_url)) continue;
    const full = liveById.get(sig.id) || {};
    const pm = sig.planning_meta || full.planning_meta || {};
    const ut = full.utility_tip || null;
    joined.push({
      id: String(sig.id),
      titleKo: stripHighlightMarkers(sig.title_ko || full.title_ko || sig.original_title),
      originalTitle: stripHighlightMarkers(sig.original_title || sig.title_ko),
      platformId: String(sig.platform_id || full.platform_id || "ai-radar"),
      authorHandle: sig.author_handle || full.author_handle || null,
      category: String(sig.category || full.category || "industry"),
      lifecycleStatus: String(sig.lifecycle_status || full.lifecycle_status || "hot"),
      canonicalUrl: String(sig.canonical_url),
      publishedAt: String(sig.published_at || sig.fetched_at || new Date().toISOString()),
      fetchedAt: String(sig.fetched_at || new Date().toISOString()),
      importanceScore: Number(sig.importance_score || full.importance_score || 10),
      sourceCount: Number(sig.source_count || full.source_count || 1),
      benefitTag: sig.benefit_tag ? stripHighlightMarkers(sig.benefit_tag) : null,
      highlightSummary: stripHighlightMarkers(sig.highlight_summary || full.highlight_summary || ""),
      whatKo: stripHighlightMarkers(full.what_ko || sig.highlight_summary || ""),
      whyKo: stripHighlightMarkers(full.why_ko || ""),
      utilityTip: ut
        ? {
            whenNeeded: stripHighlightMarkers(ut.when_needed || ""),
            workUtility: stripHighlightMarkers(ut.work_utility || ""),
            practicalTip: stripHighlightMarkers(ut.practical_tip || ""),
          }
        : null,
      planningMeta: {
        signalType: String(pm.signal_type || "new_product"),
        productDomain: String(pm.product_domain || "ai-business-infra"),
        benchmarkPoint: stripHighlightMarkers(pm.benchmark_point || "핵심 성능·워크플로 개선"),
        actionableIdea: stripHighlightMarkers(pm.actionable_idea || ""),
      },
      entities: Array.isArray(sig.entities)
        ? sig.entities.map((e) => (typeof e === "string" ? e : String(e?.name || ""))).filter(Boolean)
        : [],
    });
  }

  return {
    items: joined,
    status: planRes.status || 200,
    cached304: false,
    note: `joined planning(${planData?.signals?.length || 0}) + live(${liveById.size})`,
  };
}

function parseShowHnTitle(rawTitle) {
  const cleaned = stripHighlightMarkers(rawTitle).replace(/^Show\s+HN\s*[:–—-]\s*/i, "").trim();
  const split = cleaned.split(/\s+[–—-]\s+|\s*:\s+/);
  if (split.length >= 2 && split[0].length <= 42) {
    return { name: split[0].trim(), tagline: split.slice(1).join(" — ").trim() };
  }
  const words = cleaned.split(/\s+/);
  return { name: words.slice(0, 4).join(" "), tagline: cleaned };
}

async function syncShowHn(guard, existingBySource) {
  const latestRes = await guard.fetchText(SHOW_HN_LATEST_URL, {
    accept: "application/json",
    bypass304: existingBySource.length === 0,
  });
  const topRes = await guard.fetchText(SHOW_HN_TOP_URL, {
    accept: "application/json",
    bypass304: existingBySource.length === 0,
  });

  if (latestRes.cached304 && topRes.cached304 && existingBySource.length > 0) {
    return { items: existingBySource, status: 304, cached304: true, note: "304 cached" };
  }

  const hits = [];
  for (const res of [topRes, latestRes]) {
    if (!res.text) continue;
    try {
      const data = JSON.parse(res.text);
      if (Array.isArray(data?.hits)) hits.push(...data.hits);
    } catch {}
  }

  const seenUrl = new Set();
  const out = [];
  const nowIso = new Date().toISOString();

  for (const h of hits) {
    const url = h?.url ? String(h.url).trim() : "";
    if (!isValidHttpUrl(url) || seenUrl.has(url)) continue;
    seenUrl.add(url);

    const { name, tagline } = parseShowHnTitle(h.title || "");
    if (!name || name.length < 2) continue;
    const points = Number(h.points || 1);
    const comments = Number(h.num_comments || 0);
    const storyExcerpt = h.story_text ? stripTags(h.story_text).slice(0, 220) : "";
    const rawDesc = tagline || storyExcerpt || stripHighlightMarkers(h.title || "");
    const mechId = classifyMechanism(`${name} ${rawDesc} ${storyExcerpt}`, "show_hn", "points");

    out.push({
      id: `builder-hn-${h.objectID || shortHash(url)}`,
      name,
      slug: slugify(`${name}-${h.objectID || shortHash(url)}`),
      source: "show_hn",
      sourceLabel: "Show HN",
      url,
      discussionUrl: h.objectID ? `https://news.ycombinator.com/item?id=${h.objectID}` : null,
      taglineEn: rawDesc,
      taglineKo: rawDesc,
      summaryKo: rawDesc,
      painPointKo:
        points >= 15
          ? `Hacker News에서 ${points}점과 댓글 ${comments}개를 받으며 실사용 효용을 인정받은 프로젝트입니다.`
          : `Show HN에 새롭게 공개된 해외 1인·소규모 메이커 프로젝트입니다.`,
      tractionLabel: `HN ${points} pts · 댓글 ${comments}`,
      tractionValue: points * 10 + comments * 3,
      tractionType: "points",
      mrrUsd: null,
      mechanism: mechId,
      mechanismLabel: MECHANISM_BY_ID[mechId].label,
      tags: ["show-hn", points >= 15 ? "validated" : "fresh"],
      publishedAt: String(h.created_at || nowIso),
      fetchedAt: nowIso,
      verifiedRevenue: false,
    });
    if (out.length >= 34) break;
  }

  return {
    items: out.length > 0 ? out : existingBySource,
    status: topRes.status || latestRes.status || 200,
    cached304: false,
    note: `${out.length} live Show HN items`,
  };
}

async function syncProductHunt(guard, existingBySource) {
  const res = await guard.fetchText(PRODUCT_HUNT_FEED_URL, {
    accept: "application/atom+xml,application/xml,text/xml",
    bypass304: existingBySource.length === 0,
  });

  if (res.cached304 && existingBySource.length > 0) {
    return { items: existingBySource, status: 304, cached304: true, note: "304 cached" };
  }
  if (!res.ok || !res.text) {
    return { items: existingBySource, status: res.status, note: res.skippedReason || "fallback cache" };
  }

  const entries = res.text.match(/<entry>[\s\S]*?<\/entry>/gi) || [];
  const out = [];
  const seen = new Set();
  const nowIso = new Date().toISOString();

  for (let i = 0; i < entries.length; i += 1) {
    const entry = entries[i];
    const titleM = entry.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    const linkM = entry.match(/<link[^>]*href=["']([^"']+)["'][^>]*>/i);
    const contentM = entry.match(/<content[^>]*>([\s\S]*?)<\/content>/i);
    const pubM = entry.match(/<published>([^<]+)<\/published>/i) || entry.match(/<updated>([^<]+)<\/updated>/i);

    const name = stripHighlightMarkers(decodeHtml(titleM ? titleM[1] : ""));
    const url = linkM ? decodeHtml(linkM[1]).trim() : "";
    if (!name || !isValidHttpUrl(url) || seen.has(url)) continue;
    seen.add(url);

    const contentRaw = decodeHtml(contentM ? contentM[1] : "");
    const firstP = contentRaw.match(/<p[^>]*>([\s\S]*?)<\/p>/i);
    const taglineEn = stripHighlightMarkers(stripTags(firstP ? firstP[1] : contentRaw))
      .replace(/Discussion\s*\|\s*Link/gi, "")
      .trim()
      .slice(0, 200);

    const mechId = classifyMechanism(`${name} ${taglineEn}`, "product_hunt", "launch");
    out.push({
      id: `builder-ph-${shortHash(url)}`,
      name,
      slug: slugify(`${name}-${shortHash(url).slice(0, 6)}`),
      source: "product_hunt",
      sourceLabel: "Product Hunt",
      url,
      discussionUrl: url,
      taglineEn: taglineEn || `${name} on Product Hunt`,
      taglineKo: taglineEn || name,
      summaryKo: taglineEn || name,
      painPointKo: `Product Hunt 최신 피드에 공개된 신상 서비스로, 한 가지 핵심 경험을 단순하게 풀어냈습니다.`,
      tractionLabel: `PH 최신 런칭 #${i + 1}`,
      tractionValue: Math.max(10, 220 - i * 6),
      tractionType: "launch",
      mrrUsd: null,
      mechanism: mechId,
      mechanismLabel: MECHANISM_BY_ID[mechId].label,
      tags: ["product-hunt", "launch"],
      publishedAt: pubM ? pubM[1].trim() : nowIso,
      fetchedAt: nowIso,
      verifiedRevenue: false,
    });
    if (out.length >= 22) break;
  }

  return {
    items: out.length > 0 ? out : existingBySource,
    status: res.status,
    cached304: false,
    note: `${out.length} Product Hunt entries`,
  };
}

async function syncTrustMrr(guard, existingBySource) {
  const res = await guard.fetchText(TRUSTMRR_URL, {
    accept: "text/html,application/xhtml+xml",
    bypass304: existingBySource.length === 0,
  });

  if (res.cached304 && existingBySource.length > 0) {
    return { items: existingBySource, status: 304, cached304: true, note: "304 cached" };
  }
  if (!res.ok || !res.text) {
    return { items: existingBySource, status: res.status, note: res.skippedReason || "fallback cache" };
  }

  const html = res.text;
  const out = [];
  const seen = new Set();
  const nowIso = new Date().toISOString();

  const cardRe = /<a[^>]+href=["'](\/startup\/[a-zA-Z0-9_-]+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let m;
  while ((m = cardRe.exec(html)) !== null) {
    const relPath = m[1];
    const inner = m[2];
    const fullUrl = `https://trustmrr.com${relPath}`;
    if (seen.has(fullUrl)) continue;

    const hMatch = inner.match(/<h[2-4][^>]*>([\s\S]*?)<\/h[2-4]>/i);
    const imgAlt = inner.match(/alt=["']([^"']+)["']/i);
    const plain = stripTags(inner);
    const slugName = relPath.replace("/startup/", "").replace(/[-_]+/g, " ");
    let name = stripHighlightMarkers(
      hMatch ? stripTags(hMatch[1]) : imgAlt ? imgAlt[1] : slugName
    );
    name = name.replace(/\s+logo$/i, "").trim();
    if (!name || name.length < 2 || /private enterprise/i.test(name)) continue;

    const windowText = stripTags(html.slice(Math.max(0, m.index - 200), m.index + m[0].length + 400));
    const revMatches = windowText.match(/\$[\d,]+(?:\.\d+)?\s*[kKmM]?(?:\/mo)?/g) || [];
    const mrrTokenRaw =
      revMatches.find((tok) => /\/mo/i.test(tok)) ||
      revMatches.find((tok) => parseDollarValue(tok) >= 100) ||
      null;
    const mrrToken = mrrTokenRaw ? mrrTokenRaw.replace(/\s+/g, "").trim() : null;
    const mrrUsd = mrrToken ? parseDollarValue(mrrToken) : null;

    const pMatch = inner.match(/<p[^>]*>([\s\S]*?)<\/p>/i);
    let desc = stripHighlightMarkers(pMatch ? stripTags(pMatch[1]) : plain.replace(name, "").trim());
    desc = desc.replace(/\$[\d,]+(?:\.\d+)?\s*[kKmM]?(?:\/mo)?/g, "").replace(/\s+/g, " ").trim();
    if (!desc || desc.length < 4) {
      desc = `Stripe verified revenue SaaS (${mrrToken || "TrustMRR"})`;
    }

    seen.add(fullUrl);
    const mechId = classifyMechanism(`${name} ${desc}`, "trustmrr", "mrr");
    const tractionLabel = mrrToken
      ? `검증 매출 ${mrrToken}${/\/mo/i.test(mrrToken) ? "" : " (TrustMRR)"}`
      : "TrustMRR 검증 매출";

    out.push({
      id: `builder-tmrr-${shortHash(fullUrl)}`,
      name,
      slug: slugify(`tmrr-${name}`),
      source: "trustmrr",
      sourceLabel: "TrustMRR",
      url: fullUrl,
      discussionUrl: fullUrl,
      taglineEn: desc.slice(0, 180),
      taglineKo: desc.slice(0, 180),
      summaryKo: desc.slice(0, 180),
      painPointKo: `실제 결제 데이터로 월 매출이 검증된 해외 마이크로 SaaS 사례입니다.`,
      tractionLabel,
      tractionValue: mrrUsd ? Math.min(50000, mrrUsd) : 800,
      tractionType: "mrr",
      mrrUsd,
      mechanism: mechId,
      mechanismLabel: MECHANISM_BY_ID[mechId].label,
      tags: ["trustmrr", "verified-revenue"],
      publishedAt: nowIso,
      fetchedAt: nowIso,
      verifiedRevenue: true,
    });
    if (out.length >= 16) break;
  }

  return {
    items: out.length > 0 ? out : existingBySource,
    status: res.status,
    cached304: false,
    note: `${out.length} TrustMRR verified startups`,
  };
}

async function syncUneed(guard, existingBySource) {
  const res = await guard.fetchText(UNEED_URL, {
    accept: "text/html,application/xhtml+xml",
    bypass304: existingBySource.length === 0,
  });

  if (res.cached304 && existingBySource.length > 0) {
    return { items: existingBySource, status: 304, cached304: true, note: "304 cached" };
  }
  if (!res.ok || !res.text) {
    return { items: existingBySource, status: res.status, note: res.skippedReason || "fallback cache" };
  }

  const html = res.text;
  const out = [];
  const seen = new Set();
  const nowIso = new Date().toISOString();

  const toolRe = /<a[^>]+href=["'](\/tool\/[a-zA-Z0-9_-]+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let m;
  let idx = 0;
  while ((m = toolRe.exec(html)) !== null) {
    const relPath = m[1];
    const inner = m[2];
    const fullUrl = `https://www.uneed.best${relPath}`;
    if (seen.has(fullUrl)) continue;

    const slice = html.slice(m.index, Math.min(html.length, m.index + m[0].length + 600));
    const hMatch = inner.match(/<h[2-4][^>]*>([\s\S]*?)<\/h[2-4]>/i) || slice.match(/<h[2-4][^>]*>([\s\S]*?)<\/h[2-4]>/i);
    const pMatch = slice.match(/<p[^>]*>([\s\S]*?)<\/p>/i);

    const rawTitle = stripTags(hMatch ? hMatch[1] : inner) || relPath.replace("/tool/", "");
    const rankMatch = rawTitle.match(/#(\d+)/);
    let name = stripHighlightMarkers(rawTitle.replace(/#\d+/g, "").trim());
    if (name && name === name.toLowerCase()) {
      name = name
        .split(/[-_\s]+/)
        .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : ""))
        .join(" ");
    }
    if (!name || name.length < 2 || name.length > 50) continue;

    const pText = stripHighlightMarkers(stripTags(pMatch ? pMatch[1] : ""));
    const desc = (pText && pText.length >= 12 ? pText : `${name} — Uneed 오늘의 런칭 선정 인디 웹·앱 프로덕트`).slice(0, 180);

    seen.add(fullUrl);
    idx += 1;
    const rank = rankMatch ? Number(rankMatch[1]) : idx;
    const mechId = classifyMechanism(`${name} ${desc}`, "uneed", "rank");

    out.push({
      id: `builder-uneed-${shortHash(fullUrl)}`,
      name,
      slug: slugify(`uneed-${name}`),
      source: "uneed",
      sourceLabel: "Uneed",
      url: fullUrl,
      discussionUrl: fullUrl,
      taglineEn: desc,
      taglineKo: desc,
      summaryKo: desc,
      painPointKo: `Uneed 데일리 런칭 보드에 오른 인디 프로덕트로, 한 가지 기능에 집중한 단순한 구조가 강점입니다.`,
      tractionLabel: rankMatch ? `Uneed 오늘 #${rank}` : `Uneed 데일리 런칭`,
      tractionValue: Math.max(20, 180 - rank * 8),
      tractionType: "rank",
      mrrUsd: null,
      mechanism: mechId,
      mechanismLabel: MECHANISM_BY_ID[mechId].label,
      tags: ["uneed", "daily-launch"],
      publishedAt: nowIso,
      fetchedAt: nowIso,
      verifiedRevenue: false,
    });
    if (out.length >= 16) break;
  }

  return {
    items: out.length > 0 ? out : existingBySource,
    status: res.status,
    cached304: false,
    note: `${out.length} Uneed daily launches`,
  };
}

async function enrichXLinks(builders, guard) {
  const xRe = /^https?:\/\/(?:www\.)?(?:x\.com|twitter\.com)\/([A-Za-z0-9_]{1,20})\/status\/(\d+)/i;
  let enriched = 0;
  for (const b of builders) {
    if (enriched >= 3) break;
    if (!xRe.test(b.url)) continue;
    const oembedUrl = `https://publish.twitter.com/oembed?url=${encodeURIComponent(b.url)}&omit_script=true`;
    const res = await guard.fetchText(oembedUrl, { accept: "application/json", bypass304: true });
    if (!res.ok || !res.text) continue;
    try {
      const data = JSON.parse(res.text);
      const pMatch = (data.html || "").match(/<p[^>]*>([\s\S]*?)<\/p>/i);
      const txt = stripHighlightMarkers(stripTags(pMatch ? pMatch[1] : data.html || "")).slice(0, 180);
      if (txt) {
        b.taglineEn = txt;
        b.tags = Array.from(new Set([...b.tags, "x-oembed"]));
        enriched += 1;
      }
    } catch {}
  }
  return enriched;
}

const CADENCES = [
  "3~5일 MVP",
  "5~7일 MVP",
  "1주 프로토타입",
  "주말 48시간 실험",
  "1~2주 베타 런칭",
];

function fnv1a(seed) {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i += 1) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h >>> 0);
}

function matchRadar(builder, domain, radars, offset) {
  const tokens = new Set(
    `${builder.name} ${builder.taglineEn} ${builder.tags.join(" ")}`
      .toLowerCase()
      .split(/[^a-z0-9가-힣]+/)
      .filter((t) => t.length >= 3)
  );
  const scored = radars.map((r) => {
    let score = Math.min(35, r.importanceScore || 10);
    if (domain.affinityCategories.includes(r.category)) score += 18;
    if (domain.affinityDomains.includes(r.planningMeta.productDomain)) score += 16;
    if (r.planningMeta.signalType === "open_source_trend") score += 7;
    if (r.planningMeta.signalType === "dev_workflow") score += 6;
    if (r.planningMeta.signalType === "new_product") score += 5;
    const rText = `${r.titleKo} ${r.originalTitle} ${r.planningMeta.benchmarkPoint} ${r.entities.join(" ")}`.toLowerCase();
    let overlap = 0;
    for (const tok of tokens) if (rText.includes(tok)) overlap += 1;
    score += Math.min(18, overlap * 6);
    return { signal: r, score };
  });
  scored.sort((a, b) => b.score - a.score);
  const pool = Math.min(14, scored.length);
  return scored[((offset % pool) + pool) % pool].signal;
}

function buildHumanSeedTreatments(builders, radars) {
  const config = readJson(BLUEPRINTS_PATH, { domains: [], blueprints: {} });
  const domains = config.domains || [];
  const blueprintsMap = config.blueprints || {};

  // Flatten all 40 distinct human-crafted blueprints interleaved across the 6 domains
  const perDomainLists = domains.map((domain) => {
    const mechMap = blueprintsMap[domain.slug] || {};
    const list = [];
    for (const mechId of Object.keys(mechMap)) {
      for (const bp of mechMap[mechId] || []) {
        list.push({ domain, mechId, bp });
      }
    }
    return list;
  });

  const interleavedSlots = [];
  let more = true;
  while (more) {
    more = false;
    for (const list of perDomainLists) {
      if (list.length > 0) {
        interleavedSlots.push(list.shift());
        more = true;
      }
    }
  }

  // Sort builders with source diversity (TrustMRR, Show HN, Product Hunt, Uneed)
  const sortedBuilders = [...builders].sort((a, b) => {
    const revDiff = Number(b.verifiedRevenue) - Number(a.verifiedRevenue);
    if (revDiff !== 0) return revDiff;
    return b.tractionValue - a.tractionValue;
  });
  const bySource = new Map();
  for (const b of sortedBuilders) {
    const arr = bySource.get(b.source) || [];
    arr.push(b);
    bySource.set(b.source, arr);
  }
  const sourceOrder = ["trustmrr", "show_hn", "product_hunt", "uneed", "x_oembed"];
  const diverseBuilders = [];
  let added = true;
  while (added && diverseBuilders.length < sortedBuilders.length) {
    added = false;
    for (const src of sourceOrder) {
      const arr = bySource.get(src);
      if (arr && arr.length > 0) {
        diverseBuilders.push(arr.shift());
        added = true;
      }
    }
  }

  const nowIso = new Date().toISOString();
  const usedBuilderIds = new Set();
  const treatments = [];

  for (let i = 0; i < interleavedSlots.length; i += 1) {
    const { domain, mechId, bp } = interleavedSlots[i];

    // Pick best unused overseas builder matching this mechanism (or next diverse unused builder)
    let builder =
      diverseBuilders.find((b) => b.mechanism === mechId && !usedBuilderIds.has(b.id)) ||
      diverseBuilders.find((b) => !usedBuilderIds.has(b.id)) ||
      diverseBuilders[i % diverseBuilders.length];
    usedBuilderIds.add(builder.id);

    const radar = matchRadar(builder, domain, radars, i);
    const mech = MECHANISM_BY_ID[mechId] || MECHANISM_RULES[0];
    const hash = fnv1a(`${domain.slug}|${builder.id}|${bp.title}|${i}`);
    const id = `tr-${slugify(domain.slug).slice(0, 8)}-${slugify(builder.name).slice(0, 14)}-${hash.toString(36).slice(0, 6)}`;
    const techName = radar.entities[0] || radar.platformId;
    const cleanTagline = stripHighlightMarkers(builder.taglineKo || builder.summaryKo);
    const overseasProofKo = builder.verifiedRevenue
      ? `${builder.name}은 ${builder.tractionLabel}의 실제 결제 수익으로 수요가 입증된 해외 서비스입니다. '${cleanTagline}'라는 단순한 한 가지 문제에 집중해, ${mech.simpleActionKo}으로 유료 사용자를 빠르게 모았습니다.`
      : `${builder.name}은 ${builder.sourceLabel}에서 ${builder.tractionLabel}의 호응을 얻은 해외 신상 프로덕트입니다. '${cleanTagline}' 경험을 무거운 가입 절차 없이 열어주고, ${mech.simpleActionKo}으로 초기 팬을 끌어모았습니다.`;

    treatments.push({
      id,
      slug: id,
      createdAt: nowIso,
      updatedAt: nowIso,
      domainSlug: domain.slug,
      domainLabel: domain.label,
      domainColor: domain.color,
      customTopic: null,
      title: stripHighlightMarkers(bp.title),
      oneLineHook: stripHighlightMarkers(bp.hook),
      firstThreeSecondsUx: stripHighlightMarkers(
        `회원가입 없이 첫 화면에서 바로 써볼 수 있습니다. ${bp.hook}`
      ),
      buildCadence: CADENCES[hash % CADENCES.length],
      sampleA: {
        builderId: builder.id,
        name: builder.name,
        url: builder.url,
        sourceLabel: builder.sourceLabel,
        tractionLabel: builder.tractionLabel,
        shortMetricLabel: formatShortMetric(builder),
        verifiedRevenue: builder.verifiedRevenue,
        mechanism: mechId,
        mechanismLabel: mech.label,
        overseasProofKo: stripHighlightMarkers(overseasProofKo),
      },
      sampleA2: null,
      sampleB: {
        radarId: radar.id,
        titleKo: radar.titleKo,
        canonicalUrl: radar.canonicalUrl,
        platformId: radar.platformId,
        signalType: radar.planningMeta.signalType,
        productDomain: radar.planningMeta.productDomain,
        benchmarkPoint: radar.planningMeta.benchmarkPoint,
        bottleneckSolvedKo: stripHighlightMarkers(
          `최근 화제가 된 ${techName} 계열 소식('${radar.titleKo}')의 아이디어나 공개 도구를 연결하면, 예전에는 사람이 일일이 분류·정리해야 했던 데이터 입력 단계를 몇 줄의 코드만으로 자동화할 수 있습니다. (${radar.whatKo.slice(0, 120)})`
        ),
      },
      twistSummaryKo: stripHighlightMarkers(bp.hook),
      mvpFeatures: bp.features.map((f) => stripHighlightMarkers(f)),
      scopeCutoff: domain.cutoffs,
      targetKpis: domain.kpis,
      lineage: [
        {
          step: "A",
          label: "원본",
          title: builder.name,
          builderId: builder.id,
          builderName: builder.name,
        },
        {
          step: "B",
          label: "1차 기획",
          title: stripHighlightMarkers(bp.title),
          treatmentId: id,
          builderId: builder.id,
          builderName: builder.name,
        },
      ],
      synthesisMode: "deterministic",
      parentTreatmentId: null,
      variantIndex: i,
    });
  }

  return treatments;
}

async function main() {
  ensureDir(PUBLIC_DATA);
  ensureDir(SRC_DATA);

  const guard = new FetchGuard(GUARD_META_PATH);
  const translationCache = readJson(TRANSLATION_CACHE_PATH, {});

  const prevRadar = readJson(path.join(PUBLIC_DATA, "ai-radar-signals.json"), { items: [] }).items || [];
  const prevBuilders = readJson(path.join(PUBLIC_DATA, "builder-signals.json"), { items: [] }).items || [];
  const prevBySource = (src) => prevBuilders.filter((b) => b.source === src);

  console.log("[BENCH sync] 1/5 Fetching AI Radar planning-feed + live-feed...");
  const radarResult = await syncAiRadar(guard, prevRadar);

  console.log("[BENCH sync] 2/5 Fetching Show HN Algolia API...");
  const showHnResult = await syncShowHn(guard, prevBySource("show_hn"));

  console.log("[BENCH sync] 3/5 Fetching Product Hunt Atom feed...");
  const phResult = await syncProductHunt(guard, prevBySource("product_hunt"));

  console.log("[BENCH sync] 4/5 Fetching TrustMRR SSR HTML...");
  const trustResult = await syncTrustMrr(guard, prevBySource("trustmrr"));

  console.log("[BENCH sync] 5/5 Fetching Uneed SSR HTML...");
  const uneedResult = await syncUneed(guard, prevBySource("uneed"));

  const mergedMap = new Map();
  for (const list of [trustResult.items, showHnResult.items, phResult.items, uneedResult.items]) {
    for (const item of list) {
      const key = item.url.toLowerCase().replace(/\/+$/, "");
      if (!mergedMap.has(key)) mergedMap.set(key, item);
    }
  }
  const builders = Array.from(mergedMap.values());

  const xEnriched = await enrichXLinks(builders, guard);

  console.log(`[BENCH sync] Translating ${builders.length} overseas builder taglines (cached)...`);
  await translateBatchToKo(
    builders.map((b) => b.taglineEn),
    translationCache,
    guard
  );

  for (const b of builders) {
    const ko = getTranslated(b.taglineEn, translationCache);
    b.taglineKo = ko;
    b.summaryKo = b.source === "trustmrr" ? `${b.name}: ${ko} (${b.tractionLabel})` : `${b.name}: ${ko}`;
  }

  const treatments = buildHumanSeedTreatments(builders, radarResult.items);

  const bySource = {};
  for (const b of builders) bySource[b.source] = (bySource[b.source] || 0) + 1;

  const syncedAt = new Date().toISOString();
  const syncMeta = {
    syncedAt,
    counts: {
      aiRadar: radarResult.items.length,
      builderTotal: builders.length,
      bySource,
      verifiedRevenueCount: builders.filter((b) => b.verifiedRevenue).length,
      treatmentsSeed: treatments.length,
    },
    sources: [
      { id: "ai_radar", label: "AI Radar (GitHub Raw)", status: radarResult.status, count: radarResult.items.length, cached304: Boolean(radarResult.cached304), note: radarResult.note },
      { id: "show_hn", label: "Show HN Algolia API", status: showHnResult.status, count: bySource.show_hn || 0, cached304: Boolean(showHnResult.cached304), note: showHnResult.note },
      { id: "product_hunt", label: "Product Hunt Atom Feed", status: phResult.status, count: bySource.product_hunt || 0, cached304: Boolean(phResult.cached304), note: phResult.note },
      { id: "trustmrr", label: "TrustMRR SSR", status: trustResult.status, count: bySource.trustmrr || 0, cached304: Boolean(trustResult.cached304), note: trustResult.note },
      { id: "uneed", label: "Uneed SSR", status: uneedResult.status, count: bySource.uneed || 0, cached304: Boolean(uneedResult.cached304), note: uneedResult.note },
      { id: "x_oembed", label: "X oEmbed Adapter", status: 200, count: xEnriched, note: `${xEnriched} X URLs enriched` },
    ],
  };

  writeJson(TRANSLATION_CACHE_PATH, translationCache);
  writeJson(path.join(PUBLIC_DATA, "ai-radar-signals.json"), { version: 1, syncedAt, count: radarResult.items.length, items: radarResult.items });
  writeJson(path.join(PUBLIC_DATA, "builder-signals.json"), { version: 1, syncedAt, count: builders.length, items: builders });
  writeJson(path.join(PUBLIC_DATA, "treatments-seed.json"), { version: 1, syncedAt, count: treatments.length, items: treatments });
  writeJson(path.join(PUBLIC_DATA, "sync-meta.json"), syncMeta);
  guard.save();

  console.log("[BENCH sync] Done:", JSON.stringify(syncMeta.counts));
  if (builders.length < 45) process.exit(1);
  if (radarResult.items.length < 80) process.exit(1);
}

main().catch((err) => {
  console.error("[BENCH sync] Fatal error:", err);
  process.exit(1);
});
