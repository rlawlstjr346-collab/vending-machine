import type { Treatment } from "./types";

export interface DiscoverHub {
  slug: string;
  labelKo: string;
  titleKo: string;
  titleEn: string;
  seoTitle: string;
  descriptionKo: string;
  introKo: string;
  keywords: string[];
  match: (t: Treatment) => boolean;
}

export const DISCOVER_HUBS: DiscoverHub[] = [
  {
    slug: "ai-service-ideas",
    labelKo: "AI 서비스 기획 아이디어",
    titleKo: "AI 서비스 기획 아이디어 · 생성형 AI 웹앱 아이템 모음",
    titleEn: "Generative AI Service & Web App Ideas",
    seoTitle: "AI 서비스 기획 아이디어 · 생성형 AI 웹앱 아이템 모음",
    descriptionKo:
      "실시간 AI Radar 기술 이슈와 GitHub 급상승 오픈소스를 결합해 1주일 안에 만들 수 있는 생성형 AI 웹앱·서비스 기획 아이디어를 탐색하세요.",
    introKo:
      "단순 챗봇 래퍼를 넘어 최신 오픈 모델, 에이전트 프로토콜(MCP), 브라우저 온디바이스 기술을 실제 사용자 문제와 결합한 실행형 AI 서비스 기획안 모음입니다.",
    keywords: [
      "AI 서비스 기획 아이디어",
      "생성형 AI 웹앱 아이템",
      "AI 프로덕트 기획",
      "AI 에이전트 서비스 사례",
      "LLM 웹서비스 아이디어",
    ],
    match: (t) => t.track === "tech",
  },
  {
    slug: "side-project-mvp",
    labelKo: "사이드 프로젝트 · 주말 MVP",
    titleKo: "사이드 프로젝트 아이디어 · 1인 개발 주말 MVP 주제 추천",
    titleEn: "Solo Maker Weekend MVP & Side Project Ideas",
    seoTitle: "사이드 프로젝트 아이디어 · 1인 개발 주말 MVP 주제 추천",
    descriptionKo:
      "로그인과 무거운 백엔드 없이 48시간~1주일 안에 띄워 반응을 검증할 수 있는 1인 개발자용 사이드 프로젝트·주말 MVP 기획안을 모았습니다.",
    introKo:
      "처음 만들 때 과감히 뺄 스펙까지 명확히 정리해 1인 메이커가 주말 48시간~5일 안에 첫 프로토타입을 배포하고 실제 사용자 반응을 얻을 수 있는 실전 MVP 주제들입니다.",
    keywords: [
      "사이드 프로젝트 아이디어",
      "1인 개발 프로젝트 추천",
      "주말 MVP 주제",
      "웹서비스 토이 프로젝트",
      "인디 메이커 아이디어",
    ],
    match: (t) =>
      t.buildCadence.includes("3~5일") ||
      t.buildCadence.includes("48시간") ||
      t.sampleA.source === "show_hn" ||
      t.sampleA.source === "uneed",
  },
  {
    slug: "vibe-coding-topics",
    labelKo: "바이브코딩 프로젝트 추천",
    titleKo: "바이브코딩 프로젝트 추천 · 클로드 코드 커서로 만들 웹 서비스",
    titleEn: "Vibe Coding Web App Prompts & Blueprints",
    seoTitle: "바이브코딩 프로젝트 추천 · 클로드 코드 커서로 만들 웹 서비스",
    descriptionKo:
      "클로드 코드(Claude Code), 커서(Cursor)에 바로 복사해 첫 화면부터 구현할 수 있는 바이브코딩 웹 서비스 주제와 구조화 초기 프롬프트 모음입니다.",
    introKo:
      "모든 기획안마다 MVP 핵심 기능 3가지, 제외 스펙, 원본 기술 작동 원리가 구조화된 원클릭 AI 코딩 초기 프롬프트로 제공되어 바로 바이브코딩을 시작할 수 있습니다.",
    keywords: [
      "바이브코딩 프로젝트 추천",
      "클로드 코드 웹앱 만들기",
      "커서 AI 프로젝트 주제",
      "AI 코딩 프롬프트 모음",
      "노코드 바이브코딩 아이디어",
    ],
    match: (t) =>
      t.domainSlug === "creator-tool" ||
      t.sampleA.source === "github_trending" ||
      /코딩|프롬프트|에이전트|캔버스|스크립트/i.test(`${t.title} ${t.oneLineHook}`),
  },
  {
    slug: "startup-benchmarking",
    labelKo: "해외 스타트업 벤치마킹",
    titleKo: "해외 스타트업 벤치마킹 · 실리콘밸리 마이크로 SaaS 수익 모델 사례",
    titleEn: "Global Micro-SaaS & Verified Revenue Benchmarks",
    seoTitle: "해외 스타트업 벤치마킹 · 실리콘밸리 마이크로 SaaS 수익 모델 사례",
    descriptionKo:
      "TrustMRR 실제 결제 매출이 검증된 해외 마이크로 SaaS와 Product Hunt·Show HN 화제 신상 프로덕트를 국내 실정에 맞게 재해석한 벤치마킹 기획안입니다.",
    introKo:
      "추측이 아닌 실제 월 매출(MRR)과 글로벌 개발자 커뮤니티의 뜨거운 반응으로 수요가 검증된 해외 프로덕트 메커니즘을 해부해 새로운 서비스 기회로 엮었습니다.",
    keywords: [
      "해외 스타트업 벤치마킹",
      "마이크로 SaaS 수익 모델",
      "TrustMRR 매출 사례",
      "실리콘밸리 1인 창업 아이템",
      "해외 인기 웹서비스 모음",
    ],
    match: (t) =>
      t.sampleA.verifiedRevenue ||
      t.sampleA.source === "trustmrr" ||
      t.sampleA.source === "product_hunt",
  },
  {
    slug: "opensource-product-ideas",
    labelKo: "깃허브 오픈소스 활용 기획",
    titleKo: "깃허브 오픈소스 활용 기획 · 해커뉴스 프로덕트헌트 신기술 조합",
    titleEn: "GitHub Trending Open-Source Productization Ideas",
    seoTitle: "깃허브 오픈소스 활용 기획 · 해커뉴스 프로덕트헌트 신기술 조합",
    descriptionKo:
      "GitHub 최근 급상승 오픈소스 레포지토리와 Hacker News·Product Hunt 신기술을 비개발자도 바로 쓰는 웹 서비스로 제품화하는 기획 아이디어 모음입니다.",
    introKo:
      "터미널과 코드 속에 머물러 있던 최신 GitHub 오픈소스 엔진을 누구나 브라우저 첫 화면에서 3초 만에 체험하는 직관적 웹 프로덕트로 번역한 기획안들입니다.",
    keywords: [
      "깃허브 오픈소스 활용 기획",
      "해커뉴스 Show HN 인기 프로젝트",
      "오픈소스 제품화 아이디어",
      "GitHub 트렌딩 웹서비스",
      "프로덕트헌트 신상 조합",
    ],
    match: (t) =>
      t.sampleA.source === "github_trending" || t.sampleA.source === "show_hn",
  },
  {
    slug: "brand-digital-campaign",
    labelKo: "브랜드 · 패션 · 컬처 캠페인",
    titleKo: "브랜드 인터랙티브 캠페인 기획 · 패션 커머스 컬처 웹 레퍼런스",
    titleEn: "Brand Interactive Campaign & Fashion Culture Web Ideas",
    seoTitle: "브랜드 인터랙티브 캠페인 기획 · 패션 커머스 컬처 웹 레퍼런스",
    descriptionKo:
      "Hypebeast, Dazed, Put This On, Dezeen 등 글로벌 컬처 매거진 이슈와 최신 웹 기술을 이종교배한 브랜드 인터랙티브 캠페인·패션 커머스 기획 레퍼런스입니다.",
    introKo:
      "패션 아카이브, 한정판 협업 드롭, 팝업스토어, 스몰 브랜드 룩북에 촉각적 웹 인터랙션과 신기술을 결합해 자발적 공유를 부르는 디지털 캠페인 기획안입니다.",
    keywords: [
      "브랜드 인터랙티브 캠페인 기획",
      "패션 커머스 웹 레퍼런스",
      "팝업스토어 디지털 경험",
      "스몰 브랜드 룩북 웹사이트",
      "컬처 마케팅 아이디어",
    ],
    match: (t) =>
      t.track === "culture" &&
      (t.domainSlug === "brand-commerce" || t.domainSlug === "local-archive"),
  },
  {
    slug: "media-art-cinema-web",
    labelKo: "시네마 · 사진 · 음악 크리에이티브 웹",
    titleKo: "영화 사진 음악 크리에이티브 웹 기획 · 비주얼 아카이브 아이디어",
    titleEn: "Cinema, Photography & Music Creative Web Concepts",
    seoTitle: "영화 사진 음악 크리에이티브 웹 기획 · 비주얼 아카이브 아이디어",
    descriptionKo:
      "Letterboxd, IndieWire, PetaPixel, Booooooom, Colossal, CDM, Pitchfork 등 해외 예술·미디어 원출처와 WebGL·WebAudio 기술을 결합한 크리에이티브 웹 기획안입니다.",
    introKo:
      "독립영화 콘티 분석, 필름 암실 색보정, WebAudio 군집 신시사이저, 디지털 전시 도록 등 고감도 비주얼·사운드 취향을 웹 제품으로 풀어낸 크리에이티브 기획 모음입니다.",
    keywords: [
      "영화 사진 음악 웹 기획",
      "미디어아트 인터랙티브 웹",
      "비주얼 아카이브 웹사이트",
      "크리에이티브 코딩 아이디어",
      "독립 전시 디지털 도록",
    ],
    match: (t) =>
      t.domainSlug === "cinema-video" ||
      t.domainSlug === "photo-visual" ||
      t.domainSlug === "music-audio",
  },
  {
    slug: "micro-saas-trends",
    labelKo: "글로벌 인디해커 최신 트렌드",
    titleKo: "글로벌 인디해커 최신 런칭 트렌드 · 검증된 웹툴 아이디어",
    titleEn: "Global Indie Hacker Launch Trends & Micro-Tool Ideas",
    seoTitle: "글로벌 인디해커 최신 런칭 트렌드 · 검증된 웹툴 아이디어",
    descriptionKo:
      "매일 갱신되는 해외 인디해커 런칭 보드와 글로벌 컬처·AI 시그널을 교차 분석해 지금 가장 수요가 뜨거운 마이크로 웹툴 기획 아이디어를 제안합니다.",
    introKo:
      "거대한 올인원 플랫폼 대신 단 하나의 명확한 불편이나 취향 디깅을 3초 안에 풀어주는 글로벌 인디해커식 마이크로 웹툴 트렌드를 정리했습니다.",
    keywords: [
      "인디해커 최신 트렌드",
      "마이크로 웹툴 아이디어",
      "1인 SaaS 창업 아이템",
      "글로벌 신규 웹서비스",
      "검증된 프로덕트 아이디어",
    ],
    match: (t) =>
      t.sampleA.source === "trustmrr" ||
      t.sampleA.source === "product_hunt" ||
      t.sampleA.source === "uneed" ||
      t.track === "culture",
  },
];

export const DISCOVER_HUB_MAP: Record<string, DiscoverHub> = Object.fromEntries(
  DISCOVER_HUBS.map((h) => [h.slug, h])
);

export function getDiscoverHub(slug: string): DiscoverHub | undefined {
  return DISCOVER_HUB_MAP[slug];
}

export function getTreatmentsForDiscoverHub(
  hub: DiscoverHub,
  allTreatments: Treatment[],
  limit = 16
): Treatment[] {
  const matched = allTreatments.filter((t) => hub.match(t));
  if (matched.length >= 8) {
    return matched.slice(0, limit);
  }
  const seen = new Set(matched.map((t) => t.id));
  const padded = [...matched];
  for (const t of allTreatments) {
    if (padded.length >= Math.min(limit, allTreatments.length)) break;
    if (!seen.has(t.id)) {
      seen.add(t.id);
      padded.push(t);
    }
  }
  return padded;
}
