#!/usr/bin/env node
/**
 * DISPENSER Real-Data Signal, Global Culture RSS & Demo Media Synchronization Pipeline
 *
 * Tech & Builder Sources:
 *  1) AI Radar (planning-feed.json + live-feed.json joined by id, with thumbnail_url)
 *  2) GitHub Trending Recent Open-Source Repos (Search API + README demo video/GIF/image extraction)
 *  3) Reddit Public JSON Feeds (r/SideProject, r/LocalLLaMA)
 *  4) Show HN (Algolia latest + top)
 *  5) Product Hunt (Atom feed)
 *  6) TrustMRR (SSR HTML verified revenue startups)
 *  7) Uneed (SSR HTML daily launches)
 *
 * Global High-Taste Culture Sources (6 verticals / 23 RSS-Atom feeds, max 8 per outlet -> 75+ items):
 *  - Fashion/Archive/Youth: Dazed Digital, Hypebeast, Highsnobiety, Put This On
 *  - Cinema/Directing: Letterboxd Journal, IndieWire, The Film Stage, MUBI Notebook
 *  - Photo/Visual/Graphic: It's Nice That, Booooooom, PetaPixel, Colossal
 *  - Music/Vinyl/Sound: Bandcamp Daily, CDM, Pitchfork, Stereogum
 *  - Architecture/Space/Objects: Dezeen, designboom, Core77
 *  - Rare Archives/Art/Curation: The Public Domain Review, Hyperallergic, Open Culture, Kottke.org
 */

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import { pairSignalsWithGemini } from "./lib/gemini-pairer.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const PUBLIC_DATA = path.join(ROOT, "public", "data");
const SRC_DATA = path.join(ROOT, "src", "data");
const GUARD_META_PATH = path.join(PUBLIC_DATA, "fetch-guard-meta.json");
const MEDIA_CACHE_PATH = path.join(PUBLIC_DATA, "media-cache.json");
const TRANSLATION_CACHE_PATH = path.join(SRC_DATA, "translation-cache.json");
const BLUEPRINTS_PATH = path.join(SRC_DATA, "concept-blueprints.json");
const CURATED_SEEDS_PATH = path.join(SRC_DATA, "curated-seeds.json");

const USER_AGENT =
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";
const REDDIT_USER_AGENT = "DISPENSER-SignalSync/1.0 (https://dispenser-deck.vercel.app)";

const AI_RADAR_PLANNING_URL =
  "https://raw.githubusercontent.com/rlawlstjr346-collab/ai-radar/main/web/public/data/planning-feed.json";
const AI_RADAR_LIVE_URL =
  "https://raw.githubusercontent.com/rlawlstjr346-collab/ai-radar/main/web/public/live-feed.json";
const SHOW_HN_LATEST_URL =
  "https://hn.algolia.com/api/v1/search_by_date?tags=show_hn&hitsPerPage=45&page=0";
const SHOW_HN_LATEST_P2_URL =
  "https://hn.algolia.com/api/v1/search_by_date?tags=show_hn&hitsPerPage=45&page=1";
const SIX_MONTHS_AGO_UNIX = Math.floor((Date.now() - 180 * 24 * 60 * 60 * 1000) / 1000);
const SHOW_HN_TOP_URL =
  `https://hn.algolia.com/api/v1/search?tags=show_hn&numericFilters=points>12,created_at_i>${SIX_MONTHS_AGO_UNIX}&hitsPerPage=45`;
const PRODUCT_HUNT_FEED_URL = "https://www.producthunt.com/feed";
const TRUSTMRR_URL = "https://trustmrr.com";
const UNEED_URL = "https://www.uneed.best";

