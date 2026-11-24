"use client";

import React from "react";
import type { Treatment } from "@/lib/types";

export type HighlightVariant = "amber" | "sky";

export interface HighlightRule {
  phrase: string;
  variant: HighlightVariant;
}

export interface HighlightSegment {
  text: string;
  variant?: HighlightVariant;
}

const AMBER_MARK_CLASS =
  "bg-[#FEF08A]/80 text-[#0F172A] px-1 py-0.5 rounded-[4px] font-semibold box-decoration-clone shadow-[inset_0_-1.5px_0_rgba(217,119,6,0.28)]";

const SKY_MARK_CLASS =
  "bg-[#BAE6FD]/65 text-[#0F172A] px-1 py-0.5 rounded-[4px] font-semibold box-decoration-clone shadow-[inset_0_-1.5px_0_rgba(2,132,199,0.26)]";

const NUMERIC_METRIC_RE =
  /(?:(?:월|약|최대|최소|단|총)\s?)?\$?\d[\d,.]*(?:[kKmM])?\s?(?:%|퍼센트|배|달러|원(?!래)|점(?![가-힣])|위(?![가-힣])|만\s?(?:명|건|개|원|달러|스타)?|초(?![가-힣])|분(?![가-힣])|시간|일(?![가-힣])|주(?![가-힣])|가지|종|개|컷|줄|단계|fps|MB|GB|KB|B)/g;

