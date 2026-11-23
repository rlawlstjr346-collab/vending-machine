import { DOMAIN_LIST, DOMAIN_MAP, MECHANISM_LIST, MECHANISM_MAP } from "./domains";
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
  "5일 · 2인 직장인 TF 웨지",
  "7일 · 초기 스타트업 1차 MVP",
  "10일 · 2인 스튜디오 실전 파일럿",
  "4일 · 주말 해커톤 검증형 웨지",
  "2주 · 소규모 TF 베타 런칭",
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
  const poolSize = Math.min(12, scored.length);
  const idx = ((offset % poolSize) + poolSize) % poolSize;
  return scored[idx].signal;
}

function buildOverseasProofKo(builder: BuilderSignal): string {
  const mech = MECHANISM_MAP[builder.mechanism];
  const metricPhrase = builder.verifiedRevenue
    ? `실제 검증 매출(${builder.tractionLabel})로 지불 의사가 입증된`
    : `${builder.sourceLabel}에서 ${builder.tractionLabel} 반응을 확보한`;
  const cleanSummary = sanitizeEditorialText(builder.summaryKo || builder.taglineKo);
  return `${builder.name}은 ${metricPhrase} 해외 프로덕트입니다. ${cleanSummary} 핵심 흥행 동력은 '${mech.label}' 구조로, ${builder.painPointKo}`;
}

function buildBottleneckSolvedKo(radar: AiRadarSignal, domainSlug: DomainSlug): string {
  const domain = DOMAIN_MAP[domainSlug];
  const benchmark = sanitizeEditorialText(radar.planningMeta.benchmarkPoint);
  const what = sanitizeEditorialText(radar.whatKo || radar.highlightSummary).slice(0, 130);
  return `'${radar.titleKo}'(${radar.platformId})의 '${benchmark}' 역량을 접목하면, 소규모 TF가 ${domain.objectNoun} 데이터를 수작업으로 분류·정규화하던 초기 구현 병목을 API/오픈소스 파이프라인으로 대체할 수 있습니다. (${what})`;
}

function buildThreeMvpFeatures(
  builder: BuilderSignal,
  radar: AiRadarSignal,
  domainSlug: DomainSlug,
  customTopic?: string | null
): [string, string, string] {
  const domain = DOMAIN_MAP[domainSlug];
  const mech = MECHANISM_MAP[builder.mechanism];
  const subject = customTopic?.trim() ? customTopic.trim() : domain.objectNoun;
  const primaryFeature = customTopic?.trim()
    ? `'${subject}' URL·이미지·메모 입력 시 ${builder.name}의 ${mech.shortLabel} 구조로 핵심 속성과 비교 지표를 3초 안에 정규화하는 원샷 수집 시트`
    : mech.graftFeatureByDomain[domainSlug];

  const techEntity = radar.entities[0] || radar.platformId;
  const secondFeature = `${techEntity} 기반 '${sanitizeEditorialText(radar.planningMeta.benchmarkPoint)}' 파이프라인을 붙여 ${subject} 항목별 핵심 판단 근거 3줄과 추천 우선순위를 자동 태깅하는 경량 분석 엔진`;

  const thirdFeature = `선별한 ${subject} 비교 결과를 로그인 없이 1클릭 공유 URL과 마크다운/PDF 시트로 내보내 팀·커뮤니티 피드백을 즉시 수렴하는 ${domain.artifactNoun} 퍼블리셔`;

  return [
    sanitizeEditorialText(primaryFeature),
    sanitizeEditorialText(secondFeature),
    sanitizeEditorialText(thirdFeature),
  ];
}

