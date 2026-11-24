/**
 * DISPENSER — Gemini 2.5 Flash 50:50 Dual-Track Smart Signal Pairer
 *
 * When GEMINI_API_KEY is configured, calls Google Gemini REST API (gemini-2.5-flash)
 * with structured JSON output to generate:
 *  - 50% Tech Wedge Track: [Global Open-Source / Builder Tech] x [Live AI Radar Issues]
 *  - 50% Global Culture Track: [Global Open-Source / Builder Tech] x [Global High-Taste Culture Signals]
 * Interleaved 1:1 (tech -> culture -> tech -> culture) with curiosity question headlines,
 * highlightPhrases, 3~4 sentence fusionStoryKo, 3-step techDigestKo, and 3 MVP features.
 */

const DEFAULT_GEMINI_MODEL = process.env.DISPENSER_GEMINI_MODEL || "gemini-2.5-flash";

const RESPONSE_SCHEMA = {
  type: "OBJECT",
  properties: {
    pairings: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          builderId: { type: "STRING" },
          signalId: { type: "STRING" },
          track: { type: "STRING", enum: ["tech", "culture"] },
          domainSlug: {
            type: "STRING",
            enum: [
              "brand-commerce",
              "cinema-video",
              "photo-visual",
              "music-audio",
              "local-archive",
              "creator-tool",
            ],
          },
          title: { type: "STRING" },
          oneLineHook: { type: "STRING" },
          firstThreeSecondsUx: { type: "STRING" },
          fusionStoryKo: { type: "STRING" },
          highlightPhrases: {
            type: "ARRAY",
            items: { type: "STRING" },
          },
          builderSummaryKo: { type: "STRING" },
          radarSummaryKo: { type: "STRING" },
          techDigestKo: {
            type: "OBJECT",
            properties: {
              inputKo: { type: "STRING" },
              coreEngineKo: { type: "STRING" },
              outputKo: { type: "STRING" },
              summaryKo: { type: "STRING" },
            },
            required: ["inputKo", "coreEngineKo", "outputKo", "summaryKo"],
          },
          mvpFeatures: {
            type: "ARRAY",
            items: { type: "STRING" },
          },
          scopeCutoff: { type: "STRING" },
          buildCadence: { type: "STRING" },
        },
        required: [
          "builderId",
          "signalId",
          "track",
          "domainSlug",
          "title",
          "oneLineHook",
          "firstThreeSecondsUx",
          "fusionStoryKo",
          "highlightPhrases",
          "builderSummaryKo",
          "radarSummaryKo",
          "techDigestKo",
          "mvpFeatures",
          "scopeCutoff",
          "buildCadence",
        ],
      },
    },
  },
  required: ["pairings"],
};

function cleanText(input) {
  return String(input || "")
    .replace(/==([^=]+?)==/g, "$1")
    .replace(/==+/g, "")
    .replace(/[\u{1F300}-\u{1F9FF}\u{1FA00}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}]/gu, "")
    .replace(/준비\s*중/gi, "진행 단계")
    .replace(/coming\s+soon/gi, "예정")
    .replace(/샘플\s*데이터/gi, "실측 데이터")
    .replace(/\s+/g, " ")
    .trim();
}

function ensureQuestionTitle(raw) {
  const cleaned = cleanText(raw).replace(/[.!]+$/, "").trim();
  if (!cleaned) return "";
  if (cleaned.endsWith("?")) return cleaned;
  return `${cleaned} 서비스를 만들어본다면?`;
}

