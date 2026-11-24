"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  treatmentToCodingPrompt,
  treatmentToMarkdown,
} from "@/lib/synthesis-engine";
import type { Treatment } from "@/lib/types";
import {
  buildFeatureHighlightRules,
  buildSynergyHighlightRules,
  HighlightText,
  type HighlightRule,
} from "./HighlightText";
import {
  ArrowRightIcon,
  CheckIcon,
  CopyIcon,
  ExternalLinkIcon,
  TerminalIcon,
  XIcon,
} from "./Icons";

interface TreatmentModalProps {
  treatment: Treatment | null;
  onClose: () => void;
}

type PromptSectionKind = "none" | "features" | "tech" | "fusion";

function PromptHighlightedPreview({
  promptText,
  treatment,
}: {
  promptText: string;
  treatment: Treatment;
}) {
  const lines = useMemo(() => {
    const rawLines = promptText.split("\n");
    let section: PromptSectionKind = "none";

    return rawLines.map((line) => {
      const trimmed = line.trim();
      if (trimmed.startsWith("[반드시 구현할 핵심 기능")) {
        section = "features";
        return { line, isHeader: true, section };
      }
      if (
        trimmed.startsWith("[참고 레퍼런스]") ||
        trimmed.startsWith("[원본 기술 작동 원리]")
      ) {
        section = "tech";
        return { line, isHeader: true, section };
      }
      if (trimmed.startsWith("[기술 × 이슈 결합 배경]")) {
        section = "fusion";
        return { line, isHeader: true, section };
      }
      if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
        section = "none";
        return { line, isHeader: true, section };
      }
      return { line, isHeader: false, section };
    });
  }, [promptText]);

  const techRules: HighlightRule[] = useMemo(() => {
    const out: HighlightRule[] = [];
    if (treatment.sampleA.name) {
      out.push({ phrase: treatment.sampleA.name, variant: "sky" });
    }
    if (treatment.sampleB.titleKo) {
      out.push({ phrase: treatment.sampleB.titleKo, variant: "sky" });
    }
    if (treatment.sampleB.benchmarkPoint) {
      out.push({ phrase: treatment.sampleB.benchmarkPoint, variant: "sky" });
    }
    return out;
  }, [treatment]);

  const synergyRules = useMemo(
    () => buildSynergyHighlightRules(treatment),
    [treatment]
  );

  return (
    <div className="mt-4 max-h-[340px] overflow-y-auto rounded-xl border border-[#E2E8F0] bg-[#FFFFFF] p-5 text-[clamp(0.88rem,0.82vw,1.02rem)] leading-[1.82] text-[#1E293B]">
      {lines.map(({ line, isHeader, section }, idx) => {
        if (!line.trim()) {
          return <div key={idx} className="h-2.5" aria-hidden="true" />;
        }
        if (isHeader) {
          const headerColor =
            section === "features"
              ? "text-[#B45309]"
              : section === "tech" || section === "fusion"
                ? "text-[#0369A1]"
                : "text-[#0F172A]";
          return (
            <div key={idx} className={`mt-1 font-extrabold ${headerColor}`}>
              {line}
            </div>
          );
        }

        if (section === "features" && /^\d+\.\s+/.test(line.trim())) {
          return (
            <div key={idx} className="pl-1">
              <HighlightText
                text={line}
                rules={buildFeatureHighlightRules(line)}
                variant="amber"
                maxHighlights={2}
              />
            </div>
          );
        }

        if (section === "tech") {
          return (
            <div key={idx} className="pl-1">
              <HighlightText
                text={line}
                rules={techRules}
                variant="sky"
                autoTechSky
                maxHighlights={2}
              />
            </div>
          );
        }

        if (section === "fusion") {
          return (
            <div key={idx} className="pl-1">
              <HighlightText
                text={line}
                rules={synergyRules}
                variant="amber"
                autoTechSky
                maxHighlights={3}
              />
            </div>
          );
        }

        return <div key={idx}>{line}</div>;
      })}
    </div>
  );
}

