"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  treatmentToCodingPrompt,
  treatmentToMarkdown,
} from "@/lib/synthesis-engine";
import type { Treatment } from "@/lib/types";
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

export function TreatmentModal({ treatment, onClose }: TreatmentModalProps) {
  const [copiedKind, setCopiedKind] = useState<string | null>(null);
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
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [treatment, onClose]);

  if (!treatment) return null;

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

      {/* Pure White Centered Editorial Spec Modal */}
      <div
        ref={scrollRef}
        role="dialog"
        aria-modal="true"
        aria-label="상세 스펙 및 구현 프롬프트"
        className="relative z-10 max-h-[90vh] w-[min(95vw,780px)] overflow-y-auto rounded-[24px] border border-[#E2E8F0] bg-[#FFFFFF] p-7 text-[#0F172A] shadow-[0_24px_64px_rgba(15,23,42,0.16)] sm:p-10"
      >
        <div className="flex flex-col gap-6">
          {/* Top Meta & Close */}
          <div className="flex items-start justify-between gap-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-[#F1F5F9] px-3.5 py-1 text-[13px] font-bold text-[#0F172A]">
                {treatment.buildCadence}
              </span>
              <span className="tnum rounded-full border border-[#E2E8F0] bg-[#FFFFFF] px-3 py-1 text-[13px] font-semibold text-[#475569]">
                {treatment.sampleA.name} · {treatment.sampleA.shortMetricLabel}
              </span>
              <Link
                href={`/treatment/${treatment.id}`}
                className="inline-flex items-center gap-1 rounded-full border border-[#E2E8F0] bg-[#FFFFFF] px-3 py-1 text-[13px] font-semibold text-[#475569] hover:border-[#0F172A] hover:text-[#0F172A]"
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
            <h2 className="text-[24px] font-extrabold leading-[1.3] tracking-[-0.025em] text-[#0F172A] sm:text-[30px]">
              {treatment.title}
            </h2>
            <p className="mt-3 text-[16.5px] leading-[1.72] text-[#475569]">
              {treatment.firstThreeSecondsUx || treatment.oneLineHook}
            </p>
          </div>

          {/* Fusion Story */}
          <section className="rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] p-6">
            <h3 className="text-[13.5px] font-bold text-[#2563EB]">
              기술 × 이슈 시너지 인사이트
            </h3>
            <p className="mt-2.5 text-[16px] leading-[1.78] text-[#1E293B]">
              {treatment.fusionStoryKo}
            </p>
          </section>

          {/* 3 Core MVP Features + Scope Cutoff */}
          <section className="rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] p-6">
            <h3 className="text-[13.5px] font-bold text-[#059669]">
              이렇게 만듭니다 · MVP 핵심 기능 3가지
            </h3>
            <ul className="mt-3.5 space-y-3 text-[15.5px] leading-[1.72] text-[#0F172A]">
              {treatment.mvpFeatures.map((feat, idx) => (
                <li key={idx} className="flex gap-3">
                  <span className="tnum mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#0F172A] text-[12px] font-bold text-[#FFFFFF]">
                    {idx + 1}
                  </span>
                  <span>{feat}</span>
                </li>
              ))}
            </ul>
            <div className="mt-5 border-t border-[#E2E8F0] pt-4 text-[14.5px] leading-[1.7] text-[#475569]">
              <strong className="font-bold text-[#0F172A]">과감히 뺄 스펙: </strong>
              {treatment.scopeCutoff[0]}
            </div>
          </section>

          {/* 3-Step Tech Digest */}
          <section className="rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] p-6">
            <h3 className="text-[13.5px] font-bold text-[#475569]">
              원본 기술 핵심 메커니즘 ({treatment.sampleA.name})
            </h3>
            <div className="mt-3.5 divide-y divide-[#E2E8F0] text-[15px] leading-[1.68]">
              <div className="py-2.5 first:pt-0">
                <span className="mr-2 font-bold text-[#2563EB]">01 입력</span>
                <span className="text-[#1E293B]">{treatment.techDigestKo.inputKo}</span>
              </div>
              <div className="py-2.5">
                <span className="mr-2 font-bold text-[#0F172A]">02 핵심 처리</span>
                <span className="text-[#1E293B]">{treatment.techDigestKo.coreEngineKo}</span>
              </div>
              <div className="py-2.5 last:pb-0">
                <span className="mr-2 font-bold text-[#059669]">03 결과</span>
                <span className="text-[#1E293B]">{treatment.techDigestKo.outputKo}</span>
              </div>
            </div>
          </section>

          {/* Reference Links Row */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <a
              href={treatment.sampleA.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between gap-2 rounded-2xl border border-[#E2E8F0] bg-[#FFFFFF] px-5 py-4 text-[14.5px] font-bold text-[#0F172A] hover:border-[#0F172A] hover:bg-[#F8FAFC]"
            >
              <span className="truncate">원본 기술 · {treatment.sampleA.name}</span>
              <ExternalLinkIcon className="h-4 w-4 shrink-0 text-[#475569]" />
            </a>

            <a
              href={treatment.sampleB.canonicalUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between gap-2 rounded-2xl border border-[#E2E8F0] bg-[#FFFFFF] px-5 py-4 text-[14.5px] font-bold text-[#0F172A] hover:border-[#0F172A] hover:bg-[#F8FAFC]"
            >
              <span className="truncate">AI 이슈 원문 열기 ({treatment.sampleB.platformId})</span>
              <ExternalLinkIcon className="h-4 w-4 shrink-0 text-[#2563EB]" />
            </a>
          </div>

          {/* Primary One-Click Copy Actions */}
          <div className="flex flex-col gap-3 pt-1">
            <button
              type="button"
              onClick={() => copyText("prompt", treatmentToCodingPrompt(treatment))}
              className="inline-flex h-14 w-full items-center justify-center gap-2.5 rounded-2xl bg-[#0F172A] px-6 text-[16px] font-bold text-[#FFFFFF] hover:bg-[#1E293B]"
            >
              {copiedKind === "prompt" ? (
                <CheckIcon className="h-4 w-4" />
              ) : (
                <TerminalIcon className="h-4 w-4" />
              )}
              <span>
                {copiedKind === "prompt"
                  ? "원클릭 코딩 프롬프트 복사 완료"
                  : "원클릭 코딩 프롬프트 복사"}
              </span>
            </button>

            <button
              type="button"
              onClick={() => copyText("md", treatmentToMarkdown(treatment))}
              className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl border border-[#E2E8F0] bg-[#FFFFFF] px-5 text-[15px] font-semibold text-[#0F172A] hover:border-[#0F172A] hover:bg-[#F8FAFC]"
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
