import { isValidHttpUrl, sanitizeEditorialText, slugifyAscii } from "./text-clean";
import type { AiRadarSignal, AiRadarUtilityTip } from "./types";

export const AI_RADAR_MAX_SIGNALS = 220;

const PRIORITY_CHINESE_PLATFORMS = new Set([
  "v2ex",
  "v2ex-ai",
  "v2ex-cn",
  "v2ex-create",
  "juejin",
  "juejin-ai",
  "juejin-cn",
  "qbitai",
  "qbit-ai",
  "liangziwei",
  "jiqizhixin",
  "synced",
  "synced-ai",
  "synced-review",
  "syncedreview",
  "36kr-ai",
  "36kr",
  "36kr-cn",
  "36kr-news",
  "36krai",
]);

/**
 * Known global & Chinese platform Korean/editorial badge labels.
 * Unknown future platform_id values are NOT filtered out; they are
 * automatically formatted via formatRadarPlatformLabel().
 */
const PLATFORM_LABEL_MAP: Record<string, string> = {
  // AI Radar 5 Core Chinese Sources (exact platform_ids + variant keys)
  v2ex: "V2EX · 인디빌더",
  "v2ex-ai": "V2EX · 인디빌더",
  "v2ex-cn": "V2EX · 인디빌더",
  "v2ex-create": "V2EX · 인디빌더",
  juejin: "Juejin · 굴진",
  "juejin-ai": "Juejin · 굴진",
  "juejin-cn": "Juejin · 굴진",
  qbitai: "QbitAI · 양자위",
  "qbit-ai": "QbitAI · 양자위",
  liangziwei: "QbitAI · 양자위",
  jiqizhixin: "Synced · 기기지심",
  synced: "Synced · 기기지심",
  "synced-ai": "Synced · 기기지심",
  "synced-review": "Synced · 기기지심",
  syncedreview: "Synced · 기기지심",
  "36kr-ai": "36Kr AI",
  "36kr": "36Kr AI",
  "36kr-cn": "36Kr AI",
  "36kr-news": "36Kr AI",
  "36krai": "36Kr AI",

  // Other Chinese AI / Tech / Social Platforms
  weibo: "웨이보 (Weibo)",
  xiaohongshu: "샤오홍슈 (小红书)",
  xhs: "샤오홍슈 (小红书)",
  rednote: "샤오홍슈 (小红书)",
  bilibili: "비리비리 (Bilibili)",
  bili: "비리비리 (Bilibili)",
  zhihu: "즈후 (知乎)",
  ithome: "ITHome (IT之家)",
  modelscope: "모델스코프 (ModelScope)",
  gitee: "Gitee",
  wechat: "위챗 (WeChat)",
  weixin: "위챗 (WeChat)",
  douyin: "도우인 (Douyin)",
  baidu: "바이두 (Baidu)",
  csdn: "CSDN",
  oschina: "OSChina",
  sspai: "소수파 (少数派)",
  huxiu: "후슈 (虎嗅)",
  geekpark: "지커공원 (极客公园)",

  // Global / KR / JP AI / Tech / Research / Community Platforms
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
  "microsoft-research": "Microsoft Research",
  "the-verge-ai": "The Verge AI",
  "the-verge": "The Verge",
  techcrunch: "TechCrunch",
  "techcrunch-ai": "TechCrunch AI",
  "mit-tech-review": "MIT Tech Review",
  "mit-tr-korea": "MIT TR Korea",
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
  geeknews: "GeekNews",
  aitimes: "AI타임스",
  "pytorch-kr": "PyTorch KR",
  "ai-korea-community": "AI Korea",
  gpters: "GPTers",
  "itmedia-aiplus": "ITmedia AI+",
  "hatena-bookmark": "Hatena Bookmark",
  qiita: "Qiita",
  zenn: "Zenn",
  "latent-space": "Latent Space",
  "one-useful-thing": "One Useful Thing",
  interconnects: "Interconnects",
  "ahead-of-ai": "Ahead of AI",
  "import-ai": "Import AI",
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

function signalTimestampMs(sig: AiRadarSignal): number {
  const pub = Date.parse(sig.publishedAt || "");
  if (Number.isFinite(pub)) return pub;
  const fetched = Date.parse(sig.fetchedAt || "");
  return Number.isFinite(fetched) ? fetched : 0;
}

function compareRadarFreshness(a: AiRadarSignal, b: AiRadarSignal): number {
  const dt = signalTimestampMs(b) - signalTimestampMs(a);
  if (dt !== 0) return dt;
  return (b.importanceScore || 0) - (a.importanceScore || 0);
}

/**
 * Deduplicates by id & canonicalUrl and selects up to `maxCount` (default 220)
 * signals while enforcing a per-platform minimum quota so active platforms —
 * especially the 5 Chinese AI/builder sources (V2EX, Juejin, QbitAI, Synced,
 * 36Kr AI) — are never crowded out by high-volume feeds.
 */
export function selectBalancedRadarSignals(
  signals: AiRadarSignal[],
  maxCount = AI_RADAR_MAX_SIGNALS
): AiRadarSignal[] {
  const deduped: AiRadarSignal[] = [];
  const seenIds = new Set<string>();
  const seenUrls = new Set<string>();

  for (const raw of signals) {
    if (!raw || !isValidHttpUrl(raw.canonicalUrl)) continue;
    const normUrl = raw.canonicalUrl.toLowerCase().replace(/\/+$/, "");
    if (seenIds.has(raw.id) || seenUrls.has(normUrl)) continue;
    seenIds.add(raw.id);
    seenUrls.add(normUrl);
    deduped.push({
      ...raw,
      platformLabel: formatRadarPlatformLabel(raw.platformId, raw.canonicalUrl),
    });
  }

  if (deduped.length <= maxCount) {
    return deduped;
  }

  const buckets = new Map<string, AiRadarSignal[]>();
  for (const sig of deduped) {
    const pid = (sig.platformId || "ai-radar").toLowerCase().trim() || "ai-radar";
    const list = buckets.get(pid);
    if (list) list.push(sig);
    else buckets.set(pid, [sig]);
  }

  for (const list of buckets.values()) {
    list.sort(compareRadarFreshness);
  }

  const platformKeys = Array.from(buckets.keys()).sort((a, b) => {
    const aCn = PRIORITY_CHINESE_PLATFORMS.has(a) ? 1 : 0;
    const bCn = PRIORITY_CHINESE_PLATFORMS.has(b) ? 1 : 0;
    if (aCn !== bCn) return bCn - aCn;
    const aTop = buckets.get(a)?.[0];
    const bTop = buckets.get(b)?.[0];
    if (aTop && bTop) return compareRadarFreshness(aTop, bTop);
    return a.localeCompare(b);
  });

  const baseMinQuota = Math.max(2, Math.min(6, Math.floor(maxCount / Math.max(platformKeys.length, 1))));
  const quotaFor = (pid: string) =>
    PRIORITY_CHINESE_PLATFORMS.has(pid) ? Math.max(baseMinQuota, 8) : baseMinQuota;
  const maxQuota = Math.max(baseMinQuota, 8);

  const selected: AiRadarSignal[] = [];
  const selectedIds = new Set<string>();

  // Pass 1: Round-robin minimum quota per active platform_id
  for (let round = 0; round < maxQuota && selected.length < maxCount; round += 1) {
    for (const pid of platformKeys) {
      if (selected.length >= maxCount) break;
      if (round >= quotaFor(pid)) continue;
      const candidate = buckets.get(pid)?.[round];
      if (!candidate || selectedIds.has(candidate.id)) continue;
      selected.push(candidate);
      selectedIds.add(candidate.id);
    }
  }

  // Pass 2: Fill remaining capacity up to maxCount by recency & importance
  if (selected.length < maxCount) {
    const remainder = deduped
      .filter((s) => !selectedIds.has(s.id))
      .sort(compareRadarFreshness);
    for (const sig of remainder) {
      if (selected.length >= maxCount) break;
      selected.push(sig);
      selectedIds.add(sig.id);
    }
  }

  return selected.sort(compareRadarFreshness);
}

/**
 * Merges fresh primary signals with preserved secondary snapshots (deduped by id & URL)
 * and enforces the balanced 220-signal quota cap.
 */
export function mergeAndBalanceRadarSignals(
  primary: AiRadarSignal[],
  secondary: AiRadarSignal[] = [],
  maxCount = AI_RADAR_MAX_SIGNALS
): AiRadarSignal[] {
  return selectBalancedRadarSignals([...primary, ...secondary], maxCount);
}

/**
 * Merges planning-feed.json + live-feed.json + existing local snapshots without any
 * hardcoded platform or category restrictions, so future Chinese/global AI Radar sources
 * are absorbed automatically with zero code edits.
 */
export function normalizeAiRadarFeed(
  planningPayload: unknown,
  livePayload?: unknown,
  existingSignals: AiRadarSignal[] = [],
  maxCount = AI_RADAR_MAX_SIGNALS
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
    return selectBalancedRadarSignals(existingSignals, maxCount);
  }

  return selectBalancedRadarSignals(out, maxCount);
}
