import { isValidHttpUrl, sanitizeEditorialText, slugifyAscii } from "./text-clean";
import type { AiRadarSignal, AiRadarUtilityTip } from "./types";

/**
 * Known global & Chinese platform Korean/editorial badge labels.
 * Unknown future platform_id values are NOT filtered out; they are
 * automatically formatted via formatRadarPlatformLabel().
 */
const PLATFORM_LABEL_MAP: Record<string, string> = {
  // Chinese AI / Tech / Social Platforms
  weibo: "웨이보 (Weibo)",
  xiaohongshu: "샤오홍슈 (小红书)",
  xhs: "샤오홍슈 (小红书)",
  rednote: "샤오홍슈 (小红书)",
  bilibili: "비리비리 (Bilibili)",
  bili: "비리비리 (Bilibili)",
  "36kr": "36Kr (36氪)",
  zhihu: "즈후 (知乎)",
  ithome: "ITHome (IT之家)",
  qbitai: "량쯔웨이 (量子位)",
  jiqizhixin: "지치즈신 (机器之心)",
  synced: "지치즈신 (机器之心)",
  modelscope: "모델스코프 (ModelScope)",
  gitee: "Gitee",
  wechat: "위챗 (WeChat)",
  weixin: "위챗 (WeChat)",
  douyin: "도우인 (Douyin)",
  baidu: "바이두 (Baidu)",
  csdn: "CSDN",
  juejin: "줴진 (掘金)",
  oschina: "OSChina",
  v2ex: "V2EX",
  sspai: "소수파 (少数派)",
  huxiu: "후슈 (虎嗅)",
  geekpark: "지커공원 (极客公园)",

  // Global AI / Tech / Research / Community Platforms
  x: "X",
  twitter: "X",
  github: "GitHub",
  "github-trending": "GitHub",
  huggingface: "Hugging Face",
  hf: "Hugging Face",
  arxiv: "arXiv",
  hn: "Hacker News",
  hackernews: "Hacker News",
  "hacker-news": "Hacker News",
  reddit: "Reddit",
  openai: "OpenAI",
  anthropic: "Anthropic",
  google: "Google AI",
  deepmind: "Google DeepMind",
  "google-deepmind": "Google DeepMind",
  meta: "Meta AI",
  nvidia: "NVIDIA",
  microsoft: "Microsoft AI",
  "the-verge-ai": "The Verge AI",
  "the-verge": "The Verge",
  techcrunch: "TechCrunch",
  "mit-tech-review": "MIT Tech Review",
  venturebeat: "VentureBeat",
  wired: "WIRED",
  "ars-technica": "Ars Technica",
  "the-information": "The Information",
  "simon-willison": "Simon Willison",
  producthunt: "Product Hunt",
  "product-hunt": "Product Hunt",
  youtube: "YouTube",
  threads: "Threads",
  bluesky: "Bluesky",
};

function quickHash(input: string): string {
  let h = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h >>> 0).toString(36);
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function pickString(
  sources: Array<Record<string, unknown> | null | undefined>,
  keys: string[]
): string {
  for (const src of sources) {
    if (!src) continue;
    for (const key of keys) {
      const val = src[key];
      if (typeof val === "string" && val.trim().length > 0) {
        return val.trim();
      }
    }
  }
  return "";
}

function pickNumber(
  sources: Array<Record<string, unknown> | null | undefined>,
  keys: string[],
  fallback: number
): number {
  for (const src of sources) {
    if (!src) continue;
    for (const key of keys) {
      const val = src[key];
      if (typeof val === "number" && Number.isFinite(val)) return val;
      if (typeof val === "string" && val.trim() !== "") {
        const parsed = Number(val);
        if (Number.isFinite(parsed)) return parsed;
      }
    }
  }
  return fallback;
}

