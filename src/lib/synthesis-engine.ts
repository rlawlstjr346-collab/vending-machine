import {
  CONCEPT_BLUEPRINTS,
  DOMAIN_LIST,
  DOMAIN_MAP,
  MECHANISM_LIST,
  MECHANISM_MAP,
} from "./domains";
import { sanitizeEditorialText, slugifyAscii } from "./text-clean";
import type {
  AiRadarSignal,
  BuilderSignal,
  DomainSlug,
  MechanismId,
  Treatment,
  TreatmentLineageNode,
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

export function formatShortMetric(builder: BuilderSignal): string {
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
  const poolSize = Math.min(14, scored.length);
  const idx = ((offset % poolSize) + poolSize) % poolSize;
  return scored[idx].signal;
}

function buildOverseasProofKo(builder: BuilderSignal): string {
  const mech = MECHANISM_MAP[builder.mechanism];
  const cleanTagline = sanitizeEditorialText(builder.taglineKo || builder.summaryKo);
  if (builder.verifiedRevenue) {
    return `${builder.name}은 ${builder.tractionLabel}의 실제 결제 수익으로 수요가 입증된 해외 서비스입니다. '${cleanTagline}'라는 단순한 한 가지 문제에 집중해, ${mech.simpleActionKo}으로 유료 사용자를 빠르게 모았습니다.`;
  }
  return `${builder.name}은 ${builder.sourceLabel}에서 ${builder.tractionLabel}의 호응을 얻은 해외 신상 프로덕트입니다. '${cleanTagline}' 경험을 무거운 가입 절차 없이 열어주고, ${mech.simpleActionKo}으로 초기 팬을 끌어모았습니다.`;
}

function buildBottleneckSolvedKo(radar: AiRadarSignal): string {
  const techName = radar.entities[0] || radar.platformId;
  const cleanWhat = sanitizeEditorialText(radar.whatKo || radar.highlightSummary).slice(0, 125);
  return `최근 화제가 된 ${techName} 계열 소식('${radar.titleKo}')의 아이디어나 공개 도구를 연결하면, 예전에는 사람이 일일이 분류·정리해야 했던 데이터 입력 단계를 몇 줄의 코드만으로 자동화할 수 있습니다. (${cleanWhat})`;
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
      title: `${topic} 사진이나 링크 한 개로 시세·대안을 비교해 주는 디깅 웹`,
      hook: `관심 있는 ${topic} 링크나 사진을 올리면 핵심 스펙, 가격대, 비슷한 대안 3가지를 한눈에 정리해 선택을 쉽게 만들어 줍니다.`,
      features: [
        `${topic} 관련 사진이나 상품·글 링크를 올려 핵심 특징과 가격 정보를 자동으로 정리합니다.`,
        `비슷한 취향의 대안 후보 3개를 깔끔한 비교 카드로 나란히 띄워 장단점을 확인합니다.`,
        `마음에 든 항목만 골라 내 보드에 저장하고 링크 하나로 친구에게 바로 공유합니다.`,
      ],
    },
    {
      title: `흩어진 ${topic} 추천 글과 영상에서 핵심 포인트만 모아두는 아카이브`,
      hook: `유튜브·블로그·SNS에 흩어진 ${topic} 정보를 링크만 넣어두면 꼭 필요한 팁과 추천 목록만 깔끔한 카드로 정리해 줍니다.`,
      features: [
        `${topic} 영상이나 글 링크를 붙여 넣으면 핵심 팁 3줄과 참고 구간만 자동으로 추려줍니다.`,
        `가격대·난이도·분위기 태그로 정리해 필요할 때마다 3초 만에 다시 꺼내 봅니다.`,
        `모아둔 나만의 ${topic} 리스트를 1페이지 가이드로 묶어 지인이나 커뮤니티에 공유합니다.`,
      ],
    },
    {
      title: `고민되는 ${topic} 후보 3가지를 한 화면에 놓고 고르는 결정 보드`,
      hook: `${topic}을 고를 때 탭을 수십 개 띄우지 않고, 최종 후보 3개를 같은 기준 카드로 비교해 1분 만에 결정할 수 있게 돕습니다.`,
      features: [
        `후보 ${topic} 2~4개의 링크를 넣으면 사진·가격·핵심 장점이 같은 규격 카드로 정렬됩니다.`,
        `내가 중요하게 보는 기준에 체크 표시를 남기며 가장 잘 맞는 선택지를 좁혀갑니다.`,
        `결정이 애매할 땐 투표 링크를 만들어 주변 사람들의 의견을 바로 받아봅니다.`,
      ],
    },
    {
      title: `이번 주 뜨는 ${topic} 소식과 실사용자 반응을 모아보는 큐레이션 지도`,
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
    domainSlug,
    customTopic,
    variantIndex = 0,
    parentTreatment = null,
    addedBuilder = null,
    mechanismOverride = null,
    nowIso = new Date().toISOString(),
  } = options;

  const domain = DOMAIN_MAP[domainSlug];
  const effectiveMechanism: MechanismId = mechanismOverride || builder.mechanism;
  const mech = MECHANISM_MAP[effectiveMechanism];
  const cleanTopic = customTopic ? sanitizeEditorialText(customTopic) : null;
  const seedKey = `${builder.id}|${radar.id}|${domainSlug}|${effectiveMechanism}|${cleanTopic || ""}|${addedBuilder?.id || ""}|${variantIndex}`;
  const hash = deterministicHash(seedKey);

  const isEvolution = Boolean(parentTreatment && addedBuilder);
  const shortId = hash.toString(36).slice(0, 6);
  const id = isEvolution
    ? `tr-c-${slugifyAscii(builder.name).slice(0, 14)}-${shortId}`
    : `tr-${slugifyAscii(domainSlug).slice(0, 8)}-${slugifyAscii(builder.name).slice(0, 14)}-${shortId}`;

  const cadence = CADENCE_OPTIONS[hash % CADENCE_OPTIONS.length];

  // Pick a vivid human-written concept blueprint for (domainSlug, effectiveMechanism)
  const pool =
    CONCEPT_BLUEPRINTS[domainSlug][effectiveMechanism] ||
    CONCEPT_BLUEPRINTS[domainSlug]["drop-validation"];
  const blueprint = pool[Math.abs(variantIndex + hash) % pool.length];

  let title: string;
  let oneLineHook: string;
  let firstThreeSecondsUx: string;
  let mvpFeatures: [string, string, string];
  let sampleA2: Treatment["sampleA2"] = null;

  if (isEvolution && parentTreatment && addedBuilder) {
    const addedMech = MECHANISM_MAP[addedBuilder.mechanism];
    const addedPool = CONCEPT_BLUEPRINTS[domainSlug][addedBuilder.mechanism] || pool;
    const addedBlueprint = addedPool[hash % addedPool.length];
    const baseShortTitle = parentTreatment.title.replace(/\s*\(.+?\)\s*$/, "");

    title = sanitizeEditorialText(
      `${baseShortTitle} + ${addedMech.shortLabel} 확장판`
    );
    oneLineHook = sanitizeEditorialText(
      `기존 기획에 해외 인기 서비스 ${addedBuilder.name}(${formatShortMetric(addedBuilder)})의 '${addedMech.shortLabel}' 기능을 더해, 탐색부터 공유·재방문까지 한 번에 이어지게 만든 2차 확장안입니다.`
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
    title = custom.title;
    oneLineHook = custom.hook;
    firstThreeSecondsUx = custom.hook;
    mvpFeatures = custom.features;
  } else {
    title = sanitizeEditorialText(blueprint.title);
    oneLineHook = sanitizeEditorialText(blueprint.hook);
    firstThreeSecondsUx = sanitizeEditorialText(
      `회원가입 없이 첫 화면에서 바로 써볼 수 있습니다. ${blueprint.hook}`
    );
    mvpFeatures = blueprint.features.map((f) => sanitizeEditorialText(f)) as [string, string, string];
  }

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
    createdAt: nowIso,
    updatedAt: nowIso,
    domainSlug,
    domainLabel: domain.label,
    domainColor: domain.color,
    customTopic: cleanTopic,
    title,
    oneLineHook,
    firstThreeSecondsUx,
    buildCadence: cadence,
    sampleA: {
      builderId: builder.id,
      name: builder.name,
      url: builder.url,
      sourceLabel: builder.sourceLabel,
      tractionLabel: builder.tractionLabel,
      shortMetricLabel: formatShortMetric(builder),
      verifiedRevenue: builder.verifiedRevenue,
      mechanism: effectiveMechanism,
      mechanismLabel: mech.label,
      overseasProofKo: buildOverseasProofKo({ ...builder, mechanism: effectiveMechanism }),
    },
    sampleA2,
    sampleB: {
      radarId: radar.id,
      titleKo: sanitizeEditorialText(radar.titleKo),
      canonicalUrl: radar.canonicalUrl,
      platformId: radar.platformId,
      signalType: radar.planningMeta.signalType,
      productDomain: radar.planningMeta.productDomain,
      benchmarkPoint: sanitizeEditorialText(radar.planningMeta.benchmarkPoint),
      bottleneckSolvedKo: buildBottleneckSolvedKo(radar),
    },
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
    ? `\n- 추가 결합한 해외 기능: [${t.sampleA2.name}](${t.sampleA2.url}) (${t.sampleA2.tractionLabel}) — ${t.sampleA2.addedFeatureKo}`
    : "";

  return `# ${t.title}

- 분야: ${t.domainLabel}${t.customTopic ? ` (맞춤 주제: ${t.customTopic})` : ""}
- 예상 구현 기간: ${t.buildCadence}

## 한 줄 정의
${t.oneLineHook}

## 벤치마킹한 해외 서비스
- 서비스명: [${t.sampleA.name}](${t.sampleA.url}) (${t.sampleA.shortMetricLabel})
- 핵심 포인트: ${t.sampleA.overseasProofKo}${sampleA2Line}

## 이렇게 만듭니다 · 핵심 기능 3가지
1. ${t.mvpFeatures[0]}
2. ${t.mvpFeatures[1]}
3. ${t.mvpFeatures[2]}

- 처음 만들 때 과감히 뺄 기능: ${t.scopeCutoff[0]}

## 결합할 최신 AI 기술
- 참고 기술: [${t.sampleB.titleKo}](${t.sampleB.canonicalUrl}) (${t.sampleB.platformId})
- 활용 이유: ${t.sampleB.bottleneckSolvedKo}
`;
}

export function treatmentToCodingPrompt(t: Treatment): string {
  return `다음 웹 서비스 MVP의 첫 번째 프로토타입을 구현해 주세요.

[서비스 개요]
- 제목: ${t.title}
- 분야: ${t.domainLabel}${t.customTopic ? ` (주제: ${t.customTopic})` : ""}
- 한 줄 설명: ${t.oneLineHook}
- 목표 개발 기간: ${t.buildCadence}

[벤치마킹 레퍼런스]
- 해외 참고 서비스: ${t.sampleA.name} (${t.sampleA.url}) — ${t.sampleA.shortMetricLabel}
- 핵심 동작 원리: ${t.sampleA.overseasProofKo}${
    t.sampleA2
      ? `\n- 추가 이식할 기능: ${t.sampleA2.name} (${t.sampleA2.url}) — ${t.sampleA2.addedFeatureKo}`
      : ""
  }
- 결합할 AI 기술 참고: ${t.sampleB.titleKo} (${t.sampleB.canonicalUrl})

[반드시 구현할 핵심 기능 3가지]
1. ${t.mvpFeatures[0]}
2. ${t.mvpFeatures[1]}
3. ${t.mvpFeatures[2]}

[처음 만들 때 과감히 뺄 기능]
- ${t.scopeCutoff[0]}
${t.scopeCutoff[1] ? `- ${t.scopeCutoff[1]}` : ""}

[구현 가이드]
- 스택: Next.js App Router + TypeScript + Tailwind CSS
- 로그인 없이 첫 화면에서 핵심 기능을 바로 체험할 수 있게 만들고, 유료 API 키가 없어도 기본 흐름이 동작하도록 폴백 로직을 포함해 주세요.
- 군더더기 없는 깔끔한 카드 UI와 높은 글자 대비로 가독성을 최우선으로 설계해 주세요.`;
}