const QUOTED_PHRASE_RE = /(?<![A-Za-z0-9])['‘]([^'’\n]{3,28})['’]/g;

const TECH_MODEL_RE =
  /(?:Claude\s+Code|Claude\s+Ship|Claude\s+Opus|Claude|Gemini\s+4(?:\s+Neon)?|Gemini|GPT-\d(?:\.\d)?|GLM-\d(?:\.\d)?|DeepSeek|Kimi|Gemma\s*\d?|DepthPro2|Haru-4B|RoboTrack|LongCat-Video-Avatar|TokenEconomizer|MiniMax\s+H3|Shirudo|Kaeso|MCP|WebAssembly|WASM|WebGL|WebAudio|FFmpeg|Docker|Ollama|Rust|n8n|Loop\s+Transformer|OpenAI|Anthropic|Google\s+DeepMind|Hugging\s+Face|Microsoft\s+Research|Apple|AI\s+에이전트|오픈소스|온디바이스|로컬\s*LLM|에이전틱\s*커머스|파라메트릭\s*3D\s*CAD)/g;

interface SpanRange {
  start: number;
  end: number;
  variant: HighlightVariant;
}

function overlaps(a: SpanRange, b: SpanRange): boolean {
  return a.start < b.end && b.start < a.end;
}

function escapeRegExp(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function isAsciiPhrase(str: string): boolean {
  return /^[A-Za-z0-9 ._+/:$-]+$/.test(str);
}

/**
 * Splits plain Korean/English text into non-overlapping highlighted segments
 * without ever using raw markup delimiters in data strings.
 */
export function buildHighlightSegments(
  text: string,
  options: {
    rules?: HighlightRule[];
    autoVariant?: HighlightVariant;
    autoTechSky?: boolean;
    maxHighlights?: number;
  } = {}
): HighlightSegment[] {
  if (!text) return [];
  const {
    rules = [],
    autoVariant = "amber",
    autoTechSky = false,
    maxHighlights = 3,
  } = options;

  const picked: SpanRange[] = [];

  // 1) Explicit phrases sorted longest-first (first occurrence each)
  const cleanRules = rules
    .map((r) => ({ phrase: r.phrase.trim(), variant: r.variant }))
    .filter((r) => r.phrase.length >= 2)
    .sort((a, b) => b.phrase.length - a.phrase.length);

  for (const rule of cleanRules) {
    if (picked.length >= maxHighlights) break;
    const escaped = escapeRegExp(rule.phrase);
    const pattern = isAsciiPhrase(rule.phrase)
      ? `(?<![A-Za-z0-9])${escaped}(?![A-Za-z0-9])`
      : escaped;
    const re = new RegExp(pattern, "i");
    const match = re.exec(text);
    if (!match) continue;
    const range: SpanRange = {
      start: match.index,
      end: match.index + match[0].length,
      variant: rule.variant,
    };
    if (!picked.some((p) => overlaps(p, range))) {
      picked.push(range);
    }
  }

  // 2) Optional auto-detect tech / AI keywords in soft sky
  if (autoTechSky && picked.length < maxHighlights) {
    for (const m of text.matchAll(TECH_MODEL_RE)) {
      if (picked.length >= maxHighlights) break;
      const start = m.index ?? 0;
      const range: SpanRange = { start, end: start + m[0].length, variant: "sky" };
      if (!picked.some((p) => overlaps(p, range))) {
        picked.push(range);
      }
    }
  }

  // 3) Auto-detect quoted concepts and concrete numeric metrics in autoVariant
  if (picked.length < maxHighlights) {
    const autoCandidates: SpanRange[] = [];
    for (const m of text.matchAll(QUOTED_PHRASE_RE)) {
      const start = (m.index ?? 0) + 1;
      autoCandidates.push({
        start,
        end: start + m[1].length,
        variant: autoVariant,
      });
    }
    for (const m of text.matchAll(NUMERIC_METRIC_RE)) {
      const start = m.index ?? 0;
      autoCandidates.push({
        start,
        end: start + m[0].length,
        variant: autoVariant,
      });
    }
    autoCandidates.sort((a, b) => a.start - b.start || b.end - a.end);

    for (const cand of autoCandidates) {
      if (picked.length >= maxHighlights) break;
      if (!picked.some((p) => overlaps(p, cand))) {
        picked.push(cand);
      }
    }
  }

  if (picked.length === 0) return [{ text }];

  picked.sort((a, b) => a.start - b.start);
  const segments: HighlightSegment[] = [];
  let cursor = 0;
  for (const r of picked) {
    if (r.start > cursor) {
      segments.push({ text: text.slice(cursor, r.start) });
    }
    segments.push({ text: text.slice(r.start, r.end), variant: r.variant });
    cursor = r.end;
  }
  if (cursor < text.length) {
    segments.push({ text: text.slice(cursor) });
  }
  return segments;
}

/**
 * Extracts restrained, high-signal rules for the main synergy story:
 * - Sky: paired AI issue / original tech catalyst
 * - Amber: core conclusion / user payoff clause
 */
export function buildSynergyHighlightRules(treatment: Treatment): HighlightRule[] {
  const rules: HighlightRule[] = [];

  // Core conclusion clause from the 3rd sentence (the payoff / UX sentence)
  const sentences = treatment.fusionStoryKo
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);

  if (sentences.length >= 3) {
    const payoffSentence = sentences[2];
    // Pick a crisp 10~28 char core action phrase right before the verb ending
    const clauseMatch = payoffSentence.match(
      /([가-힣A-Za-z0-9·\- ]{10,30}(?:웹을|도구를|스튜디오를|엔진을|보드를|카드를|서비스를|자동화|생성|비교|확인|완성|제공|압축|추출))/
    );
    if (clauseMatch && clauseMatch[1]) {
      rules.push({ phrase: clauseMatch[1].trim(), variant: "amber" });
    }
  }

  if (treatment.sampleA.name && treatment.sampleA.name.length >= 3 && treatment.sampleA.name.length <= 28) {
    rules.push({ phrase: treatment.sampleA.name, variant: "sky" });
  }

  if (treatment.sampleB.benchmarkPoint && treatment.sampleB.benchmarkPoint.length >= 4) {
    rules.push({ phrase: treatment.sampleB.benchmarkPoint, variant: "sky" });
  }

  return rules;
}

/**
 * Extracts a crisp amber highlight phrase for each MVP feature sentence
 * so visitors immediately scan the core capability of each feature.
 */
export function buildFeatureHighlightRules(feature: string): HighlightRule[] {
  const rules: HighlightRule[] = [];
  const coreMatch = feature.match(
    /([가-힣A-Za-z0-9·\-+%/ ]{6,26}(?:자동\s*[가-힣]{2,4}|즉시\s*[가-힣]{2,4}|원클릭[가-힣 ]{0,8}|한눈에\s*[가-힣]{2,4}|실시간[가-힣 ]{0,8}|로컬\s*[가-힣]{2,4}|체크리스트|프롬프트|비교|다운로드|내보냅니다|생성합니다|추천합니다))/
  );
  if (coreMatch && coreMatch[1]) {
    rules.push({ phrase: coreMatch[1].trim(), variant: "amber" });
  }
  return rules;
}

interface HighlightTextProps {
  text: string;
  rules?: HighlightRule[];
  variant?: HighlightVariant;
  autoTechSky?: boolean;
  maxHighlights?: number;
  className?: string;
}

export function HighlightText({
  text,
  rules,
  variant = "amber",
  autoTechSky = false,
  maxHighlights = 2,
  className,
}: HighlightTextProps) {
  const segments = buildHighlightSegments(text, {
    rules,
    autoVariant: variant,
    autoTechSky,
    maxHighlights,
  });

  return (
    <span className={className}>
      {segments.map((seg, idx) => {
        if (!seg.variant) {
          return <React.Fragment key={idx}>{seg.text}</React.Fragment>;
        }
        return (
          <mark
            key={idx}
            className={seg.variant === "amber" ? AMBER_MARK_CLASS : SKY_MARK_CLASS}
          >
            {seg.text}
          </mark>
        );
      })}
    </span>
  );
}