function extractDomainLabel(url?: string | null): string {
  if (!url) return "AI Radar";
  try {
    const host = new URL(url).hostname.replace(/^www\./i, "");
    const core = host.split(".")[0] || host;
    if (!core) return "AI Radar";
    return core.charAt(0).toUpperCase() + core.slice(1);
  } catch {
    return "AI Radar";
  }
}

/**
 * Formats any known (Chinese/global) or unknown future platform_id into a crisp display badge label.
 */
export function formatRadarPlatformLabel(
  platformId?: string | null,
  canonicalUrl?: string | null
): string {
  const raw = sanitizeEditorialText(String(platformId || "")).trim();
  if (!raw || raw.toLowerCase() === "ai-radar" || raw.toLowerCase() === "unknown") {
    return extractDomainLabel(canonicalUrl);
  }

  const lower = raw.toLowerCase();
  const hyphenNorm = lower.replace(/[_\s]+/g, "-");
  const compactNorm = lower.replace(/[-_\s]+/g, "");

  if (PLATFORM_LABEL_MAP[lower]) return PLATFORM_LABEL_MAP[lower];
  if (PLATFORM_LABEL_MAP[hyphenNorm]) return PLATFORM_LABEL_MAP[hyphenNorm];
  if (PLATFORM_LABEL_MAP[compactNorm]) return PLATFORM_LABEL_MAP[compactNorm];

  // Auto-humanize any future platform_id (e.g., "unknown_future_source" -> "Unknown Future Source")
  if (/^[a-z0-9_-]+$/.test(raw)) {
    return raw
      .split(/[-_]+/)
      .filter(Boolean)
      .map((part) => (part.length <= 2 ? part.toUpperCase() : part[0].toUpperCase() + part.slice(1)))
      .join(" ");
  }

  return raw;
}

/**
 * Schema-flexible normalizer for a single AI Radar item from planning-feed.json,
 * live-feed.json, or any future schema revision (including Chinese platforms & new fields).
 * Never applies a platform_id or category whitelist.
 */
