"use client";

import React, { useState } from "react";
import { DOMAIN_MAP, MECHANISM_MAP } from "@/lib/domains";
import type { Treatment } from "@/lib/types";
import {
  ArrowLeftIcon,
  BookmarkIcon,
  BranchIcon,
  ExternalLinkIcon,
  LayersIcon,
  RefreshIcon,
  TerminalIcon,
} from "./Icons";
import { ProductWireframePreview } from "./ProductWireframePreview";

interface VisualBlueprintCardProps {
  treatment: Treatment;
  cardPosition: number;
  canGoPrev: boolean;
  isSaved: boolean;
  lineageMap: Record<string, Treatment>;
  onPrev: () => void;
  onNext: () => void;
  onOpenDetail: () => void;
  onToggleSave: (treatment: Treatment) => void;
  onBranchDomain: (treatment: Treatment) => void;
  onEvolveTreatment: (treatment: Treatment) => void;
  onSelectLineage: (treatment: Treatment) => void;
}

function getHostname(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "web";
  }
}

function formatVerifiedBadge(treatment: Treatment): { label: string; isRevenue: boolean } {
  const { sampleA } = treatment;
  if (sampleA.verifiedRevenue) {
    const match = sampleA.tractionLabel.match(/\$[\d.,]+[kKmM]?/);
    return {
      label: match ? `월 ${match[0]} 수익 검증 · TrustMRR` : "실제 매출 검증 · TrustMRR",
      isRevenue: true,
    };
  }
  if (sampleA.sourceLabel.includes("Show HN") || sampleA.shortMetricLabel.includes("Show HN")) {
    return { label: `${sampleA.shortMetricLabel} · 검증 인기`, isRevenue: false };
  }
  if (sampleA.sourceLabel.includes("Product Hunt")) {
    return { label: "Product Hunt 화제 신상", isRevenue: false };
  }
  return { label: sampleA.shortMetricLabel || sampleA.sourceLabel, isRevenue: false };
}

function compactKoreanLine(text: string, maxLen = 42): string {
  const cleaned = text
    .replace(/\([^)]*[a-zA-Z]{4,}[^)]*\)/g, "")
    .replace(/\s+/g, " ")
    .trim();
  if (cleaned.length <= maxLen) return cleaned;
  return `${cleaned.slice(0, maxLen - 1).trim()}…`;
}

function buildOneLineSuccessPoint(treatment: Treatment): string {
  const mech = MECHANISM_MAP[treatment.sampleA.mechanism];
  if (mech?.simpleActionKo) {
    return compactKoreanLine(mech.simpleActionKo, 42);
  }
  return compactKoreanLine(treatment.sampleA.overseasProofKo, 42);
}

function buildOneLineTechRole(treatment: Treatment): string {
  const bp = treatment.sampleB.benchmarkPoint?.trim();
  if (bp && /[가-힣]/.test(bp)) {
    return compactKoreanLine(bp, 42);
  }
  return compactKoreanLine("반복 분류·분석 단계를 몇 줄의 코드로 자동화", 42);
}

