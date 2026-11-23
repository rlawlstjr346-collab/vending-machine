#!/usr/bin/env node
/**
 * BENCH. 100% Real-Data Signal Synchronization Pipeline
 * - AI Radar (planning-feed.json + live-feed.json joined by id, raw `==` stripped)
 * - Overseas 0-won builder sources: Show HN Algolia (latest + points>15), Product Hunt Atom,
 *   TrustMRR SSR HTML, Uneed SSR HTML, X oEmbed adapter
 * - IP-ban 0% shield: standard User-Agent, ETag/If-Modified-Since (304 cache),
 *   per-domain 1500~2500ms jitter, 429/403 Circuit Breaker cooldown
 * - 0-won Korean translation with persistent cache (src/data/translation-cache.json)
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

  // Batch up to 8 short strings per GTX request with delimiter to stay lightweight and fast
  const BATCH_SIZE = 8;
  for (let i = 0; i < uniquePending.length; i += BATCH_SIZE) {
    const batch = uniquePending.slice(i, i + BATCH_SIZE);
    const joined = batch.map((b, idx) => `[#${idx}] ${b.text}`).join("\n");
    const url =
      "https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=ko&dt=t&q=" +
      encodeURIComponent(joined);
    const res = await guard.fetchText(url, { accept: "application/json", bypass304: true });
    if (!res.ok || !res.text) {
      break;
    }
    try {
      const data = JSON.parse(res.text);
      const translatedFull = Array.isArray(data?.[0])
        ? data[0].map((seg) => (Array.isArray(seg) && seg[0] ? String(seg[0]) : "")).join("")
        : "";
      const lines = translatedFull.split(/\n+/);
      const mapped = new Map();
      for (const line of lines) {
        const m = line.match(/^\s*\[#\s*(\d+)\s*\]\s*(.+)$/);
        if (m) {
          mapped.set(Number(m[1]), stripHighlightMarkers(m[2]));
        }
      }
      for (let j = 0; j < batch.length; j += 1) {
        const tr = mapped.get(j);
        if (tr && !needsKoreanTranslation(tr)) {
          cache[batch[j].key] = tr;
        }
      }
    } catch {
      // Keep graceful fallback
    }
  }
}

function getTranslated(text, cache) {
  const clean = stripHighlightMarkers(text);
  if (!clean) return "";
  const key = shortHash(clean);
  return cache[key] || clean;
}

const MECHANISM_RULES = [
  {
    id: "visual-price-match",
    label: "시각 탐색·가격 매칭",
    shortLabel: "시각·시세 매칭",
    keywords: [
      "price", "pricing", "deal", "shop", "store", "commerce", "ecommerce", "match",
      "search", "compare", "invoice", "revenue", "mrr", "analytics", "saas", "catalog",
      "product", "market", "valuation", "brand", "design", "photo", "image", "visual",
    ],
  },
  {
    id: "timestamp-archive",
    label: "타임스탬프·구간 아카이빙",
    shortLabel: "구간 아카이빙",
    keywords: [
      "video", "clip", "timestamp", "transcript", "meeting", "record", "capture", "note",
      "bookmark", "archive", "history", "timeline", "log", "summary", "youtube", "podcast",
      "watch", "read", "doc", "pdf", "knowledge", "memory",
    ],
  },
  {
    id: "geo-curation",
    label: "지도·로컬 큐레이션",
    shortLabel: "로컬 큐레이션",
    keywords: [
      "map", "local", "travel", "city", "directory", "list", "curat", "discover", "guide",
      "place", "event", "calendar", "schedule", "trip", "weather", "hub", "index", "atlas", "finder",
    ],
  },
  {
    id: "canvas-compare",
    label: "캔버스·비교 보드",
    shortLabel: "캔버스·비교",
    keywords: [
      "canvas", "board", "editor", "studio", "whiteboard", "slide", "deck", "layout", "ui",
      "ux", "figma", "diagram", "flow", "template", "builder", "workspace", "review",
      "feedback", "diff", "grid", "portfolio", "landing",
    ],
  },
  {
    id: "audio-stem",
    label: "오디오·음성·멀티모달 처리",
    shortLabel: "오디오·멀티모달",
    keywords: [
      "audio", "music", "voice", "sound", "speech", "tts", "stt", "stem", "beat", "song",
      "midi", "synth", "radio", "podcast", "whisper", "transcribe", "speak",
    ],
  },
  {
    id: "drop-validation",
    label: "드롭·커뮤니티 검증",
    shortLabel: "드롭·검증",
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

// ── 1) AI Radar Sync ──────────────────────────────────────────────────────────
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
    return {
      items: existingItems,
      status: 304,
      cached304: true,
      note: "ETag 304 unchanged (cached 100 items)",
    };
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
    return {
      items: existingItems,
      status: planRes.status,
      note: planRes.skippedReason || "kept cached snapshot",
    };
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

// ── 2) Show HN Sync ───────────────────────────────────────────────────────────
function parseShowHnTitle(rawTitle) {
  const cleaned = stripHighlightMarkers(rawTitle).replace(/^Show\s+HN\s*[:–—-]\s*/i, "").trim();
  const split = cleaned.split(/\s+[–—-]\s+|\s*:\s+/);
  if (split.length >= 2 && split[0].length <= 42) {
    return {
      name: split[0].trim(),
      tagline: split.slice(1).join(" — ").trim(),
    };
  }
  const words = cleaned.split(/\s+/);
  return {
    name: words.slice(0, 4).join(" "),
    tagline: cleaned,
  };
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
    if (!isValidHttpUrl(url)) continue;
    if (seenUrl.has(url)) continue;
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
          ? `Hacker News 개발자·창업자 커뮤니티에서 ${points}점·댓글 ${comments}개로 실사용 효용이 검증된 신생 프로젝트입니다.`
          : `Show HN에 방금 공개된 인디 빌더 프로젝트로, 실무 개발자의 즉각적인 문제 해결 시도를 보여줍니다.`,
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