function isoDaysAgo(days) {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

const GITHUB_SEARCH_QUERIES = [
  `https://api.github.com/search/repositories?q=${encodeURIComponent(`created:>${isoDaysAgo(75)} stars:>70 topic:ai`)}&sort=stars&order=desc&per_page=25`,
  `https://api.github.com/search/repositories?q=${encodeURIComponent(`created:>${isoDaysAgo(90)} stars:>50 (agent OR video OR audio OR browser OR automation OR cli)`)}&sort=stars&order=desc&per_page=25`,
  `https://api.github.com/search/repositories?q=${encodeURIComponent(`created:>${isoDaysAgo(120)} stars:>50 (topic:developer-tools OR topic:design OR topic:canvas OR topic:self-hosted)`)}&sort=stars&order=desc&per_page=25`,
  `https://api.github.com/search/repositories?q=${encodeURIComponent(`created:>${isoDaysAgo(150)} stars:>60 (topic:local-first OR topic:creative-coding OR topic:webgl OR topic:mcp)`)}&sort=stars&order=desc&per_page=25`,
];

const REDDIT_FEEDS = [
  { sub: "SideProject", url: "https://www.reddit.com/r/SideProject/hot.json?limit=25" },
  { sub: "LocalLLaMA", url: "https://www.reddit.com/r/LocalLLaMA/hot.json?limit=25" },
  { sub: "InternetIsBeautiful", url: "https://www.reddit.com/r/InternetIsBeautiful/hot.json?limit=25" },
  { sub: "selfhosted", url: "https://www.reddit.com/r/selfhosted/hot.json?limit=25" },
];

const CULTURE_FEEDS = [
  // 1) 패션 · 아카이브 · 유스컬처
  {
    id: "dazed",
    name: "Dazed Digital",
    url: "https://www.dazeddigital.com/rss",
    vertical: "fashion-youth",
    verticalLabel: "패션 · 유스컬처",
    domainSlug: "brand-commerce",
    whyKo: "글로벌 유스컬처와 아방가르드 패션의 최신 미학·브랜드 흐름을 가장 먼저 포착하는 매체입니다.",
  },
  {
    id: "hypebeast",
    name: "Hypebeast",
    url: "https://hypebeast.com/feed",
    vertical: "fashion-youth",
    verticalLabel: "패션 · 유스컬처",
    domainSlug: "brand-commerce",
    whyKo: "스트리트웨어·한정판 드롭·글로벌 브랜드 협업 수요가 실시간으로 집결되는 컬처 허브입니다.",
  },
  {
    id: "highsnobiety",
    name: "Highsnobiety",
    url: "https://www.highsnobiety.com/feeds/rss",
    vertical: "fashion-youth",
    verticalLabel: "패션 · 유스컬처",
    domainSlug: "brand-commerce",
    whyKo: "럭셔리·아카이브 패션과 동시대 디자인 트렌드의 교차점을 선명하게 짚어내는 매거진입니다.",
  },
  {
    id: "putthison",
    name: "Put This On",
    url: "https://putthison.com/feed/",
    vertical: "fashion-youth",
    verticalLabel: "패션 · 아카이브",
    domainSlug: "brand-commerce",
    whyKo: "빈티지 멘즈웨어와 장인정신 아카이브의 소재·실루엣 문법을 깊이 있게 다루는 전문 에디토리얼입니다.",
  },

  // 2) 시네마 · 연출
  {
    id: "letterboxd",
    name: "Letterboxd Journal",
    url: "https://letterboxd.com/journal/rss/",
    vertical: "cinema-directing",
    verticalLabel: "시네마 · 연출",
    domainSlug: "cinema-video",
    whyKo: "전 세계 시네필의 감상 취향, 감독 인터뷰, 큐레이션 리스트 문화가 가장 활발하게 움직이는 저널입니다.",
  },
  {
    id: "indiewire",
    name: "IndieWire",
    url: "https://www.indiewire.com/feed/",
    vertical: "cinema-directing",
    verticalLabel: "시네마 · 연출",
    domainSlug: "cinema-video",
    whyKo: "독립영화 제작·촬영 기법·영화제 화제작과 차세대 영상 배급 흐름을 가장 빠르게 다루는 매체입니다.",
  },
  {
    id: "filmstage",
    name: "The Film Stage",
    url: "https://thefilmstage.com/feed/",
    vertical: "cinema-directing",
    verticalLabel: "시네마 · 연출",
    domainSlug: "cinema-video",
    whyKo: "동시대 작가주의 영화의 미장센, 촬영 감독 노하우, 예고편·사운드트랙 큐레이션에 강점을 가진 매체입니다.",
  },
  {
    id: "mubi",
    name: "MUBI Notebook",
    url: "https://mubi.com/en/notebook/posts.rss",
    vertical: "cinema-directing",
    verticalLabel: "시네마 · 연출",
    domainSlug: "cinema-video",
    whyKo: "영화 비평·포스터 디자인·복원 아카이브 등 고감도 시네마 비주얼 담론을 선도하는 저널입니다.",
  },

  // 3) 사진 · 시각예술 · 그래픽
  {
    id: "itsnicethat",
    name: "It's Nice That",
    url: "https://www.itsnicethat.com/rss",
    fallbackUrl: "https://feeds2.feedburner.com/itsnicethat/SlXC",
    vertical: "photo-visual-art",
    verticalLabel: "사진 · 그래픽",
    domainSlug: "photo-visual",
    whyKo: "전 세계 그래픽 디자인·타이포그래피·일러스트레이션 신예 작가들의 감각적 작업이 모이는 대표 매체입니다.",
  },
  {
    id: "booooooom",
    name: "Boooooom",
    url: "https://www.booooooom.com/feed/",
    vertical: "photo-visual-art",
    verticalLabel: "사진 · 시각예술",
    domainSlug: "photo-visual",
    whyKo: "동시대 사진·아트·숏필름 크리에이터들의 실험적 비주얼 포트폴리오를 엄선하는 큐레이션 플랫폼입니다.",
  },
  {
    id: "petapixel",
    name: "PetaPixel",
    url: "https://petapixel.com/feed/",
    vertical: "photo-visual-art",
    verticalLabel: "사진 · 카메라",
    domainSlug: "photo-visual",
    whyKo: "필름·디지털 카메라 장비, 렌즈 광학, 사진 보정 워크플로의 실전 변화가 매일 쏟아지는 매체입니다.",
  },
  {
    id: "colossal",
    name: "Colossal",
    url: "https://www.thisiscolossal.com/feed/",
    vertical: "photo-visual-art",
    verticalLabel: "시각예술 · 공예",
    domainSlug: "photo-visual",
    whyKo: "시각예술·설치미술·자연 영감 오브제 등 아날로그 물성과 시각적 경이로움을 소개하는 매거진입니다.",
  },

  // 4) 음악 · 바이닐 · 사운드테크
  {
    id: "bandcamp",
    name: "Bandcamp Daily",
    url: "https://daily.bandcamp.com/feed",
    vertical: "music-sound",
    verticalLabel: "음악 · 인디 씬",
    domainSlug: "music-audio",
    whyKo: "글로벌 인디 레이블·바이닐·로컬 서브컬처 음악 씬의 디깅 문화가 살아 숨 쉬는 음악 저널입니다.",
  },
  {
    id: "cdm",
    name: "CDM",
    url: "https://cdm.link/feed/",
    vertical: "music-sound",
    verticalLabel: "사운드테크 · 신스",
    domainSlug: "music-audio",
    whyKo: "신시사이저·오디오 소프트웨어·오픈소스 악기와 라이브 비주얼 테크놀로지의 최전선을 다루는 매체입니다.",
  },
  {
    id: "pitchfork",
    name: "Pitchfork",
    url: "https://pitchfork.com/feed/feed-news/rss",
    vertical: "music-sound",
    verticalLabel: "음악 · 앨범 문화",
    domainSlug: "music-audio",
    whyKo: "글로벌 인디·일렉트로닉·힙합 앨범 릴리스와 페스티벌·음악 팬덤의 핵심 이슈를 주도하는 매체입니다.",
  },
  {
    id: "stereogum",
    name: "Stereogum",
    url: "https://www.stereogum.com/feed/",
    vertical: "music-sound",
    verticalLabel: "음악 · 인디 문화",
    domainSlug: "music-audio",
    whyKo: "신보 트랙·재발매 아카이브·라이브 공연 씬의 생생한 팬 반응을 빠르게 포착하는 음악 매거진입니다.",
  },

  // 5) 건축 · 공간 · 오브제
  {
    id: "dezeen",
    name: "Dezeen",
    url: "https://www.dezeen.com/feed/",
    vertical: "architecture-object",
    verticalLabel: "건축 · 공간",
    domainSlug: "local-archive",
    whyKo: "세계 최신 건축·인테리어·리테일 공간 디자인과 지속가능 자재 실험이 매일 공개되는 글로벌 디자인 미디어입니다.",
  },
  {
    id: "designboom",
    name: "designboom",
    url: "https://www.designboom.com/feed/",
    vertical: "architecture-object",
    verticalLabel: "공간 · 오브제",
    domainSlug: "photo-visual",
    whyKo: "산업 디자인·전시 파빌리온·하드웨어 오브제의 독창적 형태 실험을 선명한 비주얼로 다루는 매거진입니다.",
  },
  {
    id: "core77",
    name: "Core77",
    url: "https://www.core77.com/rss/object.xml",
    vertical: "architecture-object",
    verticalLabel: "산업디자인 · 오브제",
    domainSlug: "brand-commerce",
    whyKo: "생활 도구·산업 디자인 디테일·제조 공정과 디자이너 워크플로를 실용적 시선으로 해부하는 매체입니다.",
  },

  // 6) 희귀 사료 · 아트 · 크리에이티브 큐레이션
  {
    id: "pdr",
    name: "The Public Domain Review",
    url: "https://publicdomainreview.org/rss.xml",
    vertical: "archive-curation",
    verticalLabel: "희귀 사료 · 아카이브",
    domainSlug: "local-archive",
    whyKo: "저작권이 만료된 고서적·판화·희귀 도감·고전 필름 등 방대한 퍼블릭 도메인 사료를 발굴하는 저널입니다.",
  },
  {
    id: "hyperallergic",
    name: "Hyperallergic",
    url: "https://hyperallergic.com/feed/",
    vertical: "archive-curation",
    verticalLabel: "아트 · 전시 비평",
    domainSlug: "local-archive",
    whyKo: "글로벌 미술관 전시·독립 아트 씬·문화 생태계의 날카로운 비평과 현장 이슈를 전하는 아트 매체입니다.",
  },
  {
    id: "openculture",
    name: "Open Culture",
    url: "https://www.openculture.com/feed",
    vertical: "archive-curation",
    verticalLabel: "문화 아카이브 · 지식",
    domainSlug: "local-archive",
    whyKo: "전 세계 무료 고전 영화·강의·오디오북·박물관 디지털 아카이브를 엄선해 연결하는 큐레이션 매체입니다.",
  },
  {
    id: "kottke",
    name: "Kottke.org",
    url: "https://feeds.kottke.org/main",
    vertical: "archive-curation",
    verticalLabel: "크리에이티브 큐레이션",
    domainSlug: "local-archive",
    whyKo: "예술·과학·웹 문화·디자인의 기발한 교차점을 20년 넘게 선별해 온 고감도 에디토리얼 큐레이션 블로그입니다.",
  },
];

const COOLDOWN_MS = 6 * 60 * 60 * 1000;
const MEDIA_CACHE_TTL_MS = 72 * 60 * 60 * 1000;
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

async function waitDomainJitter(url, minMs = 1500, spreadMs = 1000) {
  const host = new URL(url).hostname;
  const last = hostLastRequestAt.get(host) || 0;
  const jitter = minMs + Math.floor(Math.random() * spreadMs);
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
    .replace(/&#(\d+);/g, (_, num) => String.fromCodePoint(Number(num)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&rsquo;/g, "'")
    .replace(/&lsquo;/g, "'")
    .replace(/&rdquo;/g, '"')
    .replace(/&ldquo;/g, '"')
    .replace(/&mdash;/g, "—")
    .replace(/&ndash;/g, "–")
    .replace(/&hellip;/g, "…");
}

function stripTags(html) {
  const unwrapped = decodeHtml(String(html || "")).replace(/\]\]>/g, " ");
  return decodeHtml(unwrapped.replace(/<[^>]+>/g, " "))
    .replace(/\]\]>/g, " ")
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

  isCoolingDown(url) {
    try {
      const host = new URL(url).hostname;
      const hostState = this.meta.hosts[host] || {};
      return Boolean(hostState.cooldownUntil && Date.now() < Date.parse(hostState.cooldownUntil));
    } catch {
      return false;
    }
  }

  async fetchText(
    url,
    { accept = "*/*", bypass304 = false, userAgent = USER_AGENT, extraHeaders = {}, timeoutMs = 13000 } = {}
  ) {
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
      "User-Agent": userAgent,
      Accept: accept,
      "Accept-Language": "en-US,en;q=0.9,ko;q=0.7",
      ...extraHeaders,
    };
    if (!bypass304 && urlState.etag) headers["If-None-Match"] = urlState.etag;
    if (!bypass304 && urlState.lastModified) headers["If-Modified-Since"] = urlState.lastModified;

    try {
      const res = await fetch(url, { headers, signal: AbortSignal.timeout(timeoutMs) });
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
      "watch", "read", "doc", "pdf", "knowledge", "memory", "rag", "ocr",
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
      "feedback", "diff", "grid", "portfolio", "landing", "browser",
    ],
  },
  {
    id: "audio-stem",
    label: "음성 · 사운드 정리",
    shortLabel: "음성·오디오 정리",
    simpleActionKo: "짧은 음성 메모나 오디오 클립을 읽기 쉬운 구조화 카드와 체크리스트로 바꿔주는 방식",
    keywords: [
      "audio", "music", "voice", "sound", "speech", "tts", "stt", "stem", "beat", "song",
      "midi", "synth", "radio", "podcast", "whisper", "transcribe", "speak", "hear", "hears",
      "listen", "talk", "talking", "translator", "feed", "media", "stream", "broadcast",
      "channel", "call", "mic", "playlist", "narrat", "dub", "clipper",
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
      "maker", "startup", "founder", "growth", "seo", "agent", "cli", "open source", "llm", "mcp",
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
      if (hay.includes(kw)) {
        score += kw.length >= 6 ? 3 : 2;
        if (m.id === "audio-stem") score += 2;
      }
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

function buildTechDigestForBuilder(builder) {
  const cleanKo = stripHighlightMarkers(builder.taglineKo || builder.summaryKo || builder.name);
  const mech = MECHANISM_BY_ID[builder.mechanism] || MECHANISM_RULES[0];
  const templates = {
    "visual-price-match": {
      inputKo: "사용자가 올린 이미지, 상품 링크, 또는 비교 대상 URL",
      coreEngineKo: `${builder.name}의 핵심 탐색·매칭 로직으로 특징과 가격·스펙 데이터를 구조화해 유사 후보를 추출`,
      outputKo: "대안 리스트와 핵심 수치·가격 차이를 한눈에 대조하는 비교 결과 카드",
    },
    "timestamp-archive": {
      inputKo: "긴 영상 URL, 문서 파일, 회의록 또는 산발적인 웹 기록",
      coreEngineKo: `${builder.name} 방식의 구간 분할·핵심 추출 파이프라인으로 중요 지점만 자동 인덱싱`,
      outputKo: "원하는 순간으로 즉시 점프하고 재활용할 수 있는 구조화 타임라인 아카이브",
    },
    "geo-curation": {
      inputKo: "흩어진 장소·이벤트 링크, 지역 정보, 또는 취향 키워드",
      coreEngineKo: `${builder.name}의 위치·일정 태깅 구조로 조건별 필터링과 우선순위 정렬을 자동 실행`,
      outputKo: "방문 동선과 마감 일정을 한눈에 파악해 바로 실행할 수 있는 큐레이션 보드",
    },
    "canvas-compare": {
      inputKo: "복수의 시안 이미지, 웹 화면, 또는 아이디어 초안",
      coreEngineKo: `${builder.name} 스타일의 단일 캔버스 정렬·실시간 편집 인터페이스로 차이를 시각화`,
      outputKo: "즉각적인 피드백과 최종 선택을 끝내는 공유 가능한 인터랙티브 비교 보드",
    },
    "audio-stem": {
      inputKo: "짧은 음성 메모, 오디오 트랙, 또는 팟캐스트·영상 사운드",
      coreEngineKo: `${builder.name} 계열의 음성 인식·사운드 분리 처리로 핵심 발화와 오디오 레이어를 정제`,
      outputKo: "바로 검색·편집·공유할 수 있는 텍스트 카드 및 정제된 오디오 클립",
    },
    "drop-validation": {
      inputKo: "초기 프로젝트 컨셉, 프롬프트 명령, 또는 공개 검증용 링크",
      coreEngineKo: `${builder.name}의 자동화 실행 및 실시간 반응 집계 파이프라인으로 핵심 워크플로를 구동`,
      outputKo: "별도 세팅 없이 즉시 결과를 확인하고 사용자 반응 데이터를 확보하는 실행 화면",
    },
  };
  const tpl = templates[builder.mechanism] || templates["drop-validation"];
  return {
    inputKo: tpl.inputKo,
    coreEngineKo: tpl.coreEngineKo,
    outputKo: tpl.outputKo,
    summaryKo: stripHighlightMarkers(`${cleanKo} (${mech.shortLabel} 구조)`).slice(0, 140),
  };
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
  if (builder.source === "github_trending") {
    const m = builder.tractionLabel.match(/★\s*[\d,.]+[kKmM]?/);
    return m ? `GitHub ${m[0]}` : "GitHub 급상승";
  }
  if (builder.source === "reddit") return builder.tractionLabel || "Reddit 화제";
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

// ── Media Extraction & Verification ──────────────────────────────────────────

const BAD_MEDIA_PATTERNS = [
  /shields\.io/i,
  /img\.shields\.io/i,
  /badge\.svg/i,
  /badges\//i,
  /star-history\.com/i,
  /api\.star-history/i,
  /opencollective\.com/i,
  /buymeacoffee/i,
  /ko-fi\.com/i,
  /codecov\.io/i,
  /travis-ci/i,
  /github\.com\/[^/]+\/[^/]+\/workflows/i,
  /github\.com\/[^/]+\/[^/]+\/actions/i,
  /avatars\.githubusercontent\.com/i,
  /gravatar\.com/i,
  /favicon/i,
  /\.svg(\?|$)/i,
  /discord\.gg/i,
  /contrib\.rocks/i,
  /vercel\.com\/button/i,
  /netlify\.com\/img\/deploy/i,
  /hits\.seeyoufarm/i,
  /komarev\.com/i,
  /visitor-badge/i,
  /pixel\.wp\.com/i,
  /stats\.wordpress\.com/i,
  /doubleclick\.net/i,
  /1x1\.(gif|png)/i,
  /spacer\.(gif|png)/i,
];

function isJunkMediaUrl(url) {
  if (!isValidHttpUrl(url)) return true;
  return BAD_MEDIA_PATTERNS.some((re) => re.test(url));
}

function resolveGithubAssetUrl(rawUrl, owner, repo, branch) {
  if (!rawUrl) return null;
  let cleaned = decodeHtml(rawUrl.trim().replace(/^<|>$/g, "").split(/\s+/)[0]);
  if (!cleaned || cleaned.startsWith("data:") || cleaned.startsWith("#")) return null;
  if (cleaned.startsWith("//")) cleaned = `https:${cleaned}`;
  if (!/^https?:\/\//i.test(cleaned)) {
    const rel = cleaned.replace(/^\.?\//, "");
    return `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${rel}`;
  }
  const blobM = cleaned.match(/^https?:\/\/github\.com\/([^/]+)\/([^/]+)\/blob\/([^/]+)\/(.+)$/i);
  if (blobM) {
    return `https://raw.githubusercontent.com/${blobM[1]}/${blobM[2]}/${blobM[3]}/${blobM[4]}`;
  }
  return cleaned;
}

function extractMediaFromReadme(markdown, owner, repo, branch) {
  const videoCandidates = [];
  const gifCandidates = [];
  const imageCandidates = [];
  const seen = new Set();

  const pushCandidate = (raw) => {
    const resolved = resolveGithubAssetUrl(raw, owner, repo, branch);
    if (!resolved || seen.has(resolved) || isJunkMediaUrl(resolved)) return;
    seen.add(resolved);
    if (/\.(mp4|webm)(\?|$)/i.test(resolved) || /github\.com\/user-attachments\/assets\//i.test(resolved)) {
      videoCandidates.push(resolved);
    } else if (/\.gif(\?|$)/i.test(resolved)) {
      gifCandidates.push(resolved);
    } else if (/\.(png|jpe?g|webp|avif)(\?|$)/i.test(resolved) || /user-images\.githubusercontent\.com/i.test(resolved)) {
      imageCandidates.push(resolved);
    }
  };

  const videoRe = /(?:https?:\/\/[^\s"'<>)]+\.(?:mp4|webm)(?:\?[^\s"'<>)]*)?|https?:\/\/github\.com\/user-attachments\/assets\/[a-zA-Z0-9-]+)/gi;
  let m;
  while ((m = videoRe.exec(markdown)) !== null) pushCandidate(m[0]);

  const htmlSrcRe = /<(?:video|source|img)[^>]+src=["']([^"']+)["']/gi;
  while ((m = htmlSrcRe.exec(markdown)) !== null) pushCandidate(m[1]);

  const mdImgRe = /!\[[^\]]*\]\(([^)\s]+)(?:\s+["'][^"']*["'])?\)/g;
  while ((m = mdImgRe.exec(markdown)) !== null) pushCandidate(m[1]);

  return { videoCandidates, gifCandidates, imageCandidates };
}

function extractOpenGraphMedia(html, baseUrl) {
  const videos = [];
  const images = [];
  const metaRe = /<meta\s+[^>]*(?:property|name)=["'](og:video(?::secure_url|:url)?|og:image(?::secure_url|:url)?|twitter:image(?::src)?)["'][^>]*content=["']([^"']+)["'][^>]*>/gi;
  const metaRevRe = /<meta\s+[^>]*content=["']([^"']+)["'][^>]*(?:property|name)=["'](og:video(?::secure_url|:url)?|og:image(?::secure_url|:url)?|twitter:image(?::src)?)["'][^>]*>/gi;

  const add = (prop, rawVal) => {
    try {
      const resolved = new URL(decodeHtml(rawVal.trim()), baseUrl).toString();
      if (isJunkMediaUrl(resolved)) return;
      if (prop.toLowerCase().includes("video")) {
        if (/\.(mp4|webm)(\?|$)/i.test(resolved)) videos.push(resolved);
      } else {
        images.push(resolved);
      }
    } catch {}
  };

  let m;
  while ((m = metaRe.exec(html)) !== null) add(m[1], m[2]);
  while ((m = metaRevRe.exec(html)) !== null) add(m[2], m[1]);
  return { videos, images };
}

async function verifyMediaUrl(url, mediaCache) {
  if (!isValidHttpUrl(url) || isJunkMediaUrl(url)) return null;
  const cached = mediaCache[url];
  if (cached && cached.checkedAt && Date.now() - Date.parse(cached.checkedAt) < MEDIA_CACHE_TTL_MS) {
    return cached.ok ? { url: cached.finalUrl || url, kind: cached.kind } : null;
  }

  const probe = async (method) => {
    const headers = {
      "User-Agent": USER_AGENT,
      Accept: "video/*,image/*;q=0.9,*/*;q=0.5",
    };
    if (method === "GET") headers.Range = "bytes=0-1023";
    return fetch(url, {
      method,
      headers,
      redirect: "follow",
      signal: AbortSignal.timeout(7000),
    });
  };

  try {
    let res = await probe("HEAD");
    if (res.status === 405 || res.status === 403 || res.status === 400) {
      res = await probe("GET");
    }
    const okStatus = res.status === 200 || res.status === 206;
    const ct = (res.headers.get("content-type") || "").toLowerCase();
    const cl = Number(res.headers.get("content-length") || 0);
    try { await res.body?.cancel(); } catch {}

    let kind = null;
    if (okStatus) {
      if (ct.startsWith("video/")) kind = "video";
      else if (ct.startsWith("image/") && !ct.includes("svg") && !ct.includes("x-icon") && (cl === 0 || cl >= 2500)) {
        kind = ct.includes("gif") ? "gif" : "image";
      }
    }

    mediaCache[url] = {
      ok: Boolean(kind),
      kind,
      status: res.status,
      contentType: ct,
      finalUrl: res.url || url,
      checkedAt: new Date().toISOString(),
    };
    return kind ? { url: res.url || url, kind } : null;
  } catch {
    mediaCache[url] = {
      ok: false,
      kind: null,
      status: 0,
      checkedAt: new Date().toISOString(),
    };
    return null;
  }
}

async function runPool(items, concurrency, fn) {
  const results = new Array(items.length);
  let cursor = 0;
  async function worker() {
    while (cursor < items.length) {
      const idx = cursor;
      cursor += 1;
      results[idx] = await fn(items[idx], idx);
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, () => worker()));
  return results;
}

// ── 1) AI Radar ──────────────────────────────────────────────────────────────

async function syncAiRadar(guard, existingItems, mediaCache) {
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
  const seenIds = new Set();
  const seenUrls = new Set();
  let verifiedThumbCount = 0;

  const pushRadarRecord = async (sig, full) => {
    const canonicalUrl = String(sig.canonical_url || full.canonical_url || sig.url || full.url || "").trim();
    if (!isValidHttpUrl(canonicalUrl)) return;
    const normUrl = canonicalUrl.toLowerCase().replace(/\/+$/, "");
    const id = String(sig.id || full.id || `radar-${shortHash(canonicalUrl)}`);
    if (seenIds.has(id) || seenUrls.has(normUrl)) return;
    const titleKo = stripHighlightMarkers(sig.title_ko || full.title_ko || sig.original_title || full.original_title || sig.title || full.title || "");
    if (!titleKo || titleKo.length < 2) return;

    seenIds.add(id);
    seenUrls.add(normUrl);

    const pm = sig.planning_meta || full.planning_meta || {};
    const ut = full.utility_tip || sig.utility_tip || null;
    const rawThumb = full.thumbnail_url || sig.thumbnail_url || full.image_url || sig.image_url || null;
    let verifiedThumb = null;
    if (rawThumb && isValidHttpUrl(rawThumb) && verifiedThumbCount < 35) {
      const checked = await verifyMediaUrl(rawThumb, mediaCache);
      if (checked && checked.kind !== "video") {
        verifiedThumb = checked.url;
        verifiedThumbCount += 1;
      }
    }

    joined.push({
      id,
      titleKo,
      originalTitle: stripHighlightMarkers(sig.original_title || full.original_title || titleKo),
      platformId: String(sig.platform_id || full.platform_id || sig.source_platform || "ai-radar"),
      authorHandle: sig.author_handle || full.author_handle || null,
      category: String(sig.category || full.category || "industry"),
      lifecycleStatus: String(sig.lifecycle_status || full.lifecycle_status || "hot"),
      canonicalUrl,
      publishedAt: String(sig.published_at || full.published_at || sig.fetched_at || new Date().toISOString()),
      fetchedAt: String(sig.fetched_at || full.fetched_at || new Date().toISOString()),
      importanceScore: Number(sig.importance_score || full.importance_score || 10),
      sourceCount: Number(sig.source_count || full.source_count || 1),
      benefitTag: sig.benefit_tag ? stripHighlightMarkers(sig.benefit_tag) : null,
      highlightSummary: stripHighlightMarkers(sig.highlight_summary || full.highlight_summary || full.what_ko || titleKo),
      whatKo: stripHighlightMarkers(full.what_ko || sig.what_ko || sig.highlight_summary || titleKo),
      whyKo: stripHighlightMarkers(full.why_ko || sig.why_ko || ""),
      utilityTip: ut
        ? {
            whenNeeded: stripHighlightMarkers(ut.when_needed || ""),
            workUtility: stripHighlightMarkers(ut.work_utility || ""),
            practicalTip: stripHighlightMarkers(ut.practical_tip || ""),
          }
        : null,
      planningMeta: {
        signalType: String(pm.signal_type || "new_product"),
        productDomain: String(pm.product_domain || sig.category || "ai-business-infra"),
        benchmarkPoint: stripHighlightMarkers(pm.benchmark_point || "핵심 성능·워크플로 개선"),
        actionableIdea: stripHighlightMarkers(pm.actionable_idea || ""),
      },
      entities: Array.isArray(sig.entities || full.entities)
        ? (sig.entities || full.entities).map((e) => (typeof e === "string" ? e : String(e?.name || ""))).filter(Boolean)
        : [],
      thumbnailUrl: verifiedThumb,
    });
  };

  for (const sig of planData?.signals || []) {
    if (!sig) continue;
    const full = (sig.id ? liveById.get(sig.id) : null) || {};
    await pushRadarRecord(sig, full);
  }

  // Also absorb any live-feed-only signals (e.g., future Chinese platforms added to live-feed.json)
  for (const liveIt of liveData?.items || []) {
    if (!liveIt) continue;
    await pushRadarRecord(liveIt, liveIt);
  }

  return {
    items: joined,
    status: planRes.status || 200,
    cached304: false,
    note: `joined planning(${planData?.signals?.length || 0}) + live(${liveById.size}), thumbs(${verifiedThumbCount})`,
  };
}

// ── 2) Global High-Taste Culture RSS / Atom Collector ────────────────────────

function extractRssImageCandidates(block, baseUrl) {
  const candidates = [];
  const seen = new Set();
  const push = (raw) => {
    if (!raw) return;
    try {
      const resolved = new URL(decodeHtml(raw.trim()), baseUrl).toString();
      if (!seen.has(resolved) && !isJunkMediaUrl(resolved)) {
        seen.add(resolved);
        candidates.push(resolved);
      }
    } catch {}
  };

  // <media:content url="..."> & <media:thumbnail url="...">
  const mediaRe = /<media:(?:content|thumbnail)[^>]+url=["']([^"']+)["'][^>]*>/gi;
  let m;
  while ((m = mediaRe.exec(block)) !== null) push(m[1]);

  // <enclosure url="..." type="image/...">
  const encRe = /<enclosure[^>]+url=["']([^"']+)["'][^>]*>/gi;
  while ((m = encRe.exec(block)) !== null) {
    if (!/audio|video/i.test(m[0]) || /\.(jpe?g|png|webp|gif)/i.test(m[1])) push(m[1]);
  }

  // First <img> inside decoded content/description
  const decoded = decodeHtml(block);
  const imgRe = /<img[^>]+src=["']([^"']+)["']/gi;
  while ((m = imgRe.exec(decoded)) !== null) {
    push(m[1]);
    if (candidates.length >= 4) break;
  }

  return candidates;
}

function parseCultureXml(xml, feed) {
  const isAtom = /<entry[\s>]/i.test(xml) && !/<item[\s>]/i.test(xml);
  const blocks = isAtom
    ? xml.match(/<entry[\s>][\s\S]*?<\/entry>/gi) || []
    : xml.match(/<item[\s>][\s\S]*?<\/item>/gi) || [];

  const parsed = [];
  const seen = new Set();
  const nowIso = new Date().toISOString();

  for (const block of blocks) {
    if (parsed.length >= 8) break;
    const titleM = block.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    const titleEn = stripHighlightMarkers(stripTags(titleM ? titleM[1] : ""));
    if (!titleEn || titleEn.length < 6) continue;

    let link = "";
    if (isAtom) {
      const altLink = block.match(/<link[^>]+rel=["']alternate["'][^>]+href=["']([^"']+)["']/i)
        || block.match(/<link[^>]+href=["']([^"']+)["']/i);
      link = altLink ? decodeHtml(altLink[1]).trim() : "";
    } else {
      const linkM = block.match(/<link[^>]*>([\s\S]*?)<\/link>/i);
      const guidM = block.match(/<guid[^>]*>([\s\S]*?)<\/guid>/i);
      link = stripTags(linkM ? linkM[1] : "") || stripTags(guidM ? guidM[1] : "");
    }
    if (!isValidHttpUrl(link)) continue;
    const normLink = link.toLowerCase().replace(/\/+$/, "");
    if (seen.has(normLink)) continue;
    seen.add(normLink);

    const descM =
      block.match(/<content:encoded[^>]*>([\s\S]*?)<\/content:encoded>/i) ||
      block.match(/<description[^>]*>([\s\S]*?)<\/description>/i) ||
      block.match(/<summary[^>]*>([\s\S]*?)<\/summary>/i) ||
      block.match(/<content[^>]*>([\s\S]*?)<\/content>/i);
    const rawExcerpt = stripHighlightMarkers(stripTags(descM ? descM[1] : ""));
    const excerptEn = (rawExcerpt || titleEn).slice(0, 220);

    const dateM =
      block.match(/<pubDate[^>]*>([\s\S]*?)<\/pubDate>/i) ||
      block.match(/<published[^>]*>([\s\S]*?)<\/published>/i) ||
      block.match(/<updated[^>]*>([\s\S]*?)<\/updated>/i) ||
      block.match(/<dc:date[^>]*>([\s\S]*?)<\/dc:date>/i);
    let publishedAt = nowIso;
    if (dateM) {
      const d = new Date(stripTags(dateM[1]));
      if (!Number.isNaN(d.getTime())) publishedAt = d.toISOString();
    }

    const catMatches = [...block.matchAll(/<category[^>]*>([\s\S]*?)<\/category>/gi)]
      .map((cm) => stripHighlightMarkers(stripTags(cm[1])))
      .filter((t) => t.length >= 2 && t.length <= 28)
      .slice(0, 4);

    const imgCandidates = extractRssImageCandidates(block, link);
    let sourceDomain = "";
    try {
      sourceDomain = new URL(link).hostname.replace(/^www\./, "");
    } catch {
      sourceDomain = new URL(feed.url).hostname.replace(/^www\./, "");
    }

    parsed.push({
      id: `culture-${feed.id}-${shortHash(link)}`,
      titleEn,
      titleKo: titleEn,
      sourceId: feed.id,
      sourceName: feed.name,
      sourceDomain,
      cultureVertical: feed.vertical,
      cultureVerticalLabel: feed.verticalLabel,
      domainSlug: feed.domainSlug,
      canonicalUrl: link,
      publishedAt,
      fetchedAt: nowIso,
      excerptEn,
      phenomenonKo: excerptEn,
      whyTrendingKo: feed.whyKo,
      previewImageUrl: null,
      _imgCandidates: imgCandidates,
      tags: Array.from(new Set([feed.vertical, feed.id, ...catMatches])).slice(0, 6),
    });
  }
  return parsed;
}

async function syncCultureFeeds(guard, existingCultureItems, mediaCache) {
  const existingBySource = new Map();
  for (const it of existingCultureItems) {
    const arr = existingBySource.get(it.sourceId) || [];
    arr.push(it);
    existingBySource.set(it.sourceId, arr);
  }

  const perFeedReports = [];

  // Fetch distinct domains in parallel (concurrency 6) while keeping per-host jitter & circuit breaker
  const results = await runPool(CULTURE_FEEDS, 6, async (feed) => {
    const prevForFeed = existingBySource.get(feed.id) || [];
    let res = await guard.fetchText(feed.url, {
      accept: "application/rss+xml,application/atom+xml,application/xml,text/xml;q=0.9,*/*;q=0.5",
      bypass304: prevForFeed.length === 0,
      timeoutMs: 12000,
    });

    if ((!res.ok || (!res.cached304 && !res.text)) && feed.fallbackUrl) {
      res = await guard.fetchText(feed.fallbackUrl, {
        accept: "application/rss+xml,application/atom+xml,application/xml,text/xml;q=0.9,*/*;q=0.5",
        bypass304: prevForFeed.length === 0,
        timeoutMs: 12000,
      });
    }

    if (res.cached304 && prevForFeed.length > 0) {
      return {
        feed,
        status: 304,
        cached304: true,
        items: prevForFeed.slice(0, 8),
        note: "304 cached",
      };
    }

    if (!res.ok || !res.text) {
      return {
        feed,
        status: res.status || 0,
        cached304: false,
        items: prevForFeed.slice(0, 8),
        note: res.skippedReason || "skipped",
      };
    }

    const parsed = parseCultureXml(res.text, feed);

    // Verify editorial preview image for each item (RSS media first, then optional og:image for top 2 missing)
    let ogFetched = 0;
    for (const item of parsed) {
      const cands = item._imgCandidates || [];
      for (const imgUrl of cands.slice(0, 2)) {
        const checked = await verifyMediaUrl(imgUrl, mediaCache);
        if (checked && (checked.kind === "image" || checked.kind === "gif")) {
          item.previewImageUrl = checked.url;
          break;
        }
      }
      if (!item.previewImageUrl && ogFetched < 2 && !guard.isCoolingDown(item.canonicalUrl)) {
        ogFetched += 1;
        const pageRes = await guard.fetchText(item.canonicalUrl, {
          accept: "text/html,application/xhtml+xml",
          bypass304: true,
          timeoutMs: 8000,
        });
        if (pageRes.ok && pageRes.text) {
          const { images } = extractOpenGraphMedia(pageRes.text.slice(0, 35000), item.canonicalUrl);
          for (const ogImg of images.slice(0, 2)) {
            const checked = await verifyMediaUrl(ogImg, mediaCache);
            if (checked && (checked.kind === "image" || checked.kind === "gif")) {
              item.previewImageUrl = checked.url;
              break;
            }
          }
        }
      }
      delete item._imgCandidates;
    }

    return {
      feed,
      status: res.status || 200,
      cached304: false,
      items: parsed.length > 0 ? parsed : prevForFeed.slice(0, 8),
      note: `${parsed.length} items (${parsed.filter((x) => x.previewImageUrl).length} img)`,
    };
  });

  // Deduplicate by canonicalUrl while preserving balanced round-robin diversity
  const seenUrl = new Set();
  const byFeedLists = [];
  for (const r of results) {
    perFeedReports.push({
      id: `culture_${r.feed.id}`,
      label: `${r.feed.name} (${r.feed.verticalLabel})`,
      status: r.status,
      count: r.items.length,
      cached304: r.cached304,
      note: r.note,
    });
    if (r.items.length > 0) {
      byFeedLists.push([...r.items]);
    }
  }

  const interleaved = [];
  let more = true;
  while (more) {
    more = false;
    for (const list of byFeedLists) {
      if (list.length > 0) {
        const it = list.shift();
        const key = it.canonicalUrl.toLowerCase().replace(/\/+$/, "");
        if (!seenUrl.has(key)) {
          seenUrl.add(key);
          interleaved.push(it);
        }
        more = true;
      }
    }
  }

  return {
    items: interleaved,
    reports: perFeedReports,
  };
}

// ── 3) GitHub Recent Trending Open-Source Repos + README Demo Media ──────────

async function syncGithubTrending(guard, existingBySource, mediaCache) {
  const repos = [];
  const seenFullName = new Set();
  let lastStatus = 200;

  for (const qUrl of GITHUB_SEARCH_QUERIES) {
    const res = await guard.fetchText(qUrl, {
      accept: "application/vnd.github+json",
      bypass304: existingBySource.length < 45,
      extraHeaders: { "X-GitHub-Api-Version": "2022-11-28" },
    });
    lastStatus = res.status || lastStatus;
    if (!res.ok || !res.text) continue;
    try {
      const data = JSON.parse(res.text);
      for (const item of data?.items || []) {
        if (!item?.full_name || !item?.html_url || seenFullName.has(item.full_name)) continue;
        if (item.fork || item.archived) continue;
        if (!item.description || item.description.trim().length < 10) continue;
        seenFullName.add(item.full_name);
        repos.push(item);
      }
    } catch {}
  }

  if (repos.length === 0 && existingBySource.length > 0) {
    return { items: existingBySource, status: lastStatus, cached304: false, note: "fallback cache" };
  }

  const out = [];
  const nowIso = new Date().toISOString();
  const topRepos = repos
    .sort((a, b) => (b.stargazers_count || 0) - (a.stargazers_count || 0))
    .slice(0, 52);

  let readmeChecked = 0;
  for (const repo of topRepos) {
    const [owner, repoName] = repo.full_name.split("/");
    const branch = repo.default_branch || "main";
    const stars = Number(repo.stargazers_count || 0);
    const starsFmt = stars >= 1000 ? `${(stars / 1000).toFixed(1)}k` : String(stars);
    const desc = stripHighlightMarkers(repo.description || "");
    const topics = Array.isArray(repo.topics) ? repo.topics.slice(0, 6) : [];
    const mechId = classifyMechanism(`${repoName} ${desc} ${topics.join(" ")}`, "github_trending", "stars");

    let demoVideoUrl = null;
    let previewImageUrl = null;
    let mediaSourceLabel = null;

    const readmeUrl = `https://raw.githubusercontent.com/${owner}/${repoName}/${branch}/README.md`;
    const readmeRes =
      readmeChecked < 28
        ? await guard.fetchText(readmeUrl, { accept: "text/plain", bypass304: true })
        : { ok: false, text: null };
    if (readmeChecked < 28) readmeChecked += 1;
    if (readmeRes.ok && readmeRes.text) {
      const { videoCandidates, gifCandidates, imageCandidates } = extractMediaFromReadme(
        readmeRes.text,
        owner,
        repoName,
        branch
      );

      for (const vUrl of videoCandidates.slice(0, 3)) {
        const ok = await verifyMediaUrl(vUrl, mediaCache);
        if (ok && ok.kind === "video") {
          demoVideoUrl = ok.url;
          mediaSourceLabel = "원본 기술 시연 영상";
          break;
        }
        if (ok && (ok.kind === "gif" || ok.kind === "image") && !previewImageUrl) {
          previewImageUrl = ok.url;
          mediaSourceLabel = ok.kind === "gif" ? "원본 기술 시연 GIF" : "오픈소스 실물 화면";
        }
      }

      if (!previewImageUrl) {
        for (const gUrl of gifCandidates.slice(0, 3)) {
          const ok = await verifyMediaUrl(gUrl, mediaCache);
          if (ok && (ok.kind === "gif" || ok.kind === "image")) {
            previewImageUrl = ok.url;
            mediaSourceLabel = ok.kind === "gif" ? "원본 기술 시연 GIF" : "오픈소스 실물 화면";
            break;
          }
        }
      }

      if (!previewImageUrl) {
        for (const iUrl of imageCandidates.slice(0, 4)) {
          const ok = await verifyMediaUrl(iUrl, mediaCache);
          if (ok && (ok.kind === "image" || ok.kind === "gif")) {
            previewImageUrl = ok.url;
            mediaSourceLabel = "오픈소스 실물 화면";
            break;
          }
        }
      }
    }

    out.push({
      id: `builder-gh-${shortHash(repo.full_name)}`,
      name: repoName,
      slug: slugify(`gh-${repoName}-${shortHash(repo.full_name).slice(0, 5)}`),
      source: "github_trending",
      sourceLabel: "GitHub",
      url: repo.html_url,
      discussionUrl: repo.homepage && isValidHttpUrl(repo.homepage) ? repo.homepage : repo.html_url,
      taglineEn: desc.slice(0, 220),
      taglineKo: desc.slice(0, 220),
      summaryKo: desc.slice(0, 220),
      painPointKo: `최근 GitHub에서 빠르게 ★${starsFmt} 스타를 모으며 주목받는 오픈소스 프로젝트(${repo.full_name})입니다.`,
      tractionLabel: `GitHub ★${starsFmt}`,
      tractionValue: Math.min(40000, stars * 5),
      tractionType: "stars",
      mrrUsd: null,
      mechanism: mechId,
      mechanismLabel: MECHANISM_BY_ID[mechId].label,
      tags: ["github", "open-source", ...topics].slice(0, 6),
      publishedAt: String(repo.created_at || nowIso),
      fetchedAt: nowIso,
      verifiedRevenue: false,
      demoVideoUrl,
      previewImageUrl,
      mediaSourceLabel,
    });
  }

  return {
    items: out.length > 0 ? out : existingBySource,
    status: lastStatus,
    cached304: false,
    note: `${out.length} GitHub repos (${out.filter((x) => x.demoVideoUrl || x.previewImageUrl).length} with verified media)`,
  };
}

// ── 4) Reddit (r/SideProject, r/LocalLLaMA) ──────────────────────────────────

async function syncReddit(guard, existingBySource, mediaCache) {
  const out = [];
  const seen = new Set();
  const nowIso = new Date().toISOString();
  let lastStatus = 200;

  for (const feed of REDDIT_FEEDS) {
    const res = await guard.fetchText(feed.url, {
      accept: "application/json",
      bypass304: existingBySource.length < 30,
      userAgent: REDDIT_USER_AGENT,
    });
    lastStatus = res.status || lastStatus;
    if (!res.ok || !res.text) continue;
    try {
      const data = JSON.parse(res.text);
      const children = data?.data?.children || [];
      for (const child of children) {
        const p = child?.data;
        if (!p || p.stickied || p.over_18 || !p.title) continue;
        const ups = Number(p.ups || p.score || 0);
        if (ups < 8) continue;

        const discussionUrl = `https://www.reddit.com${p.permalink}`;
        const externalUrl =
          p.url_overridden_by_dest &&
          isValidHttpUrl(p.url_overridden_by_dest) &&
          !/i\.redd\.it|v\.redd\.it|reddit\.com\/gallery/i.test(p.url_overridden_by_dest)
            ? p.url_overridden_by_dest
            : discussionUrl;

        const dedupKey = externalUrl.toLowerCase().replace(/\/+$/, "");
        if (seen.has(dedupKey)) continue;
        seen.add(dedupKey);

        const rawTitle = stripHighlightMarkers(p.title);
        const selftext = stripHighlightMarkers(p.selftext || "").slice(0, 220);
        const nameMatch = rawTitle.split(/\s+[–—:-]\s+|\s*\|\s*/);
        const name =
          nameMatch.length >= 2 && nameMatch[0].length <= 36
            ? nameMatch[0].trim()
            : rawTitle.split(/\s+/).slice(0, 4).join(" ");
        const tagline = rawTitle.slice(0, 200);
        const mechId = classifyMechanism(`${rawTitle} ${selftext}`, "reddit", "upvotes");

        let demoVideoUrl = null;
        let previewImageUrl = null;
        let mediaSourceLabel = null;

        const redditVideo = p.media?.reddit_video?.fallback_url || p.secure_media?.reddit_video?.fallback_url;
        if (redditVideo && isValidHttpUrl(redditVideo)) {
          const ok = await verifyMediaUrl(redditVideo, mediaCache);
          if (ok && ok.kind === "video") {
            demoVideoUrl = ok.url;
            mediaSourceLabel = "커뮤니티 시연 영상";
          }
        }

        const previewRaw = p.preview?.images?.[0]?.source?.url
          ? decodeHtml(p.preview.images[0].source.url)
          : p.url_overridden_by_dest && /\.(png|jpe?g|gif|webp)(\?|$)/i.test(p.url_overridden_by_dest)
            ? p.url_overridden_by_dest
            : null;
        if (!previewImageUrl && previewRaw && isValidHttpUrl(previewRaw)) {
          const ok = await verifyMediaUrl(previewRaw, mediaCache);
          if (ok && (ok.kind === "image" || ok.kind === "gif")) {
            previewImageUrl = ok.url;
            mediaSourceLabel = ok.kind === "gif" ? "커뮤니티 시연 GIF" : "프로덕트 실물 화면";
          }
        }

        out.push({
          id: `builder-reddit-${p.id || shortHash(discussionUrl)}`,
          name: name.slice(0, 48),
          slug: slugify(`reddit-${feed.sub}-${p.id || shortHash(discussionUrl)}`),
          source: "reddit",
          sourceLabel: `r/${feed.sub}`,
          url: externalUrl,
          discussionUrl,
          taglineEn: tagline,
          taglineKo: tagline,
          summaryKo: tagline,
          painPointKo: `Reddit r/${feed.sub}에서 추천 ${ups}개와 댓글 ${p.num_comments || 0}개로 주목받은 커뮤니티 실전 프로젝트입니다.`,
          tractionLabel: `r/${feed.sub} ▲${ups}`,
          tractionValue: ups * 8 + Number(p.num_comments || 0) * 3,
          tractionType: "upvotes",
          mrrUsd: null,
          mechanism: mechId,
          mechanismLabel: MECHANISM_BY_ID[mechId].label,
          tags: ["reddit", feed.sub.toLowerCase()],
          publishedAt: p.created_utc ? new Date(p.created_utc * 1000).toISOString() : nowIso,
          fetchedAt: nowIso,
          verifiedRevenue: false,
          demoVideoUrl,
          previewImageUrl,
          mediaSourceLabel,
        });
        if (out.length >= 36) break;
      }
    } catch {}
  }

  return {
    items: out.length > 0 ? out : existingBySource,
    status: lastStatus,
    cached304: false,
    note: `${out.length} Reddit builder posts`,
  };
}

// ── 5) Show HN ───────────────────────────────────────────────────────────────

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
    bypass304: existingBySource.length < 50,
  });
  const latestP2Res = await guard.fetchText(SHOW_HN_LATEST_P2_URL, {
    accept: "application/json",
    bypass304: existingBySource.length < 50,
  });
  const topRes = await guard.fetchText(SHOW_HN_TOP_URL, {
    accept: "application/json",
    bypass304: existingBySource.length < 50,
  });

  if (latestRes.cached304 && latestP2Res.cached304 && topRes.cached304 && existingBySource.length >= 50) {
    return { items: existingBySource, status: 304, cached304: true, note: "304 cached" };
  }

  const hits = [];
  for (const res of [topRes, latestRes, latestP2Res]) {
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
      demoVideoUrl: null,
      previewImageUrl: null,
      mediaSourceLabel: null,
    });
    if (out.length >= 68) break;
  }

  return {
    items: out.length > 0 ? out : existingBySource,
    status: topRes.status || latestRes.status || 200,
    cached304: false,
    note: `${out.length} live Show HN items`,
  };
}

// ── 6) Product Hunt ──────────────────────────────────────────────────────────

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
      demoVideoUrl: null,
      previewImageUrl: null,
      mediaSourceLabel: null,
    });
    if (out.length >= 24) break;
  }

  return {
    items: out.length > 0 ? out : existingBySource,
    status: res.status,
    cached304: false,
    note: `${out.length} Product Hunt entries`,
  };
}

// ── 7) TrustMRR ──────────────────────────────────────────────────────────────

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
      demoVideoUrl: null,
      previewImageUrl: null,
      mediaSourceLabel: null,
    });
    if (out.length >= 22) break;
  }

  return {
    items: out.length > 0 ? out : existingBySource,
    status: res.status,
    cached304: false,
    note: `${out.length} TrustMRR verified startups`,
  };
}

