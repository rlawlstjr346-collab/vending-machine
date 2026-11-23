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
    <div className="min-h-screen bg-[#F6F3EC] text-[#1E1C19]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <header className="border-b border-[#E7E0D3] bg-[#F6F3EC]">
        <div className="mx-auto flex max-w-[780px] items-center justify-between px-5 py-5 sm:px-8">
          <Link href="/" aria-label="BENCH 홈">
            <BenchLogo />
          </Link>
          <div className="flex items-center gap-2 text-[13.5px] font-semibold">
            <Link
              href={`/domain/${treatment.domainSlug}`}
              className="rounded-full border border-[#E7E0D3] bg-[#FFFCF7] px-3.5 py-1.5 text-[#3D3831] hover:border-[#23201C]"
            >
              {treatment.domainLabel}
            </Link>
            <Link
              href={`/?treatment=${encodeURIComponent(treatment.id)}`}
              className="rounded-full bg-[#23201C] px-4 py-1.5 text-[#FFFCF7] hover:bg-[#36322C]"
            >
              레이더에서 가지치기
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[780px] px-5 py-8 sm:px-8 sm:py-10">
        <article className="rounded-[22px] border border-[#E7E0D3] bg-[#FFFCF7] p-6 sm:p-9 space-y-6">
          <div className="flex flex-wrap items-center gap-2 text-[13px]">
            <span
              className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 font-semibold"
              style={{
                backgroundColor: domain?.softBg || "#F5EFE4",
                color: domain?.color || "#C85A32",
              }}
            >
              <span
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: domain?.color || "#C85A32" }}
              />
              {treatment.domainLabel}
            </span>
            <span className="rounded-full border border-[#E7E0D3] bg-[#F9F5EC] px-3 py-1 font-medium text-[#3D3831]">
              {treatment.buildCadence}
            </span>
            <span className="tnum text-[#6E675C]">
              {treatment.sampleA.name} · {treatment.sampleA.shortMetricLabel}
            </span>
          </div>

          <div>
            <h1 className="text-[24px] font-bold leading-[1.36] tracking-[-0.02em] text-[#1E1C19] sm:text-[28px]">
              {treatment.title}
            </h1>
            <p className="mt-3 text-[16px] leading-[1.68] text-[#3D3831]">
              {treatment.firstThreeSecondsUx}
            </p>
          </div>

          <div className="space-y-4">
            <section className="rounded-xl border border-[#ECE5D8] bg-[#F9F5EC] p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-[14px] font-bold text-[#C85A32]">
                  벤치마킹한 해외 서비스
                </h2>
                <span className="tnum text-[13px] font-semibold text-[#3D3831]">
                  {treatment.sampleA.shortMetricLabel}
                </span>
              </div>
              <div className="mt-2 text-[16px] font-bold text-[#1E1C19]">
                {treatment.sampleA.name}
              </div>
              <p className="mt-1.5 text-[15px] leading-[1.68] text-[#3D3831]">
                {treatment.sampleA.overseasProofKo}
              </p>
              <div className="mt-3">
                <a
                  href={treatment.sampleA.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[14px] font-semibold text-[#C85A32] hover:underline"
                >
                  해외 원본 사이트 열기 ↗
                </a>
              </div>
            </section>

            <section className="rounded-xl border border-[#ECE5D8] bg-[#F9F5EC] p-5">
              <h2 className="text-[14px] font-bold text-[#3F6A52]">
                이렇게 만듭니다 · 핵심 기능 3가지
              </h2>
              <ul className="mt-3 space-y-2.5 text-[15.5px] leading-[1.66] text-[#1E1C19]">
                {treatment.mvpFeatures.map((feat, idx) => (
                  <li key={idx} className="flex gap-2.5">
                    <span className="tnum mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#EBE5D8] text-[12px] font-bold">
                      {idx + 1}
                    </span>
                    <span>{feat}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-4 border-t border-[#E7E0D3] pt-3 text-[14px] leading-[1.6] text-[#6E675C]">
                <strong className="text-[#3D3831]">처음 만들 때 과감히 뺄 기능: </strong>
                {treatment.scopeCutoff[0]}
              </p>
            </section>

            <section className="rounded-xl border border-[#ECE5D8] bg-[#F9F5EC] p-5">
              <h2 className="text-[14px] font-bold text-[#3B6380]">결합할 최신 AI 기술</h2>
              <div className="mt-2 text-[15.5px] font-bold text-[#1E1C19]">
                {treatment.sampleB.titleKo}
              </div>
              <p className="mt-1.5 text-[15px] leading-[1.68] text-[#3D3831]">
                {treatment.sampleB.bottleneckSolvedKo}
              </p>
              <div className="mt-3">
                <a
                  href={treatment.sampleB.canonicalUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[14px] font-semibold text-[#3B6380] hover:underline"
                >
                  기술 원문 보기 ↗
                </a>
              </div>
            </section>
          </div>

          <div className="flex flex-col gap-2.5 pt-2">
            <Link
              href={`/?treatment=${encodeURIComponent(treatment.id)}`}
              className="inline-flex w-full items-center justify-center rounded-2xl bg-[#23201C] px-5 py-4 text-[15.5px] font-bold text-[#FFFCF7] hover:bg-[#36322C]"
            >
              워크벤치에서 프롬프트 복사 · 다른 아이디어로 가지치기
            </Link>
            <a
              href={treatment.sampleA.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex w-full items-center justify-center rounded-2xl border border-[#D8CEBC] bg-[#FFFCF7] px-5 py-3.5 text-[15px] font-semibold text-[#1E1C19] hover:bg-[#F6F3EC]"
            >
              벤치마킹한 해외 원본 서비스 직접 써보기 ↗
            </a>
          </div>
        </article>

        {/* Related */}
        <section className="mt-10">
          <div className="flex items-center justify-between">
            <h2 className="text-[16px] font-bold text-[#1E1C19]">
              같은 분야({treatment.domainLabel})의 다른 아이디어
            </h2>
            <Link
              href={`/domain/${treatment.domainSlug}`}
              className="text-[13.5px] font-semibold text-[#6E675C] hover:text-[#1E1C19]"
            >
              전체 보기 →
            </Link>
          </div>
          <div className="mt-3.5 grid grid-cols-1 gap-3.5 md:grid-cols-2">
            {related.map((item) => (
              <Link
                key={item.id}
                href={`/treatment/${item.id}`}
                className="nordic-card block p-5"
              >
                <div className="text-[13px] font-medium text-[#6E675C]">
                  {item.sampleA.name} · {item.sampleA.shortMetricLabel}
                </div>
                <div className="mt-1.5 text-[16.5px] font-bold leading-snug text-[#1E1C19]">
                  {item.title}
                </div>
                <p className="mt-1.5 line-clamp-2 text-[14.5px] leading-[1.6] text-[#4A443C]">
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