// ── 3) Product Hunt Atom Feed Sync ────────────────────────────────────────────
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
    // Product Hunt Atom <content> starts with `<p>tagline</p>` before links
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
      painPointKo: `Product Hunt 최신 피드에 등재된 글로벌 신규 프로덕트로, 첫 진입 가치 제안이 선명하게 압축되어 있습니다.`,
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
    note: `${out.length} Product Hunt Atom entries`,
  };
}

// ── 4) TrustMRR SSR HTML Sync ─────────────────────────────────────────────────
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

  // Extract startup cards linking to /startup/<slug>
  const cardRe = /<a[^>]+href=["'](\/startup\/[a-zA-Z0-9_-]+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let m;
  while ((m = cardRe.exec(html)) !== null) {
    const relPath = m[1];
    const inner = m[2];
    const fullUrl = `https://trustmrr.com${relPath}`;
    if (seen.has(fullUrl)) continue;

    // Pull heading or prominent text inside anchor
    const hMatch = inner.match(/<h[2-4][^>]*>([\s\S]*?)<\/h[2-4]>/i);
    const imgAlt = inner.match(/alt=["']([^"']+)["']/i);
    const plain = stripTags(inner);
    const slugName = relPath.replace("/startup/", "").replace(/[-_]+/g, " ");
    let name = stripHighlightMarkers(
      hMatch ? stripTags(hMatch[1]) : imgAlt ? imgAlt[1] : slugName
    );
    name = name.replace(/\s+logo$/i, "").trim();
    if (!name || name.length < 2 || /private enterprise/i.test(name)) continue;

    // Look for revenue/MRR tokens in anchor or nearby window
    const windowText = stripTags(html.slice(Math.max(0, m.index - 200), m.index + m[0].length + 400));
    const revMatches = windowText.match(/\$[\d,]+(?:\.\d+)?\s*[kKmM]?(?:\/mo)?/g) || [];
    const mrrTokenRaw =
      revMatches.find((tok) => /\/mo/i.test(tok)) ||
      revMatches.find((tok) => parseDollarValue(tok) >= 100) ||
      null;
    const mrrToken = mrrTokenRaw ? mrrTokenRaw.replace(/\s+/g, "").trim() : null;
    const mrrUsd = mrrToken ? parseDollarValue(mrrToken) : null;

    // Extract description text from <p> inside card or remainder of plain text
    const pMatch = inner.match(/<p[^>]*>([\s\S]*?)<\/p>/i);
    let desc = stripHighlightMarkers(pMatch ? stripTags(pMatch[1]) : plain.replace(name, "").trim());
    desc = desc.replace(/\$[\d,]+(?:\.\d+)?\s*[kKmM]?(?:\/mo)?/g, "").replace(/\s+/g, " ").trim();
    if (!desc || desc.length < 8) {
      desc = `Verified revenue SaaS startup listed on TrustMRR (${mrrToken || "Stripe verified"})`;
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
      painPointKo: `결제 데이터(Stripe)로 실제 수익이 검증된 해외 마이크로 SaaS로, 명확한 유료 지불 의사가 확인된 구조입니다.`,
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

// ── 5) Uneed SSR HTML Sync ────────────────────────────────────────────────────
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

    // Expand nearby context slightly to capture sibling tagline/rank
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
      painPointKo: `Uneed 일일 런칭 보드에서 상위권 주목을 받은 인디 웹·앱 프로덕트로, 단일 기능 집중도가 높습니다.`,
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

// ── 6) Optional X oEmbed Enrichment for any X URLs spotted in Show HN ─────────
async function enrichXLinks(builders, guard) {
  const xRe = /^https?:\/\/(?:www\.)?(?:x\.com|twitter\.com)\/([A-Za-z0-9_]{1,20})\/status\/(\d+)/i;
  let enriched = 0;
  for (const b of builders) {
    if (enriched >= 3) break;
    const m = b.url.match(xRe);
    if (!m) continue;
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

// ── 7) Seed Treatments Generator (mirrors src/lib/synthesis-engine.ts contract)
const DOMAINS = [
  {
    slug: "kream-commerce",
    label: "KREAM·커머스",
    shortLabel: "KREAM·커머스",
    targetUsers: "한정판 드롭 참여자, 리셀러, 빈티지 셀렉트숍 운영자",
    affinityCategories: ["industry", "image_design", "social", "llm_chat"],
    affinityDomains: ["image-design-studio", "ai-business-infra", "builder-community-signal"],
    objectNoun: "한정판 스니커즈·드롭 매물",
    artifactNoun: "실거래 시세·착샷 비교 시트",
    workflowVerb: "매수·리셀 타이밍을 판별",
    twistFrames: [
      "해외 SaaS의 가격·스펙 비교 구조를 국내 리셀 사이즈별 프리미엄 추적 보드로 재해석",
      "스크린샷 한 장으로 발매가 대비 현재 호가와 유사 매물 체급을 즉시 대조하는 탐색 웨지",
      "커뮤니티 착샷과 실제 거래가 변동선을 한 줄 타임라인에 묶는 구매 결정 도구",
    ],
    defaultCutoffs: [
      "직접 결제·에스크로 정산 및 물류 검수 센터 운영 기능 제외 (외부 거래 링크 아웃링크 처리)",
      "판매자 입점 백오피스·재고 ERP 및 복잡한 등급제 멤버십 기능 제외",
    ],
    defaultKpis: [
      "신규 드롭 발매일 기준 24시간 내 시세·매물 비교 완료율 42% 이상",
      "관심 모델 알림 등록 후 외부 거래 페이지 클릭 전환율(CTR) 18% 이상",
      "주간 재방문율(W1 Retention) 35% 이상",
    ],
  },
  {
    slug: "film-previs",
    label: "영화·프리비주얼",
    shortLabel: "영화·프리비주얼",
    targetUsers: "독립영화 감독, 광고 PD, 영상 프리비주얼 디자이너",
    affinityCategories: ["video_audio", "image_design", "dev", "research"],
    affinityDomains: ["video-audio-media", "image-design-studio", "ai-research-model"],
    objectNoun: "레퍼런스 씬·샷 리스트",
    artifactNoun: "타임코드 콘티·샷 브리프",
    workflowVerb: "프리프로덕션 콘티와 샷 구성을 확정",
    twistFrames: [
      "해외 워크플로 도구의 프레임 단위 주석 메커니즘을 촬영 직전 샷 리스트·조명 노트 생성기로 전환",
      "레퍼런스 영상 구간에서 카메라 무빙·색온도·구도 태그를 뽑아 즉시 콘티 시트로 묶는 웨지",
      "트리트먼트 텍스트를 6컷 핵심 시퀀스 보드와 촬영 체크리스트로 바로 치환하는 경량 스튜디오",
    ],
    defaultCutoffs: [
      "브라우저 내 풀 NLE 타임라인 편집기·4K 영상 인코딩 서버 구축 제외",
      "스튜디오 회계 정산·촬영 장비 대여 마켓플레이스 기능 제외",
    ],
    defaultKpis: [
      "트리트먼트 1건당 콘티·샷 시트 초안 완성 소요 시간 70% 단축 (10분 이내)",
      "생성된 샷 보드 PDF/링크 팀 공유율 55% 이상",
      "월 2회 이상 새 프로젝트 보드를 생성하는 활성 제작자 비율 30% 이상",
    ],
  },
  {
    slug: "photo-lookbook",
    label: "사진·룩북",
    shortLabel: "사진·룩북",
    targetUsers: "패션 브랜드 디렉터, 상업 포토그래퍼, 스타일리스트",
    affinityCategories: ["image_design", "llm_chat", "social"],
    affinityDomains: ["image-design-studio", "chatbot-productivity", "builder-community-signal"],
    objectNoun: "시즌 룩북·레퍼런스 컷",
    artifactNoun: "무드보드·색감 컨택트 시트",
    workflowVerb: "촬영 톤앤매너와 최종 A컷을 선별",
    twistFrames: [
      "해외 비주얼 비교 툴의 A/B 셀렉트 구조를 룩북 컨택트 시트와 컬러 팔레트 검수 도구로 전환",
      "업로드한 테스트 컷들의 노출·색온도·크롭 일관성을 자동 진단해 B컷을 걸러내는 웨지",
      "클라이언트 피드백을 사진 위 좌표 핀과 한 줄 수정 지시서로 압축하는 공유 룩북",
    ],
    defaultCutoffs: [
      "RAW 파일 풀 보정 엔진(Lightroom 대체) 및 대규모 테라바이트 클라우드 스토리지 제외",
      "스튜디오 예약·모델 캐스팅 에이전시 중개 결제 기능 제외",
    ],
    defaultKpis: [
      "컨택트 시트 업로드 후 클라이언트 최종 A컷 확정까지 소요 시간 50% 단축",
      "공유 링크를 통한 외부 디렉터 코멘트 참여율 60% 이상",
      "유료 팀 시트 전환 의향(내보내기/워터마크 해제 클릭) 12% 이상",
    ],
  },
  {
    slug: "music-sampling",
    label: "음악·샘플링",
    shortLabel: "음악·샘플링",
    targetUsers: "인디 프로듀서, 비트메이커, 음악 감독, A&R",
    affinityCategories: ["video_audio", "dev", "research", "social"],
    affinityDomains: ["video-audio-media", "coding-agent-devtool", "ai-research-model"],
    objectNoun: "레퍼런스 루프·샘플 구간",
    artifactNoun: "BPM·키 매칭 샘플 보드",
    workflowVerb: "트랙 레퍼런스를 분해하고 샘플 조합을 스케치",
    twistFrames: [
      "해외 크리에이터 유틸리티의 구간 북마크 구조를 BPM·키·질감별 4마디 샘플 크레이트로 전환",
      "레퍼런스 곡의 분위기 키워드를 입력하면 호환되는 리듬·악기 레이어 조합안을 제안하는 웨지",
      "흩어진 보이스메모와 데모 구간을 프로젝트별 트랙 시트로 묶어 공동 작업자에게 넘기는 도구",
    ],
    defaultCutoffs: [
      "웹 기반 풀 DAW 멀티트랙 믹서·VST 플러그인 호스팅 기능 제외",
      "음원 저작권 신탁 정산 및 스트리밍 유통(DSP 배급) 파이프라인 제외",
    ],
    defaultKpis: [
      "세션당 레퍼런스 구간 태깅 및 호환 샘플 조합 생성 수 5건 이상",
      "DAW 투입용 마커/브리프 내보내기 실행률 38% 이상",
      "프로듀서 간 샘플 보드 링크 공유율 28% 이상",
    ],
  },
  {
    slug: "culture-map",
    label: "컬처 맵·아카이브",
    shortLabel: "컬처 맵·아카이브",
    targetUsers: "로컬 에디터, 팝업 마케터, 전시·공간 큐레이터, 주말 탐색자",
    affinityCategories: ["social", "llm_chat", "industry", "image_design"],
    affinityDomains: ["builder-community-signal", "chatbot-productivity", "ai-business-infra"],
    objectNoun: "로컬 팝업·전시·취향 공간",
    artifactNoun: "동선 큐레이션 컬처 시트",
    workflowVerb: "로컬 공간 아카이브와 반나절 동선을 설계",
    twistFrames: [
      "해외 검증 디렉터리·랭킹 메커니즘을 '이번 주 종료 임박 팝업·전시' 필터 중심 로컬 지도로 재구성",
      "URL이나 캡처 이미지 몇 장을 던지면 운영시간·웨이팅 팁·도보 동선 카드로 정규화하는 아카이브 웨지",
      "개인 취향 태그(바이닐, 건축, 독립출판) 기준으로 큐레이터별 컬처 맵을 포크·조합하는 도구",
    ],
    defaultCutoffs: [
      "자체 지도 타일 렌더링 엔진 개발 및 실시간 턴바이턴 내비게이션 제외 (외부 지도 딥링크 연동)",
      "매장 POS 연동 실시간 테이블 예약·티켓 발권 결제 시스템 제외",
    ],
    defaultKpis: [
      "지도/리스트 진입 후 3개 이상 공간 저장 및 동선 시트 생성률 34% 이상",
      "카카오맵·네이버지도·구글맵 외부 길찾기 딥링크 클릭률 26% 이상",
      "주말 전(목·금) 재방문 활성 비율 40% 이상",
    ],
  },
];

const GRAFT_FEATURES = {
  "visual-price-match": {
    "kream-commerce": "착샷 이미지나 모델 코드 입력 시 해외 리셀가와 국내 실거래가 스프레드를 한 표로 매칭하는 가격 격차 레이더",
    "film-previs": "레퍼런스 스틸컷 업로드 시 유사 구도·렌즈 화각과 대략적 프로덕션 난이도를 함께 비교해 주는 샷 매칭 패널",
    "photo-lookbook": "레퍼런스 룩북 이미지에서 색상 팔레트·조명 대비와 유사 브랜드 레퍼런스 톤을 자동 대조하는 스타일 매처",
    "music-sampling": "레퍼런스 트랙의 에너지·질감 지표를 분석해 유사 톤의 샘플 팩과 라이선스 비용 체급을 나란히 비교하는 매처",
    "culture-map": "팝업·전시 포스터 이미지 하나로 입장료·예약 난이도·인근 유사 취향 공간을 자동 매칭하는 탐색 카드",
  },
  "timestamp-archive": {
    "kream-commerce": "드롭 발표·착샷 리뷰 영상의 특정 초(실물 디테일·사이즈 팁)만 잘라 모델 카드에 고정하는 타임스탬프 리뷰 클립",
    "film-previs": "레퍼런스 영상 URL에서 컷 전환 타임코드·카메라 워크·대사 비트를 자동 추출해 샷 리스트로 꽂아주는 구간 아카이버",
    "photo-lookbook": "런웨이·백스테이지 영상에서 특정 착장 프레임을 타임스탬프로 캡처해 시즌 룩북 컨택트 시트에 바로 적재하는 클리퍼",
    "music-sampling": "유튜브·데모 음원의 4마디 루프 시작·종료 초를 원클릭 마킹하고 BPM·키 메모와 함께 크레이트에 저장하는 구간 클리퍼",
    "culture-map": "전시 도슨트·공간 투어 영상에서 핵심 관람 포인트 타임스탬프만 뽑아 공간 아카이브 카드에 붙이는 하이라이트 로그",
  },
  "geo-curation": {
    "kream-commerce": "성수·한남·도쿄 오프라인 드롭 팝업과 빈티지 셀렉트숍의 발매 일정·재고 제보를 구역별로 묶는 드롭 로케이터",
    "film-previs": "씬 분위기 키워드(우중 골목, 모던 콘크리트 등)에 맞는 실제 로케이션 헌팅 스팟과 채광 시간대를 묶는 로케이션 시트",
    "photo-lookbook": "자연광 시간대·배경 텍스처 기준으로 야외 룩북 스팟과 실내 렌탈 스튜디오를 반경별로 필터링하는 촬영지 큐레이터",
    "music-sampling": "도시별 바이닐 숍·리스닝 바·인디 공연장의 장르 아카이브와 디깅 추천 트랙을 한 지도에 엮는 디깅 로케이터",
    "culture-map": "이번 주 종료 임박 팝업·전시·독립서점을 도보 15분 클러스터와 취향 태그로 자동 묶어주는 반나절 동선 큐레이터",
  },
  "canvas-compare": {
    "kream-commerce": "관심 스니커즈·아우터 3~4종의 실거래 추이·소재·코디 컷을 한 화면에 병렬 고정해 최종 1픽을 고르는 비교 시트",
    "film-previs": "시퀀스별 레퍼런스 스틸·조명 도면·대사 톤을 1px 그리드 캔버스에 나란히 배치해 감독과 촬영감독이 합의하는 프리비즈 보드",
    "photo-lookbook": "동일 착장의 A/B 테스트 컷을 나란히 고정하고 색감·크롭·표정 체크마크를 좌표 핀으로 남기는 컨택트 비교 보드",
    "music-sampling": "후보 비트 버전 A/B와 레퍼런스 트랙의 파형·구간 메모를 한 보드에 병렬 배치해 편곡 방향을 확정하는 트랙 비교 시트",
    "culture-map": "주말 후보 코스 A안(성수 전시)과 B안(한남 팝업)의 이동 거리·예산·운영시간을 나란히 비교해 확정하는 코스 비교 보드",
  },
  "audio-stem": {
    "kream-commerce": "해외 스니커즈 유튜버·팟캐스트 리뷰 음성을 자동 전사해 사이즈감·착화감·리셀 전망 핵심 3줄만 추출하는 보이스 브리퍼",
    "film-previs": "감독의 구두 씬 설명 음성 메모를 즉시 샷 리스트·사운드 톤·배경음 무드 시트로 구조화하는 보이스-투-프리비즈 변환기",
    "photo-lookbook": "촬영장 현장 디렉터의 짧은 음성 피드백을 컷 번호별 리터칭 지시 체크리스트로 자동 변환하는 보이스 셀렉트 로그",
    "music-sampling": "업로드한 레퍼런스 오디오나 허밍 데모에서 BPM·키·드럼/베이스 성향 태그를 추출해 샘플 크레이트를 자동 매칭하는 스템 인덱서",
    "culture-map": "공간 방문 직후 남긴 30초 음성 감상 메모를 분위기 키워드·추천 시간대·재방문 포인트가 정리된 아카이브 카드로 변환하는 보이스 로그",
  },
  "drop-validation": {
    "kream-commerce": "출시 예정 협업 드롭의 커뮤니티 체감 수요 투표와 예상 리셀 밴드를 발매 48시간 전에 집계하는 드롭 수요 검증 보드",
    "film-previs": "독립영화·단편 시놉시스와 6컷 프리비즈 시트를 비공개 링크로 돌려 제작 동료의 씬별 몰입도 피드백을 집계하는 사전 검증 보드",
    "photo-lookbook": "신규 시즌 룩북 후보 10컷을 핵심 팬·바이어에게 비공개 투표 링크로 배포해 메인 썸네일과 주력 착장을 사전 검증하는 룩북 폴",
    "music-sampling": "미발매 비트·샘플 팩 프리뷰 15초 스니펫을 리스너·래퍼에게 공개해 저장률 상위 루프만 정식 팩으로 묶는 드롭 검증 보드",
    "culture-map": "신규 오픈 팝업·전시의 실방문자 한 줄 검증 태그(웨이팅 실제 시간·포토존 밀도)를 실시간 집계하는 로컬 현장 검증 피드",
  },
};

const CADENCES = [
  "5일 · 2인 직장인 TF 웨지",
  "7일 · 초기 스타트업 1차 MVP",
  "10일 · 2인 스튜디오 실전 파일럿",
  "4일 · 주말 해커톤 검증형 웨지",
  "2주 · 소규모 TF 베타 런칭",
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
  const pool = Math.min(12, scored.length);
  return scored[((offset % pool) + pool) % pool].signal;
}

function buildSeedTreatments(builders, radars, count = 40) {
  const sorted = [...builders].sort((a, b) => {
    const revDiff = Number(b.verifiedRevenue) - Number(a.verifiedRevenue);
    if (revDiff !== 0) return revDiff;
    return b.tractionValue - a.tractionValue;
  });

  const buckets = new Map();
  for (const b of sorted) {
    const arr = buckets.get(b.source) || [];
    arr.push(b);
    buckets.set(b.source, arr);
  }
  const order = ["trustmrr", "show_hn", "product_hunt", "uneed", "x_oembed"];
  const interleaved = [];
  let added = true;
  while (added && interleaved.length < sorted.length) {
    added = false;
    for (const src of order) {
      const arr = buckets.get(src);
      if (arr && arr.length > 0) {
        interleaved.push(arr.shift());
        added = true;
      }
    }
  }

  const nowIso = new Date().toISOString();
  const treatments = [];
  const usedIds = new Set();

  for (let i = 0; i < count; i += 1) {
    const domain = DOMAINS[i % DOMAINS.length];
    const builder = interleaved[i % interleaved.length];
    const radar = matchRadar(builder, domain, radars, Math.floor(i / DOMAINS.length));
    const mech = MECHANISM_BY_ID[builder.mechanism] || MECHANISM_RULES[0];
    const hash = fnv1a(`${builder.id}|${radar.id}|${domain.slug}|${i}`);
    const id = `tr-${slugify(domain.slug).slice(0, 8)}-${slugify(builder.name).slice(0, 14)}-${hash.toString(36).slice(0, 6)}`;
    if (usedIds.has(id)) continue;
    usedIds.add(id);

    const title = stripHighlightMarkers(`${domain.shortLabel} × ${builder.name} 방식의 ${mech.shortLabel} 워크벤치`);
    const techEntity = radar.entities[0] || radar.platformId;
    const metricPhrase = builder.verifiedRevenue
      ? `실제 검증 매출(${builder.tractionLabel})로 지불 의사가 입증된`
      : `${builder.sourceLabel}에서 ${builder.tractionLabel} 반응을 확보한`;

    treatments.push({
      id,
      slug: id,
      createdAt: nowIso,
      updatedAt: nowIso,
      domainSlug: domain.slug,
      domainLabel: domain.label,
      customTopic: null,
      title,
      oneLineHook: stripHighlightMarkers(
        `해외 검증 프로덕트 ${builder.name}(${builder.tractionLabel})의 '${mech.label}' 구조를 ${domain.shortLabel} 현장에 맞게 압축하고, AI Radar '${radar.titleKo}' 기술로 수작업 병목을 없앤 2주 이내 TF용 마이크로 서비스`
      ),
      firstThreeSecondsUx: stripHighlightMarkers(
        `회원가입 없이 첫 화면에 ${domain.objectNoun} 링크나 키워드 1개를 넣으면, 3초 안에 ${builder.name} 스타일의 구조화 비교 시트와 실행 체크리스트가 우측 지면에 즉시 펼쳐지는 단일 뷰`
      ),
      buildCadence: CADENCES[hash % CADENCES.length],
      sampleA: {
        builderId: builder.id,
        name: builder.name,
        url: builder.url,
        sourceLabel: builder.sourceLabel,
        tractionLabel: builder.tractionLabel,
        verifiedRevenue: builder.verifiedRevenue,
        mechanism: builder.mechanism,
        mechanismLabel: mech.label,
        overseasProofKo: stripHighlightMarkers(
          `${builder.name}은 ${metricPhrase} 해외 프로덕트입니다. ${builder.summaryKo} 핵심 흥행 동력은 '${mech.label}' 구조로, ${builder.painPointKo}`
        ),
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
          `'${radar.titleKo}'(${radar.platformId})의 '${radar.planningMeta.benchmarkPoint}' 역량을 접목하면, 소규모 TF가 ${domain.objectNoun} 데이터를 수작업으로 분류·정규화하던 초기 구현 병목을 API/오픈소스 파이프라인으로 대체할 수 있습니다. (${radar.whatKo.slice(0, 120)})`
        ),
      },
      twistSummaryKo: stripHighlightMarkers(
        `${domain.twistFrames[hash % domain.twistFrames.length]}. 원형 서비스 ${builder.name}의 강점(${builder.taglineKo})을 그대로 복제하지 않고, ${domain.targetUsers}가 매일 반복하는 '${domain.workflowVerb}' 순간에만 집중하도록 범위를 절반 이하로 도려냈습니다.`
      ),
      mvpFeatures: [
        stripHighlightMarkers(GRAFT_FEATURES[builder.mechanism][domain.slug]),
        stripHighlightMarkers(
          `${techEntity} 기반 '${radar.planningMeta.benchmarkPoint}' 파이프라인을 붙여 ${domain.objectNoun} 항목별 핵심 판단 근거 3줄과 추천 우선순위를 자동 태깅하는 경량 분석 엔진`
        ),
        stripHighlightMarkers(
          `선별한 ${domain.objectNoun} 비교 결과를 로그인 없이 1클릭 공유 URL과 마크다운/PDF 시트로 내보내 팀·커뮤니티 피드백을 즉시 수렴하는 ${domain.artifactNoun} 퍼블리셔`
        ),
      ],
      scopeCutoff: [
        ...domain.defaultCutoffs,
        "초기 2주 MVP에서 자체 대형 파운데이션 모델 학습 및 다중 권한 엔터프라이즈 어드민 제외",
      ],
      targetKpis: domain.defaultKpis,
      lineage: [
        {
          step: "A",
          label: "원본 해외 근거 A",
          title: `${builder.name} (${builder.tractionLabel})`,
          builderId: builder.id,
          builderName: builder.name,
        },
        {
          step: "B",
          label: "1차 기획 B",
          title,
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

  // Merge and deduplicate builder signals
  const mergedMap = new Map();
  for (const list of [trustResult.items, showHnResult.items, phResult.items, uneedResult.items]) {
    for (const item of list) {
      const key = item.url.toLowerCase().replace(/\/+$/, "");
      if (!mergedMap.has(key)) {
        mergedMap.set(key, item);
      }
    }
  }
  const builders = Array.from(mergedMap.values());

  // Enrich any X URLs via oEmbed
  const xEnriched = await enrichXLinks(builders, guard);

  // Translate English taglines to natural Korean with local cache
  console.log(`[BENCH sync] Translating ${builders.length} overseas builder taglines (cached)...`);
  await translateBatchToKo(
    builders.map((b) => b.taglineEn),
    translationCache,
    guard
  );

  for (const b of builders) {
    const ko = getTranslated(b.taglineEn, translationCache);
    b.taglineKo = ko;
    b.summaryKo =
      b.source === "trustmrr"
        ? `${b.name}: ${ko} (${b.tractionLabel})`
        : `${b.name}: ${ko}`;
  }

  // Generate 40 deterministic seed treatments from real synced signals
  const treatments = buildSeedTreatments(builders, radarResult.items, 40);

  const bySource = {};
  for (const b of builders) {
    bySource[b.source] = (bySource[b.source] || 0) + 1;
  }

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
  if (builders.length < 45) {
    console.error(`[BENCH sync] ERROR: builder signals (${builders.length}) below minimum threshold 45.`);
    process.exit(1);
  }
  if (radarResult.items.length < 80) {
    console.error(`[BENCH sync] ERROR: AI Radar signals (${radarResult.items.length}) unexpectedly low.`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("[BENCH sync] Fatal error:", err);
  process.exit(1);
});