export function normalizeAiRadarSignal(
  rawInput: unknown,
  liveExtraInput?: unknown,
  existing?: AiRadarSignal | null
): AiRadarSignal | null {
  const raw = asRecord(rawInput);
  const live = asRecord(liveExtraInput);
  if (!raw && !live) return null;

  const sources = [raw, live];

  const canonicalUrl =
    pickString(sources, ["canonical_url", "canonicalUrl", "url", "link", "source_url"]) ||
    existing?.canonicalUrl ||
    "";
  if (!isValidHttpUrl(canonicalUrl)) return null;

  const titleKoRaw =
    pickString(sources, ["title_ko", "titleKo", "title", "headline", "original_title", "originalTitle"]) ||
    existing?.titleKo ||
    "";
  const originalTitleRaw =
    pickString(sources, ["original_title", "originalTitle", "title", "title_ko", "titleKo"]) ||
    titleKoRaw ||
    existing?.originalTitle ||
    "";

  const titleKo = sanitizeEditorialText(titleKoRaw);
  const originalTitle = sanitizeEditorialText(originalTitleRaw || titleKo);
  if (titleKo.length < 2) return null;

  const rawId = pickString(sources, ["id", "signal_id", "guid", "slug"]);
  const id =
    rawId ||
    existing?.id ||
    `radar-${slugifyAscii(originalTitle || titleKo).slice(0, 14) || "sig"}-${quickHash(canonicalUrl)}`;

  const platformId =
    pickString(sources, ["platform_id", "platformId", "source_platform", "platform", "source"]) ||
    existing?.platformId ||
    extractDomainLabel(canonicalUrl).toLowerCase();
  const platformLabel = formatRadarPlatformLabel(platformId, canonicalUrl);

  const category =
    pickString(sources, ["category", "vertical", "topic", "section"]) ||
    existing?.category ||
    "industry";

  const lifecycleStatus =
    pickString(sources, ["lifecycle_status", "lifecycleStatus", "status"]) ||
    existing?.lifecycleStatus ||
    "hot";

  const authorHandleRaw = pickString(sources, ["author_handle", "authorHandle", "author"]);
  const authorHandle = authorHandleRaw || existing?.authorHandle || null;

  const nowIso = new Date().toISOString();
  const publishedAt =
    pickString(sources, ["published_at", "publishedAt", "created_at", "date"]) ||
    existing?.publishedAt ||
    nowIso;
  const fetchedAt =
    pickString(sources, ["fetched_at", "fetchedAt", "updated_at"]) ||
    existing?.fetchedAt ||
    nowIso;

  const highlightSummary = sanitizeEditorialText(
    pickString(sources, [
      "highlight_summary",
      "highlightSummary",
      "summary_ko",
      "summaryKo",
      "summary",
      "what_ko",
      "whatKo",
      "description",
    ]) ||
      existing?.highlightSummary ||
      titleKo
  );

  const whatKo = sanitizeEditorialText(
    pickString([live, raw], ["what_ko", "whatKo", "excerpt_ko", "summary_ko", "summary", "description"]) ||
      existing?.whatKo ||
      highlightSummary
  );

  const whyKo = sanitizeEditorialText(
    pickString([live, raw], ["why_ko", "whyKo", "impact_ko", "reason_ko"]) ||
      existing?.whyKo ||
      ""
  );

  const pmRaw =
    asRecord(raw?.planning_meta) ||
    asRecord(raw?.planningMeta) ||
    asRecord(live?.planning_meta) ||
    asRecord(live?.planningMeta);

  const signalType =
    pickString([pmRaw], ["signal_type", "signalType"]) ||
    existing?.planningMeta?.signalType ||
    "new_product";
  const productDomain =
    pickString([pmRaw], ["product_domain", "productDomain"]) ||
    existing?.planningMeta?.productDomain ||
    category;
  const benchmarkPoint = sanitizeEditorialText(
    pickString([pmRaw], ["benchmark_point", "benchmarkPoint"]) ||
      existing?.planningMeta?.benchmarkPoint ||
      `${platformLabel} 최신 AI·테크 시그널`
  );
  const actionableIdea = sanitizeEditorialText(
    pickString([pmRaw], ["actionable_idea", "actionableIdea"]) ||
      existing?.planningMeta?.actionableIdea ||
      ""
  );

  const utRaw = asRecord(live?.utility_tip) || asRecord(raw?.utility_tip) || asRecord(raw?.utilityTip);
  let utilityTip: AiRadarUtilityTip | null = existing?.utilityTip || null;
  if (utRaw) {
    utilityTip = {
      whenNeeded: sanitizeEditorialText(pickString([utRaw], ["when_needed", "whenNeeded"])),
      workUtility: sanitizeEditorialText(pickString([utRaw], ["work_utility", "workUtility"])),
      practicalTip: sanitizeEditorialText(pickString([utRaw], ["practical_tip", "practicalTip"])),
    };
  }

  const rawEntities =
    (Array.isArray(raw?.entities) ? raw?.entities : null) ||
    (Array.isArray(live?.entities) ? live?.entities : null) ||
    (Array.isArray(raw?.tags) ? raw?.tags : null) ||
    (Array.isArray(live?.tags) ? live?.tags : null) ||
    [];
  const entities = Array.from(
    new Set(
      rawEntities
        .map((e) => {
          if (typeof e === "string") return sanitizeEditorialText(e);
          const rec = asRecord(e);
          return rec ? sanitizeEditorialText(pickString([rec], ["name", "label", "value"])) : "";
        })
        .filter((e) => e.length >= 2)
    )
  ).slice(0, 8);

  const rawThumb = pickString([live, raw], [
    "thumbnail_url",
    "thumbnailUrl",
    "image_url",
    "imageUrl",
    "cover_url",
    "og_image",
  ]);
  const thumbnailUrl = isValidHttpUrl(rawThumb) ? rawThumb : existing?.thumbnailUrl || null;

  const benefitTagRaw = pickString(sources, ["benefit_tag", "benefitTag", "badge"]);
  const benefitTag = benefitTagRaw ? sanitizeEditorialText(benefitTagRaw) : existing?.benefitTag || null;

  return {
    id,
    titleKo,
    originalTitle,
    platformId,
    platformLabel,
    authorHandle,
    category,
    lifecycleStatus,
    canonicalUrl,
    publishedAt,
    fetchedAt,
    importanceScore: pickNumber(sources, ["importance_score", "importanceScore", "score"], existing?.importanceScore ?? 15),
    sourceCount: pickNumber(sources, ["source_count", "sourceCount"], existing?.sourceCount ?? 1),
    benefitTag,
    highlightSummary,
    whatKo,
    whyKo,
    utilityTip,
    planningMeta: {
      signalType,
      productDomain,
      benchmarkPoint,
      actionableIdea,
    },
    entities: entities.length > 0 ? entities : existing?.entities || [platformLabel],
    thumbnailUrl,
  };
}