export interface SynthesizeOptions {
  builder: BuilderSignal;
  radar: AiRadarSignal;
  domainSlug: DomainSlug;
  customTopic?: string | null;
  variantIndex?: number;
  parentTreatment?: Treatment | null;
  addedBuilder?: BuilderSignal | null;
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
    nowIso = new Date().toISOString(),
  } = options;

  const domain = DOMAIN_MAP[domainSlug];
  const mech = MECHANISM_MAP[builder.mechanism];
  const cleanTopic = customTopic ? sanitizeEditorialText(customTopic) : null;
  const seedKey = `${builder.id}|${radar.id}|${domainSlug}|${cleanTopic || ""}|${addedBuilder?.id || ""}|${variantIndex}`;
  const hash = deterministicHash(seedKey);

  const isEvolution = Boolean(parentTreatment && addedBuilder);
  const shortId = hash.toString(36).slice(0, 6);
  const id = isEvolution
    ? `tr-c-${slugifyAscii(builder.name).slice(0, 14)}-${shortId}`
    : `tr-${slugifyAscii(domainSlug).slice(0, 8)}-${slugifyAscii(builder.name).slice(0, 14)}-${shortId}`;

  const cadence = CADENCE_OPTIONS[hash % CADENCE_OPTIONS.length];
  const twistFrame = domain.twistFrames[hash % domain.twistFrames.length];

  const baseFeatures = buildThreeMvpFeatures(builder, radar, domainSlug, cleanTopic);
  let mvpFeatures: [string, string, string] = baseFeatures;
  let title: string;
  let oneLineHook: string;
  let firstThreeSecondsUx: string;
  let twistSummaryKo: string;
  let sampleA2: Treatment["sampleA2"] = null;

  if (isEvolution && parentTreatment && addedBuilder) {
    const addedMech = MECHANISM_MAP[addedBuilder.mechanism];
    const graftedFeature = addedMech.graftFeatureByDomain[domainSlug];
    title = cleanTopic
      ? `[${cleanTopic}] ${builder.name} × ${addedBuilder.name} 연쇄 합성 워크벤치`
      : `${domain.shortLabel}: ${builder.name} 기반에 ${addedBuilder.name}의 ${addedMech.shortLabel}을 얹은 2차 진화 시트`;
    oneLineHook = sanitizeEditorialText(
      `1차 기획(${builder.name}의 ${mech.shortLabel})에 해외 검증 프로덕트 ${addedBuilder.name}(${addedBuilder.tractionLabel})의 ${addedMech.shortLabel} 레이어를 샘플링해 의사결정 밀도를 2배로 끌어올린 파생 웨지`
    );
    firstThreeSecondsUx = sanitizeEditorialText(
      `진입 즉시 1차 ${domain.artifactNoun} 옆 패널에 ${addedBuilder.name} 방식의 '${addedMech.shortLabel}' 검증 카드가 동시 렌더링되어, 클릭 한 번으로 비교·확정까지 끝내는 단일 화면`
    );
    twistSummaryKo = sanitizeEditorialText(
      `1차 트리트먼트 '${parentTreatment.title}'의 핵심 웨지를 유지하되, ${addedBuilder.name}(${addedBuilder.sourceLabel} · ${addedBuilder.tractionLabel})에서 입증된 '${addedMech.label}' 메커니즘을 2번째 핵심 기능으로 이식해 리텐션 고리를 보강했습니다.`
    );
    mvpFeatures = [
      parentTreatment.mvpFeatures[0],
      sanitizeEditorialText(`[${addedBuilder.name} 추가 샘플링] ${graftedFeature}`),
      parentTreatment.mvpFeatures[2],
    ];
    sampleA2 = {
      builderId: addedBuilder.id,
      name: addedBuilder.name,
      url: addedBuilder.url,
      sourceLabel: addedBuilder.sourceLabel,
      tractionLabel: addedBuilder.tractionLabel,
      mechanismLabel: addedMech.label,
      addedFeatureKo: sanitizeEditorialText(
        `${addedBuilder.name}의 '${addedMech.label}' 핵심 구조(${addedBuilder.taglineKo})를 1차 기획의 보조 검증·리텐션 레이어로 이식`
      ),
    };
  } else {
    const subjectLabel = cleanTopic || domain.shortLabel;
    title = cleanTopic
      ? `${cleanTopic} — ${builder.name}의 ${mech.shortLabel}을 이식한 실전 웨지`
      : `${domain.shortLabel} × ${builder.name} 방식의 ${mech.shortLabel} 워크벤치`;
    oneLineHook = sanitizeEditorialText(
      `해외 검증 프로덕트 ${builder.name}(${builder.tractionLabel})의 '${mech.label}' 구조를 ${subjectLabel} 현장에 맞게 압축하고, AI Radar '${radar.titleKo}' 기술로 수작업 병목을 없앤 2주 이내 TF용 마이크로 서비스`
    );
    firstThreeSecondsUx = sanitizeEditorialText(
      `회원가입 없이 첫 화면에 ${cleanTopic || domain.objectNoun} 링크나 키워드 1개를 넣으면, 3초 안에 ${builder.name} 스타일의 구조화 비교 시트와 실행 체크리스트가 우측 지면에 즉시 펼쳐지는 단일 뷰`
    );
    twistSummaryKo = sanitizeEditorialText(
      `${twistFrame}. 원형 서비스 ${builder.name}의 강점(${builder.taglineKo})을 그대로 복제하지 않고, ${cleanTopic ? `'${cleanTopic}' 주제 사용자` : domain.targetUsers}가 매일 반복하는 '${domain.workflowVerb}' 순간에만 집중하도록 범위를 절반 이하로 도려냈습니다.`
    );
  }

  const lineage: TreatmentLineageNode[] = isEvolution && parentTreatment && addedBuilder
    ? [
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
          title: parentTreatment.title,
          treatmentId: parentTreatment.id,
          builderId: builder.id,
          builderName: builder.name,
        },
        {
          step: "C",
          label: "2차 합성 C",
          title: `+ ${addedBuilder.name} (${MECHANISM_MAP[addedBuilder.mechanism].shortLabel})`,
          treatmentId: id,
          builderId: addedBuilder.id,
          builderName: addedBuilder.name,
        },
      ]
    : [
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
          title: title,
          treatmentId: id,
          builderId: builder.id,
          builderName: builder.name,
        },
      ];

  const scopeCutoff = [
    ...domain.defaultCutoffs,
    `초기 2주 MVP에서 자체 대형 파운데이션 모델 학습 및 다중 권한 엔터프라이즈 어드민 제외`,
  ];

  return {
    id,
    slug: id,
    createdAt: nowIso,
    updatedAt: nowIso,
    domainSlug,
    domainLabel: domain.label,
    customTopic: cleanTopic,
    title: sanitizeEditorialText(title),
    oneLineHook,
    firstThreeSecondsUx,
    buildCadence: cadence,
    sampleA: {
      builderId: builder.id,
      name: builder.name,
      url: builder.url,
      sourceLabel: builder.sourceLabel,
      tractionLabel: builder.tractionLabel,
      verifiedRevenue: builder.verifiedRevenue,
      mechanism: builder.mechanism,
      mechanismLabel: mech.label,
      overseasProofKo: buildOverseasProofKo(builder),
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
      bottleneckSolvedKo: buildBottleneckSolvedKo(radar, domainSlug),
    },
    twistSummaryKo,
    mvpFeatures,
    scopeCutoff,
    targetKpis: domain.defaultKpis,
    lineage,
    synthesisMode: "deterministic",
    parentTreatmentId: parentTreatment?.id ?? null,
    variantIndex,
  };
}

