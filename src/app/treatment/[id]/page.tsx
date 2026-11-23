import React from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getSiteUrl, loadSeedTreatments } from "@/lib/data-loader";
import { BenchLogo, ExternalLinkIcon } from "@/components/Icons";

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateStaticParams() {
  return loadSeedTreatments().map((t) => ({ id: t.id }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const treatment = loadSeedTreatments().find((t) => t.id === id);
  if (!treatment) return { title: "트리트먼트를 찾을 수 없습니다" };

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
    <div className="min-h-screen bg-[#FAFAFA] text-[#111111]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <header className="border-b border-[#E5E7EB] bg-[#FFFFFF]">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-4">
          <Link href="/" aria-label="BENCH 홈">
            <BenchLogo className="h-5 w-auto" />
          </Link>
          <div className="flex items-center gap-3 text-xs font-semibold">
            <Link
              href={`/domain/${treatment.domainSlug}`}
              className="border border-[#E5E7EB] bg-[#FAFAFA] px-3 py-1.5 text-[#374151] hover:border-[#111111] hover:text-[#111111]"
            >
              {treatment.domainLabel} 허브
            </Link>
            <Link
              href={`/?treatment=${encodeURIComponent(treatment.id)}`}
              className="border border-[#111111] bg-[#111111] px-3 py-1.5 text-[#FFFFFF]"
            >
              워크벤치에서 분기·진화하기
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-10">
        <div className="border border-[#E5E7EB] bg-[#FFFFFF] p-8">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="border border-[#111111] bg-[#111111] px-2.5 py-0.5 font-semibold text-[#FFFFFF]">
              {treatment.domainLabel}
            </span>
            <span className="border border-[#E5E7EB] bg-[#FAFAFA] px-2.5 py-0.5 font-medium text-[#374151]">
              {treatment.buildCadence}
            </span>
            <span className="font-mono text-[#4B5563]">
              {treatment.sampleA.sourceLabel} · {treatment.sampleA.tractionLabel}
            </span>
          </div>

          <h1 className="mt-4 text-2xl font-bold leading-snug tracking-tight text-[#111111] sm:text-3xl">
            {treatment.title}
          </h1>
          <p className="mt-3 text-base leading-relaxed text-[#374151]">
            {treatment.oneLineHook}
          </p>

          <section className="mt-6 border border-[#E5E7EB] bg-[#FAFAFA] p-5">
            <div className="text-xs font-bold uppercase tracking-wider text-[#4B5563]">
              01 · 첫 3초 핵심 UX 정의
            </div>
            <p className="mt-2 text-sm leading-relaxed text-[#111111]">
              {treatment.firstThreeSecondsUx}
            </p>
          </section>

          <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
            <section className="border border-[#E5E7EB] p-5">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#4B5563]">
                <span
                  className={`inline-block h-2 w-2 rounded-full ${
                    treatment.sampleA.verifiedRevenue ? "bg-[#15803D]" : "bg-[#D9381E]"
                  }`}
                />
                <span>02 · 해외 벤치마킹 근거 (Sample A)</span>
              </div>
              <a
                href={treatment.sampleA.url}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2.5 inline-flex items-center gap-1.5 text-base font-bold text-[#111111] underline decoration-[#E5E7EB] underline-offset-4 hover:decoration-[#111111]"
              >
                <span>{treatment.sampleA.name}</span>
                <ExternalLinkIcon className="h-3.5 w-3.5" />
              </a>
              <div className="mt-1 text-xs font-medium text-[#4B5563]">
                {treatment.sampleA.tractionLabel} · {treatment.sampleA.mechanismLabel}
              </div>
              <p className="mt-3 text-sm leading-relaxed text-[#374151]">
                {treatment.sampleA.overseasProofKo}
              </p>
            </section>

            <section className="border border-[#E5E7EB] p-5">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#4B5563]">
                <span className="inline-block h-2 w-2 rounded-full bg-[#D9381E]" />
                <span>03 · 결합 AI Radar 기술 (Sample B)</span>
              </div>
              <a
                href={treatment.sampleB.canonicalUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2.5 inline-flex items-start gap-1.5 text-base font-bold text-[#111111] underline decoration-[#E5E7EB] underline-offset-4 hover:decoration-[#111111]"
              >
                <span>{treatment.sampleB.titleKo}</span>
                <ExternalLinkIcon className="mt-1 h-3.5 w-3.5 shrink-0" />
              </a>
              <div className="mt-1 font-mono text-xs text-[#4B5563]">
                {treatment.sampleB.platformId} · {treatment.sampleB.signalType}
              </div>
              <p className="mt-3 text-sm leading-relaxed text-[#374151]">
                {treatment.sampleB.bottleneckSolvedKo}
              </p>
            </section>
          </div>

          <section className="mt-6 border-t border-[#E5E7EB] pt-6">
            <h2 className="text-sm font-bold uppercase tracking-wider text-[#4B5563]">
              04 · 문화 도메인 비틀기 & MVP 핵심 기능 3선
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-[#374151]">
              {treatment.twistSummaryKo}
            </p>
            <ol className="mt-4 divide-y divide-[#E5E7EB] border border-[#E5E7EB]">
              {treatment.mvpFeatures.map((feat, idx) => (
                <li key={idx} className="flex gap-3 p-4">
                  <span className="font-mono text-xs font-bold text-[#111111]">
                    0{idx + 1}
                  </span>
                  <span className="text-sm leading-relaxed text-[#111111]">{feat}</span>
                </li>
              ))}
            </ol>

            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="border border-[#E5E7EB] bg-[#FAFAFA] p-4">
                <h3 className="text-xs font-bold text-[#111111]">과잉 스펙 컷오프</h3>
                <ul className="mt-2 space-y-1.5 text-xs leading-relaxed text-[#374151]">
                  {treatment.scopeCutoff.map((c, i) => (
                    <li key={i}>— {c}</li>
                  ))}
                </ul>
              </div>
              <div className="border border-[#E5E7EB] bg-[#FFFFFF] p-4">
                <h3 className="text-xs font-bold text-[#111111]">기대 성과 지표 (KPI)</h3>
                <ul className="mt-2 space-y-1.5 text-xs leading-relaxed text-[#374151]">
                  {treatment.targetKpis.map((k, i) => (
                    <li key={i}>• {k}</li>
                  ))}
                </ul>
              </div>
            </div>
          </section>
        </div>

        {/* Related Treatments */}
        <section className="mt-8">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-[#111111]">
              같은 도메인({treatment.domainLabel}) 관련 트리트먼트
            </h2>
            <Link
              href={`/domain/${treatment.domainSlug}`}
              className="text-xs font-semibold text-[#4B5563] hover:text-[#111111]"
            >
              전체 보기 →
            </Link>
          </div>
          <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
            {related.map((item) => (
              <Link
                key={item.id}
                href={`/treatment/${item.id}`}
                className="block border border-[#E5E7EB] bg-[#FFFFFF] p-4 hover:border-[#111111]"
              >
                <div className="text-[11px] font-mono text-[#4B5563]">
                  {item.sampleA.name} · {item.sampleA.tractionLabel}
                </div>
                <div className="mt-1 text-sm font-bold text-[#111111]">{item.title}</div>
                <p className="mt-1 line-clamp-2 text-xs text-[#374151]">
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