function ProductFavicon({ url, name }: { url: string; name: string }) {
  const [failed, setFailed] = useState(false);
  const hostname = getHostname(url);
  const initial = (name.trim()[0] || "B").toUpperCase();

  if (failed || !hostname || hostname === "web") {
    return (
      <span
        className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-[#E2E8F0] bg-[#FFFFFF] text-[14px] font-extrabold text-[#0F172A]"
        aria-hidden="true"
      >
        {initial}
      </span>
    );
  }

  return (
    <span className="grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-xl border border-[#E2E8F0] bg-[#FFFFFF]">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={`https://www.google.com/s2/favicons?domain=${encodeURIComponent(hostname)}&sz=128`}
        alt={`${name} 아이콘`}
        width={24}
        height={24}
        className="h-6 w-6 object-contain"
        onError={() => setFailed(true)}
      />
    </span>
  );
}

export function VisualBlueprintCard({
  treatment,
  cardPosition,
  canGoPrev,
  isSaved,
  lineageMap,
  onPrev,
  onNext,
  onOpenDetail,
  onToggleSave,
  onBranchDomain,
  onEvolveTreatment,
  onSelectLineage,
}: VisualBlueprintCardProps) {
  const domain = DOMAIN_MAP[treatment.domainSlug];
  const domainColor = domain?.color || "#2563EB";
  const domainSoftBg = domain?.softBg || "#EFF6FF";
  const badge = formatVerifiedBadge(treatment);
  const hostname = getHostname(treatment.sampleA.url);
  const hasLineageEvolution = treatment.lineage.length >= 3;

  return (
    <article
      className="w-full rounded-[24px] border border-[#E5E7EB] bg-[#FFFFFF] p-5 shadow-[0_10px_32px_rgba(15,23,42,0.05)] sm:p-7"
      aria-label={treatment.title}
    >
      {/* ── 1) CARD TOP: META BAR + 1-LINE TITLE + 1-LINE HOOK ─────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[12.5px] font-bold"
            style={{ backgroundColor: domainSoftBg, color: domainColor }}
          >
            <span
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: domainColor }}
            />
            {treatment.domainLabel}
          </span>

          <span className="rounded-full border border-[#E2E8F0] bg-[#F8FAFC] px-2.5 py-1 text-[12px] font-semibold text-[#475569]">
            {treatment.buildCadence}
          </span>

          {treatment.customTopic && (
            <span className="rounded-full border border-[#E2E8F0] bg-[#FFFFFF] px-2.5 py-1 text-[12px] font-semibold text-[#0F172A]">
              주제 · {treatment.customTopic}
            </span>
          )}

          {hasLineageEvolution && (
            <nav
              aria-label="아이디어 계보"
              className="inline-flex flex-wrap items-center gap-1 rounded-full border border-[#E2E8F0] bg-[#F8FAFC] px-2.5 py-0.5 text-[11.5px]"
            >
              {treatment.lineage.map((node, idx) => {
                const linked = node.treatmentId ? lineageMap[node.treatmentId] : undefined;
                const isCurrent = node.treatmentId === treatment.id;
                return (
                  <React.Fragment key={`${node.step}-${idx}`}>
                    {idx > 0 && <span className="text-[#94A3B8]">→</span>}
                    {linked && !isCurrent ? (
                      <button
                        type="button"
                        onClick={() => onSelectLineage(linked)}
                        className="font-semibold text-[#475569] hover:text-[#0F172A] hover:underline"
                      >
                        {node.label}
                      </button>
                    ) : (
                      <span
                        className={
                          isCurrent
                            ? "font-bold text-[#0F172A]"
                            : "font-medium text-[#64748B]"
                        }
                      >
                        {node.label}
                      </span>
                    )}
                  </React.Fragment>
                );
              })}
            </nav>
          )}
        </div>

        <div className="flex items-center gap-2">
          <span className="tnum text-[12px] font-semibold text-[#64748B]">
            #{cardPosition}
          </span>
          <button
            type="button"
            onClick={() => onToggleSave(treatment)}
            aria-pressed={isSaved}
            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12.5px] font-semibold transition-colors ${
              isSaved
                ? "border-[#0F172A] bg-[#0F172A] text-[#FFFFFF]"
                : "border-[#E5E7EB] bg-[#FFFFFF] text-[#1E293B] hover:border-[#0F172A]"
            }`}
          >
            <BookmarkIcon className="h-3.5 w-3.5" filled={isSaved} />
            <span>{isSaved ? "저장됨" : "저장"}</span>
          </button>
        </div>
      </div>

      {/* Large Single-Line Title & 1-Line Concept */}
      <h1 className="mt-3 text-[22px] font-bold leading-[1.34] tracking-[-0.025em] text-[#0F172A] sm:text-[27px]">
        {treatment.title}
      </h1>
      <p className="mt-1.5 line-clamp-1 text-[15px] leading-[1.6] text-[#475569] sm:text-[16px]">
        {treatment.oneLineHook}
      </p>

      {/* ── 2) CARD MIDDLE: 12-COL VISUAL GRID (5 PROOF + 7 WIREFRAME) ─────── */}
      <div className="mt-6 grid grid-cols-1 items-stretch gap-5 lg:grid-cols-12">
        {/* LEFT 5 COLS: REAL OVERSEAS PRODUCT + AI RADAR TREND */}
        <div className="flex flex-col justify-between gap-2.5 lg:col-span-5">
          {/* Block A: Overseas Verified Product */}
          <section className="flex flex-1 flex-col justify-between rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] p-4">
            <div className="flex items-start justify-between gap-2.5">
              <div className="flex min-w-0 items-center gap-2.5">
                <ProductFavicon url={treatment.sampleA.url} name={treatment.sampleA.name} />
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <a
                      href={treatment.sampleA.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="truncate text-[15px] font-bold text-[#0F172A] hover:underline"
                    >
                      {treatment.sampleA.name}
                    </a>
                    <ExternalLinkIcon className="h-3.5 w-3.5 shrink-0 text-[#64748B]" />
                  </div>
                  <div className="truncate text-[12px] font-medium text-[#64748B]">
                    {hostname}
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-1.5">
              <span
                className={`tnum inline-flex items-center rounded-full px-2.5 py-0.5 text-[11.5px] font-bold ${
                  badge.isRevenue
                    ? "bg-[#ECFDF5] text-[#059669]"
                    : "bg-[#FFF7ED] text-[#EA580C]"
                }`}
              >
                {badge.label}
              </span>
              {treatment.sampleA2 && (
                <span className="inline-flex items-center rounded-full border border-[#E2E8F0] bg-[#FFFFFF] px-2.5 py-0.5 text-[11px] font-bold text-[#0F172A]">
                  + {treatment.sampleA2.name}
                </span>
              )}
            </div>

            <p className="mt-2.5 line-clamp-1 text-[13.5px] font-medium text-[#1E293B]">
              {buildOneLineSuccessPoint(treatment)}
            </p>
          </section>

          {/* Center + Connector */}
          <div className="flex items-center justify-center" aria-hidden="true">
            <span className="grid h-7 w-7 place-items-center rounded-full border border-[#E2E8F0] bg-[#FFFFFF] text-[15px] font-bold text-[#64748B]">
              +
            </span>
          </div>

          {/* Block B: AI Radar Technology / Trend */}
          <section className="flex flex-1 flex-col justify-between rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] p-4">
            <div className="flex items-center justify-between gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[#EFF6FF] px-2.5 py-0.5 text-[11.5px] font-bold text-[#2563EB]">
                <span className="h-1.5 w-1.5 rounded-full bg-[#2563EB]" />
                AI Radar · {treatment.sampleB.platformId}
              </span>
              <a
                href={treatment.sampleB.canonicalUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-[12px] font-semibold text-[#64748B] hover:text-[#0F172A]"
              >
                <span>원문</span>
                <ExternalLinkIcon className="h-3 w-3" />
              </a>
            </div>

            <h2 className="mt-2.5 line-clamp-2 text-[14.5px] font-bold leading-[1.45] text-[#0F172A]">
              {treatment.sampleB.titleKo}
            </h2>

            <p className="mt-2 line-clamp-1 text-[13.5px] font-medium text-[#475569]">
              {buildOneLineTechRole(treatment)}
            </p>
          </section>
        </div>

        {/* RIGHT 7 COLS: 6-TYPE DYNAMIC WIREFRAME PREVIEW */}
        <div className="lg:col-span-7">
          <ProductWireframePreview treatment={treatment} />
        </div>
      </div>

      {/* ── 3) CARD BOTTOM CONTROL BAR ─────────────────────────────────────── */}
      <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-[#E5E7EB] pt-5">
        {/* Left: Prev & Quick Remix Actions */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onPrev}
            disabled={!canGoPrev}
            className="inline-flex items-center gap-1.5 rounded-xl border border-[#E5E7EB] bg-[#FFFFFF] px-3 py-2.5 text-[13.5px] font-semibold text-[#1E293B] hover:border-[#0F172A] disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ArrowLeftIcon className="h-3.5 w-3.5" />
            <span>이전</span>
          </button>

          <button
            type="button"
            onClick={() => onBranchDomain(treatment)}
            className="inline-flex items-center gap-1.5 rounded-xl border border-[#E5E7EB] bg-[#FFFFFF] px-3.5 py-2.5 text-[13.5px] font-semibold text-[#1E293B] hover:border-[#0F172A]"
          >
            <BranchIcon className="h-3.5 w-3.5 text-[#D97706]" />
            <span>다른 분야로 비틀기</span>
          </button>

          <button
            type="button"
            onClick={() => onEvolveTreatment(treatment)}
            className="inline-flex items-center gap-1.5 rounded-xl border border-[#E5E7EB] bg-[#FFFFFF] px-3.5 py-2.5 text-[13.5px] font-semibold text-[#1E293B] hover:border-[#0F172A]"
          >
            <LayersIcon className="h-3.5 w-3.5 text-[#059669]" />
            <span>인기 기능 더 섞기</span>
          </button>
        </div>

        {/* Right: Detail Spec Modal & Next Random Card */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onOpenDetail}
            className="inline-flex items-center gap-1.5 rounded-xl border border-[#E5E7EB] bg-[#FFFFFF] px-4 py-2.5 text-[13.5px] font-semibold text-[#0F172A] hover:border-[#0F172A] hover:bg-[#F8FAFC]"
          >
            <TerminalIcon className="h-3.5 w-3.5 text-[#475569]" />
            <span>상세 스펙 · 프롬프트</span>
          </button>

          <button
            type="button"
            onClick={onNext}
            className="inline-flex items-center gap-2 rounded-xl bg-[#0F172A] px-5 py-2.5 text-[14px] font-bold text-[#FFFFFF] hover:bg-[#1E293B]"
          >
            <span>다음 랜덤 아이디어</span>
            <RefreshIcon className="h-3.5 w-3.5" />
            <kbd className="hidden rounded border border-[#334155] bg-[#1E293B] px-1.5 py-0.5 font-sans text-[10.5px] font-semibold text-[#CBD5E1] sm:inline-block">
              Space
            </kbd>
          </button>
        </div>
      </div>
    </article>
  );
}