export function generateSeedTreatments(
  builders: BuilderSignal[],
  radars: AiRadarSignal[],
  count = 40,
  nowIso = new Date().toISOString()
): Treatment[] {
  if (builders.length === 0 || radars.length === 0) return [];

  // Prioritize verified revenue & high-traction builders across sources for rich diversity
  const sortedBuilders = [...builders].sort((a, b) => {
    const revDiff = Number(b.verifiedRevenue) - Number(a.verifiedRevenue);
    if (revDiff !== 0) return revDiff;
    return b.tractionValue - a.tractionValue;
  });

  // Interleave by source so Show HN, TrustMRR, Product Hunt, and Uneed all appear prominently
  const buckets = new Map<string, BuilderSignal[]>();
  for (const b of sortedBuilders) {
    const list = buckets.get(b.source) || [];
    list.push(b);
    buckets.set(b.source, list);
  }
  const sourceOrder = ["trustmrr", "show_hn", "product_hunt", "uneed", "x_oembed"];
  const interleaved: BuilderSignal[] = [];
  let added = true;
  while (added && interleaved.length < sortedBuilders.length) {
    added = false;
    for (const src of sourceOrder) {
      const list = buckets.get(src);
      if (list && list.length > 0) {
        interleaved.push(list.shift()!);
        added = true;
      }
    }
  }

  const treatments: Treatment[] = [];
  const usedIds = new Set<string>();

  for (let i = 0; i < count; i += 1) {
    const domain = DOMAIN_LIST[i % DOMAIN_LIST.length];
    const builder = interleaved[i % interleaved.length];
    const radar = matchAiRadarFor(builder, domain.slug, radars, Math.floor(i / DOMAIN_LIST.length));
    const tr = synthesizeTreatment({
      builder,
      radar,
      domainSlug: domain.slug,
      variantIndex: i,
      nowIso,
    });
    if (!usedIds.has(tr.id)) {
      usedIds.add(tr.id);
      treatments.push(tr);
    }
  }

  return treatments;
}

