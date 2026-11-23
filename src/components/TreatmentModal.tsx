"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { DOMAIN_LIST, DOMAIN_MAP } from "@/lib/domains";
import {
  formatShortMetric,
  treatmentToCodingPrompt,
  treatmentToMarkdown,
} from "@/lib/synthesis-engine";
import type { AiRadarSignal, BuilderSignal, DomainSlug, Treatment } from "@/lib/types";
import {
  ArrowRightIcon,
  BookmarkIcon,
  BranchIcon,
  CheckIcon,
  CopyIcon,
  ExternalLinkIcon,
  LayersIcon,
  TerminalIcon,
  XIcon,
} from "./Icons";

export type ModalSelection =
  | { type: "treatment"; treatment: Treatment }
  | { type: "builder"; builder: BuilderSignal }
  | { type: "radar"; radar: AiRadarSignal }
  | null;

interface TreatmentModalProps {
  selection: ModalSelection;
  savedIdSet: Set<string>;
  lineageMap: Record<string, Treatment>;
  onClose: () => void;
  onSelectTreatment: (treatment: Treatment) => void;
  onBranchDomain: (treatment: Treatment, nextDomainSlug?: DomainSlug) => void;
  onEvolveTreatment: (treatment: Treatment) => void;
  onToggleSave: (treatment: Treatment) => void;
  onSynthesizeFromBuilder: (builder: BuilderSignal) => void;
  onSynthesizeFromRadar: (radar: AiRadarSignal) => void;
}

