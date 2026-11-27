import React from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getSiteUrl, loadSeedTreatments } from "@/lib/data-loader";
import { DispenserLogo } from "@/components/Icons";

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateStaticParams() {
  return (await loadSeedTreatments()).map((t) => ({ id: t.id }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const treatment = (await loadSeedTreatments()).find((t) => t.id === id);
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
  const all = await loadSeedTreatments();
  const treatment = all.find((t) => t.id === id);
  if (!treatment) notFound();

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
    author: { "@type": "Organization", name: "DISPENSER" },
    publisher: { "@type": "Organization", name: "DISPENSER" },
    about: [treatment.domainLabel, treatment.sampleA.name, treatment.sampleB.titleKo],
  };

  return (
    <div className="min-h-screen bg-[#F7F8FA] text-[#0F172A]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <main className="mx-auto max-w-[920px] px-5 py-8 sm:px-8 sm:py-10">
        <div className="mb-6 flex items-center justify-between gap-3">
          <Link href="/" aria-label="DISPENSER 홈">
            <DispenserLogo />
          </Link>
          <Link
            href={`/?treatment=${encodeURIComponent(treatment.id)}`}
            className="rounded-xl bg-[#0F172A] px-4 py-2 text-[14px] font-bold text-[#FFFFFF] hover:bg-[#1E293B]"
          >
            디스펜서에서 열기
          </Link>
        </div>

        <article className="studio-card space-y-7 p-7 sm:p-10">
          <div className="flex flex-wrap items-center gap-2 text-[13px] font-semibold text-[#64748B]">
            <span className="rounded-full bg-[#F1F5F9] px-3 py-1 text-[#0F172A]">
              {treatment.buildCadence}
            </span>
            <span className="tnum">
              {treatment.sampleA.name} · {treatment.sampleA.shortMetricLabel}
            </span>
          </div>

          <div>
            <h1 className="text-[26px] font-extrabold leading-[1.3] tracking-[-0.03em] text-[#0F172A] sm:text-[34px]">
              {treatment.title}
            </h1>
            <p className="mt-3 text-[17px] leading-[1.7] text-[#475569]">
              {treatment.oneLineHook}
            </p>
          </div>

          <section className="studio-inset p-6">
            <h2 className="text-[13.5px] font-bold text-[#2563EB]">
              기술 × 이슈 시너지 인사이트
            </h2>
            <p className="mt-2.5 text-[16px] leading-[1.78] text-[#1E293B]">
              {treatment.fusionStoryKo}
            </p>
          </section>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <section className="studio-inset p-5">
              <div className="text-[13px] font-bold text-[#475569]">
                재료 01 · 원본 기술 / 프로덕트
              </div>
              <div className="mt-2 text-[18px] font-bold text-[#0F172A]">
                {treatment.sampleA.name}
              </div>
              <p className="mt-2 text-[15px] leading-[1.7] text-[#334155]">
                {treatment.sampleA.summaryKo || treatment.sampleA.overseasProofKo}
              </p>
              <a
                href={treatment.sampleA.url}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-block text-[14px] font-bold text-[#2563EB] hover:underline"
              >
                원본 기술 바로가기 ↗
              </a>
            </section>

            <section className="studio-inset p-5">
              <div className="text-[13px] font-bold text-[#2563EB]">
                재료 02 · 실시간 AI 이슈 ({treatment.sampleB.platformId})
              </div>
              <div className="mt-2 text-[18px] font-bold text-[#0F172A]">
                {treatment.sampleB.titleKo}
              </div>
              <p className="mt-2 text-[15px] leading-[1.7] text-[#334155]">
                {treatment.sampleB.summaryKo || treatment.sampleB.bottleneckSolvedKo}
              </p>
              <a
                href={treatment.sampleB.canonicalUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-block text-[14px] font-bold text-[#2563EB] hover:underline"
              >
                이슈 원문 보기 ↗
              </a>
            </section>
          </div>

          <section className="studio-inset p-6">
            <h2 className="text-[13.5px] font-bold text-[#059669]">
              이렇게 만듭니다 · MVP 핵심 기능 3가지
            </h2>
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
            <p className="mt-4 border-t border-[#E2E8F0] pt-3.5 text-[14.5px] leading-[1.7] text-[#475569]">
              <strong className="text-[#0F172A]">과감히 뺄 스펙: </strong>
              {treatment.scopeCutoff[0]}
            </p>
          </section>

          <div className="pt-1">
            <Link
              href={`/?treatment=${encodeURIComponent(treatment.id)}`}
              className="inline-flex h-13 w-full items-center justify-center rounded-2xl bg-[#0F172A] px-6 text-[16px] font-bold text-[#FFFFFF] hover:bg-[#1E293B]"
            >
              DISPENSER에서 코딩 프롬프트 복사 · 다른 아이디어 탐색
            </Link>
          </div>
        </article>

        <section className="mt-10">
          <h2 className="text-[16px] font-bold text-[#0F172A]">함께 볼 만한 기획 아이디어</h2>
          <div className="mt-3.5 grid grid-cols-1 gap-4 md:grid-cols-2">
            {related.map((item) => (
              <Link
                key={item.id}
                href={`/treatment/${item.id}`}
                className="studio-card-flat block p-5"
              >
                <div className="text-[13px] font-medium text-[#64748B]">
                  {item.sampleA.name} · {item.sampleA.shortMetricLabel}
                </div>
                <div className="mt-1.5 text-[17px] font-bold leading-snug text-[#0F172A]">
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