export function treatmentToMarkdown(t: Treatment): string {
  const lineageLine = t.lineage.map((n) => `${n.step}: ${n.title}`).join(" -> ");
  const sampleA2Section = t.sampleA2
    ? `\n### 추가 샘플링 해외 기능 (Sample A2)\n- 서비스: [${t.sampleA2.name}](${t.sampleA2.url}) (${t.sampleA2.sourceLabel} · ${t.sampleA2.tractionLabel})\n- 이식 내용: ${t.sampleA2.addedFeatureKo}\n`
    : "";

  return `# ${t.title}

- 도메인: ${t.domainLabel}${t.customTopic ? ` (맞춤 주제: ${t.customTopic})` : ""}
- 개발 호흡: ${t.buildCadence}
- 계보: ${lineageLine}

## 1. 한 줄 훅 & 첫 3초 핵심 UX
- **한 줄 훅**: ${t.oneLineHook}
- **첫 3초 UX**: ${t.firstThreeSecondsUx}

## 2. 해외 벤치마킹 근거 (Sample A)
- 서비스: [${t.sampleA.name}](${t.sampleA.url})
- 출처 및 지표: ${t.sampleA.sourceLabel} · ${t.sampleA.tractionLabel}
- 핵심 메커니즘: ${t.sampleA.mechanismLabel}
- 분석: ${t.sampleA.overseasProofKo}
${sampleA2Section}
## 3. 결합된 최신 기술 (Sample B · AI Radar)
- 시그널: [${t.sampleB.titleKo}](${t.sampleB.canonicalUrl})
- 플랫폼 / 유형: ${t.sampleB.platformId} / ${t.sampleB.signalType}
- 해결하는 구현 병목: ${t.sampleB.bottleneckSolvedKo}

## 4. 문화 도메인 비틀기 & MVP 핵심 기능 3선
${t.twistSummaryKo}

1. ${t.mvpFeatures[0]}
2. ${t.mvpFeatures[1]}
3. ${t.mvpFeatures[2]}

### 과잉 스펙 컷오프 (MVP에서 의도적으로 제외)
${t.scopeCutoff.map((c) => `- ${c}`).join("\n")}

### 기대 성과 지표 (KPI)
${t.targetKpis.map((k) => `- ${k}`).join("\n")}
`;
}

export function treatmentToAgyPrompt(t: Treatment): string {
  return `[신규 MVP 구현 지시 — BENCH. 트리트먼트 기반]

1. 프로젝트 목표
- 서비스명(가칭): ${t.title}
- 한 줄 정의: ${t.oneLineHook}
- 타깃 개발 호흡: ${t.buildCadence}
- 첫 3초 핵심 UX: ${t.firstThreeSecondsUx}

2. 벤치마킹 근거 및 기술 재료
- 해외 원형(Sample A): ${t.sampleA.name} (${t.sampleA.url}) — ${t.sampleA.tractionLabel}, 메커니즘 '${t.sampleA.mechanismLabel}'${
    t.sampleA2
      ? `\n- 추가 샘플링(Sample A2): ${t.sampleA2.name} (${t.sampleA2.url}) — ${t.sampleA2.addedFeatureKo}`
      : ""
  }
- 결합 AI 기술(Sample B): ${t.sampleB.titleKo} (${t.sampleB.canonicalUrl}) — ${t.sampleB.bottleneckSolvedKo}

3. 권장 스택 및 제약
- Next.js App Router + TypeScript + Tailwind CSS (0원 무서버 우선, API 키 미설정 시 결정론적 폴백 필수)
- 로그인 없는 즉시 체험 진입, 고대비 화이트 에디토리얼 UI, 불필요한 애니메이션 금지

4. 반드시 구현할 MVP 핵심 기능 딱 3가지
1) ${t.mvpFeatures[0]}
2) ${t.mvpFeatures[1]}
3) ${t.mvpFeatures[2]}

5. 과잉 스펙 컷오프 (구현 금지 범위)
${t.scopeCutoff.map((c) => `- ${c}`).join("\n")}

6. 완료 기준 (KPI & 검증)
${t.targetKpis.map((k) => `- ${k}`).join("\n")}
- TypeScript strict 통과, 계약 테스트 통과, 프로덕션 빌드 에러 0건으로 마무리하라.`;
}
