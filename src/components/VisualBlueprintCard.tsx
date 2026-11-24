"use client";

import React, { useEffect, useState } from "react";
import type { Treatment } from "@/lib/types";
import {
  ArrowLeftIcon,
  ExternalLinkIcon,
  RefreshIcon,
  TerminalIcon,
} from "./Icons";

interface VisualBlueprintCardProps {
  treatment: Treatment;
  cardPosition: number;
  canGoPrev: boolean;
  onPrev: () => void;
  onNext: () => void;
  onOpenDetail: () => void;
}

function getHostname(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "web";
  }
}

function getBuilderBadgeStyle(treatment: Treatment): {
  label: string;
  bg: string;
  text: string;
} {
  const { sampleA } = treatment;
  if (sampleA.verifiedRevenue || sampleA.source === "trustmrr") {
    const match = sampleA.tractionLabel.match(/\$[\d.,]+[kKmM]?/);
    return {
      label: match ? `TrustMRR 수익 ${match[0]}` : "TrustMRR 검증 수익",
      bg: "#ECFDF5",
      text: "#047857",
    };
  }
  if (sampleA.source === "github_trending") {
    return {
      label: sampleA.shortMetricLabel || sampleA.tractionLabel,
      bg: "#F1F5F9",
      text: "#0F172A",
    };
  }
  if (sampleA.source === "reddit") {
    return {
      label: sampleA.shortMetricLabel || sampleA.tractionLabel,
      bg: "#FFF7ED",
      text: "#C2410C",
    };
  }
  if (sampleA.source === "show_hn" || sampleA.sourceLabel.includes("Show HN")) {
    return {
      label: sampleA.shortMetricLabel || "Show HN 인기",
      bg: "#FFF7ED",
      text: "#EA580C",
    };
  }
  if (sampleA.source === "product_hunt") {
    return {
      label: "Product Hunt 신상",
      bg: "#FEF2F2",
      text: "#DC2626",
    };
  }
  return {
    label: sampleA.shortMetricLabel || sampleA.sourceLabel,
    bg: "#F1F5F9",
    text: "#334155",
  };
}

