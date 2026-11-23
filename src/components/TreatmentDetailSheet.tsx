"use client";

import React, { useState } from "react";
import Link from "next/link";
import { DOMAIN_LIST } from "@/lib/domains";
import { treatmentToAgyPrompt, treatmentToMarkdown } from "@/lib/synthesis-engine";
import type { DomainSlug, Treatment } from "@/lib/types";
import {
  BookmarkIcon,
  BranchIcon,
  CheckIcon,
  CopyIcon,
  ExternalLinkIcon,
  LayersIcon,
  LinkIcon,
  TerminalIcon,
} from "./Icons";

interface TreatmentDetailSheetProps {
  treatment: Treatment;
  isSaved: boolean;
  lineageMap: Record<string, Treatment>;
  onSelectTreatment: (treatment: Treatment) => void;
  onBranchDomain: (treatment: Treatment, nextDomainSlug?: DomainSlug) => void;
  onEvolveTreatment: (treatment: Treatment) => void;
  onToggleSave: (treatment: Treatment) => void;
  onCopyShareUrl: () => void;
  onBackToList?: () => void;
}

export function TreatmentDetailSheet({
  treatment,
  isSaved,
  lineageMap,
  onSelectTreatment,
  onBranchDomain,
  onEvolveTreatment,
  onToggleSave,
  onCopyShareUrl,
  onBackToList,
}: TreatmentDetailSheetProps) {
  const [copiedKind, setCopiedKind] = useState<string | null>(null);
  const [showDomainPicker, setShowDomainPicker] = useState(false);

  const handleCopy = async (kind: "md" | "agy" | "share", text?: string) => {
    if (kind === "share") {
      onCopyShareUrl();
      setCopiedKind("share");
      window.setTimeout(() => setCopiedKind(null), 1800);
      return;
    }
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKind(kind);
      window.setTimeout(() => setCopiedKind(null), 1800);
    } catch {
      setCopiedKind(null);
    }
  };

  return (
    <article className="flex h-full flex-col bg-[#FFFFFF] text-[#111111]">
      {/* Top Meta & Lineage Breadcrumb */}
      <div className="border-b border-[#E5E7EB] px-6 py-4">
        <div className="flex items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2 text-xs text-[#4B5563]">
            {onBackToList && (
              <button
                type="button"
                onClick={onBackToList}
                className="mr-1 border border-[#E5E7EB] px-2 py-0.5 font-medium text-[#111111] lg:hidden"
              >
                목록으로
              </button>
            )}
            <span className="border border-[#111111] bg-[#111111] px-2 py-0.5 font-semibold text-[#FFFFFF]">
              {treatment.domainLabel}
            </span>
            <span className="border border-[#E5E7EB] bg-[#FAFAFA] px-2 py-0.5 font-medium text-[#374151]">
              {treatment.buildCadence}
            </span>
            {treatment.customTopic && (
              <span className="border border-[#E5E7EB] px-2 py-0.5 font-medium text-[#111111]">
                주제: {treatment.customTopic}
              </span>
            )}
          </div>
          <Link
            href={`/treatment/${treatment.id}`}
            className="inline-flex items-center gap-1 text-xs font-medium text-[#4B5563] hover:text-[#111111]"
          >
            <span>고유 페이지</span>
            <ExternalLinkIcon className="h-3 w-3" />
          </Link>
        </div>

        {/* Lineage Breadcrumb: A -> B -> C */}
        <nav aria-label="샘플링 계보" className="mt-3 flex flex-wrap items-center gap-1.5 text-xs">
          {treatment.lineage.map((node, index) => {
            const linkedTreatment = node.treatmentId ? lineageMap[node.treatmentId] : undefined;
            const isCurrent = node.treatmentId === treatment.id;
            return (
              <React.Fragment key={`${node.step}-${index}`}>
                {index > 0 && <span className="text-[#4B5563]">→</span>}
                {linkedTreatment && !isCurrent ? (
                  <button
                    type="button"
                    onClick={() => onSelectTreatment(linkedTreatment)}
                    className="inline-flex items-center gap-1 border border-[#E5E7EB] bg-[#FAFAFA] px-2 py-0.5 text-left font-medium text-[#111111] hover:border-[#111111]"
                  >
                    <span className="font-mono font-bold">{node.step}</span>
                    <span className="max-w-[140px] truncate">{node.title}</span>
                  </button>
                ) : (
                  <span
                    className={
                      isCurrent
                        ? "inline-flex items-center gap-1 border border-[#111111] bg-[#111111] px-2 py-0.5 font-medium text-[#FFFFFF]"
                        : "inline-flex items-center gap-1 border border-[#E5E7EB] bg-[#FAFAFA] px-2 py-0.5 font-medium text-[#374151]"
                    }
                  >
                    <span className="font-mono font-bold">{node.step}</span>
                    <span className="max-w-[140px] truncate">{node.title}</span>
                  </span>
                )}
              </React.Fragment>
            );
          })}
        </nav>

        <h2 className="mt-3 text-xl font-bold leading-snug tracking-tight text-[#111111]">
          {treatment.title}
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-[#374151]">{treatment.oneLineHook}</p>
      </div>

      {/* Scrollable Editorial Treatment Body */}
      <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
        {/* 1. First 3 Seconds Core UX */}
        <section className="border border-[#E5E7EB] bg-[#FAFAFA] p-4">
          <div className="text-[11px] font-bold uppercase tracking-wider text-[#4B5563]">
            01 · 첫 3초 핵심 UX 정의
          </div>
          <p className="mt-1.5 text-sm leading-relaxed text-[#111111]">
            {treatment.firstThreeSecondsUx}
          </p>
        </section>

        {/* 2. Overseas Benchmark Sample A (+ Sample A2 when evolved) */}
        <section className="border-t border-[#E5E7EB] pt-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-[#4B5563]">
              <span
                className={`inline-block h-2 w-2 rounded-full ${
                  treatment.sampleA.verifiedRevenue ? "bg-[#15803D]" : "bg-[#D9381E]"
                }`}
              />
              <span>02 · 해외 벤치마킹 근거 (Sample A)</span>
            </div>
            <span className="text-xs font-semibold text-[#111111]">
              {treatment.sampleA.sourceLabel} · {treatment.sampleA.tractionLabel}
            </span>
          </div>

          <div className="mt-2.5 border border-[#E5E7EB] bg-[#FFFFFF] p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <a
                  href={treatment.sampleA.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-base font-bold text-[#111111] underline decoration-[#E5E7EB] underline-offset-4 hover:decoration-[#111111]"
                >
                  <span>{treatment.sampleA.name}</span>
                  <ExternalLinkIcon className="h-3.5 w-3.5 shrink-0" />
                </a>
                <div className="mt-1 text-xs font-medium text-[#4B5563]">
                  핵심 흥행 메커니즘: {treatment.sampleA.mechanismLabel}
                </div>
              </div>
              {treatment.sampleA.verifiedRevenue && (
                <span className="inline-flex items-center gap-1.5 border border-[#E5E7EB] bg-[#FAFAFA] px-2 py-0.5 text-[11px] font-semibold text-[#111111]">
                  <span className="inline-block h-1.5 w-1.5 rounded-full bg-[#15803D]" />
                  검증 수익
                </span>
              )}
            </div>
            <p className="mt-2.5 text-sm leading-relaxed text-[#374151]">
              {treatment.sampleA.overseasProofKo}
            </p>
          </div>

          {treatment.sampleA2 && (
            <div className="mt-3 border border-[#111111] bg-[#FAFAFA] p-4">
              <div className="flex items-center justify-between gap-2 text-[11px] font-bold uppercase tracking-wider text-[#111111]">
                <span>추가 샘플링 해외 기능 (Sample A2 · B → C 진화)</span>
                <span>{treatment.sampleA2.tractionLabel}</span>
              </div>
              <a
                href={treatment.sampleA2.url}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-1.5 inline-flex items-center gap-1 text-sm font-bold text-[#111111] underline underline-offset-4"
              >
                <span>{treatment.sampleA2.name}</span>
                <ExternalLinkIcon className="h-3.5 w-3.5" />
              </a>
              <p className="mt-1.5 text-sm leading-relaxed text-[#374151]">
                {treatment.sampleA2.addedFeatureKo}
              </p>
            </div>
          )}
        </section>

        {/* 3. AI Radar Technical Ingredient Sample B */}
        <section className="border-t border-[#E5E7EB] pt-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-[#4B5563]">
              <span className="inline-block h-2 w-2 rounded-full bg-[#D9381E]" />
              <span>03 · 결합된 최신 기술 (Sample B · AI Radar)</span>
            </div>
            <span className="font-mono text-xs text-[#4B5563]">
              {treatment.sampleB.platformId} · {treatment.sampleB.signalType}
            </span>
          </div>

          <div className="mt-2.5 border border-[#E5E7EB] bg-[#FFFFFF] p-4">
            <a
              href={treatment.sampleB.canonicalUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-start gap-1.5 text-sm font-bold text-[#111111] underline decoration-[#E5E7EB] underline-offset-4 hover:decoration-[#111111]"
            >
              <span>{treatment.sampleB.titleKo}</span>
              <ExternalLinkIcon className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            </a>
            <div className="mt-1.5 text-xs font-medium text-[#4B5563]">
              벤치마크 포인트: {treatment.sampleB.benchmarkPoint}
            </div>
            <p className="mt-2 text-sm leading-relaxed text-[#374151]">
              {treatment.sampleB.bottleneckSolvedKo}
            </p>
          </div>
        </section>

        {/* 4. Cultural Domain Twist + 3 MVP Features + Scope Cutoff + KPI */}
        <section className="border-t border-[#E5E7EB] pt-4">
          <div className="text-[11px] font-bold uppercase tracking-wider text-[#4B5563]">
            04 · 문화 도메인 비틀기 & MVP 핵심 기능 3선
          </div>
          <p className="mt-2 text-sm leading-relaxed text-[#374151]">
            {treatment.twistSummaryKo}
          </p>

          <ol className="mt-3 divide-y divide-[#E5E7EB] border border-[#E5E7EB] bg-[#FFFFFF]">
            {treatment.mvpFeatures.map((feat, idx) => (
              <li key={idx} className="flex gap-3 p-3.5">
                <span className="font-mono text-xs font-bold text-[#111111]">
                  0{idx + 1}
                </span>
                <span className="text-sm leading-relaxed text-[#111111]">{feat}</span>
              </li>
            ))}
          </ol>

          <div className="mt-3 grid grid-cols-1 gap-3">
            <div className="border border-[#E5E7EB] bg-[#FAFAFA] p-3.5">
              <div className="text-xs font-bold text-[#111111]">
                과잉 스펙 컷오프 (MVP에서 의도적으로 제외할 기능)
              </div>
              <ul className="mt-2 space-y-1.5 text-xs leading-relaxed text-[#374151]">
                {treatment.scopeCutoff.map((cut, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="font-mono text-[#4B5563]">—</span>
                    <span>{cut}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="border border-[#E5E7EB] bg-[#FFFFFF] p-3.5">
              <div className="text-xs font-bold text-[#111111]">기대 성과 지표 (KPI)</div>
              <ul className="mt-2 space-y-1.5 text-xs leading-relaxed text-[#374151]">
                {treatment.targetKpis.map((kpi, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="font-mono text-[#111111]">•</span>
                    <span>{kpi}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* 5. Parallel & Chained Sampling Actions (A -> Z, B -> C) */}
        <section className="border-t border-[#E5E7EB] pt-4">
          <div className="text-[11px] font-bold uppercase tracking-wider text-[#4B5563]">
            05 · 병렬 · 연쇄 샘플링 확장
          </div>
          <div className="mt-2.5 flex flex-col gap-2">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => onBranchDomain(treatment)}
                className="flex flex-1 items-center justify-center gap-2 border border-[#111111] bg-[#FFFFFF] px-3.5 py-2.5 text-xs font-semibold text-[#111111] hover:bg-[#111111] hover:text-[#FFFFFF]"
              >
                <BranchIcon className="h-3.5 w-3.5" />
                <span>같은 해외 근거로 다른 도메인 뽑기 (A → Z)</span>
              </button>
              <button
                type="button"
                onClick={() => setShowDomainPicker((v) => !v)}
                className="border border-[#E5E7EB] bg-[#FAFAFA] px-3 py-2.5 text-xs font-medium text-[#374151] hover:border-[#111111] hover:text-[#111111]"
              >
                도메인 지정
              </button>
            </div>

            {showDomainPicker && (
              <div className="flex flex-wrap gap-1.5 border border-[#E5E7EB] bg-[#FAFAFA] p-2.5">
                {DOMAIN_LIST.map((d) => (
                  <button
                    key={d.slug}
                    type="button"
                    onClick={() => {
                      onBranchDomain(treatment, d.slug);
                      setShowDomainPicker(false);
                    }}
                    className={`border px-2.5 py-1 text-xs font-medium ${
                      d.slug === treatment.domainSlug
                        ? "border-[#111111] bg-[#111111] text-[#FFFFFF]"
                        : "border-[#E5E7EB] bg-[#FFFFFF] text-[#374151] hover:border-[#111111] hover:text-[#111111]"
                    }`}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
            )}

            <button
              type="button"
              onClick={() => onEvolveTreatment(treatment)}
              className="flex w-full items-center justify-center gap-2 border border-[#111111] bg-[#111111] px-3.5 py-2.5 text-xs font-semibold text-[#FFFFFF] hover:bg-[#374151]"
            >
              <LayersIcon className="h-3.5 w-3.5" />
              <span>다른 해외 기능 추가 샘플링 (B → C 진화)</span>
            </button>
          </div>
        </section>
      </div>

      {/* 6. Execution & Export Sticky Footer */}
      <footer className="border-t border-[#E5E7EB] bg-[#FAFAFA] px-6 py-3.5">
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => onToggleSave(treatment)}
            className={`inline-flex items-center justify-center gap-1.5 border px-3 py-2 text-xs font-semibold ${
              isSaved
                ? "border-[#111111] bg-[#111111] text-[#FFFFFF]"
                : "border-[#E5E7EB] bg-[#FFFFFF] text-[#111111] hover:border-[#111111]"
            }`}
          >
            <BookmarkIcon className="h-3.5 w-3.5" filled={isSaved} />
            <span>{isSaved ? "보관함 저장됨" : "보관함 저장"}</span>
          </button>

          <button
            type="button"
            onClick={() => handleCopy("share")}
            className="inline-flex items-center justify-center gap-1.5 border border-[#E5E7EB] bg-[#FFFFFF] px-3 py-2 text-xs font-semibold text-[#111111] hover:border-[#111111]"
          >
            {copiedKind === "share" ? (
              <CheckIcon className="h-3.5 w-3.5" />
            ) : (
              <LinkIcon className="h-3.5 w-3.5" />
            )}
            <span>{copiedKind === "share" ? "공유 URL 복사됨" : "보관함 공유 링크"}</span>
          </button>

          <button
            type="button"
            onClick={() => handleCopy("md", treatmentToMarkdown(treatment))}
            className="inline-flex items-center justify-center gap-1.5 border border-[#E5E7EB] bg-[#FFFFFF] px-3 py-2 text-xs font-semibold text-[#111111] hover:border-[#111111]"
          >
            {copiedKind === "md" ? (
              <CheckIcon className="h-3.5 w-3.5" />
            ) : (
              <CopyIcon className="h-3.5 w-3.5" />
            )}
            <span>{copiedKind === "md" ? "마크다운 복사됨" : "기획서 마크다운 복사"}</span>
          </button>

          <button
            type="button"
            onClick={() => handleCopy("agy", treatmentToAgyPrompt(treatment))}
            className="inline-flex items-center justify-center gap-1.5 border border-[#111111] bg-[#111111] px-3 py-2 text-xs font-semibold text-[#FFFFFF] hover:bg-[#374151]"
          >
            {copiedKind === "agy" ? (
              <CheckIcon className="h-3.5 w-3.5" />
            ) : (
              <TerminalIcon className="h-3.5 w-3.5" />
            )}
            <span>
              {copiedKind === "agy" ? "프롬프트 복사됨" : "agy 초기 구현 프롬프트 복사"}
            </span>
          </button>
        </div>
      </footer>
    </article>
  );
}