export function TreatmentModal({ treatment, onClose }: TreatmentModalProps) {
  const [copiedKind, setCopiedKind] = useState<string | null>(null);
  const [showPromptPreview, setShowPromptPreview] = useState<boolean>(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!treatment) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    scrollRef.current?.scrollTo({ top: 0 });
    setShowPromptPreview(true);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [treatment, onClose]);

  if (!treatment) return null;

  const plainCodingPrompt = treatmentToCodingPrompt(treatment);
  const synergyRules = buildSynergyHighlightRules(treatment);

  const copyText = async (kind: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKind(kind);
      window.setTimeout(() => setCopiedKind(null), 1800);
    } catch {
      setCopiedKind(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      {/* Cool Charcoal Backdrop */}
      <button
        type="button"
        aria-label="모달 닫기"
        tabIndex={-1}
        onClick={onClose}
        className="fixed inset-0 cursor-default bg-[#0F172A]/45 backdrop-blur-[2px]"
      />

      {/* Pure White Centered Proportional Editorial Spec Modal */}
      <div
        ref={scrollRef}
        role="dialog"
        aria-modal="true"
        aria-label="상세 스펙 및 구현 프롬프트"
        className="relative z-10 max-h-[90vh] w-[min(88vw,1080px)] overflow-y-auto rounded-[24px] border border-[#E2E8F0] bg-[#FFFFFF] p-[clamp(1.75rem,2.2vw,3rem)] text-[#0F172A] shadow-[0_24px_64px_rgba(15,23,42,0.16)]"
      >
        <div className="flex flex-col gap-6">
          {/* Top Meta & Close */}
          <div className="flex items-start justify-between gap-4">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="rounded-full bg-[#F1F5F9] px-3.5 py-1 text-[clamp(0.8rem,0.74vw,0.94rem)] font-bold text-[#0F172A]">
                {treatment.buildCadence}
              </span>
              <span className="tnum rounded-full border border-[#E2E8F0] bg-[#FFFFFF] px-3.5 py-1 text-[clamp(0.8rem,0.74vw,0.94rem)] font-semibold text-[#475569]">
                {treatment.sampleA.name} · {treatment.sampleA.shortMetricLabel}
              </span>
              <Link
                href={`/treatment/${treatment.id}`}
                className="inline-flex items-center gap-1 rounded-full border border-[#E2E8F0] bg-[#FFFFFF] px-3.5 py-1 text-[clamp(0.8rem,0.74vw,0.94rem)] font-semibold text-[#475569] hover:border-[#0F172A] hover:text-[#0F172A]"
              >
                <span>고정 URL</span>
                <ArrowRightIcon className="h-3.5 w-3.5" />
              </Link>
            </div>

            <button
              type="button"
              onClick={onClose}
              aria-label="닫기"
              className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-[#E2E8F0] bg-[#FFFFFF] text-[#475569] hover:border-[#0F172A] hover:text-[#0F172A]"
            >
              <XIcon className="h-4 w-4" />
            </button>
          </div>

          {/* Headline & Core UX */}
          <div>
            <h2 className="text-[clamp(1.45rem,1.65vw,2.25rem)] font-extrabold leading-[1.3] tracking-[-0.025em] text-[#0F172A]">
              {treatment.title}
            </h2>
            <p className="mt-3 text-[clamp(0.98rem,0.95vw,1.22rem)] leading-[1.75] text-[#475569]">
              {treatment.firstThreeSecondsUx || treatment.oneLineHook}
            </p>
          </div>

          {/* 1) Fusion Story (with amber + sky highlights) */}
          <section className="rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] p-[clamp(1.25rem,1.5vw,1.9rem)]">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-[clamp(0.84rem,0.78vw,0.98rem)] font-bold text-[#2563EB]">
                기술 × 이슈 시너지 인사이트
              </h3>
              <div className="flex items-center gap-3 text-[12px] font-medium text-[#64748B]">
                <span className="inline-flex items-center gap-1">
                  <span className="h-2.5 w-2.5 rounded-[3px] bg-[#FEF08A]" />
                  핵심 결론 · 기능
                </span>
                <span className="inline-flex items-center gap-1">
                  <span className="h-2.5 w-2.5 rounded-[3px] bg-[#BAE6FD]" />
                  AI 이슈 · 기술
                </span>
              </div>
            </div>
            <p className="mt-3 text-[clamp(0.98rem,0.92vw,1.18rem)] leading-[1.78] text-[#1E293B]">
              <HighlightText
                text={treatment.fusionStoryKo}
                rules={synergyRules}
                variant="amber"
                autoTechSky
                maxHighlights={3}
              />
            </p>
          </section>

          {/* 2) 3 Core MVP Features (amber highlight on key actions) + Scope Cutoff */}
          <section className="rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] p-[clamp(1.25rem,1.5vw,1.9rem)]">
            <h3 className="text-[clamp(0.84rem,0.78vw,0.98rem)] font-bold text-[#059669]">
              이렇게 만듭니다 · MVP 핵심 기능 3가지
            </h3>
            <ul className="mt-4 space-y-3.5 text-[clamp(0.98rem,0.92vw,1.18rem)] leading-[1.78] text-[#0F172A]">
              {treatment.mvpFeatures.map((feat, idx) => (
                <li key={idx} className="flex gap-3">
                  <span className="tnum mt-1 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#0F172A] text-[12px] font-bold text-[#FFFFFF]">
                    {idx + 1}
                  </span>
                  <span>
                    <HighlightText
                      text={feat}
                      rules={buildFeatureHighlightRules(feat)}
                      variant="amber"
                      maxHighlights={2}
                    />
                  </span>
                </li>
              ))}
            </ul>
            <div className="mt-5 border-t border-[#E2E8F0] pt-4 text-[clamp(0.9rem,0.84vw,1.06rem)] leading-[1.72] text-[#475569]">
              <strong className="font-bold text-[#0F172A]">과감히 뺄 스펙: </strong>
              {treatment.scopeCutoff[0]}
            </div>
          </section>

          {/* 3) Core AI Issue or Global Culture Signal & Original Tech Mechanism (sky highlights) */}
          <section className="rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] p-[clamp(1.25rem,1.5vw,1.9rem)]">
            <h3 className="text-[clamp(0.84rem,0.78vw,0.98rem)] font-bold text-[#0369A1]">
              {treatment.track === "culture"
                ? `글로벌 컬처 시그널 (${treatment.sampleB.platformId}) 및 원본 기술 원리 (${treatment.sampleA.name})`
                : `핵심 AI 이슈 및 원본 기술 원리 (${treatment.sampleA.name})`}
            </h3>
            <div className="mt-3.5 text-[clamp(0.98rem,0.92vw,1.18rem)] leading-[1.78] text-[#1E293B]">
              <div className="font-bold text-[#0F172A]">{treatment.sampleB.titleKo}</div>
              <p className="mt-1.5 text-[#334155]">
                <HighlightText
                  text={treatment.sampleB.summaryKo || treatment.sampleB.bottleneckSolvedKo}
                  rules={
                    treatment.sampleB.benchmarkPoint
                      ? [{ phrase: treatment.sampleB.benchmarkPoint, variant: "sky" }]
                      : []
                  }
                  variant="sky"
                  autoTechSky
                  maxHighlights={2}
                />
              </p>
            </div>
            <div className="mt-4 divide-y divide-[#E2E8F0] border-t border-[#E2E8F0] pt-3 text-[clamp(0.94rem,0.88vw,1.12rem)] leading-[1.72]">
              <div className="py-2.5 first:pt-1">
                <span className="mr-2 font-bold text-[#2563EB]">01 입력</span>
                <span className="text-[#1E293B]">{treatment.techDigestKo.inputKo}</span>
              </div>
              <div className="py-2.5">
                <span className="mr-2 font-bold text-[#0F172A]">02 핵심 처리</span>
                <span className="text-[#1E293B]">
                  <HighlightText
                    text={treatment.techDigestKo.coreEngineKo}
                    variant="sky"
                    autoTechSky
                    maxHighlights={2}
                  />
                </span>
              </div>
              <div className="py-2.5 last:pb-0">
                <span className="mr-2 font-bold text-[#059669]">03 결과</span>
                <span className="text-[#1E293B]">{treatment.techDigestKo.outputKo}</span>
              </div>
            </div>
          </section>

          {/* 4) Highlighted Coding Prompt Preview (plain-text copy preserved) */}
          <section className="rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] p-[clamp(1.25rem,1.5vw,1.9rem)]">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <TerminalIcon className="h-4 w-4 text-[#0F172A]" />
                <h3 className="text-[clamp(0.88rem,0.82vw,1.02rem)] font-bold text-[#0F172A]">
                  구현 프롬프트 미리보기
                </h3>
                <span className="hidden rounded-full bg-[#FFFFFF] px-2.5 py-0.5 text-[12px] font-medium text-[#64748B] ring-1 ring-[#E2E8F0] sm:inline-block">
                  복사 시 태그 없는 순수 텍스트로 복사됩니다
                </span>
              </div>

              <button
                type="button"
                onClick={() => setShowPromptPreview((v) => !v)}
                className="rounded-lg border border-[#E2E8F0] bg-[#FFFFFF] px-3 py-1.5 text-[13px] font-semibold text-[#334155] hover:border-[#0F172A] hover:text-[#0F172A]"
              >
                {showPromptPreview ? "미리보기 접기" : "미리보기 펼치기"}
              </button>
            </div>

            {showPromptPreview && (
              <PromptHighlightedPreview
                promptText={plainCodingPrompt}
                treatment={treatment}
              />
            )}
          </section>

          {/* Reference Links Row */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <a
              href={treatment.sampleA.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between gap-2 rounded-2xl border border-[#E2E8F0] bg-[#FFFFFF] px-5 py-4 text-[clamp(0.9rem,0.85vw,1.06rem)] font-bold text-[#0F172A] hover:border-[#0F172A] hover:bg-[#F8FAFC]"
            >
              <span className="truncate">원본 기술 · {treatment.sampleA.name}</span>
              <ExternalLinkIcon className="h-4 w-4 shrink-0 text-[#475569]" />
            </a>

            <a
              href={treatment.sampleB.canonicalUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between gap-2 rounded-2xl border border-[#E2E8F0] bg-[#FFFFFF] px-5 py-4 text-[clamp(0.9rem,0.85vw,1.06rem)] font-bold text-[#0F172A] hover:border-[#0F172A] hover:bg-[#F8FAFC]"
            >
              <span className="truncate">
                {treatment.track === "culture"
                  ? `컬처 기사 원문 열기 (${treatment.sampleB.platformId})`
                  : `AI 이슈 원문 열기 (${treatment.sampleB.platformId})`}
              </span>
              <ExternalLinkIcon className="h-4 w-4 shrink-0 text-[#2563EB]" />
            </a>
          </div>

          {/* Primary One-Click Plain-Text Copy Actions */}
          <div className="flex flex-col gap-3 pt-1">
            <button
              type="button"
              onClick={() => copyText("prompt", plainCodingPrompt)}
              className="inline-flex h-[clamp(3.25rem,3.3vw,3.9rem)] w-full items-center justify-center gap-2.5 rounded-2xl bg-[#0F172A] px-6 text-[clamp(0.98rem,0.95vw,1.15rem)] font-bold text-[#FFFFFF] hover:bg-[#1E293B]"
            >
              {copiedKind === "prompt" ? (
                <CheckIcon className="h-4 w-4" />
              ) : (
                <TerminalIcon className="h-4 w-4" />
              )}
              <span>
                {copiedKind === "prompt"
                  ? "AI 코딩 초기 프롬프트 복사 완료"
                  : "AI 코딩 초기 프롬프트 복사"}
              </span>
            </button>

            <button
              type="button"
              onClick={() => copyText("md", treatmentToMarkdown(treatment))}
              className="inline-flex h-[clamp(2.9rem,3vw,3.45rem)] w-full items-center justify-center gap-2 rounded-2xl border border-[#E2E8F0] bg-[#FFFFFF] px-5 text-[clamp(0.92rem,0.88vw,1.08rem)] font-semibold text-[#0F172A] hover:border-[#0F172A] hover:bg-[#F8FAFC]"
            >
              {copiedKind === "md" ? (
                <CheckIcon className="h-4 w-4 text-[#059669]" />
              ) : (
                <CopyIcon className="h-4 w-4" />
              )}
              <span>
                {copiedKind === "md" ? "기획안 마크다운 복사 완료" : "기획안 마크다운 복사"}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
