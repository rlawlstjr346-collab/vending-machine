import React from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { DOMAIN_MAP } from "@/lib/domains";
import { getSiteUrl, loadSeedTreatments } from "@/lib/data-loader";
import { BenchLogo } from "@/components/Icons";

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateStaticParams() {
  return loadSeedTreatments().map((t) => ({ id: t.id }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const treatment = loadSeedTreatments().find((t) => t.id === id);
  if (!treatment) return { title: "기획안을 찾을 수 없습니다" };

  const siteUrl = getSiteUrl();
  const canonical = `${siteUrl}/treatment/${treatment.id}`;
  return {
    title: treatment.title,
    description: treatment.oneLineHook,
    alternates: { canonical },
    openGraph: {
      type: "article",
      url: canonical,
      title: treatment.title,
      description: treatment.oneLineHook,
    },
  };
}

export default async function TreatmentPage({ params }: PageProps) {
  const { id } = await params;
  const all = loadSeedTreatments();
  const treatment = all.find((t) => t.id === id);
  if (!treatment) notFound();

  const domain = DOMAIN_MAP[treatment.domainSlug];
  const related = all
    .filter((t) => t.id !== treatment.id && t.domainSlug === treatment.domainSlug)
    .slice(0, 4);

  const siteUrl = getSiteUrl();
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: treatment.title,
    description: treatment.oneLineHook,
    datePublished: treatment.createdAt,
    dateModified: treatment.updatedAt,
    inLanguage: "ko-KR",
    mainEntityOfPage: `${siteUrl}/treatment/${treatment.id}`,
    author: { "@type": "Organization", name: "BENCH." },
    publisher: { "@type": "Organization", name: "BENCH." },
    about: [treatment.domainLabel, treatment.sampleA.name, treatment.sampleB.titleKo],
  };

  return (
    <div className="min-h-screen bg-[#F7F8FA] text-[#0F172A]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <header className="border-b border-[#E5E7EB] bg-[#FFFFFF]">
        <div className="mx-auto flex h-16 max-w-[820px] items-center justify-between px-5 sm:px-8">
          <Link href="/" aria-label="BENCH 홈">
            <BenchLogo />
          </Link>
          <div className="flex items-center gap-2 text-[13.5px] font-semibold">
            <Link
              href={`/domain/${treatment.domainSlug}`}
              className="rounded-full border border-[#E5E7EB] bg-[#FFFFFF] px-3.5 py-1.5 text-[#1E293B] hover:border-[#0F172A]"
            >
              {treatment.domainLabel}
            </Link>
            <Link
              href={`/?treatment=${encodeURIComponent(treatment.id)}`}
              className="rounded-full bg-[#0F172A] px-4 py-1.5 text-[#FFFFFF] hover:bg-[#1E293B]"
            >
              덱에서 가지치기
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[820px] px-5 py-8 sm:px-8 sm:py-10">
        <article className="studio-card space-y-6 p-6 sm:p-9">
          <div className="flex flex-wrap items-center gap-2 text-[13px]">
            <span
              className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 font-semibold"
              style={{
                backgroundColor: domain?.softBg || "#EFF6FF",
                color: domain?.color || "#2563EB",
              }}
            >
              <span
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: domain?.color || "#2563EB" }}
              />
              {treatment.domainLabel}
            </span>
            <span className="rounded-full border border-[#E2E8F0] bg-[#F8FAFC] px-3 py-1 font-medium text-[#475569]">
              {treatment.buildCadence}
            </span>
            <span className="tnum text-[#64748B]">
              {treatment.sampleA.name} · {treatment.sampleA.shortMetricLabel}
            </span>
          </div>

          <div>
            <h1 className="text-[24px] font-bold leading-[1.35] tracking-[-0.025em] text-[#0F172A] sm:text-[28px]">
              {treatment.title}
            </h1>
            <p className="mt-3 text-[16px] leading-[1.75] text-[#475569]">
              {treatment.firstThreeSecondsUx}
            </p>
          </div>

          <div className="space-y-4">
            <section className="studio-inset p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-[14px] font-bold text-[#EA580C]">
                  벤치마킹한 해외 서비스
                </h2>
                <span className="tnum text-[13px] font-semibold text-[#1E293B]">
                  {treatment.sampleA.shortMetricLabel}
                </span>
              </div>
              <div className="mt-2 text-[16px] font-bold text-[#0F172A]">
                {treatment.sampleA.name}
              </div>
              <p className="mt-1.5 text-[15px] leading-[1.75] text-[#475569]">
                {treatment.sampleA.overseasProofKo}
              </p>
              <div className="mt-3">
                <a
                  href={treatment.sampleA.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[14px] font-semibold text-[#EA580C] hover:underline"
                >
                  해외 원본 사이트 열기 ↗
                </a>
              </div>
            </section>

            <section className="studio-inset p-5">
              <h2 className="text-[14px] font-bold text-[#059669]">
                이렇게 만듭니다 · 핵심 기능 3가지
              </h2>
              <ul className="mt-3 space-y-2.5 text-[15.5px] leading-[1.7] text-[#0F172A]">
                {treatment.mvpFeatures.map((feat, idx) => (
                  <li key={idx} className="flex gap-2.5">
                    <span className="tnum mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#E2E8F0] text-[12px] font-bold text-[#0F172A]">
                      {idx + 1}
                    </span>
                    <span>{feat}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-4 border-t border-[#E2E8F0] pt-3 text-[14px] leading-[1.7] text-[#64748B]">
                <strong className="text-[#1E293B]">처음 만들 때 과감히 뺄 기능: </strong>
                {treatment.scopeCutoff[0]}
              </p>
            </section>

            <section className="studio-inset p-5">
              <h2 className="text-[14px] font-bold text-[#2563EB]">결합할 최신 AI 기술</h2>
              <div className="mt-2 text-[15.5px] font-bold text-[#0F172A]">
                {treatment.sampleB.titleKo}
              </div>
              <p className="mt-1.5 text-[15px] leading-[1.75] text-[#475569]">
                {treatment.sampleB.bottleneckSolvedKo}
              </p>
              <div className="mt-3">
                <a
                  href={treatment.sampleB.canonicalUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[14px] font-semibold text-[#2563EB] hover:underline"
                >
                  기술 원문 보기 ↗
                </a>
              </div>
            </section>
          </div>

          <div className="flex flex-col gap-2.5 pt-2">
            <Link
              href={`/?treatment=${encodeURIComponent(treatment.id)}`}
              className="inline-flex w-full items-center justify-center rounded-2xl bg-[#0F172A] px-5 py-4 text-[15.5px] font-bold text-[#FFFFFF] hover:bg-[#1E293B]"
            >
              덱에서 프롬프트 복사 · 다른 아이디어로 가지치기
            </Link>
            <a
              href={treatment.sampleA.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex w-full items-center justify-center rounded-2xl border border-[#E5E7EB] bg-[#FFFFFF] px-5 py-3.5 text-[15px] font-semibold text-[#0F172A] hover:bg-[#F8FAFC]"
            >
              벤치마킹한 해외 원본 서비스 직접 써보기 ↗
            </a>
          </div>
        </article>

        <section className="mt-10">
          <div className="flex items-center justify-between">
            <h2 className="text-[16px] font-bold text-[#0F172A]">
              같은 분야({treatment.domainLabel})의 다른 아이디어
            </h2>
            <Link
              href={`/domain/${treatment.domainSlug}`}
              className="text-[13.5px] font-semibold text-[#64748B] hover:text-[#0F172A]"
            >
              전체 보기 →
            </Link>
          </div>
          <div className="mt-3.5 grid grid-cols-1 gap-3.5 md:grid-cols-2">
            {related.map((item) => (
              <Link
                key={item.id}
                href={`/treatment/${item.id}`}
                className="studio-card-flat block p-5"
              >
                <div className="text-[13px] font-medium text-[#64748B]">
                  {item.sampleA.name} · {item.sampleA.shortMetricLabel}
                </div>
                <div className="mt-1.5 text-[16.5px] font-bold leading-snug text-[#0F172A]">
                  {item.title}
                </div>
                <p className="mt-1.5 line-clamp-2 text-[14.5px] leading-[1.65] text-[#475569]">
                  {item.oneLineHook}
                </p>
              </Link>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
