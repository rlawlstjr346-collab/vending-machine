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
      {/* Clean Cool Charcoal Backdrop */}
      <button
        type="button"
        aria-label="모달 닫기"
        tabIndex={-1}
        onClick={onClose}
        className="fixed inset-0 cursor-default bg-[#0F172A]/45 backdrop-blur-[2px]"
      />

      {/* Pure White Centered Focus Modal */}
      <div
        ref={scrollRef}
        role="dialog"
        aria-modal="true"
        aria-label="상세 기획 보기"
        className="relative z-10 max-h-[88vh] w-[min(94vw,700px)] overflow-y-auto rounded-[24px] border border-[#E5E7EB] bg-[#FFFFFF] p-7 text-[#0F172A] shadow-[0_20px_60px_rgba(15,23,42,0.16)] sm:p-9"
      >
        {/* ── 1) TREATMENT DETAIL MODAL ──────────────────────────────────── */}
        {selection.type === "treatment" &&
          (() => {
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
                      className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[13px] font-bold"
                      style={{
                        backgroundColor: domain?.softBg || "#EFF6FF",
                        color: domain?.color || "#2563EB",
                      }}
                    >
                      <span
                        className="h-2 w-2 rounded-full"
                        style={{ backgroundColor: domain?.color || "#2563EB" }}
                      />
                      {t.domainLabel}
                    </span>
                    <span className="rounded-full border border-[#E2E8F0] bg-[#F8FAFC] px-3 py-1 text-[13px] font-semibold text-[#475569]">
                      {t.buildCadence}
                    </span>
                    {t.customTopic && (
                      <span className="rounded-full border border-[#E2E8F0] bg-[#FFFFFF] px-3 py-1 text-[13px] font-semibold text-[#1E293B]">
                        주제 · {t.customTopic}
                      </span>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={onClose}
                    aria-label="닫기"
                    className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-[#E5E7EB] bg-[#FFFFFF] text-[#475569] hover:border-[#0F172A] hover:text-[#0F172A]"
                  >
                    <XIcon className="h-4 w-4" />
                  </button>
                </div>

                {/* Lineage Path (when evolved A -> B -> C) */}
                {hasLineageEvolution && (
                  <nav
                    aria-label="아이디어 확장 경로"
                    className="flex flex-wrap items-center gap-1.5 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] px-3.5 py-2.5 text-[13px]"
                  >
                    {t.lineage.map((node, idx) => {
                      const linked = node.treatmentId ? lineageMap[node.treatmentId] : undefined;
                      const isCurrent = node.treatmentId === t.id;
                      return (
                        <React.Fragment key={`${node.step}-${idx}`}>
                          {idx > 0 && <span className="text-[#94A3B8]">→</span>}
                          {linked && !isCurrent ? (
                            <button
                              type="button"
                              onClick={() => onSelectTreatment(linked)}
                              className="rounded-lg border border-[#E5E7EB] bg-[#FFFFFF] px-2.5 py-0.5 font-semibold text-[#1E293B] hover:border-[#0F172A]"
                            >
                              {node.label}: {node.title.slice(0, 18)}
                            </button>
                          ) : (
                            <span
                              className={
                                isCurrent
                                  ? "rounded-lg bg-[#0F172A] px-2.5 py-0.5 font-semibold text-[#FFFFFF]"
                                  : "font-medium text-[#64748B]"
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

                {/* Title & First-Screen Description */}
                <div>
                  <h2 className="text-[22px] font-bold leading-[1.35] tracking-[-0.025em] text-[#0F172A] sm:text-[26px]">
                    {t.title}
                  </h2>
                  <p className="mt-2.5 text-[15.5px] leading-[1.75] text-[#475569]">
                    {t.firstThreeSecondsUx}
                  </p>
                </div>

                {/* Top Bookmark Bar */}
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => onToggleSave(t)}
                    className={`inline-flex items-center justify-center gap-2 rounded-full border px-4 py-2 text-[13.5px] font-semibold ${
                      isSaved
                        ? "border-[#0F172A] bg-[#0F172A] text-[#FFFFFF]"
                        : "border-[#E5E7EB] bg-[#FFFFFF] text-[#0F172A] hover:border-[#0F172A]"
                    }`}
                  >
                    <BookmarkIcon className="h-4 w-4" filled={isSaved} />
                    <span>{isSaved ? "보관함에 저장됨" : "보관함에 저장"}</span>
                  </button>

                  <Link
                    href={`/treatment/${t.id}`}
                    className="inline-flex items-center gap-1.5 rounded-full border border-[#E5E7EB] bg-[#FFFFFF] px-4 py-2 text-[13.5px] font-semibold text-[#475569] hover:border-[#0F172A] hover:text-[#0F172A]"
                  >
                    <span>고정 페이지 열기</span>
                    <ArrowRightIcon className="h-3.5 w-3.5" />
                  </Link>
                </div>

                {/* 4 Clean Cool-Inset Spec Boxes */}
                <div className="space-y-3.5">
                  {/* Box 1: Overseas Benchmark */}
                  <section className="rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] p-5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h3 className="text-[13.5px] font-bold text-[#EA580C]">
                        벤치마킹한 해외 서비스
                      </h3>
                      <span className="tnum rounded-full border border-[#E2E8F0] bg-[#FFFFFF] px-2.5 py-0.5 text-[12px] font-semibold text-[#1E293B]">
                        {t.sampleA.shortMetricLabel}
                      </span>
                    </div>
                    <div className="mt-2 text-[16px] font-bold text-[#0F172A]">
                      {t.sampleA.name}
                      <span className="ml-2 text-[13.5px] font-medium text-[#64748B]">
                        · {t.sampleA.mechanismLabel}
                      </span>
                    </div>
                    <p className="mt-1.5 text-[15px] leading-[1.75] text-[#475569]">
                      {t.sampleA.overseasProofKo}
                    </p>
                    {t.sampleA2 && (
                      <div className="mt-3 rounded-xl border border-[#E2E8F0] bg-[#FFFFFF] p-3.5">
                        <div className="text-[13px] font-bold text-[#D97706]">
                          추가 결합 기능 · {t.sampleA2.name} ({t.sampleA2.tractionLabel})
                        </div>
                        <p className="mt-1 text-[14px] leading-[1.7] text-[#475569]">
                          {t.sampleA2.addedFeatureKo}
                        </p>
                      </div>
                    )}
                  </section>

                  {/* Box 2: 3 Core Features + Scope Cutoff */}
                  <section className="rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] p-5">
                    <h3 className="text-[13.5px] font-bold text-[#059669]">
                      이렇게 만듭니다 · 핵심 기능 3가지
                    </h3>
                    <ul className="mt-3 space-y-2.5 text-[15px] leading-[1.75] text-[#1E293B]">
                      {t.mvpFeatures.map((feat, idx) => (
                        <li key={idx} className="flex gap-2.5">
                          <span className="tnum mt-1 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#E2E8F0] text-[11.5px] font-bold text-[#0F172A]">
                            {idx + 1}
                          </span>
                          <span>{feat}</span>
                        </li>
                      ))}
                    </ul>
                    <div className="mt-4 border-t border-[#E2E8F0] pt-3 text-[14px] leading-[1.7] text-[#64748B]">
                      <span className="font-semibold text-[#1E293B]">
                        처음 만들 때 과감히 뺄 기능:{" "}
                      </span>
                      {t.scopeCutoff[0]}
                    </div>
                  </section>

                  {/* Box 3: Latest AI Radar Technology */}
                  <section className="rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] p-5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h3 className="text-[13.5px] font-bold text-[#2563EB]">
                        결합할 최신 AI 기술
                      </h3>
                      <span className="text-[12.5px] font-medium text-[#64748B]">
                        AI Radar · {t.sampleB.platformId}
                      </span>
                    </div>
                    <div className="mt-2 text-[15.5px] font-bold text-[#0F172A]">
                      {t.sampleB.titleKo}
                    </div>
                    <p className="mt-1.5 text-[15px] leading-[1.75] text-[#475569]">
                      {t.sampleB.bottleneckSolvedKo}
                    </p>
                    <div className="mt-3">
                      <a
                        href={t.sampleB.canonicalUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-[13.5px] font-semibold text-[#2563EB] hover:underline"
                      >
                        <span>기술 원문 보기 ↗</span>
                      </a>
                    </div>
                  </section>

                  {/* Box 4: Branch & Evolve */}
                  <section className="rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] p-5">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="text-[13.5px] font-bold text-[#D97706]">
                        이 아이디어에서 가지치기
                      </h3>
                      <button
                        type="button"
                        onClick={() => setShowDomainChooser((v) => !v)}
                        className="text-[12.5px] font-semibold text-[#64748B] hover:text-[#0F172A]"
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
                            className="inline-flex items-center gap-1.5 rounded-full border border-[#E5E7EB] bg-[#FFFFFF] px-3 py-1 text-[13px] font-medium text-[#1E293B] hover:border-[#0F172A]"
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

                    <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                      <button
                        type="button"
                        onClick={() => onBranchDomain(t)}
                        className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#E5E7EB] bg-[#FFFFFF] px-4 py-3 text-[13.5px] font-semibold text-[#0F172A] hover:border-[#0F172A]"
                      >
                        <BranchIcon className="h-4 w-4 text-[#D97706]" />
                        <span>다른 분야로 비틀기</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => onEvolveTreatment(t)}
                        className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#E5E7EB] bg-[#FFFFFF] px-4 py-3 text-[13.5px] font-semibold text-[#0F172A] hover:border-[#0F172A]"
                      >
                        <LayersIcon className="h-4 w-4 text-[#059669]" />
                        <span>인기 기능 더 섞기</span>
                      </button>
                    </div>
                  </section>
                </div>

                {/* Bottom Action Buttons: Prompt Copy + Markdown Copy + Overseas Site */}
                <div className="flex flex-col gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => copyText("prompt", treatmentToCodingPrompt(t))}
                    className="inline-flex w-full items-center justify-center gap-2.5 rounded-2xl bg-[#0F172A] px-5 py-4 text-[15px] font-bold text-[#FFFFFF] hover:bg-[#1E293B]"
                  >
                    {copiedKind === "prompt" ? (
                      <CheckIcon className="h-4 w-4" />
                    ) : (
                      <TerminalIcon className="h-4 w-4" />
                    )}
                    <span>
                      {copiedKind === "prompt"
                        ? "AI 코딩 프롬프트 복사 완료"
                        : "AI 코딩 프롬프트 복사"}
                    </span>
                  </button>

                  <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                    <button
                      type="button"
                      onClick={() => copyText("md", treatmentToMarkdown(t))}
                      className="inline-flex items-center justify-center gap-2 rounded-2xl border border-[#E5E7EB] bg-[#FFFFFF] px-4 py-3.5 text-[14.5px] font-semibold text-[#0F172A] hover:border-[#0F172A] hover:bg-[#F8FAFC]"
                    >
                      {copiedKind === "md" ? (
                        <CheckIcon className="h-4 w-4 text-[#059669]" />
                      ) : (
                        <CopyIcon className="h-4 w-4" />
                      )}
                      <span>
                        {copiedKind === "md" ? "마크다운 복사 완료" : "기획안 마크다운 복사"}
                      </span>
                    </button>

                    <a
                      href={t.sampleA.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center gap-2 rounded-2xl border border-[#E5E7EB] bg-[#FFFFFF] px-4 py-3.5 text-[14.5px] font-semibold text-[#0F172A] hover:border-[#0F172A] hover:bg-[#F8FAFC]"
                    >
                      <span>해외 원본 사이트 열기 ↗</span>
                    </a>
                  </div>
                </div>
              </div>
            );
          })()}

        {/* ── 2) OVERSEAS BUILDER MODAL ──────────────────────────────────── */}
        {selection.type === "builder" &&
          (() => {
            const b = selection.builder;
            return (
              <div className="flex flex-col gap-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-[#FFF7ED] px-3 py-1 text-[13px] font-bold text-[#EA580C]">
                      <span className="h-2 w-2 rounded-full bg-[#EA580C]" />
                      {b.sourceLabel}
                    </span>
                    <span className="tnum rounded-full border border-[#E2E8F0] bg-[#F8FAFC] px-3 py-1 text-[13px] font-semibold text-[#1E293B]">
                      {formatShortMetric(b)}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={onClose}
                    aria-label="닫기"
                    className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-[#E5E7EB] bg-[#FFFFFF] text-[#475569] hover:border-[#0F172A] hover:text-[#0F172A]"
                  >
                    <XIcon className="h-4 w-4" />
                  </button>
                </div>

                <div>
                  <h2 className="text-[23px] font-bold leading-[1.35] text-[#0F172A]">
                    {b.name}
                  </h2>
                  <p className="mt-2 text-[15.5px] leading-[1.75] text-[#475569]">
                    {b.taglineKo}
                  </p>
                </div>

                <div className="space-y-2.5 rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] p-5">
                  <div className="text-[13.5px] font-bold text-[#EA580C]">
                    핵심 작동 방식 · {b.mechanismLabel}
                  </div>
                  <p className="text-[15px] leading-[1.75] text-[#1E293B]">{b.painPointKo}</p>
                </div>

                <div className="flex flex-col gap-2.5 pt-1">
                  <button
                    type="button"
                    onClick={() => onSynthesizeFromBuilder(b)}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#0F172A] px-5 py-4 text-[15px] font-bold text-[#FFFFFF] hover:bg-[#1E293B]"
                  >
                    <span>이 재료로 새 서비스 기획안 뽑기</span>
                    <ArrowRightIcon className="h-4 w-4" />
                  </button>
                  <a
                    href={b.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-[#E5E7EB] bg-[#FFFFFF] px-5 py-3.5 text-[14.5px] font-semibold text-[#0F172A] hover:border-[#0F172A] hover:bg-[#F8FAFC]"
                  >
                    <span>해외 원본 사이트 열기</span>
                    <ExternalLinkIcon className="h-4 w-4" />
                  </a>
                </div>
              </div>
            );
          })()}

        {/* ── 3) AI RADAR INGREDIENT MODAL ───────────────────────────────── */}
        {selection.type === "radar" &&
          (() => {
            const r = selection.radar;
            return (
              <div className="flex flex-col gap-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-[#EFF6FF] px-3 py-1 text-[13px] font-bold text-[#2563EB]">
                      <span className="h-2 w-2 rounded-full bg-[#2563EB]" />
                      AI Radar · {r.platformId}
                    </span>
                    <span className="rounded-full border border-[#E2E8F0] bg-[#F8FAFC] px-3 py-1 text-[13px] font-medium text-[#475569]">
                      {r.planningMeta.signalType}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={onClose}
                    aria-label="닫기"
                    className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-[#E5E7EB] bg-[#FFFFFF] text-[#475569] hover:border-[#0F172A] hover:text-[#0F172A]"
                  >
                    <XIcon className="h-4 w-4" />
                  </button>
                </div>

                <div>
                  <h2 className="text-[22px] font-bold leading-[1.38] text-[#0F172A]">
                    {r.titleKo}
                  </h2>
                  <p className="mt-2.5 text-[15.5px] leading-[1.75] text-[#475569]">
                    {r.whatKo || r.highlightSummary}
                  </p>
                </div>

                <div className="space-y-2.5 rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] p-5">
                  <div className="text-[13.5px] font-bold text-[#2563EB]">
                    서비스 기획에 가져다 쓸 포인트
                  </div>
                  <p className="text-[15px] leading-[1.75] text-[#1E293B]">
                    {r.planningMeta.benchmarkPoint}
                  </p>
                  {r.whyKo && (
                    <p className="border-t border-[#E2E8F0] pt-2.5 text-[14.5px] leading-[1.7] text-[#475569]">
                      {r.whyKo}
                    </p>
                  )}
                </div>

                <div className="flex flex-col gap-2.5 pt-1">
                  <button
                    type="button"
                    onClick={() => onSynthesizeFromRadar(r)}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#0F172A] px-5 py-4 text-[15px] font-bold text-[#FFFFFF] hover:bg-[#1E293B]"
                  >
                    <span>이 기술로 새 서비스 기획안 뽑기</span>
                    <ArrowRightIcon className="h-4 w-4" />
                  </button>
                  <a
                    href={r.canonicalUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-[#E5E7EB] bg-[#FFFFFF] px-5 py-3.5 text-[14.5px] font-semibold text-[#0F172A] hover:border-[#0F172A] hover:bg-[#F8FAFC]"
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
