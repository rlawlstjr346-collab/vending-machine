import blueprintsJson from "@/data/concept-blueprints.json";
import type { DomainSlug, MechanismId } from "./types";

export interface DomainProfile {
  slug: DomainSlug;
  label: string;
  shortLabel: string;
  color: string;
  softBg: string;
  tagline: string;
  description: string;
  affinityCategories: string[];
  affinityDomains: string[];
  cutoffs: string[];
  kpis: string[];
}

export interface ConceptBlueprint {
  title: string;
  hook: string;
  features: [string, string, string];
}

export interface MechanismProfile {
  id: MechanismId;
  label: string;
  shortLabel: string;
  simpleActionKo: string;
  keywords: string[];
}

export const DOMAIN_LIST: DomainProfile[] = blueprintsJson.domains as DomainProfile[];

export const DOMAIN_MAP: Record<DomainSlug, DomainProfile> = Object.fromEntries(
  DOMAIN_LIST.map((d) => [d.slug, d])
) as Record<DomainSlug, DomainProfile>;

export const CONCEPT_BLUEPRINTS = blueprintsJson.blueprints as Record<
  DomainSlug,
  Record<MechanismId, ConceptBlueprint[]>
>;

export const MECHANISM_LIST: MechanismProfile[] = [
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

export const MECHANISM_MAP: Record<MechanismId, MechanismProfile> = Object.fromEntries(
  MECHANISM_LIST.map((m) => [m.id, m])
) as Record<MechanismId, MechanismProfile>;

export function isValidDomainSlug(slug: string): slug is DomainSlug {
  return slug in DOMAIN_MAP;
}
