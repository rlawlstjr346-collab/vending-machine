import {
  CONCEPT_BLUEPRINTS,
  DOMAIN_LIST,
  DOMAIN_MAP,
  MECHANISM_LIST,
  MECHANISM_MAP,
} from "./domains";
import { formatRadarPlatformLabel } from "./radar-adapter";
import { sanitizeEditorialText, slugifyAscii } from "./text-clean";
import type {
  AiRadarSignal,
  BuilderSignal,
  CultureSignal,
  DomainSlug,
  MechanismId,
  TechDigestKo,
  Treatment,
  TreatmentLineageNode,
  TreatmentTrack,
} from "./types";

const CADENCE_OPTIONS = [
  "3~5일 MVP",
  "5~7일 MVP",
  "1주 프로토타입",
  "주말 48시간 실험",
  "1~2주 베타 런칭",
];

function deterministicHash(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i += 1) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h >>> 0);
}

/**
 * Natural Korean particle selector (을/를, 이/가, 은/는, 과/와, 으로/로)
 * so dynamically synthesized sentences always read like native editorial copy.
 */
function hasBatchim(word: string): { batchim: boolean; rieul: boolean } {
  const cleaned = word.replace(/['"’”)\].,!?…\s]+$/g, "");
  if (!cleaned) return { batchim: false, rieul: false };
  const lastChar = cleaned[cleaned.length - 1];
  const code = lastChar.charCodeAt(0);
  if (code >= 0xac00 && code <= 0xd7a3) {
    const jong = (code - 0xac00) % 28;
    return { batchim: jong !== 0, rieul: jong === 8 };
  }
  if (/[0-9]/.test(lastChar)) {
    const b = ["0", "1", "3", "6", "7", "8"].includes(lastChar);
    return { batchim: b, rieul: lastChar === "1" || lastChar === "7" || lastChar === "8" };
  }
  if (/[A-Za-z]/.test(lastChar)) {
    const lower = lastChar.toLowerCase();
    const b = ["l", "m", "n", "r", "k", "p", "t", "b", "g"].includes(lower);
    return { batchim: b, rieul: lower === "l" || lower === "r" };
  }
  return { batchim: false, rieul: false };
}

function josa(
  word: string,
  pair: "을/를" | "이/가" | "은/는" | "과/와" | "으로/로"
): string {
  const { batchim, rieul } = hasBatchim(word);
  if (pair === "으로/로") return batchim && !rieul ? "으로" : "로";
  const [withB, withoutB] = pair.split("/");
  return batchim ? withB : withoutB;
}

export function classifyMechanism(
  text: string,
  source: string,
  tractionType: string
): MechanismId {
  const hay = text.toLowerCase();
  let best: MechanismId = tractionType === "mrr" ? "visual-price-match" : "drop-validation";
  let bestScore = -1;

  for (const mech of MECHANISM_LIST) {
    let score = 0;
    for (const kw of mech.keywords) {
      if (hay.includes(kw)) {
        score += kw.length >= 6 ? 3 : 2;
        if (mech.id === "audio-stem") score += 2;
      }
    }
    if (source === "trustmrr" && mech.id === "visual-price-match") score += 2;
    if (source === "uneed" && mech.id === "drop-validation") score += 1;
    if (source === "product_hunt" && mech.id === "canvas-compare") score += 1;
    if (score > bestScore) {
      bestScore = score;
      best = mech.id;
    }
  }
  return best;
}

export function inferDomainSlugForPair(
  builder: BuilderSignal,
  radar: AiRadarSignal
): DomainSlug {
  const hay = `${builder.name} ${builder.taglineEn} ${builder.tags.join(" ")} ${radar.titleKo} ${radar.originalTitle} ${radar.category} ${radar.planningMeta.productDomain}`.toLowerCase();

  if (/(music|audio|voice|sound|speech|tts|stt|podcast|synth|midi|음악|음성|사운드|오디오)/.test(hay)) {
    return "music-audio";
  }
  if (/(video|film|cinema|movie|clip|subtitle|edit|avatar|영상|영화|시네마|비디오|편집)/.test(hay)) {
    return "cinema-video";
  }
  if (/(image|photo|svg|canvas|3d|shader|design|figma|visual|diagram|사진|이미지|그래픽|디자인|시각)/.test(hay)) {
    return "photo-visual";
  }
  if (/(shop|commerce|price|brand|fashion|retail|mrr|saas|deal|커머스|쇼핑|브랜드|가격|결제)/.test(hay)) {
    return "brand-commerce";
  }
  if (/(map|geo|travel|archive|book|museum|local|history|지식|아카이브|지도|독서|기록|문서)/.test(hay)) {
    return "local-archive";
  }
  return "creator-tool";
}

export function formatShortMetric(builder: BuilderSignal): string {
  if (builder.source === "github_trending") {
    const m = builder.tractionLabel.match(/★\s*[\d,.]+[kKmM]?/);
    return m ? `GitHub ${m[0]}` : "GitHub 급상승";
  }
  if (builder.source === "reddit") {
    return builder.tractionLabel || "Reddit 화제";
  }
  if (builder.source === "trustmrr") {
    const m = builder.tractionLabel.match(/\$[\d.,]+[kKmM]?(?:\/mo)?/);
    return m ? `TrustMRR ${m[0]}` : "TrustMRR 검증 매출";
  }
  if (builder.source === "show_hn") {
    const pts = builder.tractionLabel.match(/HN\s+(\d+)\s+pts/i);
    if (pts && Number(pts[1]) >= 100) return `Show HN ${pts[1]}점 인기`;
    return pts ? `Show HN ${pts[1]}점` : "Show HN 인기";
  }
  if (builder.source === "product_hunt") {
    return "Product Hunt 신상";
  }
  if (builder.source === "uneed") {
    return "Uneed 오늘의 런칭";
  }
  return builder.tractionLabel;
}

export function ensureQuestionHeadline(rawTitle: string, variantSeed = 0): string {
  const cleaned = sanitizeEditorialText(rawTitle).replace(/[.!]+$/, "").trim();
  if (!cleaned) return "지금 뜨는 오픈소스로 1인 웹 서비스를 만들어본다면?";
  if (cleaned.endsWith("?")) return cleaned;

  const endings = [
    " 웹을 만들어본다면?",
    " 서비스를 만들어본다면?",
    " 도구를 1주일 안에 띄워본다면?",
  ];
  const stripped = cleaned.replace(/\s*(웹|서비스|도구|보드|지도|아카이브)$/, "");
  if (stripped.length >= 12) {
    return `${cleaned}${josa(cleaned, "을/를")} 바로 써보는 서비스를 만들어본다면?`;
  }
  return `${cleaned}${endings[Math.abs(variantSeed) % endings.length]}`;
}

export function buildTechDigestKo(
  builder: BuilderSignal,
  mechanism: MechanismId
): TechDigestKo {
  if (
    builder.techDigestKo &&
    builder.techDigestKo.inputKo &&
    builder.techDigestKo.coreEngineKo &&
    builder.techDigestKo.outputKo
  ) {
    return builder.techDigestKo;
  }

  const mech = MECHANISM_MAP[mechanism];
  const cleanKo = sanitizeEditorialText(builder.taglineKo || builder.summaryKo || builder.name);

  const map: Record<MechanismId, Omit<TechDigestKo, "summaryKo">> = {
    "visual-price-match": {
      inputKo: "사용자가 올린 사진, 상품 링크, 또는 비교하려는 대상 URL",
      coreEngineKo: `${builder.name}의 시각·스펙 대조 파이프라인으로 핵심 속성과 가격 범위를 구조화해 유사 후보를 매칭`,
      outputKo: "대체 후보와 가격·스펙 차이를 한눈에 비교하는 인터랙티브 결과 카드",
    },
    "timestamp-archive": {
      inputKo: "긴 유튜브·강의 영상 링크, 문서 파일, 또는 산발적인 기록",
      coreEngineKo: `${builder.name} 방식의 구간 분할·핵심 추출 엔진으로 꼭 필요한 지점만 초 단위로 인덱싱`,
      outputKo: "원하는 장면과 문장으로 즉시 점프해 재활용하는 구조화 아카이브 보드",
    },
    "geo-curation": {
      inputKo: "흩어진 장소·전시·이벤트 링크, 지역 정보, 또는 취향 키워드",
      coreEngineKo: `${builder.name}의 위치·일정 태깅 구조로 조건별 필터링과 동선 우선순위를 자동 정렬`,
      outputKo: "방문 순서와 마감 일정을 한 화면에 묶어 바로 실행할 수 있는 큐레이션 지도",
    },
    "canvas-compare": {
      inputKo: "여러 장의 시안 이미지, 웹 화면 캡처, 또는 기획 초안",
      coreEngineKo: `${builder.name} 스타일의 단일 캔버스 비교·실시간 주석 처리로 차이와 선택 근거를 시각화`,
      outputKo: "링크 하나로 피드백과 최종 결정을 1분 만에 끝내는 공유용 비교 보드",
    },
    "audio-stem": {
      inputKo: "짧은 음성 메모, 오디오 트랙, 또는 팟캐스트·영상 사운드",
      coreEngineKo: `${builder.name} 계열의 음성 인식·사운드 분리 처리로 핵심 발화와 오디오 구간을 정제`,
      outputKo: "바로 검색·편집·공유할 수 있는 구조화 텍스트 카드와 정제된 오디오 클립",
    },
    "drop-validation": {
      inputKo: "초기 아이디어 설명, 프롬프트 명령, 또는 수요 확인용 공유 링크",
      coreEngineKo: `${builder.name}의 자동 실행 워크플로와 실시간 반응 집계 로직으로 핵심 결과를 즉시 산출`,
      outputKo: "별도 로그인 없이 첫 화면에서 체험하고 실제 관심 데이터를 모으는 실행 페이지",
    },
  };

  const base = map[mechanism] || map["drop-validation"];
  return {
    ...base,
    summaryKo: sanitizeEditorialText(`${cleanKo} (${mech.shortLabel} 원리)`).slice(0, 140),
  };
}

// ── Semantic Extraction Helpers (Builder A Weapon × Issue B Essence) ─────────

interface TechWeaponProfile {
  shortName: string;
  actionShort: string;
  inputCue: string;
  outputCue: string;
  mechanismVerb: string;
  highlightToken: string;
}

const TECH_WEAPON_RULES: Array<{
  re: RegExp;
  actionShort: string;
  inputCue: string;
  outputCue: string;
  mechanismVerb: string;
}> = [
  {
    re: /(convert|converter|format|pdf|hwp|docx|ffmpeg|transcode|변환)/i,
    actionShort: "로컬 즉석 포맷 변환",
    inputCue: "파일 하나만 끌어다 놓으면",
    outputCue: "브라우저 변환 워크벤치",
    mechanismVerb: "서버 업로드 없이 브라우저에서 파일·자료를 즉시 변환하고 구조화",
  },
  {
    re: /(isometric|svg|webgl|3d|shader|diagram|illustrat|cad|render|도해|일러스트)/i,
    actionShort: "인터랙티브 입체 도해 생성",
    inputCue: "구조 설명 한 줄만 넣으면",
    outputCue: "시각 분해도 스튜디오",
    mechanismVerb: "복잡한 구조와 원리를 인터랙티브 SVG·3D 레이어로 즉시 시각화",
  },
  {
    re: /(agent|mcp|codex|claude|llm|model|menu bar|cli|terminal|에이전트|모델)/i,
    actionShort: "원클릭 에이전트 실행",
    inputCue: "명령 한 줄이나 링크만 넣으면",
    outputCue: "경량 에이전트 보드",
    mechanismVerb: "여러 AI 모델과 자동화 단계를 한 화면에서 즉시 전환·실행",
  },
  {
    re: /(browser|crawl|scrape|extension|tab|bookmark|web|브라우저|수집)/i,
    actionShort: "브라우저 실시간 채집·정리",
    inputCue: "웹 링크 하나만 붙여 넣으면",
    outputCue: "실시간 리서치 카드",
    mechanismVerb: "흩어진 웹페이지와 스레드의 핵심 신호만 자동으로 추출·정리",
  },
  {
    re: /(audio|voice|sound|music|synth|tts|stt|whisper|podcast|speech|음성|사운드|음악)/i,
    actionShort: "실시간 음성·사운드 구조화",
    inputCue: "짧은 음성이나 오디오 클립만 올리면",
    outputCue: "사운드 큐레이션 카드",
    mechanismVerb: "음성·오디오 트랙에서 핵심 구간과 텍스트 맥락을 즉시 분리·정제",
  },
  {
    re: /(video|clip|youtube|frame|subtitle|timeline|edit|영상|비디오|타임스탬프)/i,
    actionShort: "영상 핵심 장면 초단위 인덱싱",
    inputCue: "긴 영상 링크 하나만 넣으면",
    outputCue: "장면 아카이브 보드",
    mechanismVerb: "긴 영상에서 꼭 봐야 할 핵심 컷과 대사만 타임스탬프 카드로 압축",
  },
  {
    re: /(code|git|pr|diff|review|debug|test|repo|refactor|코드|리뷰|개발)/i,
    actionShort: "코드·설계 결함 자동 진단",
    inputCue: "저장소나 PR 링크만 붙여 넣으면",
    outputCue: "1분 리뷰 대시보드",
    mechanismVerb: "변경점과 아키텍처 충돌 위험을 핵심 카드 3장으로 즉시 짚어냄",
  },
  {
    re: /(canvas|whiteboard|design|figma|layout|grid|ui|ux|photo|image|비교|캔버스|사진)/i,
    actionShort: "단일 캔버스 나란히 비교",
    inputCue: "시안이나 이미지 몇 장만 올리면",
    outputCue: "인터랙티브 비교 보드",
    mechanismVerb: "여러 후보 비주얼과 스펙을 같은 규격 캔버스 위에 올려 즉시 대조",
  },
  {
    re: /(price|mrr|deal|shop|store|commerce|invoice|revenue|market|가격|시세|매출)/i,
    actionShort: "실시간 시세·대안 3초 매칭",
    inputCue: "상품 링크나 조건만 입력하면",
    outputCue: "스펙·가격 대조 카드",
    mechanismVerb: "흩어진 가격·스펙·대안 후보를 한 표로 정렬해 의사결정을 단축",
  },
  {
    re: /(map|geo|travel|city|local|calendar|schedule|event|지도|일정|장소)/i,
    actionShort: "취향 동선·일정 자동 큐레이션",
    inputCue: "관심 지역이나 취향 키워드만 고르면",
    outputCue: "맞춤 큐레이션 지도",
    mechanismVerb: "흩어진 장소·전시·일정 정보를 취향 태그와 마감 순으로 자동 정렬",
  },
  {
    re: /(local|offline|privacy|self-hosted|sqlite|memory|rag|note|archive|로컬|오프라인|아카이브)/i,
    actionShort: "로컬 온디바이스 지식 아카이빙",
    inputCue: "흩어진 메모나 원문 링크만 던지면",
    outputCue: "개인용 지식 아카이브",
    mechanismVerb: "민감한 기록을 외부 전송 없이 브라우저·로컬에서 초고속 색인·검색",
  },
];

const MECH_WEAPON_FALLBACK: Record<
  MechanismId,
  { actionShort: string; inputCue: string; outputCue: string; mechanismVerb: string }
> = {
  "visual-price-match": {
    actionShort: "시각·스펙 즉석 대조",
    inputCue: "사진이나 링크 하나만 올리면",
    outputCue: "비교 결과 카드",
    mechanismVerb: "핵심 속성과 가격·대안 차이를 한 화면에 정렬해 선택 시간을 단축",
  },
  "timestamp-archive": {
    actionShort: "핵심 구간 초단위 채집",
    inputCue: "긴 원문이나 영상 링크만 넣으면",
    outputCue: "타임라인 아카이브",
    mechanismVerb: "필요한 구간과 문장만 자동으로 잘라 재활용 가능한 카드로 정리",
  },
  "geo-curation": {
    actionShort: "취향 태그 기반 큐레이션",
    inputCue: "관심 키워드나 링크만 모으면",
    outputCue: "큐레이션 보드",
    mechanismVerb: "흩어진 정보와 일정을 취향·우선순위 기준으로 깔끔하게 정렬",
  },
  "canvas-compare": {
    actionShort: "단일 캔버스 비교·주석",
    inputCue: "후보 시안 몇 개만 올려두면",
    outputCue: "공유용 비교 보드",
    mechanismVerb: "여러 후보를 나란히 펼쳐 1분 만에 핵심 차이와 선택 근거를 정리",
  },
  "audio-stem": {
    actionShort: "음성·오디오 핵심 추출",
    inputCue: "짧은 음성이나 클립만 넣으면",
    outputCue: "구조화 오디오 카드",
    mechanismVerb: "사운드와 발화에서 핵심 포인트만 뽑아 검색 가능한 카드로 변환",
  },
  "drop-validation": {
    actionShort: "무가입 즉석 검증 워크플로",
    inputCue: "아이디어나 링크 한 줄만 넣으면",
    outputCue: "실시간 반응 테스트 웹",
    mechanismVerb: "별도 설정 없이 첫 화면에서 바로 체험하고 핵심 반응을 자동 집계",
  },
};

function extractTechWeapon(
  builder: BuilderSignal,
  mechanism: MechanismId
): TechWeaponProfile {
  const hay = `${builder.name} ${builder.taglineEn} ${builder.taglineKo} ${(builder.tags || []).join(" ")}`;
  const shortName = sanitizeEditorialText(builder.name).slice(0, 26);

  for (const rule of TECH_WEAPON_RULES) {
    if (rule.re.test(hay)) {
      return {
        shortName,
        actionShort: rule.actionShort,
        inputCue: rule.inputCue,
        outputCue: rule.outputCue,
        mechanismVerb: rule.mechanismVerb,
        highlightToken: rule.actionShort,
      };
    }
  }

  const fb = MECH_WEAPON_FALLBACK[mechanism] || MECH_WEAPON_FALLBACK["drop-validation"];
  return {
    shortName,
    actionShort: fb.actionShort,
    inputCue: fb.inputCue,
    outputCue: fb.outputCue,
    mechanismVerb: fb.mechanismVerb,
    highlightToken: fb.actionShort,
  };
}

interface IssueEssence {
  subjectKo: string;
  anchorLabel: string;
  platformDisplay: string;
  verticalShort: string;
  contextKo: string;
  highlightToken: string;
}

function trimCleanKoreanSubject(raw: string, maxLen = 24): string {
  let s = sanitizeEditorialText(raw)
    .replace(/^@[A-Za-z0-9_]+:\s*/g, "")
    .replace(/^(?:Show\s+HN|Breaking|Update|Exclusive|Watch|Review|Interview|Summary|요약)\s*[:–—-]\s*/i, "")
    .replace(/https?:\/\/\S+/g, "")
    .replace(/pic\.twitter\.com\/\S+/g, "")
    .replace(/#[A-Za-z0-9_가-힣]+/g, "")
    .replace(/@[A-Za-z0-9_]+/g, "")
    .replace(/[“”"'‘’`]/g, "")
    .replace(/[…]+/g, "")
    .replace(/\s+/g, " ")
    .trim();

  // Strip verbose conversational openers or trailing declarative verbs for cleaner noun-phrase headlines
  s = s
    .replace(/^우리는\s+/g, "")
    .replace(/\s*(?:을|를)\s*(?:소개합니다|개발했습니다|출시합니다|공개했습니다|발표했습니다|설명합니다|고찰합니다|다룹니다)\.?$/g, "")
    .replace(/\s*(?:소개합니다|개발했습니다|출시합니다|공개했습니다|발표했습니다|합류합니다|설계하다)\.?$/g, "")
    .replace(/[.!?]+$/g, "")
    .trim();

  if (s.length <= maxLen) return s;

  // Prefer breaking at natural delimiter (colon, comma, dash) if early enough
  const delimIdx = s.search(/[:–—|,]/);
  if (delimIdx >= 8 && delimIdx <= maxLen) {
    return s.slice(0, delimIdx).trim();
  }

  // Otherwise break cleanly at word boundary
  const slice = s.slice(0, maxLen);
  const lastSpace = slice.lastIndexOf(" ");
  if (lastSpace >= 9) {
    return slice.slice(0, lastSpace).trim();
  }
  return slice.trim();
}

function extractIssueEssence(
  radar: AiRadarSignal,
  culture: CultureSignal | null,
  track: TreatmentTrack
): IssueEssence {
  if (track === "culture" && culture) {
    const subjectKo = trimCleanKoreanSubject(culture.titleKo || culture.titleEn, 24) || culture.cultureVerticalLabel;
    const verticalShort = (culture.cultureVerticalLabel || "컬처").split("·")[0].trim();
    const contextKo = sanitizeEditorialText(culture.phenomenonKo || culture.titleKo).slice(0, 130);
    return {
      subjectKo,
      anchorLabel: culture.sourceName,
      platformDisplay: culture.sourceName,
      verticalShort,
      contextKo,
      highlightToken: subjectKo.length >= 4 ? subjectKo : culture.sourceName,
    };
  }

  const platformDisplay =
    radar.platformLabel || formatRadarPlatformLabel(radar.platformId, radar.canonicalUrl);
  const subjectKo =
    trimCleanKoreanSubject(radar.titleKo || radar.originalTitle, 24) ||
    sanitizeEditorialText(radar.entities[0] || platformDisplay);
  const anchorLabel =
    (radar.entities && radar.entities[0] && radar.entities[0].length >= 2
      ? sanitizeEditorialText(radar.entities[0])
      : platformDisplay) || platformDisplay;
  const contextKo = sanitizeEditorialText(
    radar.whatKo || radar.highlightSummary || radar.titleKo
  ).slice(0, 135);

  return {
    subjectKo,
    anchorLabel,
    platformDisplay,
    verticalShort: "AI · 테크",
    contextKo,
    highlightToken: subjectKo.length >= 4 ? subjectKo : anchorLabel,
  };
}

/**
 * 22 distinct, natural Korean editorial curiosity headline patterns
 * (12 Tech × AI Radar + 10 Global Culture × Tech)
 * weaving BOTH Builder A's concrete weapon and Issue B's real subject.
 */
function buildDynamicHeadline(
  weapon: TechWeaponProfile,
  issue: IssueEssence,
  track: TreatmentTrack,
  seedHash: number
): string {
  const s = issue.subjectKo;
  const a = weapon.actionShort;
  const n = weapon.shortName;
  const inp = weapon.inputCue;
  const out = weapon.outputCue;
  const src = issue.platformDisplay;
  const v = issue.verticalShort;

  if (track === "culture") {
    const culturePatterns = [
      () => `${src}의 '${s}' 감도를 ${a}${josa(a, "으로/로")} 직접 디깅하는 ${v} 아카이브를 만든다면?`,
      () => `'${s}'에 열광하는 ${v} 팬을 위해 ${a} 기반 ${out}${josa(out, "을/를")} 띄워본다면?`,
      () => `'${s}' 같은 글로벌 ${v} 레퍼런스를 ${a}${josa(a, "으로/로")} 모으는 큐레이션 웹을 만든다면?`,
      () => `${src}${josa(src, "이/가")} 조명한 '${s}' 무드를 ${inp} ${a}${josa(a, "으로/로")} 재구성해 본다면?`,
      () => `${v} 취향이 까다로운 팬들이 '${s}' 맥락을 ${a}${josa(a, "으로/로")} 비교하는 보드를 만든다면?`,
      () => `'${s}'에서 영감 받은 ${v} 작업물을 ${a}${josa(a, "으로/로")} 정리·공유하는 스튜디오를 만든다면?`,
      () => `${src} 독자들이 챙겨 보는 '${s}' 흐름을 ${a}${josa(a, "으로/로")} 1분 만에 탐색하는 웹을 만든다면?`,
      () => `흩어진 '${s}' 계열 ${v} 사료를 ${a}${josa(a, "으로/로")} 엮어내는 포켓 도감을 만들어본다면?`,
      () => `'${s}' 화제작의 디테일을 ${n}식 ${a}${josa(a, "으로/로")} 해부해 보는 인터랙티브 웹을 만든다면?`,
      () => `${v} 씬의 '${s}' 감성을 ${a}${josa(a, "으로/로")} 누구나 체험하는 1페이지 웹을 띄워본다면?`,
    ];
    return ensureQuestionHeadline(culturePatterns[seedHash % culturePatterns.length](), seedHash);
  }

  const techPatterns = [
    () => `'${s}' 흐름 속에서 ${inp} ${a}${josa(a, "으로/로")} 끝내는 ${out}${josa(out, "을/를")} 띄워본다면?`,
    () => `'${s}' 이슈를 ${n}의 ${a}${josa(a, "으로/로")} 3초 만에 풀어내는 1인 웹을 만든다면?`,
    () => `'${s}' 변화에 맞춰 ${a}${josa(a, "으로/로")} 바로 써먹는 ${out}${josa(out, "을/를")} 만들어본다면?`,
    () => `복잡한 '${s}' 실무 대응을 ${a} 한 번으로 줄여주는 초경량 웹 도구를 만든다면?`,
    () => `'${s}'${josa(s, "이/가")} 화제인 지금, ${n}처럼 ${a}${josa(a, "을/를")} 브라우저에 열어둔다면?`,
    () => `누구나 '${s}' 맥락을 ${a}${josa(a, "으로/로")} 즉시 실험해 보는 ${out}${josa(out, "을/를")} 띄워본다면?`,
    () => `'${s}' 관련 반복 수작업을 ${a}${josa(a, "으로/로")} 덜어주는 마이크로 웹앱을 만든다면?`,
    () => `'${s}' 자료를 ${inp} ${a}${josa(a, "으로/로")} 정리해 주는 개인용 워크벤치를 만든다면?`,
    () => `${n}의 ${a} 감각으로 '${s}' 실전 워크플로를 1분 컷으로 압축한다면?`,
    () => `'${s}' 트렌드를 따라잡기 바쁜 팀을 위해 ${a} 기반 ${out}${josa(out, "을/를")} 만든다면?`,
    () => `회원가입 없이 '${s}' 현안을 ${a}${josa(a, "으로/로")} 바로 검증하는 테스트 보드를 띄워본다면?`,
    () => `${src}에서 주목받은 '${s}' 과제를 ${a}${josa(a, "으로/로")} 해결하는 경량 툴을 만들어본다면?`,
  ];

  return ensureQuestionHeadline(techPatterns[seedHash % techPatterns.length](), seedHash);
}

function buildDynamicOneLineHook(
  weapon: TechWeaponProfile,
  issue: IssueEssence,
  track: TreatmentTrack,
  seedHash: number
): string {
  const s = issue.subjectKo;
  const a = weapon.actionShort;
  const inp = weapon.inputCue;
  const out = weapon.outputCue;

  if (track === "culture") {
    const hooks = [
      `${issue.platformDisplay}에서 화제가 된 '${s}' 감도를 ${inp} ${a} 기반 ${out}${josa(out, "으로/로")} 바로 탐색·저장할 수 있게 압축한 웹입니다.`,
      `글로벌 ${issue.verticalShort} 팬들이 열광하는 '${s}' 레퍼런스를 별도 가입 없이 ${a}${josa(a, "으로/로")} 수집하고 나만의 보드로 공유합니다.`,
      `'${s}' 무드와 디테일을 ${weapon.shortName}식 ${a} 인터랙션으로 풀어내어, 첫 화면 30초 안에 취향 큐레이션 결과를 완성해 줍니다.`,
    ];
    return sanitizeEditorialText(hooks[seedHash % hooks.length]);
  }

  const hooks = [
    `${inp} '${s}' 맥락에 맞춘 ${a}${josa(a, "을/를")} 즉시 실행하고 핵심 결과만 ${out}${josa(out, "으로/로")} 정리해 주는 초경량 웹입니다.`,
    `'${s}' 이슈로 늘어난 탐색·정리 부담을 ${weapon.shortName}의 ${a} 구조로 덜어내어, 로그인 없이 1분 만에 실전 결과를 확인합니다.`,
    `${issue.platformDisplay}에서 주목받는 '${s}' 흐름을 누구나 손쉽게 검증할 수 있도록 ${a} 기능 1개에 집중한 마이크로 도구입니다.`,
  ];
  return sanitizeEditorialText(hooks[seedHash % hooks.length]);
}

function buildDynamicMvpFeatures(
  weapon: TechWeaponProfile,
  issue: IssueEssence,
  track: TreatmentTrack,
  seedHash: number
): [string, string, string] {
  const s = issue.subjectKo;
  const a = weapon.actionShort;
  const out = weapon.outputCue;

  if (track === "culture") {
    const f1Pool = [
      `'${s}' 관련 기사·이미지·링크를 올려두면 ${a} 파이프라인이 핵심 무드와 출처 태그를 자동으로 정리합니다.`,
      `${issue.platformDisplay} 감도의 '${s}' 레퍼런스를 입력하면 ${weapon.shortName} 방식의 ${a}${josa(a, "으로/로")} 핵심 디테일을 즉시 추출합니다.`,
    ];
    const f2Pool = [
      `수집한 ${issue.verticalShort} 후보를 같은 규격의 ${out}에 나란히 펼쳐 취향과 디테일 차이를 한눈에 비교합니다.`,
      `색감·시대·장르 태그로 필터링해 '${s}' 맥락과 가장 잘 어울리는 레퍼런스 3가지를 실시간 추천합니다.`,
    ];
    const f3Pool = [
      `마음에 든 큐레이션 카드만 묶어 나만의 ${issue.verticalShort} 아카이브 링크로 원클릭 공유합니다.`,
      `선별한 '${s}' 영감 리스트를 발표·작업용 카드 묶음과 체크리스트로 저장합니다.`,
    ];
    return [
      sanitizeEditorialText(f1Pool[seedHash % f1Pool.length]),
      sanitizeEditorialText(f2Pool[(seedHash + 1) % f2Pool.length]),
      sanitizeEditorialText(f3Pool[(seedHash + 2) % f3Pool.length]),
    ];
  }

  const f1Pool = [
    `'${s}' 관련 원문 링크나 입력값을 넣으면 ${weapon.shortName}의 ${a} 엔진이 핵심 항목만 자동으로 정리합니다.`,
    `복잡한 설치 없이 브라우저 첫 화면에서 '${s}' 테스트 데이터를 넣어 ${a} 결과를 즉시 생성합니다.`,
  ];
  const f2Pool = [
    `처리된 결과를 기준별 ${out}로 시각화해 대안·수치·핵심 변화 포인트를 한눈에 비교합니다.`,
    `${issue.platformDisplay}의 '${s}' 이슈 기준에 맞춰 우선순위와 리스크 3가지를 실시간 체크리스트로 보여줍니다.`,
  ];
  const f3Pool = [
    `완성된 분석 카드와 실행 요약을 팀·커뮤니티에 바로 넘길 수 있는 공유 링크로 원클릭 복사합니다.`,
    `검증이 끝난 '${s}' 워크플로 결과물을 마크다운 리포트와 재사용 프리셋으로 저장합니다.`,
  ];

  return [
    sanitizeEditorialText(f1Pool[seedHash % f1Pool.length]),
    sanitizeEditorialText(f2Pool[(seedHash + 1) % f2Pool.length]),
    sanitizeEditorialText(f3Pool[(seedHash + 2) % f3Pool.length]),
  ];
}

export function matchAiRadarFor(
  builder: BuilderSignal,
  domainSlug: DomainSlug,
  radarSignals: AiRadarSignal[],
  offset = 0
): AiRadarSignal {
  if (radarSignals.length === 0) {
    throw new Error("AI Radar signals are required for synthesis.");
  }
  const domain = DOMAIN_MAP[domainSlug];
  const builderTokens = new Set(
    `${builder.name} ${builder.taglineEn} ${builder.tags.join(" ")}`
      .toLowerCase()
      .split(/[^a-z0-9가-힣]+/)
      .filter((t) => t.length >= 3)
  );

  const scored = radarSignals.map((r) => {
    let score = Math.min(35, r.importanceScore || 10);
    if (domain.affinityCategories.includes(r.category)) score += 18;
    if (domain.affinityDomains.includes(r.planningMeta.productDomain)) score += 16;
    if (r.planningMeta.signalType === "open_source_trend") score += 7;
    if (r.planningMeta.signalType === "dev_workflow") score += 6;
    if (r.planningMeta.signalType === "new_product") score += 5;

    const rText =
      `${r.titleKo} ${r.originalTitle} ${r.planningMeta.benchmarkPoint} ${r.entities.join(" ")}`.toLowerCase();
    let overlap = 0;
    for (const tok of builderTokens) {
      if (rText.includes(tok)) overlap += 1;
    }
    score += Math.min(18, overlap * 6);
    return { signal: r, score };
  });

  scored.sort((a, b) => b.score - a.score);
  const poolSize = Math.min(18, scored.length);
  const idx = ((offset % poolSize) + poolSize) % poolSize;
  return scored[idx].signal;
}

export function matchCultureFor(
  builder: BuilderSignal,
  domainSlug: DomainSlug,
  cultureSignals: CultureSignal[],
  offset = 0
): CultureSignal | null {
  if (!cultureSignals || cultureSignals.length === 0) return null;
  const builderTokens = new Set(
    `${builder.name} ${builder.taglineEn} ${builder.tags.join(" ")}`
      .toLowerCase()
      .split(/[^a-z0-9가-힣]+/)
      .filter((t) => t.length >= 3)
  );

  const scored = cultureSignals.map((c, idx) => {
    let score = 20;
    if (c.domainSlug === domainSlug) score += 20;
    if (c.previewImageUrl) score += 12;
    const cText = `${c.titleEn} ${c.titleKo} ${c.tags.join(" ")} ${c.sourceName}`.toLowerCase();
    let overlap = 0;
    for (const tok of builderTokens) {
      if (cText.includes(tok)) overlap += 1;
    }
    score += Math.min(18, overlap * 6);
    score += (idx % 7) * 0.25;
    return { signal: c, score };
  });

  scored.sort((a, b) => b.score - a.score);
  const poolSize = Math.min(28, scored.length);
  const idx = ((offset % poolSize) + poolSize) % poolSize;
  return scored[idx].signal;
}

function buildOverseasProofKo(builder: BuilderSignal, mechanism: MechanismId): string {
  const mech = MECHANISM_MAP[mechanism];
  const cleanTagline = sanitizeEditorialText(builder.taglineKo || builder.summaryKo);
  if (builder.verifiedRevenue) {
    return `${builder.name}${josa(builder.name, "은/는")} ${builder.tractionLabel}의 실제 결제 수익으로 수요가 입증된 해외 서비스입니다. '${cleanTagline}'라는 명확한 문제 하나에 집중해, ${mech.simpleActionKo}으로 유료 사용자를 빠르게 모았습니다.`;
  }
  if (builder.source === "github_trending") {
    return `${builder.name}${josa(builder.name, "은/는")} GitHub에서 ${builder.tractionLabel}를 빠르게 모은 오픈소스 프로젝트입니다. '${cleanTagline}' 기능을 코드로 바로 실행할 수 있게 열어 개발자와 메이커의 주목을 받았습니다.`;
  }
  return `${builder.name}${josa(builder.name, "은/는")} ${builder.sourceLabel}에서 ${builder.tractionLabel}의 호응을 얻은 해외 프로젝트입니다. '${cleanTagline}' 경험을 가볍게 열어주고, ${mech.simpleActionKo}으로 초기 반응을 끌어냈습니다.`;
}

function buildBottleneckSolvedKo(radar: AiRadarSignal): string {
  const techName =
    radar.entities[0] ||
    radar.platformLabel ||
    formatRadarPlatformLabel(radar.platformId, radar.canonicalUrl);
  const cleanWhat = sanitizeEditorialText(radar.whatKo || radar.highlightSummary).slice(0, 125);
  return `최근 화제가 된 ${techName} 계열 이슈('${radar.titleKo}')의 흐름과 공개 도구를 연결하면, 예전에 사람이 일일이 정리·분류하던 구간을 짧은 자동화 파이프라인으로 덜어낼 수 있습니다. ${cleanWhat}`;
}

function buildDynamicTechFusionStoryKo(
  builder: BuilderSignal,
  radar: AiRadarSignal,
  weapon: TechWeaponProfile,
  issue: IssueEssence,
  cutoff: string,
  seedHash: number
): string {
  const metric = formatShortMetric(builder);
  const cleanBuilderKo = sanitizeEditorialText(builder.taglineKo || builder.summaryKo).slice(0, 80);
  const cleanCutoff = cutoff.replace(/\.$/, "");
  const cleanContext = issue.contextKo.replace(/\.$/, "");

  const openers = [
    `${builder.sourceLabel}(${metric})에서 검증된 ${weapon.shortName}${josa(weapon.shortName, "은/는")} '${cleanBuilderKo}'라는 선명한 무기 하나로 ${weapon.mechanismVerb}하는 구조가 돋보입니다.`,
    `${weapon.shortName}(${metric})이 빠른 호응을 얻은 비결은 복잡한 부가 기능 대신 ${weapon.actionShort} 하나에 집중해 ${weapon.mechanismVerb}한 데 있습니다.`,
    `${builder.sourceLabel} 화제작 ${weapon.shortName}(${metric})의 핵심은 ${weapon.inputCue} ${weapon.mechanismVerb}하는 직관적 워크플로입니다.`,
  ];

  const bridges = [
    `마침 ${issue.platformDisplay}에서 주목받는 '${issue.subjectKo}' 이슈(${cleanContext})가 커지면서, 실무자와 개인 메이커들이 관련 자료를 직접 비교·검증하려는 수요가 빠르게 늘고 있습니다.`,
    `최근 ${issue.platformDisplay}를 통해 확산 중인 '${issue.subjectKo}' 흐름을 들여다보면, ${cleanContext} 덕분에 기존 수작업 파이프라인의 병목이 선명하게 드러납니다.`,
    `여기에 ${issue.platformDisplay}의 '${issue.subjectKo}' 이슈를 맞물려 보면, ${cleanContext} 흐름에 대응할 가벼운 실행 도구가 비어 있는 틈새가 보입니다.`,
  ];

  const payoffs = [
    `방문자가 가입 없이 '${issue.subjectKo}' 관련 입력값 하나만 던져 ${weapon.actionShort} 기반 ${weapon.outputCue}${josa(weapon.outputCue, "을/를")} 1분 만에 얻게 만들면 즉각적인 실용 가치가 생깁니다.`,
    `그래서 '${issue.subjectKo}' 맥락에 특화된 ${weapon.actionShort} 화면을 첫 페이지에 바로 열어, 누구나 30초 만에 ${weapon.outputCue}${josa(weapon.outputCue, "을/를")} 완성하고 공유하게 설계합니다.`,
    `핵심은 '${issue.subjectKo}' 대응에 꼭 필요한 ${weapon.actionShort} 흐름만 남긴 ${weapon.outputCue}${josa(weapon.outputCue, "을/를")} 만들어 첫 방문 1분 안에 효용을 체감시키는 것입니다.`,
  ];

  const closers = [
    `첫 버전은 ${cleanCutoff} 범위만 과감히 비우고 핵심 기능 3가지로 1주일 안에 반응 실험을 띄웁니다.`,
    `v1에서는 ${cleanCutoff} 요소를 덜어내어 주말 프로토타입 수준으로 빠르게 배포하고 실사용 피드백을 확인합니다.`,
  ];

  return sanitizeEditorialText(
    [
      openers[seedHash % openers.length],
      bridges[(seedHash + 1) % bridges.length],
      payoffs[(seedHash + 2) % payoffs.length],
      closers[(seedHash + 3) % closers.length],
    ].join(" ")
  );
}

function buildDynamicCultureFusionStoryKo(
  builder: BuilderSignal,
  culture: CultureSignal,
  weapon: TechWeaponProfile,
  issue: IssueEssence,
  cutoff: string,
  seedHash: number
): string {
  const metric = formatShortMetric(builder);
  const cleanCutoff = cutoff.replace(/\.$/, "");
  const cleanPhenomenon = issue.contextKo.replace(/\.$/, "");

  const openers = [
    `${builder.sourceLabel}(${metric})에서 주목받은 ${weapon.shortName}의 ${weapon.actionShort} 감각을 ${issue.platformDisplay}가 다룬 '${issue.subjectKo}' ${issue.verticalShort} 씬으로 옮겨 왔습니다.`,
    `${weapon.shortName}(${metric})이 보여준 ${weapon.actionShort} 인터랙션을 ${issue.platformDisplay}의 '${issue.subjectKo}' 컬처 담론에 이식하면 전혀 새로운 취향 웹이 열립니다.`,
    `개발 도구로 쓰이던 ${weapon.shortName}(${metric})의 ${weapon.actionShort} 파이프라인을 글로벌 ${issue.verticalShort} 매체 ${issue.platformDisplay}의 '${issue.subjectKo}' 감도와 맞물렸습니다.`,
  ];

  const bridges = [
    `${cleanPhenomenon} 이처럼 디테일과 맥락에 예민한 글로벌 ${culture.cultureVerticalLabel} 팬들은 단순 피드보다 직접 비교·수집하며 파고들 수 있는 도구를 원합니다.`,
    `${cleanPhenomenon} 취향 기준이 뚜렷한 ${culture.cultureVerticalLabel} 커뮤니티일수록 흩어진 레퍼런스를 한눈에 엮어주는 전용 아카이브에 강하게 반응합니다.`,
  ];

  const payoffs = [
    `방문자가 별도 가입 없이 '${issue.subjectKo}' 관련 레퍼런스를 올려 ${weapon.actionShort} 기반 ${weapon.outputCue}${josa(weapon.outputCue, "을/를")} 직접 만들고 공유하게 설계하면 높은 재방문이 일어납니다.`,
    `첫 화면에서 곧바로 '${issue.subjectKo}' 무드를 ${weapon.actionShort}${josa(weapon.actionShort, "으로/로")} 탐색하고 나만의 ${weapon.outputCue}${josa(weapon.outputCue, "을/를")} 완성하게 만들면 자연스러운 바이럴이 붙습니다.`,
  ];

  const closers = [
    `첫 버전은 ${cleanCutoff} 영역을 과감히 덜어내고 감도 높은 핵심 체험 3가지만 1주일 안에 완성합니다.`,
    `v1은 ${cleanCutoff} 기능 없이 '${issue.subjectKo}' 디깅과 ${weapon.outputCue} 공유에 집중해 빠르게 출시합니다.`,
  ];

  return sanitizeEditorialText(
    [
      openers[seedHash % openers.length],
      bridges[(seedHash + 1) % bridges.length],
      payoffs[(seedHash + 2) % payoffs.length],
      closers[(seedHash + 3) % closers.length],
    ].join(" ")
  );
}

function buildCustomTopicConcept(
  topic: string,
  builder: BuilderSignal,
  mechanism: MechanismId,
  variantIndex: number
): { title: string; hook: string; features: [string, string, string] } {
  const templates: Array<{
    title: string;
    hook: string;
    features: [string, string, string];
  }> = [
    {
      title: `${topic} 사진이나 링크 한 개로 시세와 대안을 3초 만에 비교해 준다면?`,
      hook: `관심 있는 ${topic} 링크나 사진을 올리면 핵심 스펙, 가격대, 비슷한 대안 3가지를 한눈에 정리해 선택을 쉽게 만들어 줍니다.`,
      features: [
        `${topic} 관련 사진이나 상품·글 링크를 올려 핵심 특징과 가격 정보를 자동으로 정리합니다.`,
        `비슷한 취향의 대안 후보 3개를 깔끔한 비교 카드로 나란히 띄워 장단점을 확인합니다.`,
        `마음에 든 항목만 골라 내 보드에 저장하고 링크 하나로 친구에게 바로 공유합니다.`,
      ],
    },
    {
      title: `흩어진 ${topic} 추천 글과 영상에서 핵심 포인트만 모아두는 웹을 만들어본다면?`,
      hook: `유튜브·블로그·SNS에 흩어진 ${topic} 정보를 링크만 넣어두면 꼭 필요한 팁과 추천 목록만 깔끔한 카드로 정리해 줍니다.`,
      features: [
        `${topic} 영상이나 글 링크를 붙여 넣으면 핵심 팁 3줄과 참고 구간만 자동으로 추려줍니다.`,
        `가격대·난이도·분위기 태그로 정리해 필요할 때마다 3초 만에 다시 꺼내 봅니다.`,
        `모아둔 나만의 ${topic} 리스트를 1페이지 가이드로 묶어 지인이나 커뮤니티에 공유합니다.`,
      ],
    },
    {
      title: `고민되는 ${topic} 후보 3가지를 한 화면에 놓고 1분 만에 고르는 보드를 만든다면?`,
      hook: `${topic}을 고를 때 탭을 수십 개 띄우지 않고, 최종 후보 3개를 같은 기준 카드로 비교해 1분 만에 결정할 수 있게 돕습니다.`,
      features: [
        `후보 ${topic} 2~4개의 링크를 넣으면 사진·가격·핵심 장점이 같은 규격 카드로 정렬됩니다.`,
        `내가 중요하게 보는 기준에 체크 표시를 남기며 가장 잘 맞는 선택지를 좁혀갑니다.`,
        `결정이 애매할 땐 투표 링크를 만들어 주변 사람들의 의견을 바로 받아봅니다.`,
      ],
    },
    {
      title: `이번 주 뜨는 ${topic} 소식과 실사용자 반응을 한 장의 지도로 묶어본다면?`,
      hook: `${topic}을 좋아하는 사람들이 지금 가장 주목하는 신상·장소·이벤트만 추려 놓치지 않고 챙겨볼 수 있게 정리해 줍니다.`,
      features: [
        `새로 올라온 ${topic} 소식과 마감 임박 일정을 한눈에 보기 쉬운 카드로 모아줍니다.`,
        `실제 경험해 본 사람들의 짧은 한 줄 평과 추천 포인트를 카드 아래에 함께 보여줍니다.`,
        `가고 싶거나 써보고 싶은 항목만 북마크해 주말 일정이나 장바구니로 바로 넘깁니다.`,
      ],
    },
  ];

  const mechOffset = MECHANISM_LIST.findIndex((m) => m.id === mechanism);
  const picked = templates[Math.abs(variantIndex + mechOffset) % templates.length];
  return {
    title: sanitizeEditorialText(picked.title),
    hook: sanitizeEditorialText(
      `${picked.hook} (${builder.name}의 '${MECHANISM_MAP[mechanism].shortLabel}' 아이디어를 ${topic}에 맞게 풀었습니다.)`
    ),
    features: picked.features.map((f) => sanitizeEditorialText(f)) as [string, string, string],
  };
}

export interface SynthesizeOptions {
  builder: BuilderSignal;
  radar: AiRadarSignal;
  culture?: CultureSignal | null;
  track?: TreatmentTrack;
  domainSlug: DomainSlug;
  customTopic?: string | null;
  variantIndex?: number;
  parentTreatment?: Treatment | null;
  addedBuilder?: BuilderSignal | null;
  mechanismOverride?: MechanismId | null;
  nowIso?: string;
}

export function synthesizeTreatment(options: SynthesizeOptions): Treatment {
  const {
    builder,
    radar,
    culture = null,
    track: explicitTrack,
    domainSlug,
    customTopic,
    variantIndex = 0,
    parentTreatment = null,
    addedBuilder = null,
    mechanismOverride = null,
    nowIso = new Date().toISOString(),
  } = options;

  const track: TreatmentTrack = explicitTrack === "culture" && culture ? "culture" : "tech";
  const effectiveDomainSlug: DomainSlug =
    track === "culture" && culture ? culture.domainSlug : domainSlug;
  const domain = DOMAIN_MAP[effectiveDomainSlug] || DOMAIN_MAP["creator-tool"];
  const effectiveMechanism: MechanismId = mechanismOverride || builder.mechanism;
  const mech = MECHANISM_MAP[effectiveMechanism];
  const cleanTopic = customTopic ? sanitizeEditorialText(customTopic) : null;
  const secondaryId = track === "culture" && culture ? culture.id : radar.id;
  const seedKey = `${track}|${builder.id}|${secondaryId}|${effectiveDomainSlug}|${effectiveMechanism}|${cleanTopic || ""}|${addedBuilder?.id || ""}|${variantIndex}`;
  const hash = deterministicHash(seedKey);

  const isEvolution = Boolean(parentTreatment && addedBuilder);
  const shortId = hash.toString(36).slice(0, 6);
  const id = isEvolution
    ? `tr-c-${slugifyAscii(builder.name).slice(0, 14)}-${shortId}`
    : `tr-${track === "culture" ? "cul" : "tec"}-${slugifyAscii(builder.name).slice(0, 14)}-${shortId}`;

  const cadence = CADENCE_OPTIONS[hash % CADENCE_OPTIONS.length];
  const weapon = extractTechWeapon(builder, effectiveMechanism);
  const issue = extractIssueEssence(radar, culture, track);

  let title: string;
  let oneLineHook: string;
  let firstThreeSecondsUx: string;
  let mvpFeatures: [string, string, string];
  let sampleA2: Treatment["sampleA2"] = null;

  if (isEvolution && parentTreatment && addedBuilder) {
    const addedMech = MECHANISM_MAP[addedBuilder.mechanism];
    const addedPool =
      CONCEPT_BLUEPRINTS[effectiveDomainSlug][addedBuilder.mechanism] ||
      CONCEPT_BLUEPRINTS[effectiveDomainSlug]["drop-validation"];
    const addedBlueprint = addedPool[hash % addedPool.length];
    const baseShortTitle = parentTreatment.title.replace(/\?+$/, "").replace(/\s*\(.+?\)\s*$/, "");

    title = ensureQuestionHeadline(
      `${baseShortTitle}에 ${addedMech.shortLabel}까지 붙여본다면?`,
      variantIndex
    );
    oneLineHook = sanitizeEditorialText(
      `기존 기획에 ${addedBuilder.name}(${formatShortMetric(addedBuilder)})의 '${addedMech.shortLabel}' 기능을 더해, 탐색부터 공유·재방문까지 한 번에 이어지게 만든 확장안입니다.`
    );
    firstThreeSecondsUx = sanitizeEditorialText(
      `${parentTreatment.oneLineHook} 여기에 ${addedBuilder.name} 방식의 '${addedMech.shortLabel}' 탭이 함께 열려 한 화면에서 비교와 검증을 끝낼 수 있습니다.`
    );
    mvpFeatures = [
      parentTreatment.mvpFeatures[0],
      sanitizeEditorialText(`${addedBlueprint.features[0]} (${addedBuilder.name} 기능 이식)`),
      parentTreatment.mvpFeatures[2],
    ];
    sampleA2 = {
      builderId: addedBuilder.id,
      name: addedBuilder.name,
      url: addedBuilder.url,
      sourceLabel: addedBuilder.sourceLabel,
      tractionLabel: formatShortMetric(addedBuilder),
      mechanismLabel: addedMech.label,
      addedFeatureKo: sanitizeEditorialText(
        `${addedBuilder.name}이 검증한 '${addedMech.label}' 흐름을 두 번째 핵심 기능으로 합쳐 사용자가 다시 돌아올 이유를 만들었습니다.`
      ),
    };
  } else if (cleanTopic) {
    const custom = buildCustomTopicConcept(cleanTopic, builder, effectiveMechanism, variantIndex);
    title = ensureQuestionHeadline(custom.title, variantIndex);
    oneLineHook = custom.hook;
    firstThreeSecondsUx = custom.hook;
    mvpFeatures = custom.features;
  } else {
    title = buildDynamicHeadline(weapon, issue, track, hash);
    oneLineHook = buildDynamicOneLineHook(weapon, issue, track, hash);
    firstThreeSecondsUx = sanitizeEditorialText(
      `회원가입 없이 첫 화면에서 바로 체험할 수 있습니다. ${oneLineHook}`
    );
    mvpFeatures = buildDynamicMvpFeatures(weapon, issue, track, hash);
  }

  const techDigestKo = buildTechDigestKo(builder, effectiveMechanism);
  const primaryCutoff = domain.cutoffs[0] || "회원가입과 복잡한 설정 화면";
  const fusionStoryKo =
    track === "culture" && culture
      ? buildDynamicCultureFusionStoryKo(builder, culture, weapon, issue, primaryCutoff, hash)
      : buildDynamicTechFusionStoryKo(builder, radar, weapon, issue, primaryCutoff, hash);

  // Explicit structured highlight phrases reflecting BOTH Material A (weapon) & Material B (issue)
  const highlightPhrases = Array.from(
    new Set(
      [
        `${weapon.actionShort} 기반 ${weapon.outputCue}`,
        issue.highlightToken,
        weapon.highlightToken,
      ].filter((p) => p && p.length >= 3 && fusionStoryKo.includes(p))
    )
  ).slice(0, 3);

  // Media priority: Builder demoVideo -> Builder previewImage -> Culture/Radar previewImage
  const demoVideoUrl = builder.demoVideoUrl || null;
  let previewImageUrl: string | null = null;
  let mediaSourceLabel: string | null = null;

  if (demoVideoUrl) {
    mediaSourceLabel = builder.mediaSourceLabel || "원본 기술 시연 영상";
    previewImageUrl =
      builder.previewImageUrl ||
      (track === "culture" && culture ? culture.previewImageUrl : radar.thumbnailUrl) ||
      null;
  } else if (builder.previewImageUrl) {
    previewImageUrl = builder.previewImageUrl;
    mediaSourceLabel = builder.mediaSourceLabel || "프로덕트 실물 화면";
  } else if (track === "culture" && culture?.previewImageUrl) {
    previewImageUrl = culture.previewImageUrl;
    mediaSourceLabel = `컬처 이슈 이미지 · ${culture.sourceName}`;
  } else if (track === "tech" && radar.thumbnailUrl) {
    previewImageUrl = radar.thumbnailUrl;
    mediaSourceLabel = "이슈 기사 이미지";
  }

  const radarPlatformDisplay =
    radar.platformLabel || formatRadarPlatformLabel(radar.platformId, radar.canonicalUrl);

  const sampleB =
    track === "culture" && culture
      ? {
          radarId: culture.id,
          titleKo: sanitizeEditorialText(culture.titleKo),
          canonicalUrl: culture.canonicalUrl,
          platformId: culture.sourceName,
          platformLabel: culture.sourceName,
          sourceType: "culture" as const,
          cultureVerticalLabel: culture.cultureVerticalLabel,
          signalType: culture.cultureVertical,
          productDomain: culture.domainSlug,
          summaryKo: sanitizeEditorialText(culture.phenomenonKo),
          benchmarkPoint: sanitizeEditorialText(culture.cultureVerticalLabel),
          bottleneckSolvedKo: sanitizeEditorialText(
            `${culture.sourceName}의 '${culture.titleKo}' 글로벌 컬처 흐름을 브라우저 인터랙션으로 풀어냅니다. ${culture.phenomenonKo}`
          ),
        }
      : {
          radarId: radar.id,
          titleKo: sanitizeEditorialText(radar.titleKo),
          canonicalUrl: radar.canonicalUrl,
          platformId: radarPlatformDisplay,
          platformLabel: radarPlatformDisplay,
          sourceType: "ai_radar" as const,
          cultureVerticalLabel: null,
          signalType: radar.planningMeta.signalType,
          productDomain: radar.planningMeta.productDomain,
          summaryKo: sanitizeEditorialText(radar.whatKo || radar.highlightSummary),
          benchmarkPoint: sanitizeEditorialText(radar.planningMeta.benchmarkPoint),
          bottleneckSolvedKo: buildBottleneckSolvedKo(radar),
        };

  const lineage: TreatmentLineageNode[] =
    isEvolution && parentTreatment && addedBuilder
      ? [
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
            title: parentTreatment.title,
            treatmentId: parentTreatment.id,
            builderId: builder.id,
            builderName: builder.name,
          },
          {
            step: "C",
            label: "2차 확장",
            title: `+ ${addedBuilder.name}`,
            treatmentId: id,
            builderId: addedBuilder.id,
            builderName: addedBuilder.name,
          },
        ]
      : [
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
        ];

  return {
    id,
    slug: id,
    track,
    createdAt: nowIso,
    updatedAt: nowIso,
    domainSlug: effectiveDomainSlug,
    domainLabel: domain.label,
    domainColor: domain.color,
    customTopic: cleanTopic,
    title,
    oneLineHook,
    firstThreeSecondsUx,
    fusionStoryKo,
    highlightPhrases,
    buildCadence: cadence,
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
      mechanism: effectiveMechanism,
      mechanismLabel: mech.label,
      summaryKo: sanitizeEditorialText(builder.taglineKo || builder.summaryKo),
      overseasProofKo: buildOverseasProofKo(builder, effectiveMechanism),
    },
    sampleA2,
    sampleB,
    twistSummaryKo: oneLineHook,
    mvpFeatures,
    scopeCutoff: domain.cutoffs,
    targetKpis: domain.kpis,
    lineage,
    synthesisMode: "deterministic",
    parentTreatmentId: parentTreatment?.id ?? null,
    variantIndex,
  };
}

export function treatmentToMarkdown(t: Treatment): string {
  const sampleA2Line = t.sampleA2
    ? `\n- 추가 결합 기능: [${t.sampleA2.name}](${t.sampleA2.url}) (${t.sampleA2.tractionLabel}) — ${t.sampleA2.addedFeatureKo}`
    : "";
  const isCulture = t.track === "culture" || t.sampleB.sourceType === "culture";

  return `# ${t.title}

- 트랙: ${isCulture ? "글로벌 컬처 × 기술 이종교배" : "테크 웨지 × 실시간 AI 이슈"}
- 예상 구현 기간: ${t.buildCadence}

## 핵심 경험 요약
${t.oneLineHook}

## 기술 × 이슈 시너지 인사이트
${t.fusionStoryKo}

## 재료 01 · 원본 기술 / 프로덕트
- 서비스/레포: [${t.sampleA.name}](${t.sampleA.url}) (${t.sampleA.shortMetricLabel})
- 핵심 요약: ${t.sampleA.summaryKo || t.sampleA.overseasProofKo}${sampleA2Line}

## 재료 02 · ${isCulture ? `글로벌 컬처 시그널 (${t.sampleB.platformId})` : `실시간 AI / 트렌드 이슈 (${t.sampleB.platformId})`}
- 원문 기사: [${t.sampleB.titleKo}](${t.sampleB.canonicalUrl})
- 핵심 요약: ${t.sampleB.summaryKo || t.sampleB.bottleneckSolvedKo}

## 이렇게 만듭니다 · MVP 핵심 기능 3가지
1. ${t.mvpFeatures[0]}
2. ${t.mvpFeatures[1]}
3. ${t.mvpFeatures[2]}

- 처음 만들 때 과감히 뺄 스펙: ${t.scopeCutoff[0]}
`;
}

export function treatmentToCodingPrompt(t: Treatment): string {
  const isCulture = t.track === "culture" || t.sampleB.sourceType === "culture";
  return `다음 웹 서비스 MVP의 첫 번째 프로토타입을 구현해 주세요.

[서비스 개요]
- 기획 질문(제목): ${t.title}
- 한 줄 경험: ${t.oneLineHook}
- 목표 개발 기간: ${t.buildCadence}

[기술 × 이슈 결합 배경]
${t.fusionStoryKo}

[원본 기술 작동 원리]
- 입력: ${t.techDigestKo.inputKo}
- 핵심 처리: ${t.techDigestKo.coreEngineKo}
- 출력: ${t.techDigestKo.outputKo}

[참고 레퍼런스]
- 원본 기술/프로덕트: ${t.sampleA.name} (${t.sampleA.url}) — ${t.sampleA.shortMetricLabel}
- ${isCulture ? `글로벌 컬처 시그널 (${t.sampleB.platformId})` : `실시간 AI 이슈 (${t.sampleB.platformId})`}: ${t.sampleB.titleKo} (${t.sampleB.canonicalUrl})

[반드시 구현할 핵심 기능 3가지]
1. ${t.mvpFeatures[0]}
2. ${t.mvpFeatures[1]}
3. ${t.mvpFeatures[2]}

[처음 만들 때 과감히 뺄 스펙]
- ${t.scopeCutoff[0]}
${t.scopeCutoff[1] ? `- ${t.scopeCutoff[1]}` : ""}

[구현 가이드]
- 스택: Next.js App Router + TypeScript + Tailwind CSS
- 로그인 없이 첫 화면에서 핵심 기능을 바로 체험할 수 있게 만들고, 외부 API 키가 없어도 기본 흐름이 동작하도록 폴백 로직을 포함해 주세요.
- 여백이 충분한 순백 에디토리얼 UI와 높은 텍스트 대비로 가독성을 최우선으로 설계해 주세요.`;
}