function extractFeedArray(payload: unknown): unknown[] {
  if (Array.isArray(payload)) return payload;
  const rec = asRecord(payload);
  if (!rec) return [];
  if (Array.isArray(rec.signals)) return rec.signals;
  if (Array.isArray(rec.items)) return rec.items;
  if (Array.isArray(rec.data)) return rec.data;
  return [];
}

/**
 * Merges planning-feed.json + live-feed.json + existing local snapshots without any
 * hardcoded platform or category restrictions, so future Chinese/global AI Radar sources
 * are absorbed automatically with zero code edits.
 */
export function normalizeAiRadarFeed(
  planningPayload: unknown,
  livePayload?: unknown,
  existingSignals: AiRadarSignal[] = []
): AiRadarSignal[] {
  const existingById = new Map(existingSignals.map((s) => [s.id, s]));
  const liveItems = extractFeedArray(livePayload);
  const liveById = new Map<string, Record<string, unknown>>();
  for (const it of liveItems) {
    const rec = asRecord(it);
    if (!rec) continue;
    const id = pickString([rec], ["id", "signal_id", "guid"]);
    if (id) liveById.set(id, rec);
  }

  const out: AiRadarSignal[] = [];
  const seenIds = new Set<string>();
  const seenUrls = new Set<string>();

  const pushNormalized = (sig: AiRadarSignal | null) => {
    if (!sig) return;
    const normUrl = sig.canonicalUrl.toLowerCase().replace(/\/+$/, "");
    if (seenIds.has(sig.id) || seenUrls.has(normUrl)) return;
    seenIds.add(sig.id);
    seenUrls.add(normUrl);
    out.push(sig);
  };

  // 1) All signals from planning-feed joined with live-feed
  for (const raw of extractFeedArray(planningPayload)) {
    const rec = asRecord(raw);
    const id = rec ? pickString([rec], ["id", "signal_id", "guid"]) : "";
    const liveExtra = id ? liveById.get(id) : undefined;
    const existing = id ? existingById.get(id) : undefined;
    pushNormalized(normalizeAiRadarSignal(raw, liveExtra, existing));
  }

  // 2) Also absorb live-feed-only signals (e.g., freshly added Chinese platforms not yet in planning-feed)
  for (const liveRaw of liveItems) {
    const rec = asRecord(liveRaw);
    const id = rec ? pickString([rec], ["id", "signal_id", "guid"]) : "";
    const existing = id ? existingById.get(id) : undefined;
    pushNormalized(normalizeAiRadarSignal(liveRaw, liveRaw, existing));
  }

  // 3) Preserve existing snapshots if remote returned partial or empty
  if (out.length === 0 && existingSignals.length > 0) {
    return existingSignals.map((s) => ({
      ...s,
      platformLabel: s.platformLabel || formatRadarPlatformLabel(s.platformId, s.canonicalUrl),
    }));
  }

  return out;
}