function SourceFavicon({ url, name }: { url: string; name: string }) {
  const [failed, setFailed] = useState(false);
  const hostname = getHostname(url);
  const initial = (name.trim()[0] || "D").toUpperCase();

  useEffect(() => {
    setFailed(false);
  }, [url]);

  if (failed || !hostname || hostname === "web") {
    return (
      <span
        className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#F1F5F9] text-[15px] font-extrabold text-[#0F172A]"
        aria-hidden="true"
      >
        {initial}
      </span>
    );
  }

  return (
    <span className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-xl bg-[#F8FAFC] ring-1 ring-[#E2E8F0]">
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

function TechDigestPanel({ treatment }: { treatment: Treatment }) {
  const digest = treatment.techDigestKo;
  const steps = [
    { num: "01", label: "입력", accent: "#2563EB", text: digest.inputKo },
    { num: "02", label: "핵심 기술 처리", accent: "#0F172A", text: digest.coreEngineKo },
    { num: "03", label: "결과", accent: "#059669", text: digest.outputKo },
  ];

  return (
    <div className="flex min-h-[260px] flex-col justify-between rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] p-6 sm:p-7">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="inline-flex items-center gap-2 text-[12.5px] font-bold tracking-[0.02em] text-[#475569]">
          <span className="h-2 w-2 rounded-full bg-[#0F172A]" />
          원본 기술 핵심 메커니즘 요약
        </span>
        <span className="text-[12.5px] font-semibold text-[#64748B]">
          {treatment.sampleA.name}
        </span>
      </div>

      <div className="mt-5 divide-y divide-[#E2E8F0]">
        {steps.map((s) => (
          <div key={s.num} className="grid grid-cols-1 gap-1.5 py-3.5 first:pt-0 last:pb-0 sm:grid-cols-12 sm:items-baseline sm:gap-3">
            <div className="flex items-center gap-2 sm:col-span-4">
              <span
                className="tnum text-[12px] font-extrabold"
                style={{ color: s.accent }}
              >
                {s.num}
              </span>
              <span className="text-[14px] font-bold text-[#0F172A]">
                {s.label}
              </span>
            </div>
            <p className="text-[15px] leading-[1.65] text-[#334155] sm:col-span-8">
              {s.text}
            </p>
          </div>
        ))}
      </div>

      {digest.summaryKo && (
        <p className="mt-4 border-t border-[#E2E8F0] pt-3.5 text-[14px] font-medium leading-[1.65] text-[#475569]">
          {digest.summaryKo}
        </p>
      )}
    </div>
  );
}

export function VisualBlueprintCard({
  treatment,
  cardPosition,
  canGoPrev,
  onPrev,
  onNext,
  onOpenDetail,
}: VisualBlueprintCardProps) {
  const [videoFailed, setVideoFailed] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);

  useEffect(() => {
    setVideoFailed(false);
    setImageFailed(false);
  }, [treatment.id, treatment.demoVideoUrl, treatment.previewImageUrl]);

  const badge = getBuilderBadgeStyle(treatment);
  const builderHostname = getHostname(treatment.sampleA.url);
  const radarHostname = getHostname(treatment.sampleB.canonicalUrl);

  const showVideo = Boolean(treatment.demoVideoUrl && !videoFailed);
  const showImage = Boolean(!showVideo && treatment.previewImageUrl && !imageFailed);

  const handleCardClick = (e: React.MouseEvent<HTMLElement>) => {
    const target = e.target as HTMLElement | null;
    if (target?.closest("a, button, video")) return;
    onOpenDetail();
  };

  return (
    <article
      onClick={handleCardClick}
      className="mx-auto w-full max-w-[1340px] cursor-pointer rounded-[24px] border border-[#E2E8F0] bg-[#FFFFFF] p-7 shadow-[0_12px_40px_rgba(15,23,42,0.04)] sm:p-10 lg:p-12"
      aria-label={treatment.title}
    >
      {/* ── 1) TOP LARGE CURIOSITY HEADLINE + 1-LINE CORE UX ────────────────── */}
      <header className="flex flex-col">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-[13px] font-semibold text-[#64748B]">
          <span className="inline-flex items-center gap-2">
            <span className="tnum font-bold text-[#0F172A]">#{String(cardPosition).padStart(2, "0")}</span>
            <span aria-hidden="true">·</span>
            <span>{treatment.buildCadence}</span>
          </span>
          <span className="text-[12.5px] font-medium text-[#64748B]">
            카드를 클릭하면 상세 스펙과 코딩 프롬프트가 열립니다
          </span>
        </div>

        <h1 className="text-[26px] font-extrabold leading-[1.28] tracking-[-0.03em] text-[#0F172A] sm:text-[34px] lg:text-[40px]">
          {treatment.title}
        </h1>
        <p className="mt-3 text-[17px] font-medium leading-[1.6] text-[#475569] sm:text-[18px]">
          {treatment.oneLineHook}
        </p>
      </header>

      {/* ── 2) MIDDLE 2-COLUMN STRUCTURE (5 INGREDIENTS : 7 MEDIA + STORY) ─── */}
      <div className="mt-8 grid grid-cols-1 gap-8 border-t border-[#EDF2F7] pt-8 lg:grid-cols-12 lg:gap-10">
        {/* LEFT 5 COLS: INGREDIENT FORMULA (TECH + LIVE ISSUE) */}
        <div className="flex flex-col justify-between lg:col-span-5">
          {/* Ingredient 01: Original Tech / Product */}
          <section className="flex flex-col">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-[12.5px] font-bold tracking-[0.02em] text-[#64748B]">
                재료 01 · 원본 기술 / 프로덕트
              </span>
              <span
                className="tnum inline-flex items-center rounded-full px-2.5 py-1 text-[12px] font-bold"
                style={{ backgroundColor: badge.bg, color: badge.text }}
              >
                {badge.label}
              </span>
            </div>

            <div className="mt-3.5 flex items-start gap-3">
              <SourceFavicon url={treatment.sampleA.url} name={treatment.sampleA.name} />
              <div className="min-w-0 flex-1">
                <a
                  href={treatment.sampleA.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group inline-flex items-center gap-1.5 text-[19px] font-bold leading-[1.3] text-[#0F172A] hover:text-[#2563EB] sm:text-[21px]"
                >
                  <span className="break-words">{treatment.sampleA.name}</span>
                  <ExternalLinkIcon className="h-4 w-4 shrink-0 text-[#64748B] group-hover:text-[#2563EB]" />
                </a>
                <div className="mt-0.5 truncate text-[13px] font-medium text-[#64748B]">
                  {treatment.sampleA.sourceLabel} · {builderHostname}
                </div>
              </div>
            </div>

            <p className="mt-3.5 text-[15.5px] leading-[1.7] text-[#334155] sm:text-[16px]">
              {treatment.sampleA.summaryKo || treatment.sampleA.overseasProofKo}
            </p>
          </section>

          {/* Clean Hairline + Connector */}
          <div className="my-6 flex items-center gap-3" aria-hidden="true">
            <div className="h-px flex-1 bg-[#EDF2F7]" />
            <span className="grid h-8 w-8 place-items-center rounded-full border border-[#E2E8F0] bg-[#F8FAFC] text-[16px] font-extrabold text-[#475569]">
              +
            </span>
            <div className="h-px flex-1 bg-[#EDF2F7]" />
          </div>

          {/* Ingredient 02: Live AI / Trend Issue */}
          <section className="flex flex-col">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-[12.5px] font-bold tracking-[0.02em] text-[#64748B]">
                재료 02 · 실시간 AI / 트렌드 이슈
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[#EFF6FF] px-2.5 py-1 text-[12px] font-bold text-[#2563EB]">
                <span className="h-1.5 w-1.5 rounded-full bg-[#2563EB]" />
                AI Radar 이슈 · {treatment.sampleB.platformId}
              </span>
            </div>

            <div className="mt-3.5 flex items-start gap-3">
              <SourceFavicon url={treatment.sampleB.canonicalUrl} name={treatment.sampleB.platformId} />
              <div className="min-w-0 flex-1">
                <a
                  href={treatment.sampleB.canonicalUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group inline-flex items-start gap-1.5 text-[19px] font-bold leading-[1.35] text-[#0F172A] hover:text-[#2563EB] sm:text-[20px]"
                >
                  <span className="break-words">{treatment.sampleB.titleKo}</span>
                  <ExternalLinkIcon className="mt-1 h-4 w-4 shrink-0 text-[#64748B] group-hover:text-[#2563EB]" />
                </a>
                <div className="mt-1 truncate text-[13px] font-medium text-[#64748B]">
                  {radarHostname}
                </div>
              </div>
            </div>

            <p className="mt-3.5 text-[15.5px] leading-[1.7] text-[#334155] sm:text-[16px]">
              {treatment.sampleB.summaryKo || treatment.sampleB.bottleneckSolvedKo}
            </p>
          </section>
        </div>

        {/* RIGHT 7 COLS: REAL DEMO VISUAL OR TECH DIGEST + FUSION STORY */}
        <div className="flex flex-col justify-between lg:col-span-7">
          {/* Top Visual / Tech Mechanism Stage */}
          {showVideo && treatment.demoVideoUrl ? (
            <div className="relative aspect-video max-h-[340px] w-full overflow-hidden rounded-2xl border border-[#E2E8F0] bg-[#0F172A]">
              <video
                key={treatment.demoVideoUrl}
                src={treatment.demoVideoUrl}
                autoPlay
                muted
                loop
                playsInline
                onError={() => setVideoFailed(true)}
                className="h-full w-full object-contain"
              />
              <span className="pointer-events-none absolute left-3.5 top-3.5 rounded-full bg-[#0F172A]/80 px-3 py-1 text-[12px] font-bold text-[#FFFFFF]">
                {treatment.mediaSourceLabel || "원본 기술 시연"}
              </span>
            </div>
          ) : showImage && treatment.previewImageUrl ? (
            <div className="relative aspect-video max-h-[340px] w-full overflow-hidden rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                key={treatment.previewImageUrl}
                src={treatment.previewImageUrl}
                alt={`${treatment.sampleA.name} 원본 시연 프리뷰`}
                loading="eager"
                onError={() => setImageFailed(true)}
                className="h-full w-full object-cover"
              />
              <span className="pointer-events-none absolute left-3.5 top-3.5 rounded-full bg-[#0F172A]/80 px-3 py-1 text-[12px] font-bold text-[#FFFFFF]">
                {treatment.mediaSourceLabel || "프로덕트 실물 화면"}
              </span>
            </div>
          ) : (
            <TechDigestPanel treatment={treatment} />
          )}

          {/* Bottom Fusion Derivation Story */}
          <section className="mt-6 rounded-2xl bg-[#F8FAFC] p-6 sm:p-7">
            <div className="flex items-center gap-2 text-[12.5px] font-bold tracking-[0.02em] text-[#2563EB]">
              <span className="h-2 w-2 rounded-full bg-[#2563EB]" />
              <span>기술 × 이슈 시너지 인사이트</span>
            </div>
            <p className="mt-3 text-[16.5px] leading-[1.78] text-[#1E293B] sm:text-[17.5px]">
              {treatment.fusionStoryKo}
            </p>
          </section>
        </div>
      </div>

      {/* ── 3) SIMPLE BOTTOM CONTROL BAR ────────────────────────────────────── */}
      <footer className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-[#EDF2F7] pt-6">
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={onPrev}
            disabled={!canGoPrev}
            className="inline-flex h-12 items-center gap-2 rounded-xl border border-[#E2E8F0] bg-[#FFFFFF] px-4 text-[15px] font-semibold text-[#1E293B] hover:border-[#0F172A] disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ArrowLeftIcon className="h-4 w-4" />
            <span>이전</span>
          </button>

          <button
            type="button"
            onClick={onOpenDetail}
            className="inline-flex h-12 items-center gap-2 rounded-xl border border-[#E2E8F0] bg-[#FFFFFF] px-5 text-[15px] font-semibold text-[#0F172A] hover:border-[#0F172A] hover:bg-[#F8FAFC]"
          >
            <TerminalIcon className="h-4 w-4 text-[#475569]" />
            <span>상세 스펙 · 구현 프롬프트 보기</span>
          </button>
        </div>

        <button
          type="button"
          onClick={onNext}
          className="inline-flex h-12 items-center gap-2.5 rounded-xl bg-[#0F172A] px-7 text-[16px] font-bold text-[#FFFFFF] hover:bg-[#1E293B] sm:h-[52px]"
        >
          <span>다음 랜덤 아이디어</span>
          <RefreshIcon className="h-4 w-4" />
          <kbd className="hidden rounded-md border border-[#334155] bg-[#1E293B] px-2 py-0.5 font-sans text-[11px] font-semibold text-[#CBD5E1] sm:inline-block">
            Space
          </kbd>
        </button>
      </footer>
    </article>
  );
}