export function TreatmentModal({
  selection,
  savedIdSet,
  lineageMap,
  onClose,
  onSelectTreatment,
  onBranchDomain,
  onEvolveTreatment,
  onToggleSave,
  onSynthesizeFromBuilder,
  onSynthesizeFromRadar,
}: TreatmentModalProps) {
  const [copiedKind, setCopiedKind] = useState<string | null>(null);
  const [showDomainChooser, setShowDomainChooser] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!selection) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    scrollRef.current?.scrollTo({ top: 0 });
    setShowDomainChooser(false);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [selection, onClose]);

  if (!selection) return null;

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
      {/* Calm warm charcoal dimmed backdrop */}
      <button
        type="button"
        aria-label="모달 닫기"
        tabIndex={-1}
        onClick={onClose}
        className="fixed inset-0 cursor-default bg-[#1C1916]/45 backdrop-blur-[3px]"
      />

      {/* Centered Focus Modal */}
      <div
        ref={scrollRef}
        role="dialog"
        aria-modal="true"
        aria-label="상세 기획 보기"
        className="relative z-10 w-[min(92vw,680px)] max-h-[88vh] overflow-y-auto rounded-[22px] border border-[#E5DEC9] bg-[#FFFCF7] p-6 text-[#1E1C19] shadow-2xl sm:p-8"
      >
        {/* ── 1) TREATMENT DETAIL MODAL ──────────────────────────────────── */}
        {selection.type === "treatment" && (() => {
          const t = selection.treatment;
          const domain = DOMAIN_MAP[t.domainSlug];
          const isSaved = savedIdSet.has(t.id);
          const hasLineageEvolution = t.lineage.length >= 3;

          return (
            <div className="flex flex-col gap-5">
              {/* Top Meta Row & Close */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[13px] font-semibold"
                    style={{
                      backgroundColor: domain?.softBg || "#F5EFE4",
                      color: domain?.color || "#1E1C19",
                    }}
                  >
                    <span
                      className="h-2 w-2 rounded-full"
                      style={{ backgroundColor: domain?.color || "#C85A32" }}
                    />
                    {t.domainLabel}
                  </span>
                  <span className="rounded-full border border-[#E7E0D3] bg-[#F9F5EC] px-3 py-1 text-[13px] font-medium text-[#3D3831]">
                    {t.buildCadence}
                  </span>
                  {t.customTopic && (
                    <span className="rounded-full border border-[#E7E0D3] bg-[#FFFCF7] px-3 py-1 text-[13px] font-medium text-[#6E675C]">
                      주제 · {t.customTopic}
                    </span>
                  )}
                </div>

                <button
                  type="button"
                  onClick={onClose}
                  aria-label="닫기"
                  className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-[#E7E0D3] bg-[#FFFCF7] text-[#3D3831] hover:bg-[#EBE5D8] hover:text-[#1E1C19]"
                >
                  <XIcon className="h-4 w-4" />
                </button>
              </div>

              {/* Lineage Path (shown when evolved A -> B -> C) */}
              {hasLineageEvolution && (
                <nav
                  aria-label="아이디어 확장 경로"
                  className="flex flex-wrap items-center gap-1.5 rounded-xl border border-[#ECE5D8] bg-[#F9F5EC] px-3.5 py-2.5 text-[13px]"
                >
                  {t.lineage.map((node, idx) => {
                    const linked = node.treatmentId ? lineageMap[node.treatmentId] : undefined;
                    const isCurrent = node.treatmentId === t.id;
                    return (
                      <React.Fragment key={`${node.step}-${idx}`}>
                        {idx > 0 && <span className="text-[#6E675C]">→</span>}
                        {linked && !isCurrent ? (
                          <button
                            type="button"
                            onClick={() => onSelectTreatment(linked)}
                            className="rounded-lg border border-[#E7E0D3] bg-[#FFFCF7] px-2.5 py-0.5 font-medium text-[#1E1C19] hover:bg-[#EBE5D8]"
                          >
                            {node.label}: {node.title.slice(0, 18)}
                          </button>
                        ) : (
                          <span
                            className={
                              isCurrent
                                ? "rounded-lg bg-[#23201C] px-2.5 py-0.5 font-semibold text-[#FFFCF7]"
                                : "font-medium text-[#6E675C]"
                            }
                          >
                            {node.label}: {node.title.slice(0, 18)}
                          </span>
                        )}
                      </React.Fragment>
                    );
                  })}
                </nav>
              )}

              {/* Large Editorial Title & First-Screen Description */}
              <div>
                <h2 className="text-[22px] font-bold leading-[1.36] tracking-[-0.02em] text-[#1E1C19] sm:text-[25px]">
                  {t.title}
                </h2>
                <p className="mt-2.5 text-[15.5px] leading-[1.68] text-[#3D3831] sm:text-[16px]">
                  {t.firstThreeSecondsUx}
                </p>
              </div>

              {/* Top 2-Split Action Bar */}
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => onToggleSave(t)}
                  className={`inline-flex items-center justify-center gap-2 rounded-full border px-4 py-2.5 text-[14px] font-semibold ${
                    isSaved
                      ? "border-[#23201C] bg-[#23201C] text-[#FFFCF7]"
                      : "border-[#E7E0D3] bg-[#FFFCF7] text-[#1E1C19] hover:bg-[#F6F3EC]"
                  }`}
                >
                  <BookmarkIcon className="h-4 w-4" filled={isSaved} />
                  <span>{isSaved ? "보관함에 저장됨" : "보관함에 저장"}</span>
                </button>

                <button
                  type="button"
                  onClick={() => copyText("md", treatmentToMarkdown(t))}
                  className="inline-flex items-center justify-center gap-2 rounded-full border border-[#E7E0D3] bg-[#FFFCF7] px-4 py-2.5 text-[14px] font-semibold text-[#1E1C19] hover:bg-[#F6F3EC]"
                >
                  {copiedKind === "md" ? (
                    <CheckIcon className="h-4 w-4 text-[#3F6A52]" />
                  ) : (
                    <CopyIcon className="h-4 w-4" />
                  )}
                  <span>{copiedKind === "md" ? "기획안 복사 완료" : "기획안 텍스트 복사"}</span>
                </button>
              </div>

              {/* 4 Warm Inset Boxes */}
              <div className="space-y-3.5">
                {/* Box 1: Overseas Benchmark (Terracotta #C85A32) */}
                <section className="rounded-xl border border-[#ECE5D8] bg-[#F9F5EC] p-5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="text-[14px] font-bold text-[#C85A32]">
                      벤치마킹한 해외 서비스
                    </h3>
                    <span className="tnum rounded-full border border-[#E7E0D3] bg-[#FFFCF7] px-2.5 py-0.5 text-[12.5px] font-semibold text-[#3D3831]">
                      {t.sampleA.shortMetricLabel}
                    </span>
                  </div>
                  <div className="mt-2 text-[16px] font-bold text-[#1E1C19]">
                    {t.sampleA.name}
                    <span className="ml-2 text-[13.5px] font-medium text-[#6E675C]">
                      · {t.sampleA.mechanismLabel}
                    </span>
                  </div>
                  <p className="mt-1.5 text-[15px] leading-[1.68] text-[#3D3831]">
                    {t.sampleA.overseasProofKo}
                  </p>
                  {t.sampleA2 && (
                    <div className="mt-3 rounded-lg border border-[#E7E0D3] bg-[#FFFCF7] p-3.5">
                      <div className="text-[13px] font-bold text-[#B87D2B]">
                        추가 결합 기능 · {t.sampleA2.name} ({t.sampleA2.tractionLabel})
                      </div>
                      <p className="mt-1 text-[14px] leading-[1.6] text-[#3D3831]">
                        {t.sampleA2.addedFeatureKo}
                      </p>
                    </div>
                  )}
                  <div className="mt-3">
                    <a
                      href={t.sampleA.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-[13.5px] font-semibold text-[#C85A32] hover:underline"
                    >
                      <span>해외 원본 사이트 열기 ↗</span>
                    </a>
                  </div>
                </section>

                {/* Box 2: 3 Core Features + Scope Cutoff (Sage Green #3F6A52) */}
                <section className="rounded-xl border border-[#ECE5D8] bg-[#F9F5EC] p-5">
                  <h3 className="text-[14px] font-bold text-[#3F6A52]">
                    이렇게 만듭니다 · 핵심 기능 3가지
                  </h3>
                  <ul className="mt-3 space-y-2.5 text-[15px] leading-[1.65] text-[#1E1C19]">
                    {t.mvpFeatures.map((feat, idx) => (
                      <li key={idx} className="flex gap-2.5">
                        <span className="tnum mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#EBE5D8] text-[12px] font-bold text-[#1E1C19]">
                          {idx + 1}
                        </span>
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                  <div className="mt-4 border-t border-[#E7E0D3] pt-3 text-[14px] leading-[1.6] text-[#6E675C]">
                    <span className="font-semibold text-[#3D3831]">
                      처음 만들 때 과감히 뺄 기능:{" "}
                    </span>
                    {t.scopeCutoff[0]}
                  </div>
                </section>

                {/* Box 3: Latest AI Radar Technology (Baltic Blue #3B6380) */}
                <section className="rounded-xl border border-[#ECE5D8] bg-[#F9F5EC] p-5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="text-[14px] font-bold text-[#3B6380]">
                      결합할 최신 AI 기술
                    </h3>
                    <span className="text-[12.5px] font-medium text-[#6E675C]">
                      AI Radar · {t.sampleB.platformId}
                    </span>
                  </div>
                  <div className="mt-2 text-[15.5px] font-bold text-[#1E1C19]">
                    {t.sampleB.titleKo}
                  </div>
                  <p className="mt-1.5 text-[15px] leading-[1.68] text-[#3D3831]">
                    {t.sampleB.bottleneckSolvedKo}
                  </p>
                  <div className="mt-3">
                    <a
                      href={t.sampleB.canonicalUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-[13.5px] font-semibold text-[#3B6380] hover:underline"
                    >
                      <span>기술 원문 보기 ↗</span>
                    </a>
                  </div>
                </section>

                {/* Box 4: Branch & Evolve (Warm Amber #B87D2B) */}
                <section className="rounded-xl border border-[#ECE5D8] bg-[#F9F5EC] p-5">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-[14px] font-bold text-[#B87D2B]">
                      이 아이디어에서 가지치기
                    </h3>
                    <button
                      type="button"
                      onClick={() => setShowDomainChooser((v) => !v)}
                      className="text-[12.5px] font-semibold text-[#6E675C] hover:text-[#1E1C19]"
                    >
                      {showDomainChooser ? "분야 선택 닫기" : "분야 직접 고르기"}
                    </button>
                  </div>

                  {showDomainChooser && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {DOMAIN_LIST.map((d) => (
                        <button
                          key={d.slug}
                          type="button"
                          onClick={() => {
                            onBranchDomain(t, d.slug);
                            setShowDomainChooser(false);
                          }}
                          className="inline-flex items-center gap-1.5 rounded-full border border-[#E7E0D3] bg-[#FFFCF7] px-3 py-1 text-[13px] font-medium text-[#3D3831] hover:border-[#23201C] hover:text-[#1E1C19]"
                        >
                          <span
                            className="h-2 w-2 rounded-full"
                            style={{ backgroundColor: d.color }}
                          />
                          <span>{d.label}</span>
                        </button>
                      ))}
                    </div>
                  )}

                  <div className="mt-3 flex flex-col gap-2">
                    <button
                      type="button"
                      onClick={() => onBranchDomain(t)}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-[#E7E0D3] bg-[#FFFCF7] px-4 py-3 text-[14px] font-semibold text-[#1E1C19] hover:border-[#23201C]"
                    >
                      <BranchIcon className="h-4 w-4 text-[#B87D2B]" />
                      <span>같은 해외 사례로 다른 분야 아이디어 뽑기</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onEvolveTreatment(t)}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-[#E7E0D3] bg-[#FFFCF7] px-4 py-3 text-[14px] font-semibold text-[#1E1C19] hover:border-[#23201C]"
                    >
                      <LayersIcon className="h-4 w-4 text-[#3F6A52]" />
                      <span>여기에 다른 해외 인기 기능 하나 더 합치기</span>
                    </button>
                  </div>
                </section>
              </div>

              {/* Bottom 2-Tier Full-Width CTA Buttons */}
              <div className="flex flex-col gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={() => copyText("prompt", treatmentToCodingPrompt(t))}
                  className="inline-flex w-full items-center justify-center gap-2.5 rounded-2xl bg-[#23201C] px-5 py-4 text-[15.5px] font-bold text-[#FFFCF7] hover:bg-[#36322C]"
                >
                  {copiedKind === "prompt" ? (
                    <CheckIcon className="h-4 w-4" />
                  ) : (
                    <TerminalIcon className="h-4 w-4" />
                  )}
                  <span>
                    {copiedKind === "prompt"
                      ? "초기 구현 프롬프트가 클립보드에 복사되었습니다"
                      : "AI 코딩 도구용 초기 구현 프롬프트 복사하기"}
                  </span>
                </button>

                <a
                  href={t.sampleA.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-[#D8CEBC] bg-[#FFFCF7] px-5 py-3.5 text-[15px] font-semibold text-[#1E1C19] hover:bg-[#F6F3EC]"
                >
                  <span>벤치마킹한 해외 원본 서비스 직접 써보기 ↗</span>
                </a>

                <div className="pt-1 text-center">
                  <Link
                    href={`/treatment/${t.id}`}
                    className="text-[13px] font-medium text-[#6E675C] hover:text-[#1E1C19] hover:underline"
                  >
                    이 기획안의 고정 페이지 열기
                  </Link>
                </div>
              </div>
            </div>
          );
        })()}

        {/* ── 2) OVERSEAS BUILDER MODAL ──────────────────────────────────── */}
        {selection.type === "builder" && (() => {
          const b = selection.builder;
          return (
            <div className="flex flex-col gap-5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-[#F9EFEA] px-3 py-1 text-[13px] font-semibold text-[#C85A32]">
                    <span className="h-2 w-2 rounded-full bg-[#C85A32]" />
                    {b.sourceLabel}
                  </span>
                  <span className="tnum rounded-full border border-[#E7E0D3] bg-[#F9F5EC] px-3 py-1 text-[13px] font-semibold text-[#3D3831]">
                    {formatShortMetric(b)}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="닫기"
                  className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-[#E7E0D3] bg-[#FFFCF7] text-[#3D3831] hover:bg-[#EBE5D8]"
                >
                  <XIcon className="h-4 w-4" />
                </button>
              </div>

              <div>
                <h2 className="text-[23px] font-bold leading-[1.35] text-[#1E1C19]">
                  {b.name}
                </h2>
                <p className="mt-2 text-[16px] leading-[1.68] text-[#3D3831]">{b.taglineKo}</p>
              </div>

              <div className="rounded-xl border border-[#ECE5D8] bg-[#F9F5EC] p-5 space-y-2.5">
                <div className="text-[13.5px] font-bold text-[#C85A32]">
                  핵심 작동 방식 · {b.mechanismLabel}
                </div>
                <p className="text-[15px] leading-[1.68] text-[#3D3831]">{b.painPointKo}</p>
                {b.taglineEn !== b.taglineKo && (
                  <p className="border-t border-[#E7E0D3] pt-2.5 text-[13.5px] text-[#6E675C]">
                    원문 소개: {b.taglineEn}
                  </p>
                )}
              </div>

              <div className="flex flex-col gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={() => onSynthesizeFromBuilder(b)}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#23201C] px-5 py-4 text-[15.5px] font-bold text-[#FFFCF7] hover:bg-[#36322C]"
                >
                  <span>이 재료로 새 서비스 기획안 뽑기</span>
                  <ArrowRightIcon className="h-4 w-4" />
                </button>
                <a
                  href={b.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-[#D8CEBC] bg-[#FFFCF7] px-5 py-3.5 text-[15px] font-semibold text-[#1E1C19] hover:bg-[#F6F3EC]"
                >
                  <span>해외 원본 사이트 직접 열기</span>
                  <ExternalLinkIcon className="h-4 w-4" />
                </a>
              </div>
            </div>
          );
        })()}

        {/* ── 3) AI RADAR INGREDIENT MODAL ───────────────────────────────── */}
        {selection.type === "radar" && (() => {
          const r = selection.radar;
          return (
            <div className="flex flex-col gap-5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-[#EDF2F6] px-3 py-1 text-[13px] font-semibold text-[#3B6380]">
                    <span className="h-2 w-2 rounded-full bg-[#3B6380]" />
                    AI Radar · {r.platformId}
                  </span>
                  <span className="rounded-full border border-[#E7E0D3] bg-[#F9F5EC] px-3 py-1 text-[13px] font-medium text-[#3D3831]">
                    {r.planningMeta.signalType}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="닫기"
                  className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-[#E7E0D3] bg-[#FFFCF7] text-[#3D3831] hover:bg-[#EBE5D8]"
                >
                  <XIcon className="h-4 w-4" />
                </button>
              </div>

              <div>
                <h2 className="text-[22px] font-bold leading-[1.38] text-[#1E1C19]">
                  {r.titleKo}
                </h2>
                <p className="mt-2.5 text-[15.5px] leading-[1.68] text-[#3D3831]">
                  {r.whatKo || r.highlightSummary}
                </p>
              </div>

              <div className="rounded-xl border border-[#ECE5D8] bg-[#F9F5EC] p-5 space-y-2.5">
                <div className="text-[13.5px] font-bold text-[#3B6380]">
                  서비스 기획에 가져다 쓸 포인트
                </div>
                <p className="text-[15px] leading-[1.65] text-[#1E1C19]">
                  {r.planningMeta.benchmarkPoint}
                </p>
                {r.whyKo && (
                  <p className="border-t border-[#E7E0D3] pt-2.5 text-[14.5px] leading-[1.65] text-[#3D3831]">
                    {r.whyKo}
                  </p>
                )}
              </div>

              <div className="flex flex-col gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={() => onSynthesizeFromRadar(r)}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#23201C] px-5 py-4 text-[15.5px] font-bold text-[#FFFCF7] hover:bg-[#36322C]"
                >
                  <span>이 재료로 새 서비스 기획안 뽑기</span>
                  <ArrowRightIcon className="h-4 w-4" />
                </button>
                <a
                  href={r.canonicalUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-[#D8CEBC] bg-[#FFFCF7] px-5 py-3.5 text-[15px] font-semibold text-[#1E1C19] hover:bg-[#F6F3EC]"
                >
                  <span>기술 원문 페이지 열기</span>
                  <ExternalLinkIcon className="h-4 w-4" />
                </a>
              </div>
            </div>
          );
        })()}
      </div>
    </div>
  );
}