// ── 8) Uneed ─────────────────────────────────────────────────────────────────

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
      demoVideoUrl: null,
      previewImageUrl: null,
      mediaSourceLabel: null,
    });
    if (out.length >= 22) break;
  }

  return {
    items: out.length > 0 ? out : existingBySource,
    status: res.status,
    cached304: false,
    note: `${out.length} Uneed daily launches`,
  };
}

// ── OpenGraph / GitHub README Media Enrichment for Non-GitHub Builders ───────

async function enrichBuilderOpenGraphMedia(builders, guard, mediaCache) {
  let inspected = 0;
  let foundCount = 0;
  const MAX_INSPECT = 24;

  for (const b of builders) {
    if (b.demoVideoUrl || b.previewImageUrl) continue;
    if (inspected >= MAX_INSPECT) break;
    if (!isValidHttpUrl(b.url)) continue;

    const ghMatch = b.url.match(/^https?:\/\/github\.com\/([^/]+)\/([^/?#]+)/i);
    if (ghMatch) {
      inspected += 1;
      const [, owner, rawRepo] = ghMatch;
      const repoName = rawRepo.replace(/\.git$/i, "");
      for (const branch of ["main", "master"]) {
        const readmeUrl = `https://raw.githubusercontent.com/${owner}/${repoName}/${branch}/README.md`;
        const rRes = await guard.fetchText(readmeUrl, { accept: "text/plain", bypass304: true });
        if (rRes.ok && rRes.text) {
          const { videoCandidates, gifCandidates, imageCandidates } = extractMediaFromReadme(
            rRes.text,
            owner,
            repoName,
            branch
          );
          for (const v of videoCandidates.slice(0, 2)) {
            const ok = await verifyMediaUrl(v, mediaCache);
            if (ok && ok.kind === "video") {
              b.demoVideoUrl = ok.url;
              b.mediaSourceLabel = "원본 기술 시연 영상";
              break;
            }
          }
          for (const img of [...gifCandidates.slice(0, 2), ...imageCandidates.slice(0, 3)]) {
            const ok = await verifyMediaUrl(img, mediaCache);
            if (ok && (ok.kind === "gif" || ok.kind === "image")) {
              b.previewImageUrl = ok.url;
              b.mediaSourceLabel = b.mediaSourceLabel || (ok.kind === "gif" ? "원본 기술 시연 GIF" : "오픈소스 실물 화면");
              break;
            }
          }
          if (b.demoVideoUrl || b.previewImageUrl) foundCount += 1;
          break;
        }
      }
      continue;
    }

    if (/reddit\.com|news\.ycombinator\.com/i.test(b.url)) continue;
    if (guard.isCoolingDown(b.url)) continue;

    inspected += 1;
    const htmlRes = await guard.fetchText(b.url, {
      accept: "text/html,application/xhtml+xml",
      bypass304: true,
    });
    if (!htmlRes.ok || !htmlRes.text) continue;

    const headSlice = htmlRes.text.slice(0, 45000);
    const { videos, images } = extractOpenGraphMedia(headSlice, b.url);

    for (const v of videos.slice(0, 2)) {
      const ok = await verifyMediaUrl(v, mediaCache);
      if (ok && ok.kind === "video") {
        b.demoVideoUrl = ok.url;
        b.mediaSourceLabel = "원본 기술 시연 영상";
        break;
      }
    }
    for (const img of images.slice(0, 2)) {
      const ok = await verifyMediaUrl(img, mediaCache);
      if (ok && (ok.kind === "gif" || ok.kind === "image")) {
        b.previewImageUrl = ok.url;
        b.mediaSourceLabel = b.mediaSourceLabel || (ok.kind === "gif" ? "프로덕트 시연 GIF" : "프로덕트 실물 화면");
        break;
      }
    }
    if (b.demoVideoUrl || b.previewImageUrl) foundCount += 1;
  }
  return foundCount;
}

// ── Seed Construction (Gemini 50:50 > Curated 60 1:1 > Deterministic) ────────

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

function hydratePairingToTreatment({
  pairing,
  builder,
  radar,
  culture,
  domain,
  index,
  synthesisMode,
  nowIso,
}) {
  const track = pairing.track === "culture" && culture ? "culture" : "tech";
  const mechId = builder.mechanism || "drop-validation";
  const mech = MECHANISM_BY_ID[mechId] || MECHANISM_RULES[0];
  const secondaryId = track === "culture" ? culture.id : radar.id;
  const hash = fnv1a(`${track}|${domain.slug}|${builder.id}|${secondaryId}|${pairing.title}|${index}`);
  const id = `tr-${track === "culture" ? "cul" : "tec"}-${slugify(builder.name).slice(0, 14)}-${hash.toString(36).slice(0, 6)}`;
  const cleanTitle = stripHighlightMarkers(pairing.title);
  const title = cleanTitle.endsWith("?") ? cleanTitle : `${cleanTitle}?`;

  // Visual media priority: Builder demoVideo -> Builder previewImage -> Culture/Radar previewImage
  const demoVideoUrl = builder.demoVideoUrl || null;
  let previewImageUrl = null;
  let mediaSourceLabel = null;

  if (demoVideoUrl) {
    mediaSourceLabel = builder.mediaSourceLabel || "원본 기술 시연 영상";
    previewImageUrl = builder.previewImageUrl || (track === "culture" ? culture.previewImageUrl : radar.thumbnailUrl) || null;
  } else if (builder.previewImageUrl) {
    previewImageUrl = builder.previewImageUrl;
    mediaSourceLabel = builder.mediaSourceLabel || "프로덕트 실물 화면";
  } else if (track === "culture" && culture.previewImageUrl) {
    previewImageUrl = culture.previewImageUrl;
    mediaSourceLabel = `컬처 이슈 이미지 · ${culture.sourceName}`;
  } else if (track === "tech" && radar.thumbnailUrl) {
    previewImageUrl = radar.thumbnailUrl;
    mediaSourceLabel = "이슈 기사 이미지";
  }

  const techDigestKo = pairing.techDigestKo?.inputKo
    ? {
        inputKo: stripHighlightMarkers(pairing.techDigestKo.inputKo),
        coreEngineKo: stripHighlightMarkers(pairing.techDigestKo.coreEngineKo),
        outputKo: stripHighlightMarkers(pairing.techDigestKo.outputKo),
        summaryKo: stripHighlightMarkers(pairing.techDigestKo.summaryKo),
      }
    : builder.techDigestKo || buildTechDigestForBuilder(builder);

  const builderSummaryKo = stripHighlightMarkers(
    pairing.builderSummaryKo || builder.taglineKo || builder.summaryKo
  );

  const sampleB =
    track === "culture"
      ? {
          radarId: culture.id,
          titleKo: stripHighlightMarkers(pairing.cultureTitleKo || culture.titleKo),
          canonicalUrl: culture.canonicalUrl,
          platformId: culture.sourceName,
          sourceType: "culture",
          cultureVerticalLabel: culture.cultureVerticalLabel,
          signalType: culture.cultureVertical,
          productDomain: culture.domainSlug,
          summaryKo: stripHighlightMarkers(pairing.radarSummaryKo || culture.phenomenonKo),
          benchmarkPoint: stripHighlightMarkers(culture.cultureVerticalLabel),
          bottleneckSolvedKo: stripHighlightMarkers(
            `${culture.sourceName}에서 포착된 '${culture.titleKo}' 컬처 흐름을 디지털 인터랙션으로 풀어냅니다. ${pairing.radarSummaryKo || culture.phenomenonKo}`
          ),
        }
      : {
          radarId: radar.id,
          titleKo: radar.titleKo,
          canonicalUrl: radar.canonicalUrl,
          platformId: radar.platformId,
          sourceType: "ai_radar",
          cultureVerticalLabel: null,
          signalType: radar.planningMeta.signalType,
          productDomain: radar.planningMeta.productDomain,
          summaryKo: stripHighlightMarkers(
            pairing.radarSummaryKo || radar.whatKo || radar.highlightSummary
          ),
          benchmarkPoint: radar.planningMeta.benchmarkPoint,
          bottleneckSolvedKo: stripHighlightMarkers(
            `${radar.titleKo} 이슈를 연결해 기존에 수작업이 필요했던 구간을 자동화합니다. ${pairing.radarSummaryKo || radar.whatKo}`
          ),
        };

  return {
    id,
    slug: id,
    track,
    createdAt: nowIso,
    updatedAt: nowIso,
    domainSlug: domain.slug,
    domainLabel: domain.label,
    domainColor: domain.color,
    customTopic: null,
    title,
    oneLineHook: stripHighlightMarkers(pairing.oneLineHook),
    firstThreeSecondsUx: stripHighlightMarkers(
      pairing.firstThreeSecondsUx || `회원가입 없이 첫 화면에서 바로 체험할 수 있습니다. ${pairing.oneLineHook}`
    ),
    fusionStoryKo: stripHighlightMarkers(pairing.fusionStoryKo),
    highlightPhrases: Array.isArray(pairing.highlightPhrases)
      ? pairing.highlightPhrases.map(stripHighlightMarkers).filter(Boolean).slice(0, 3)
      : [],
    buildCadence: stripHighlightMarkers(pairing.buildCadence) || CADENCES[hash % CADENCES.length],
    demoVideoUrl,
    previewImageUrl,
    mediaSourceLabel,
    techDigestKo,
    sampleA: {
      builderId: builder.id,
      name: builder.name,
      url: builder.url,
      source: builder.source,
      sourceLabel: builder.sourceLabel,
      tractionLabel: builder.tractionLabel,
      shortMetricLabel: formatShortMetric(builder),
      verifiedRevenue: builder.verifiedRevenue,
      mechanism: mechId,
      mechanismLabel: mech.label,
      summaryKo: builderSummaryKo,
      overseasProofKo: stripHighlightMarkers(
        `${builder.name}은 ${builder.sourceLabel}(${formatShortMetric(builder)})에서 주목받은 프로젝트입니다. ${builderSummaryKo}`
      ),
    },
    sampleA2: null,
    sampleB,
    twistSummaryKo: stripHighlightMarkers(pairing.oneLineHook),
    mvpFeatures: pairing.mvpFeatures.slice(0, 3).map((f) => stripHighlightMarkers(f)),
    scopeCutoff: pairing.scopeCutoff
      ? [stripHighlightMarkers(pairing.scopeCutoff), ...(domain.cutoffs || []).slice(0, 1)]
      : domain.cutoffs || ["초기 버전에서는 회원가입과 복잡한 결제 대시보드를 제외합니다."],
    targetKpis: domain.kpis || ["첫 방문 1분 내 핵심 기능 완료율"],
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
        title,
        treatmentId: id,
        builderId: builder.id,
        builderName: builder.name,
      },
    ],
    synthesisMode,
    parentTreatmentId: null,
    variantIndex: index,
  };
}

function buildInterleavedFallback(builders, radars, cultures, domains, targetCount = 60) {
  const config = readJson(BLUEPRINTS_PATH, { domains: [], blueprints: {} });
  const blueprintsMap = config.blueprints || {};
  const nowIso = new Date().toISOString();
  const slots = [];
  for (const domain of domains) {
    const mechMap = blueprintsMap[domain.slug] || {};
    for (const mechId of Object.keys(mechMap)) {
      for (const bp of mechMap[mechId] || []) slots.push({ domain, mechId, bp });
    }
  }

  const out = [];
  for (let i = 0; i < targetCount; i += 1) {
    const isCulture = i % 2 === 1 && cultures.length > 0;
    const slot = slots[i % slots.length];
    const builder = builders[i % builders.length];
    const radar = radars[(i * 3) % radars.length];
    const culture = cultures.length > 0 ? cultures[Math.floor(i / 2) % cultures.length] : null;
    const domain = isCulture && culture
      ? domains.find((d) => d.slug === culture.domainSlug) || slot.domain
      : slot.domain;

    const rawTitle = stripHighlightMarkers(slot.bp.title).replace(/[.!]+$/, "");
    const qTitle = isCulture && culture
      ? `${culture.sourceName} 감각의 ${rawTitle} 웹을 만들어본다면?`
      : rawTitle.endsWith("?")
        ? rawTitle
        : `${rawTitle} 웹을 만들어본다면?`;

    const story = isCulture && culture
      ? `${builder.name}(${formatShortMetric(builder)})이 입증한 기술 구조에 ${culture.sourceName}에서 다룬 '${culture.titleKo}' 글로벌 컬처 흐름을 이종교배했습니다. ${culture.phenomenonKo} 이 문화적 취향과 디깅 욕구를 별도 로그인 없는 웹 경험으로 압축해, 방문자가 첫 화면에서 즉시 자신만의 아카이브나 창작 결과물을 얻도록 설계했습니다. 첫 버전은 핵심 인터랙션 3가지만 빠르게 검증해 1주일 안에 출시합니다.`
      : `${builder.name}(${formatShortMetric(builder)})의 핵심 구조에 최근 AI Radar에서 화제인 '${radar.titleKo}' 흐름을 결합했습니다. 예전에는 수작업이 필요했던 구간을 최신 파이프라인으로 자동화해, 방문자가 로그인 없이 첫 화면에서 즉시 결과를 얻게 압축했습니다. 1차 버전은 핵심 워크플로 3가지만 담아 1주일 안에 배포합니다.`;

    out.push(
      hydratePairingToTreatment({
        pairing: {
          track: isCulture ? "culture" : "tech",
          title: qTitle,
          oneLineHook: slot.bp.hook,
          firstThreeSecondsUx: `회원가입 없이 첫 화면에서 바로 써볼 수 있습니다. ${slot.bp.hook}`,
          fusionStoryKo: story,
          highlightPhrases: [],
          builderSummaryKo: builder.taglineKo || builder.summaryKo,
          radarSummaryKo: isCulture && culture ? culture.phenomenonKo : radar.whatKo || radar.highlightSummary,
          techDigestKo: builder.techDigestKo,
          mvpFeatures: slot.bp.features,
          scopeCutoff: domain.cutoffs?.[0] || "초기 버전에서는 회원가입과 복잡한 관리자 기능을 제외합니다.",
          buildCadence: CADENCES[i % CADENCES.length],
        },
        builder,
        radar,
        culture,
        domain,
        index: i,
        synthesisMode: "deterministic",
        nowIso,
      })
    );
  }
  return out;
}

async function main() {
  ensureDir(PUBLIC_DATA);
  ensureDir(SRC_DATA);

  const guard = new FetchGuard(GUARD_META_PATH);
  const mediaCache = readJson(MEDIA_CACHE_PATH, {});
  const translationCache = readJson(TRANSLATION_CACHE_PATH, {});

  const prevRadar = readJson(path.join(PUBLIC_DATA, "ai-radar-signals.json"), { items: [] }).items || [];
  const prevBuilders = readJson(path.join(PUBLIC_DATA, "builder-signals.json"), { items: [] }).items || [];
  const prevCultures = readJson(path.join(PUBLIC_DATA, "culture-signals.json"), { items: [] }).items || [];
  const prevBySource = (src) => prevBuilders.filter((b) => b.source === src);

  console.log("[DISPENSER sync] 1/8 Fetching AI Radar planning-feed + live-feed (with thumbnails)...");
  const radarResult = await syncAiRadar(guard, prevRadar, mediaCache);

  console.log("[DISPENSER sync] 2/8 Fetching Global High-Taste Culture RSS/Atom feeds (23 outlets, parallel)...");
  const cultureResult = await syncCultureFeeds(guard, prevCultures, mediaCache);

  console.log("[DISPENSER sync] 3/8 Fetching GitHub recent trending open-source repos + README media...");
  const githubResult = await syncGithubTrending(guard, prevBySource("github_trending"), mediaCache);

  console.log("[DISPENSER sync] 4/8 Fetching Reddit r/SideProject + r/LocalLLaMA...");
  const redditResult = await syncReddit(guard, prevBySource("reddit"), mediaCache);

  console.log("[DISPENSER sync] 5/8 Fetching Show HN Algolia API...");
  const showHnResult = await syncShowHn(guard, prevBySource("show_hn"));

  console.log("[DISPENSER sync] 6/8 Fetching Product Hunt Atom feed...");
  const phResult = await syncProductHunt(guard, prevBySource("product_hunt"));

  console.log("[DISPENSER sync] 7/8 Fetching TrustMRR SSR HTML...");
  const trustResult = await syncTrustMrr(guard, prevBySource("trustmrr"));

  console.log("[DISPENSER sync] 8/8 Fetching Uneed SSR HTML...");
  const uneedResult = await syncUneed(guard, prevBySource("uneed"));

  // Preserve previously verified builder media URLs if URL matches
  const prevMediaByUrl = new Map();
  for (const pb of prevBuilders) {
    if (pb.demoVideoUrl || pb.previewImageUrl) {
      prevMediaByUrl.set(pb.url.toLowerCase().replace(/\/+$/, ""), {
        demoVideoUrl: pb.demoVideoUrl || null,
        previewImageUrl: pb.previewImageUrl || null,
        mediaSourceLabel: pb.mediaSourceLabel || null,
      });
    }
  }

  const mergedMap = new Map();
  for (const list of [
    githubResult.items,
    trustResult.items,
    redditResult.items,
    showHnResult.items,
    phResult.items,
    uneedResult.items,
    prevBuilders,
  ]) {
    for (const item of list) {
      const key = item.url.toLowerCase().replace(/\/+$/, "");
      if (!mergedMap.has(key)) {
        const prevM = prevMediaByUrl.get(key);
        if (prevM && !item.demoVideoUrl && !item.previewImageUrl) {
          item.demoVideoUrl = prevM.demoVideoUrl;
          item.previewImageUrl = prevM.previewImageUrl;
          item.mediaSourceLabel = prevM.mediaSourceLabel;
        }
        mergedMap.set(key, item);
      }
      if (mergedMap.size >= 240) break;
    }
    if (mergedMap.size >= 240) break;
  }
  const builders = Array.from(mergedMap.values());
  const cultures = cultureResult.items;

  console.log("[DISPENSER sync] Enriching OpenGraph / README demo media for top builders...");
  const ogMediaFound = await enrichBuilderOpenGraphMedia(builders, guard, mediaCache);

  console.log(`[DISPENSER sync] Translating ${builders.length} builders + ${cultures.length} global culture signals (cached)...`);
  await translateBatchToKo(
    [
      ...builders.map((b) => b.taglineEn),
      ...cultures.map((c) => c.titleEn),
      ...cultures.map((c) => c.excerptEn),
    ],
    translationCache,
    guard
  );

  for (const b of builders) {
    const ko = getTranslated(b.taglineEn, translationCache);
    b.taglineKo = ko;
    b.summaryKo = b.source === "trustmrr" ? `${b.name}: ${ko} (${b.tractionLabel})` : `${b.name}: ${ko}`;
    const mechId = classifyMechanism(
      `${b.name} ${b.taglineEn || ""} ${b.taglineKo || ""} ${(b.tags || []).join(" ")}`,
      b.source,
      b.tractionType
    );
    b.mechanism = mechId;
    b.mechanismLabel = MECHANISM_BY_ID[mechId]?.label || b.mechanismLabel;
    b.techDigestKo = buildTechDigestForBuilder(b);
  }

  for (const c of cultures) {
    c.titleKo = getTranslated(c.titleEn, translationCache);
    const exKo = getTranslated(c.excerptEn, translationCache);
    c.phenomenonKo = stripHighlightMarkers(exKo || c.titleKo).slice(0, 220);
  }

  const domains = readJson(BLUEPRINTS_PATH, { domains: [] }).domains || [];
  const domainBySlug = Object.fromEntries(domains.map((d) => [d.slug, d]));
  const builderById = new Map(builders.map((b) => [b.id, b]));
  const radarById = new Map(radarResult.items.map((r) => [r.id, r]));
  const cultureById = new Map(cultures.map((c) => [c.id, c]));
  const nowIso = new Date().toISOString();

  let treatments = [];

  // Mode 1: Gemini 2.5 Flash 50:50 Dual-Track Smart Pairer when GEMINI_API_KEY is set
  const geminiPairings = await pairSignalsWithGemini({
    builders,
    radars: radarResult.items,
    cultures,
    targetTotal: 60,
  });

  if (geminiPairings && geminiPairings.length >= 16) {
    console.log(`[DISPENSER sync] Gemini Flash generated ${geminiPairings.length} dual-track pairings!`);
    treatments = geminiPairings.map((p, idx) =>
      hydratePairingToTreatment({
        pairing: p,
        builder: builderById.get(p.builderId) || builders[idx % builders.length],
        radar: radarById.get(p.radarId) || radarResult.items[idx % radarResult.items.length],
        culture: p.cultureId
          ? cultureById.get(p.cultureId) || cultures[idx % Math.max(1, cultures.length)]
          : cultures[idx % Math.max(1, cultures.length)],
        domain: domainBySlug[p.domainSlug] || domains[idx % domains.length],
        index: idx,
        synthesisMode: "llm-gemini",
        nowIso,
      })
    );
  }

  // Mode 2: Curated 60 seeds (30 Tech + 30 Culture interleaved 1:1)
  if (treatments.length < 60 && fs.existsSync(CURATED_SEEDS_PATH)) {
    const curatedData = readJson(CURATED_SEEDS_PATH, { items: [] });
    const curatedItems = Array.isArray(curatedData.items) ? curatedData.items : [];
    const seenTitles = new Set(treatments.map((t) => t.title));
    console.log(`[DISPENSER sync] Hydrating ${curatedItems.length} curated seeds with live signals & media...`);

    for (let i = 0; i < curatedItems.length && treatments.length < 60; i += 1) {
      const c = curatedItems[i];
      if (!c?.title || seenTitles.has(c.title)) continue;
      const track = c.track === "culture" ? "culture" : "tech";
      const builder =
        builderById.get(c.builderId) ||
        builders.find((b) => b.name.toLowerCase() === String(c.builderName || "").toLowerCase()) ||
        builders[i % builders.length];
      const radar =
        radarById.get(c.radarId) ||
        radarResult.items[i % radarResult.items.length];
      const culture =
        (c.cultureId ? cultureById.get(c.cultureId) : null) ||
        (c.cultureSourceId ? cultures.find((cs) => cs.sourceId === c.cultureSourceId) : null) ||
        cultures[i % Math.max(1, cultures.length)] ||
        null;
      const domain = domainBySlug[c.domainSlug] || domains[i % domains.length];

      seenTitles.add(c.title);
      treatments.push(
        hydratePairingToTreatment({
          pairing: { ...c, track },
          builder,
          radar,
          culture,
          domain,
          index: treatments.length,
          synthesisMode: "curated",
          nowIso,
        })
      );
    }
  }

  // Mode 3: Interleaved 50:50 deterministic fill if needed
  if (treatments.length < 60) {
    const fallback = buildInterleavedFallback(builders, radarResult.items, cultures, domains, 60);
    const seenTitles = new Set(treatments.map((t) => t.title));
    for (const item of fallback) {
      if (treatments.length >= 60) break;
      if (seenTitles.has(item.title)) continue;
      seenTitles.add(item.title);
      treatments.push(item);
    }
  }

  const bySource = {};
  for (const b of builders) bySource[b.source] = (bySource[b.source] || 0) + 1;
  const cultureBySource = {};
  const cultureDomainSet = new Set();
  for (const c of cultures) {
    cultureBySource[c.sourceName] = (cultureBySource[c.sourceName] || 0) + 1;
    if (c.sourceDomain) cultureDomainSet.add(c.sourceDomain);
  }
  const verifiedMediaCount = builders.filter((b) => b.demoVideoUrl || b.previewImageUrl).length;
  const verifiedCultureMediaCount = cultures.filter((c) => c.previewImageUrl).length;
  const techSeedCount = treatments.filter((t) => t.track === "tech").length;
  const cultureSeedCount = treatments.filter((t) => t.track === "culture").length;

  const syncedAt = nowIso;
  const syncMeta = {
    syncedAt,
    counts: {
      aiRadar: radarResult.items.length,
      cultureTotal: cultures.length,
      cultureDomains: cultureDomainSet.size,
      builderTotal: builders.length,
      bySource,
      cultureBySource,
      verifiedRevenueCount: builders.filter((b) => b.verifiedRevenue).length,
      verifiedMediaCount,
      verifiedCultureMediaCount,
      treatmentsSeed: treatments.length,
      treatmentsByTrack: {
        tech: techSeedCount,
        culture: cultureSeedCount,
      },
    },
    sources: [
      { id: "ai_radar", label: "AI Radar (GitHub Raw)", status: radarResult.status, count: radarResult.items.length, cached304: Boolean(radarResult.cached304), note: radarResult.note },
      { id: "github_trending", label: "GitHub Trending Open Source", status: githubResult.status, count: bySource.github_trending || 0, cached304: Boolean(githubResult.cached304), note: githubResult.note },
      { id: "reddit", label: "Reddit (SideProject · LocalLLaMA)", status: redditResult.status, count: bySource.reddit || 0, cached304: Boolean(redditResult.cached304), note: redditResult.note },
      { id: "show_hn", label: "Show HN Algolia API", status: showHnResult.status, count: bySource.show_hn || 0, cached304: Boolean(showHnResult.cached304), note: showHnResult.note },
      { id: "product_hunt", label: "Product Hunt Atom Feed", status: phResult.status, count: bySource.product_hunt || 0, cached304: Boolean(phResult.cached304), note: phResult.note },
      { id: "trustmrr", label: "TrustMRR SSR", status: trustResult.status, count: bySource.trustmrr || 0, cached304: Boolean(trustResult.cached304), note: trustResult.note },
      { id: "uneed", label: "Uneed SSR", status: uneedResult.status, count: bySource.uneed || 0, cached304: Boolean(uneedResult.cached304), note: uneedResult.note },
      { id: "culture_global", label: `Global Culture RSS (${cultureDomainSet.size} domains)`, status: 200, count: cultures.length, note: `${verifiedCultureMediaCount} verified editorial images` },
      { id: "media_verifier", label: "Demo Video & OG Media Verifier", status: 200, count: verifiedMediaCount, note: `${ogMediaFound} newly enriched via OG/README` },
      ...cultureResult.reports,
    ],
  };

  writeJson(TRANSLATION_CACHE_PATH, translationCache);
  writeJson(MEDIA_CACHE_PATH, mediaCache);
  writeJson(path.join(PUBLIC_DATA, "ai-radar-signals.json"), { version: 2, syncedAt, count: radarResult.items.length, items: radarResult.items });
  writeJson(path.join(PUBLIC_DATA, "culture-signals.json"), { version: 1, syncedAt, count: cultures.length, domains: cultureDomainSet.size, items: cultures });
  writeJson(path.join(PUBLIC_DATA, "builder-signals.json"), { version: 2, syncedAt, count: builders.length, items: builders });
  writeJson(path.join(PUBLIC_DATA, "treatments-seed.json"), { version: 3, syncedAt, count: treatments.length, items: treatments });
  writeJson(path.join(PUBLIC_DATA, "sync-meta.json"), syncMeta);
  guard.save();

  console.log("[DISPENSER sync] Done:", JSON.stringify({
    aiRadar: syncMeta.counts.aiRadar,
    cultureTotal: syncMeta.counts.cultureTotal,
    cultureDomains: syncMeta.counts.cultureDomains,
    builderTotal: syncMeta.counts.builderTotal,
    verifiedMediaCount: syncMeta.counts.verifiedMediaCount,
    verifiedCultureMediaCount: syncMeta.counts.verifiedCultureMediaCount,
    treatmentsSeed: syncMeta.counts.treatmentsSeed,
    treatmentsByTrack: syncMeta.counts.treatmentsByTrack,
  }));
  if (builders.length < 45) process.exit(1);
  if (radarResult.items.length < 80) process.exit(1);
}

main().catch((err) => {
  console.error("[DISPENSER sync] Fatal error:", err);
  process.exit(1);
});
