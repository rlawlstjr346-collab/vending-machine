import type { DomainSlug, MechanismId } from "./types";

export interface DomainProfile {
  slug: DomainSlug;
  label: string;
  shortLabel: string;
  tagline: string;
  description: string;
  targetUsers: string;
  affinityCategories: string[];
  affinityDomains: string[];
  objectNoun: string;
  artifactNoun: string;
  workflowVerb: string;
  twistFrames: string[];
  defaultCutoffs: string[];
  defaultKpis: string[];
}

export interface MechanismProfile {
  id: MechanismId;
  label: string;
  shortLabel: string;
  corePatternKo: string;
  keywords: string[];
  graftFeatureByDomain: Record<DomainSlug, string>;
}

export const DOMAIN_LIST: DomainProfile[] = [
  {
    slug: "kream-commerce",
    label: "KREAM·커머스",
    shortLabel: "KREAM·커머스",
    tagline: "한정판 리셀·스니커즈·스트릿 패션의 시세 탐색과 드롭 의사결정 웨지",
    description:
      "리셀 거래소와 스트릿 커머스 사용자가 발매가·실거래가 격차, 정품 검수 포인트, 착용 컷 매칭을 3초 안에 판단하도록 돕는 경량 기획 영역입니다.",
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
    tagline: "감독·조감독·영상 제작팀의 레퍼런스 샷 분해와 콘티·프리비즈 설계 웨지",
    description:
      "촬영 전 레퍼런스 컷 수집, 렌즈·조명 메모, 타임코드 기반 씬 비트 정리를 1인 제작자나 소규모 프로덕션이 몇 분 안에 끝내도록 압축하는 영역입니다.",
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
    tagline: "포토그래퍼·패션 브랜드의 무드보드, 톤 일관성 검수 및 룩북 큐레이션 웨지",
    description:
      "시즌 룩북 촬영, 필름 색감 아카이빙, 모델·소품 시안 비교에서 흩어진 이미지 폴더를 1px 그리드 기준의 의사결정 시트로 통합하는 영역입니다.",
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
    tagline: "비트메이커·프로듀서의 레퍼런스 구간 채집, BPM·키 매칭 및 샘플 팩 조합 웨지",
    description:
      "디깅한 트랙의 4마디 루프, 드럼 질감, 코드 진행을 태그로 구조화하고 AI 스템·메타데이터 분석으로 즉시 작업에 얹는 제작 보조 영역입니다.",
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
    tagline: "성수·한남·도쿄 등 로컬 팝업, 전시, 독립서점·바이닐 바를 엮는 취향 지도 웨지",
    description:
      "인스타그램에 흩어져 사라지는 전시·팝업·편집숍 정보를 큐레이터 관점의 동선 시트와 영구 아카이브 지도로 구조화하는 로컬 컬처 영역입니다.",
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

export const DOMAIN_MAP: Record<DomainSlug, DomainProfile> = Object.fromEntries(
  DOMAIN_LIST.map((d) => [d.slug, d])
) as Record<DomainSlug, DomainProfile>;

export const MECHANISM_LIST: MechanismProfile[] = [
  {
    id: "visual-price-match",
    label: "시각 탐색·가격 매칭",
    shortLabel: "시각·시세 매칭",
    corePatternKo:
      "이미지·스펙 입력 하나로 유사 상품이나 시장 시세를 즉시 대조해 구매·선별 불확실성을 제거하는 구조",
    keywords: [
      "price",
      "pricing",
      "deal",
      "shop",
      "store",
      "commerce",
      "ecommerce",
      "match",
      "search",
      "compare",
      "invoice",
      "revenue",
      "mrr",
      "analytics",
      "saas",
      "catalog",
      "product",
      "market",
      "valuation",
      "brand",
      "design",
      "photo",
      "image",
      "visual",
    ],
    graftFeatureByDomain: {
      "kream-commerce":
        "착샷 이미지나 모델 코드 입력 시 해외 리셀가와 국내 실거래가 스프레드를 한 표로 매칭하는 가격 격차 레이더",
      "film-previs":
        "레퍼런스 스틸컷 업로드 시 유사 구도·렌즈 화각과 대략적 프로덕션 난이도를 함께 비교해 주는 샷 매칭 패널",
      "photo-lookbook":
        "레퍼런스 룩북 이미지에서 색상 팔레트·조명 대비와 유사 브랜드 레퍼런스 톤을 자동 대조하는 스타일 매처",
      "music-sampling":
        "레퍼런스 트랙의 에너지·질감 지표를 분석해 유사 톤의 샘플 팩과 라이선스 비용 체급을 나란히 비교하는 매처",
      "culture-map":
        "팝업·전시 포스터 이미지 하나로 입장료·예약 난이도·인근 유사 취향 공간을 자동 매칭하는 탐색 카드",
    },
  },
  {
    id: "timestamp-archive",
    label: "타임스탬프·구간 아카이빙",
    shortLabel: "구간 아카이빙",
    corePatternKo:
      "긴 영상·오디오·로그에서 핵심 순간만 초 단위 타임스탬프와 구조화 메모로 잘라내 재사용 자산으로 축적하는 구조",
    keywords: [
      "video",
      "clip",
      "timestamp",
      "transcript",
      "meeting",
      "record",
      "capture",
      "note",
      "bookmark",
      "archive",
      "history",
      "timeline",
      "log",
      "summary",
      "youtube",
      "podcast",
      "watch",
      "read",
      "doc",
      "pdf",
      "knowledge",
      "memory",
    ],
    graftFeatureByDomain: {
      "kream-commerce":
        "드롭 발표·착샷 리뷰 영상의 특정 초(실물 디테일·사이즈 팁)만 잘라 모델 카드에 고정하는 타임스탬프 리뷰 클립",
      "film-previs":
        "레퍼런스 영상 URL에서 컷 전환 타임코드·카메라 워크·대사 비트를 자동 추출해 샷 리스트로 꽂아주는 구간 아카이버",
      "photo-lookbook":
        "런웨이·백스테이지 영상에서 특정 착장 프레임을 타임스탬프로 캡처해 시즌 룩북 컨택트 시트에 바로 적재하는 클리퍼",
      "music-sampling":
        "유튜브·데모 음원의 4마디 루프 시작·종료 초를 원클릭 마킹하고 BPM·키 메모와 함께 크레이트에 저장하는 구간 클리퍼",
      "culture-map":
        "전시 도슨트·공간 투어 영상에서 핵심 관람 포인트 타임스탬프만 뽑아 공간 아카이브 카드에 붙이는 하이라이트 로그",
    },
  },
  {
    id: "geo-curation",
    label: "지도·로컬 큐레이션",
    shortLabel: "로컬 큐레이션",
    corePatternKo:
      "흩어진 디렉터리·장소·커뮤니티 데이터를 특정 취향 축과 마감 시한 기준으로 걸러 즉시 실행 가능한 리스트로 묶는 구조",
    keywords: [
      "map",
      "local",
      "travel",
      "city",
      "directory",
      "list",
      "curat",
      "discover",
      "guide",
      "place",
      "event",
      "calendar",
      "schedule",
      "trip",
      "weather",
      "hub",
      "index",
      "atlas",
      "finder",
    ],
    graftFeatureByDomain: {
      "kream-commerce":
        "성수·한남·도쿄 오프라인 드롭 팝업과 빈티지 셀렉트숍의 발매 일정·재고 제보를 구역별로 묶는 드롭 로케이터",
      "film-previs":
        "씬 분위기 키워드(우중 골목, 모던 콘크리트 등)에 맞는 실제 로케이션 헌팅 스팟과 채광 시간대를 묶는 로케이션 시트",
      "photo-lookbook":
        "자연광 시간대·배경 텍스처 기준으로 야외 룩북 스팟과 실내 렌탈 스튜디오를 반경별로 필터링하는 촬영지 큐레이터",
      "music-sampling":
        "도시별 바이닐 숍·리스닝 바·인디 공연장의 장르 아카이브와 디깅 추천 트랙을 한 지도에 엮는 디깅 로케이터",
      "culture-map":
        "이번 주 종료 임박 팝업·전시·독립서점을 도보 15분 클러스터와 취향 태그로 자동 묶어주는 반나절 동선 큐레이터",
    },
  },
  {
    id: "canvas-compare",
    label: "캔버스·비교 보드",
    shortLabel: "캔버스·비교",
    corePatternKo:
      "여러 시안·문서·UI 변형을 한 화면의 고정 그리드나 캔버스에 나란히 띄워 빠른 의사결정과 피드백 합의를 이끄는 구조",
    keywords: [
      "canvas",
      "board",
      "editor",
      "studio",
      "whiteboard",
      "slide",
      "deck",
      "layout",
      "ui",
      "ux",
      "figma",
      "diagram",
      "flow",
      "template",
      "builder",
      "workspace",
      "review",
      "feedback",
      "diff",
      "grid",
      "portfolio",
      "landing",
    ],
    graftFeatureByDomain: {
      "kream-commerce":
        "관심 스니커즈·아우터 3~4종의 실거래 추이·소재·코디 컷을 한 화면에 병렬 고정해 최종 1픽을 고르는 비교 시트",
      "film-previs":
        "시퀀스별 레퍼런스 스틸·조명 도면·대사 톤을 1px 그리드 캔버스에 나란히 배치해 감독과 촬영감독이 합의하는 프리비즈 보드",
      "photo-lookbook":
        "동일 착장의 A/B 테스트 컷을 나란히 고정하고 색감·크롭·표정 체크마크를 좌표 핀으로 남기는 컨택트 비교 보드",
      "music-sampling":
        "후보 비트 버전 A/B와 레퍼런스 트랙의 파형·구간 메모를 한 보드에 병렬 배치해 편곡 방향을 확정하는 트랙 비교 시트",
      "culture-map":
        "주말 후보 코스 A안(성수 전시)과 B안(한남 팝업)의 이동 거리·예산·운영시간을 나란히 비교해 확정하는 코스 비교 보드",
    },
  },
  {
    id: "audio-stem",
    label: "오디오·음성·멀티모달 처리",
    shortLabel: "오디오·멀티모달",
    corePatternKo:
      "음성·사운드·멀티모달 입력을 구조화된 텍스트·메타데이터·트랙 단위로 분해해 창작 및 작업 진입 장벽을 낮추는 구조",
    keywords: [
      "audio",
      "music",
      "voice",
      "sound",
      "speech",
      "tts",
      "stt",
      "stem",
      "beat",
      "song",
      "midi",
      "synth",
      "radio",
      "podcast",
      "whisper",
      "transcribe",
      "speak",
    ],
    graftFeatureByDomain: {
      "kream-commerce":
        "해외 스니커즈 유튜버·팟캐스트 리뷰 음성을 자동 전사해 사이즈감·착화감·리셀 전망 핵심 3줄만 추출하는 보이스 브리퍼",
      "film-previs":
        "감독의 구두 씬 설명 음성 메모를 즉시 샷 리스트·사운드 톤·배경음 무드 시트로 구조화하는 보이스-투-프리비즈 변환기",
      "photo-lookbook":
        "촬영장 현장 디렉터의 짧은 음성 피드백을 컷 번호별 리터칭 지시 체크리스트로 자동 변환하는 보이스 셀렉트 로그",
      "music-sampling":
        "업로드한 레퍼런스 오디오나 허밍 데모에서 BPM·키·드럼/베이스 성향 태그를 추출해 샘플 크레이트를 자동 매칭하는 스템 인덱서",
      "culture-map":
        "공간 방문 직후 남긴 30초 음성 감상 메모를 분위기 키워드·추천 시간대·재방문 포인트가 정리된 아카이브 카드로 변환하는 보이스 로그",
    },
  },
  {
    id: "drop-validation",
    label: "드롭·커뮤니티 검증",
    shortLabel: "드롭·검증",
    corePatternKo:
      "신규 출시·대기자·투표·검증 지표를 공개 보드로 투명하게 노출해 초기 수요와 신뢰를 빠르게 입증하는 구조",
    keywords: [
      "launch",
      "drop",
      "waitlist",
      "vote",
      "rank",
      "leaderboard",
      "community",
      "verify",
      "verified",
      "trust",
      "social",
      "newsletter",
      "submit",
      "poll",
      "beta",
      "indie",
      "maker",
      "startup",
      "founder",
      "growth",
      "seo",
      "agent",
      "cli",
      "open source",
    ],
    graftFeatureByDomain: {
      "kream-commerce":
        "출시 예정 협업 드롭의 커뮤니티 체감 수요 투표와 예상 리셀 밴드를 발매 48시간 전에 집계하는 드롭 수요 검증 보드",
      "film-previs":
        "독립영화·단편 시놉시스와 6컷 프리비즈 시트를 비공개 링크로 돌려 제작 동료의 씬별 몰입도 피드백을 집계하는 사전 검증 보드",
      "photo-lookbook":
        "신규 시즌 룩북 후보 10컷을 핵심 팬·바이어에게 비공개 투표 링크로 배포해 메인 썸네일과 주력 착장을 사전 검증하는 룩북 폴",
      "music-sampling":
        "미발매 비트·샘플 팩 프리뷰 15초 스니펫을 리스너·래퍼에게 공개해 저장률 상위 루프만 정식 팩으로 묶는 드롭 검증 보드",
      "culture-map":
        "신규 오픈 팝업·전시의 실방문자 한 줄 검증 태그(웨이팅 실제 시간·포토존 밀도)를 실시간 집계하는 로컬 현장 검증 피드",
    },
  },
];

export const MECHANISM_MAP: Record<MechanismId, MechanismProfile> =
  Object.fromEntries(MECHANISM_LIST.map((m) => [m.id, m])) as Record<
    MechanismId,
    MechanismProfile
  >;

export function isValidDomainSlug(slug: string): slug is DomainSlug {
  return slug in DOMAIN_MAP;
}
