import React from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { DOMAIN_LIST, DOMAIN_MAP, isValidDomainSlug } from "@/lib/domains";
import {
  getSiteUrl,
  loadAiRadarSignals,
  loadBuilderSignals,
  loadSeedTreatments,
} from "@/lib/data-loader";
import { BenchLogo, ExternalLinkIcon } from "@/components/Icons";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return DOMAIN_LIST.map((d) => ({ slug: d.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  if (!isValidDomainSlug(slug)) return { title: "도메인 허브" };
  const domain = DOMAIN_MAP[slug];
  const siteUrl = getSiteUrl();
  const canonical = `${siteUrl}/domain/${domain.slug}`;
  return {
    title: `${domain.label} 벤치마킹 기획 허브`,
    description: `${domain.tagline}. 해외 검증 프로덕트와 AI Radar 최신 기술을 결합한 실전 MVP 트리트먼트 모음.`,
    alternates: { canonical },
    openGraph: {
      type: "website",
      url: canonical,
      title: `${domain.label} — BENCH. 벤치마킹 허브`,
      description: domain.description,
    },
  };
}

export default async function DomainHubPage({ params }: PageProps) {
  const { slug } = await params;
  if (!isValidDomainSlug(slug)) notFound();

  const domain = DOMAIN_MAP[slug];
  const treatments = loadSeedTreatments().filter((t) => t.domainSlug === slug);
  const builders = loadBuilderSignals().slice(0, 8);
  const radars = loadAiRadarSignals()
    .filter(
      (r) =>
        domain.affinityCategories.includes(r.category) ||
        domain.affinityDomains.includes(r.planningMeta.productDomain)
    )
    .slice(0, 8);

  const siteUrl = getSiteUrl();
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: `${domain.label} 벤치마킹 기획 허브`,
    description: domain.description,
    url: `${siteUrl}/domain/${domain.slug}`,
    inLanguage: "ko-KR",
  };

  return (
    <div className="min-h-screen bg-[#FAFAFA] text-[#111111]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <header className="border-b border-[#E5E7EB] bg-[#FFFFFF]">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <Link href="/" aria-label="BENCH 홈">
            <BenchLogo className="h-5 w-auto" />
          </Link>
          <div className="flex flex-wrap items-center gap-2 text-xs">
            {DOMAIN_LIST.map((d) => (
              <Link
                key={d.slug}
                href={`/domain/${d.slug}`}
                className={`border px-2.5 py-1 font-semibold ${
                  d.slug === slug
                    ? "border-[#111111] bg-[#111111] text-[#FFFFFF]"
                    : "border-[#E5E7EB] bg-[#FFFFFF] text-[#374151] hover:border-[#111111]"
                }`}
              >
                {d.label}
              </Link>
            ))}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-10 space-y-8">
        <section className="border border-[#E5E7EB] bg-[#FFFFFF] p-7">
          <div className="text-xs font-bold uppercase tracking-wider text-[#4B5563]">
            BENCH. DOMAIN BENCHMARK HUB
          </div>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-[#111111] sm:text-3xl">
            {domain.label} 기획 트리트먼트 허브
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-[#374151]">
            {domain.description}
          </p>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-[#E5E7EB] pt-4 text-xs text-[#4B5563]">
            <span>주요 타깃: {domain.targetUsers}</span>
            <Link
              href={`/?domain=${domain.slug}`}
              className="border border-[#111111] bg-[#111111] px-3.5 py-1.5 font-semibold text-[#FFFFFF]"
            >
              이 도메인으로 워크벤치 열기 →
            </Link>
          </div>
        </section>

        {/* Treatments Grid */}
        <section>
          <h2 className="text-sm font-bold text-[#111111]">
            합성된 실전 트리트먼트 ({treatments.length}선)
          </h2>
          <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
            {treatments.map((t) => (
              <Link
                key={t.id}
                href={`/treatment/${t.id}`}
                className="block border border-[#E5E7EB] bg-[#FFFFFF] p-5 hover:border-[#111111]"
              >
                <div className="flex items-center justify-between text-[11px] font-mono text-[#4B5563]">
                  <span>{t.buildCadence}</span>
                  <span>{t.sampleA.tractionLabel}</span>
                </div>
                <h3 className="mt-1.5 text-base font-bold text-[#111111]">{t.title}</h3>
                <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-[#374151]">
                  {t.oneLineHook}
                </p>
                <div className="mt-3 border-t border-[#E5E7EB] pt-2.5 text-[11px] text-[#4B5563]">
                  A: {t.sampleA.name} × B: {t.sampleB.titleKo}
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* Paired Overseas Benchmarks & AI Radar Ingredients */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <section className="border border-[#E5E7EB] bg-[#FFFFFF] p-5">
            <h2 className="text-sm font-bold text-[#111111]">
              참조 해외 원액 프로덕트 (최신)
            </h2>
            <ul className="mt-3 divide-y divide-[#E5E7EB]">
              {builders.map((b) => (
                <li key={b.id} className="py-3">
                  <a
                    href={b.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs font-bold text-[#111111] underline decoration-[#E5E7EB] underline-offset-4 hover:decoration-[#111111]"
                  >
                    <span>{b.name}</span>
                    <ExternalLinkIcon className="h-3 w-3" />
                  </a>
                  <span className="ml-2 font-mono text-[11px] text-[#4B5563]">
                    {b.tractionLabel}
                  </span>
                  <p className="mt-1 text-xs text-[#374151]">{b.taglineKo}</p>
                </li>
              ))}
            </ul>
          </section>

          <section className="border border-[#E5E7EB] bg-[#FFFFFF] p-5">
            <h2 className="text-sm font-bold text-[#111111]">
              결합 추천 AI Radar 기술 재료
            </h2>
            <ul className="mt-3 divide-y divide-[#E5E7EB]">
              {radars.map((r) => (
                <li key={r.id} className="py-3">
                  <a
                    href={r.canonicalUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-start gap-1 text-xs font-bold text-[#111111] underline decoration-[#E5E7EB] underline-offset-4 hover:decoration-[#111111]"
                  >
                    <span>{r.titleKo}</span>
                    <ExternalLinkIcon className="mt-0.5 h-3 w-3 shrink-0" />
                  </a>
                  <p className="mt-1 text-xs text-[#374151]">
                    {r.planningMeta.benchmarkPoint}
                  </p>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </main>
    </div>
  );
}