async function callGeminiTrackBatch({
  apiKey,
  track,
  buildersSlice,
  signalsSlice,
  targetCount,
}) {
  const builderBriefs = buildersSlice.map((b) => ({
    id: b.id,
    name: b.name,
    source: b.sourceLabel,
    traction: b.tractionLabel,
    taglineKo: b.taglineKo,
    hasMedia: Boolean(b.demoVideoUrl || b.previewImageUrl),
  }));

  const isCulture = track === "culture";
  const signalBriefs = isCulture
    ? signalsSlice.map((c) => ({
        id: c.id,
        sourceName: c.sourceName,
        vertical: c.cultureVerticalLabel,
        titleKo: c.titleKo,
        phenomenonKo: (c.phenomenonKo || "").slice(0, 180),
        hasImage: Boolean(c.previewImageUrl),
      }))
    : signalsSlice.map((r) => ({
        id: r.id,
        platform: r.platformId,
        titleKo: r.titleKo,
        whatKo: (r.whatKo || r.highlightSummary || "").slice(0, 180),
        benchmarkPoint: r.planningMeta?.benchmarkPoint || "",
      }));

  const trackRole = isCulture
    ? `당신은 글로벌 고감도 패션·시네마·사진·음악·건축·아카이브 매거진 감각과 최신 오픈소스 기술을 이종교배하는 수석 크리에이티브 디렉터입니다.
아래 [원본 기술/프로덕트]와 [글로벌 컬처 시그널] 원문을 읽고, 기술과 문화적 취향이 맞물려 감도 높은 디지털 제품으로 터지는 조합 ${targetCount}건을 매칭하세요.`
    : `당신은 글로벌 오픈소스·인디 프로덕트와 최신 AI 트렌드를 결합해 날카로운 마이크로 SaaS/테크 웨지를 설계하는 수석 프로덕트 기획자입니다.
아래 [원본 기술/프로덕트]와 [AI Radar 실시간 이슈] 원문을 읽고, 가장 실행력 높은 조합 ${targetCount}건을 매칭하세요.`;

  const prompt = `${trackRole}

엄격한 규칙:
1. 각 조합은 반드시 목록에 있는 실제 builderId와 signalId를 정확히 사용하세요 (track="${track}", builderId 중복 금지).
2. title은 반드시 호기심이 꽂히는 자연스러운 한국어 질문형("...한다면?", "...한 서비스를 만들어본다면?")으로 끝내세요. 기계식 짜깁기 금지.
3. oneLineHook은 첫 화면 사용자 경험을 1문장(50~85자)으로 선명하게 쓰세요.
4. fusionStoryKo는 "저 기술에 이 ${isCulture ? "컬처 현상" : "AI 이슈"}을 붙이니까 바로 위 제목 같은 서비스가 나오는구나!" 하고 직관적으로 이해되는 3~4문장의 밀도 높은 한국어 스토리로 작성하세요.
5. highlightPhrases에는 fusionStoryKo 안에서 형광펜으로 강조할 핵심 결론/가치 구절 2개를 정확히 원문 그대로 뽑아 배열로 담으세요.
6. techDigestKo는 원본 기술의 작동 원리를 입력(inputKo) -> 핵심 처리(coreEngineKo) -> 결과(outputKo) 3단계와 1줄 요약(summaryKo)으로 정리하세요.
7. mvpFeatures는 3~7일 안에 1인 개발로 만들 수 있는 구체적 기능 정확히 3개 배열로 작성하세요.
8. 이모지, 원시 "==" 기호, 금지어(KREAM, 취업, 직장인 TF, agy, BENCH, 준비 중, coming soon, 샘플 데이터) 절대 금지.

[원본 기술 / 프로덕트 목록]
${JSON.stringify(builderBriefs)}

[${isCulture ? "글로벌 컬처 시그널 목록" : "AI Radar 실시간 이슈 목록"}]
${JSON.stringify(signalBriefs)}`;

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(DEFAULT_GEMINI_MODEL)}:generateContent?key=${encodeURIComponent(apiKey)}`;

  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: RESPONSE_SCHEMA,
        temperature: 0.7,
      },
    }),
    signal: AbortSignal.timeout(45000),
  });

  if (!res.ok) {
    const errBody = await res.text().catch(() => "");
    throw new Error(`Gemini API HTTP ${res.status}: ${errBody.slice(0, 200)}`);
  }

  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.map((p) => p.text || "").join("") || "";
  if (!text) return [];
  const parsed = JSON.parse(text);
  return Array.isArray(parsed?.pairings) ? parsed.pairings : [];
}

/**
 * Generates 50% tech + 50% culture Gemini-matched pairings interleaved 1:1.
 * Returns null if GEMINI_API_KEY is unset or API fails gracefully.
 */
export async function pairSignalsWithGemini({
  builders,
  radars,
  cultures = [],
  targetTotal = 60,
}) {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) return null;

  const builderById = new Map(builders.map((b) => [b.id, b]));
  const radarById = new Map(radars.map((r) => [r.id, r]));
  const cultureById = new Map(cultures.map((c) => [c.id, c]));

  const sortedBuilders = [...builders].sort((a, b) => {
    const mediaDiff =
      Number(Boolean(b.demoVideoUrl || b.previewImageUrl)) -
      Number(Boolean(a.demoVideoUrl || a.previewImageUrl));
    if (mediaDiff !== 0) return mediaDiff;
    return (b.tractionValue || 0) - (a.tractionValue || 0);
  });

  const targetPerTrack = Math.floor(targetTotal / 2);
  const techOut = [];
  const cultureOut = [];
  const usedBuilderIds = new Set();

  const runTrack = async (track, signals, outArr, batches = 3) => {
    const validMap = track === "culture" ? cultureById : radarById;
    const perBatch = Math.ceil(targetPerTrack / batches);

    for (let bIdx = 0; bIdx < batches; bIdx += 1) {
      if (outArr.length >= targetPerTrack) break;
      const bSlice = sortedBuilders
        .filter((b) => !usedBuilderIds.has(b.id))
        .slice(0, perBatch + 8);
      if (bSlice.length === 0 || signals.length === 0) break;

      const sStart = (bIdx * 20) % Math.max(1, signals.length);
      const sSlice = signals.slice(sStart, sStart + 24);
      const signalPool = sSlice.length >= 10 ? sSlice : signals.slice(0, 24);

      try {
        const want = Math.min(perBatch, targetPerTrack - outArr.length);
        const raw = await callGeminiTrackBatch({
          apiKey,
          track,
          buildersSlice: bSlice,
          signalsSlice: signalPool,
          targetCount: want,
        });
        for (const p of raw) {
          if (!p || !builderById.has(p.builderId) || !validMap.has(p.signalId)) continue;
          if (usedBuilderIds.has(p.builderId)) continue;
          const title = ensureQuestionTitle(p.title);
          if (!title || !Array.isArray(p.mvpFeatures) || p.mvpFeatures.length < 3) continue;
          usedBuilderIds.add(p.builderId);
          outArr.push({
            track,
            builderId: p.builderId,
            radarId: track === "tech" ? p.signalId : undefined,
            cultureId: track === "culture" ? p.signalId : undefined,
            domainSlug: p.domainSlug,
            title,
            oneLineHook: cleanText(p.oneLineHook),
            firstThreeSecondsUx: cleanText(p.firstThreeSecondsUx),
            fusionStoryKo: cleanText(p.fusionStoryKo),
            highlightPhrases: Array.isArray(p.highlightPhrases)
              ? p.highlightPhrases.map(cleanText).filter(Boolean).slice(0, 3)
              : [],
            builderSummaryKo: cleanText(p.builderSummaryKo),
            radarSummaryKo: cleanText(p.radarSummaryKo),
            techDigestKo: {
              inputKo: cleanText(p.techDigestKo?.inputKo),
              coreEngineKo: cleanText(p.techDigestKo?.coreEngineKo),
              outputKo: cleanText(p.techDigestKo?.outputKo),
              summaryKo: cleanText(p.techDigestKo?.summaryKo),
            },
            mvpFeatures: p.mvpFeatures.slice(0, 3).map(cleanText),
            scopeCutoff: cleanText(p.scopeCutoff),
            buildCadence: cleanText(p.buildCadence) || "5~7일 MVP",
          });
        }
        await new Promise((r) => setTimeout(r, 1400));
      } catch (err) {
        console.warn(`[DISPENSER gemini-pairer] ${track} batch ${bIdx + 1} skipped:`, err?.message || err);
        if (bIdx === 0 && outArr.length === 0) break;
      }
    }
  };

  await runTrack("tech", radars, techOut, 3);
  if (cultures.length > 0) {
    await runTrack("culture", cultures, cultureOut, 3);
  }

  // Strictly interleave 1:1 (tech -> culture -> tech -> culture)
  const interleaved = [];
  const maxLen = Math.max(techOut.length, cultureOut.length);
  for (let i = 0; i < maxLen; i += 1) {
    if (i < techOut.length) interleaved.push(techOut[i]);
    if (i < cultureOut.length) interleaved.push(cultureOut[i]);
  }

  return interleaved.length >= 16 ? interleaved : null;
}
