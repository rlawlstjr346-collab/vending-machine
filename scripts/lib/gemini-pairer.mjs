/**
 * DISPENSER — Gemini 2.5 Flash Smart Signal Pairer
 *
 * When GEMINI_API_KEY is configured, calls Google Gemini REST API (gemini-2.5-flash)
 * with structured JSON output to read real overseas tech/open-source/product originals
 * and live AI Radar issue articles, find high-synergy pairings, and produce:
 *  1) Curiosity-driven Korean question headline ("~한다면?" / "~한 서비스를 만들어본다면?")
 *  2) 3~4 sentence fusion story (fusionStoryKo)
 *  3) 3-step technical digest (techDigestKo: inputKo, coreEngineKo, outputKo, summaryKo)
 *  4) Concrete 3 MVP features + scope cutoff
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
          radarId: { type: "STRING" },
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
          "radarId",
          "domainSlug",
          "title",
          "oneLineHook",
          "firstThreeSecondsUx",
          "fusionStoryKo",
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

async function callGeminiBatch(apiKey, buildersSlice, radarsSlice, targetCount) {
  const builderBriefs = buildersSlice.map((b) => ({
    id: b.id,
    name: b.name,
    source: b.sourceLabel,
    traction: b.tractionLabel,
    taglineEn: b.taglineEn,
    taglineKo: b.taglineKo,
    hasMedia: Boolean(b.demoVideoUrl || b.previewImageUrl),
  }));

  const radarBriefs = radarsSlice.map((r) => ({
    id: r.id,
    platform: r.platformId,
    titleKo: r.titleKo,
    whatKo: (r.whatKo || r.highlightSummary || "").slice(0, 180),
    benchmarkPoint: r.planningMeta?.benchmarkPoint || "",
    entities: (r.entities || []).slice(0, 4),
  }));

  const prompt = `당신은 글로벌 오픈소스·인디 프로덕트와 최신 AI 트렌드를 교차 분석하는 수석 서비스 기획자입니다.
아래 [원본 기술/프로덕트] 목록과 [AI Radar 실시간 이슈] 목록의 실제 원문을 읽고, 두 재료를 결합했을 때 단번에 무릎을 치게 만드는 가장 기발하고 실행 가능한 조합 ${targetCount}건을 매칭해 JSON으로 출력하세요.

엄격한 규칙:
1. 각 조합은 반드시 목록에 있는 실제 builderId와 radarId를 정확히 사용하세요 (builderId 중복 금지).
2. title은 반드시 호기심을 자극하는 자연스러운 한국어 질문형("...한다면?", "...한 서비스를 만들어본다면?")으로 끝내세요. 기계식 짜깁기("A × B 방식의", "...요소를 참고해") 금지.
3. oneLineHook은 첫 화면 사용자 경험을 1문장(50~85자)으로 선명하게 쓰세요.
4. fusionStoryKo는 "아, 저 원본 기술에 요즘 이 이슈를 붙이니까 바로 위 제목 같은 기획이 나오는구나!" 하고 즉각 이해되는 3~4문장의 밀도 높은 한국어 스토리로 작성하세요.
5. techDigestKo는 원본 기술의 작동 원리를 입력(inputKo) -> 핵심 처리(coreEngineKo) -> 결과(outputKo) 3단계와 1줄 요약(summaryKo)으로 명확히 정리하세요.
6. builderSummaryKo와 radarSummaryKo는 각각 1~2문장(75자 이내)으로 핵심만 깔끔하게 요약하세요.
7. mvpFeatures는 1주일 내 1인 개발로 만들 수 있는 구체적 기능 정확히 3개 배열로 작성하세요.
8. 이모지, 마크다운 기호, 원시 "==", 금지어(KREAM, 취업, 직장인 TF, agy, 준비 중, coming soon, 샘플 데이터) 절대 금지.

[원본 기술 / 프로덕트 목록]
${JSON.stringify(builderBriefs)}

[AI Radar 실시간 이슈 목록]
${JSON.stringify(radarBriefs)}`;

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(DEFAULT_GEMINI_MODEL)}:generateContent?key=${encodeURIComponent(apiKey)}`;

  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: RESPONSE_SCHEMA,
        temperature: 0.65,
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
 * Generates up to targetTotal Gemini-matched pairings in clean batches.
 * Returns null if GEMINI_API_KEY is unset or API fails gracefully.
 */
export async function pairSignalsWithGemini({ builders, radars, targetTotal = 50 }) {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) return null;

  const builderById = new Map(builders.map((b) => [b.id, b]));
  const radarById = new Map(radars.map((r) => [r.id, r]));

  // Prioritize diverse builders (media-rich & high traction first)
  const sortedBuilders = [...builders].sort((a, b) => {
    const mediaDiff =
      Number(Boolean(b.demoVideoUrl || b.previewImageUrl)) -
      Number(Boolean(a.demoVideoUrl || a.previewImageUrl));
    if (mediaDiff !== 0) return mediaDiff;
    return (b.tractionValue || 0) - (a.tractionValue || 0);
  });

  const BATCH_COUNT = 5;
  const perBatch = Math.ceil(targetTotal / BATCH_COUNT);
  const collected = [];
  const usedBuilderIds = new Set();

  for (let batchIdx = 0; batchIdx < BATCH_COUNT; batchIdx += 1) {
    if (collected.length >= targetTotal) break;
    const bStart = batchIdx * (perBatch + 4);
    const bSlice = sortedBuilders
      .filter((b) => !usedBuilderIds.has(b.id))
      .slice(0, perBatch + 6);
    if (bSlice.length === 0) break;

    const rSlice = radars
      .slice((batchIdx * 18) % Math.max(1, radars.length), (batchIdx * 18) % Math.max(1, radars.length) + 26);
    const radarPool = rSlice.length >= 12 ? rSlice : radars.slice(0, 26);

    try {
      const want = Math.min(perBatch, targetTotal - collected.length);
      const rawPairings = await callGeminiBatch(apiKey, bSlice, radarPool, want);
      for (const p of rawPairings) {
        if (!p || !builderById.has(p.builderId) || !radarById.has(p.radarId)) continue;
        if (usedBuilderIds.has(p.builderId)) continue;
        const title = ensureQuestionTitle(p.title);
        if (!title || !Array.isArray(p.mvpFeatures) || p.mvpFeatures.length < 3) continue;
        usedBuilderIds.add(p.builderId);
        collected.push({
          builderId: p.builderId,
          radarId: p.radarId,
          domainSlug: p.domainSlug,
          title,
          oneLineHook: cleanText(p.oneLineHook),
          firstThreeSecondsUx: cleanText(p.firstThreeSecondsUx),
          fusionStoryKo: cleanText(p.fusionStoryKo),
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
      if (batchIdx < BATCH_COUNT - 1) {
        await new Promise((r) => setTimeout(r, 1500));
      }
    } catch (err) {
      console.warn(`[DISPENSER gemini-pairer] Batch ${batchIdx + 1} skipped:`, err?.message || err);
      if (batchIdx === 0 && collected.length === 0) return null;
    }
  }

  return collected.length >= 10 ? collected : null;
}
