import { NextResponse } from "next/server";
import { loadAiRadarSignals, loadBuilderSignals } from "@/lib/data-loader";
import { DOMAIN_LIST, isValidDomainSlug } from "@/lib/domains";
import {
  ensureQuestionHeadline,
  matchAiRadarFor,
  synthesizeTreatment,
} from "@/lib/synthesis-engine";
import { sanitizeEditorialText } from "@/lib/text-clean";
import { fetchXOembedSignal, isXPostUrl } from "@/lib/x-oembed";
import type { BuilderSignal, DomainSlug, Treatment } from "@/lib/types";

interface SynthesizeRequest {
  builderId?: string;
  radarId?: string;
  domainSlug?: string;
  customTopic?: string;
  variantIndex?: number;
  parentTreatment?: Treatment | null;
  addedBuilderId?: string;
  xPostUrl?: string;
}

async function tryLlmUpgrade(base: Treatment): Promise<Treatment> {
  const geminiKey = process.env.GEMINI_API_KEY?.trim();
  const anthropicKey = process.env.ANTHROPIC_API_KEY?.trim();
  if (!geminiKey && !anthropicKey) return base;

  const prompt = `당신은 글로벌 오픈소스와 최신 AI 이슈를 결합해 기발한 웹 서비스를 설계하는 수석 프로덕트 기획자입니다.
아래 초안을 호기심을 자극하는 질문형 제목("~한다면?" / "~한 서비스를 만들어본다면?")과 3~4문장의 밀도 높은 결합 스토리로 다듬어 JSON 객체만 반환하세요.
금지: 과장 수식어, 이모지, 원시 "==" 기호, 기계식 짜깁기 문장.
필수 JSON 키: {"title": string, "oneLineHook": string, "fusionStoryKo": string, "firstThreeSecondsUx": string, "mvpFeatures": [string, string, string]}

초안:
- 원본 기술: ${base.sampleA.name} (${base.sampleA.shortMetricLabel}) — ${base.sampleA.summaryKo}
- 실시간 AI 이슈: ${base.sampleB.titleKo} — ${base.sampleB.summaryKo}
- 핵심 기능 3가지: ${JSON.stringify(base.mvpFeatures)}`;

  try {
    if (geminiKey) {
      const model = process.env.DISPENSER_GEMINI_MODEL || "gemini-2.5-flash";
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(geminiKey)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { responseMimeType: "application/json", temperature: 0.45 },
          }),
          signal: AbortSignal.timeout(12000),
        }
      );
      if (res.ok) {
        const data = (await res.json()) as {
          candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
        };
        const raw = data.candidates?.[0]?.content?.parts?.map((p) => p.text || "").join("") || "";
        const parsed = JSON.parse(raw) as Partial<Treatment>;
        if (parsed.title && Array.isArray(parsed.mvpFeatures) && parsed.mvpFeatures.length === 3) {
          return {
            ...base,
            title: ensureQuestionHeadline(parsed.title),
            oneLineHook: sanitizeEditorialText(parsed.oneLineHook || base.oneLineHook),
            fusionStoryKo: sanitizeEditorialText(parsed.fusionStoryKo || base.fusionStoryKo),
            firstThreeSecondsUx: sanitizeEditorialText(
              parsed.firstThreeSecondsUx || base.firstThreeSecondsUx
            ),
            mvpFeatures: [
              sanitizeEditorialText(parsed.mvpFeatures[0]),
              sanitizeEditorialText(parsed.mvpFeatures[1]),
              sanitizeEditorialText(parsed.mvpFeatures[2]),
            ],
            synthesisMode: "llm-gemini",
          };
        }
      }
    }

    if (anthropicKey) {
      const model = process.env.DISPENSER_ANTHROPIC_MODEL || "claude-haiku-4-5-20251001";
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": anthropicKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model,
          max_tokens: 900,
          messages: [{ role: "user", content: prompt }],
        }),
        signal: AbortSignal.timeout(12000),
      });
      if (res.ok) {
        const data = (await res.json()) as { content?: Array<{ type: string; text?: string }> };
        const raw = (data.content || [])
          .filter((b) => b.type === "text")
          .map((b) => b.text || "")
          .join("");
        const jsonMatch = raw.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]) as Partial<Treatment>;
          if (parsed.title && Array.isArray(parsed.mvpFeatures) && parsed.mvpFeatures.length === 3) {
            return {
              ...base,
              title: ensureQuestionHeadline(parsed.title),
              oneLineHook: sanitizeEditorialText(parsed.oneLineHook || base.oneLineHook),
              fusionStoryKo: sanitizeEditorialText(parsed.fusionStoryKo || base.fusionStoryKo),
              firstThreeSecondsUx: sanitizeEditorialText(
                parsed.firstThreeSecondsUx || base.firstThreeSecondsUx
              ),
              mvpFeatures: [
                sanitizeEditorialText(parsed.mvpFeatures[0]),
                sanitizeEditorialText(parsed.mvpFeatures[1]),
                sanitizeEditorialText(parsed.mvpFeatures[2]),
              ],
              synthesisMode: "llm-anthropic",
            };
          }
        }
      }
    }
  } catch {
    // Graceful fallback to deterministic synthesis
  }
  return base;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as SynthesizeRequest;
    const builders = loadBuilderSignals();
    const radars = loadAiRadarSignals();

    if (builders.length === 0 || radars.length === 0) {
      return NextResponse.json(
        { error: "Signal snapshots are not initialized yet." },
        { status: 503 }
      );
    }

    const domainSlug: DomainSlug =
      body.domainSlug && isValidDomainSlug(body.domainSlug)
        ? body.domainSlug
        : DOMAIN_LIST[0].slug;

    let builder: BuilderSignal | undefined = body.builderId
      ? builders.find((b) => b.id === body.builderId)
      : undefined;

    if (!builder && body.xPostUrl && isXPostUrl(body.xPostUrl)) {
      const xSignal = await fetchXOembedSignal(body.xPostUrl);
      if (xSignal) builder = xSignal;
    }

    if (!builder && body.customTopic && isXPostUrl(body.customTopic)) {
      const xSignal = await fetchXOembedSignal(body.customTopic);
      if (xSignal) builder = xSignal;
    }

    if (!builder) {
      const idx = Math.abs(body.variantIndex || 0) % builders.length;
      builder = builders[idx];
    }

    const radar =
      (body.radarId ? radars.find((r) => r.id === body.radarId) : undefined) ||
      matchAiRadarFor(builder, domainSlug, radars, body.variantIndex || 0);

    const addedBuilder = body.addedBuilderId
      ? builders.find((b) => b.id === body.addedBuilderId) || null
      : null;

    const cleanTopic =
      body.customTopic && !isXPostUrl(body.customTopic) ? body.customTopic : null;

    const base = synthesizeTreatment({
      builder,
      radar,
      domainSlug,
      customTopic: cleanTopic,
      variantIndex: body.variantIndex || 0,
      parentTreatment: body.parentTreatment || null,
      addedBuilder,
    });

    const upgraded = await tryLlmUpgrade(base);
    return NextResponse.json({ treatment: upgraded });
  } catch (err) {
    return NextResponse.json(
      { error: String(err instanceof Error ? err.message : err) },
      { status: 400 }
    );
  }
}
