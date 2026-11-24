import React from "react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { DOMAIN_LIST, DOMAIN_MAP, isValidDomainSlug } from "@/lib/domains";
import {
  getSiteUrl,
  loadAiRadarSignals,
  loadBuilderSignals,
  loadSeedTreatments,
} from "@/lib/data-loader";
import { formatShortMetric } from "@/lib/synthesis-engine";
import { DispenserLogo } from "@/components/Icons";

interface PageProps {
  params: Promise<{ slug: string }>;
}

const LEGACY_REDIRECTS: Record<string, string> = {
  ["kr" + "eam-commerce"]: "/domain/brand-commerce",
  "film-previs": "/domain/cinema-video",
  "photo-lookbook": "/domain/photo-visual",
  "music-sampling": "/domain/music-audio",
  "culture-map": "/domain/local-archive",
};

export async function generateStaticParams() {
  return DOMAIN_LIST.map((d) => ({ slug: d.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  if (!isValidDomainSlug(slug)) return { title: "기획 아카이브" };
  const domain = DOMAIN_MAP[slug];
  const siteUrl = getSiteUrl();
  const canonical = `${siteUrl}/domain/${domain.slug}`;
  return {
    title: `${domain.label} 서비스 기획 아이디어 모음`,
    description: `${domain.tagline}. 글로벌 오픈소스와 최신 AI 이슈를 결합한 실행 기획안.`,
    alternates: { canonical },
    openGraph: {
      type: "website",
      url: canonical,
      title: `${domain.label} — DISPENSER`,
      description: domain.description,
    },
  };
}

export default async function DomainHubPage({ params }: PageProps) {
  const { slug } = await params;
  if (slug in LEGACY_REDIRECTS) {
    redirect(LEGACY_REDIRECTS[slug]);
  }
  if (!isValidDomainSlug(slug)) notFound();

  const domain = DOMAIN_MAP[slug];
  const treatments = loadSeedTreatments().filter((t) => t.domainSlug === slug);
  const builders = loadBuilderSignals().slice(0, 6);
  const radars = loadAiRadarSignals()
    .filter(
      (r) =>
        domain.affinityCategories.includes(r.category) ||
        domain.affinityDomains.includes(r.planningMeta.productDomain)
    )
    .slice(0, 6);

  const siteUrl = getSiteUrl();
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: `${domain.label} 서비스 기획 아이디어 모음`,
    description: domain.description,
    url: `${siteUrl}/domain/${domain.slug}`,
    inLanguage: "ko-KR",
  };

  return (
    <div className="min-h-screen bg-[#F7F8FA] text-[#0F172A]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <main className="mx-auto max-w-[980px] space-y-8 px-5 py-8 sm:px-8 sm:py-10">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link href="/" aria-label="DISPENSER 홈">
            <DispenserLogo />
          </Link>
          <Link
            href="/"
            className="rounded-xl bg-[#0F172A] px-4 py-2 text-[14px] font-bold text-[#FFFFFF] hover:bg-[#1E293B]"
          >
            전체 랜덤 디스펜서 열기 →
          </Link>
        </div>

        <section className="studio-card p-7 sm:p-9">
          <h1 className="text-[28px] font-extrabold tracking-[-0.025em] text-[#0F172A] sm:text-[34px]">
            {domain.label} 기획 아이디어
          </h1>
          <p className="mt-2.5 text-[16px] leading-[1.75] text-[#475569]">
            {domain.description}
          </p>
        </section>

        <section>
          <h2 className="text-[16px] font-bold text-[#0F172A]">
            큐레이션 기획안 ({treatments.length}선)
          </h2>
          <div className="mt-3.5 grid grid-cols-1 gap-4 md:grid-cols-2">
            {treatments.map((t) => (
              <Link
                key={t.id}
                href={`/treatment/${t.id}`}
                className="studio-card-flat flex flex-col justify-between gap-3 p-5"
              >
                <div>
                  <div className="text-[13px] font-medium text-[#64748B]">
                    {t.sampleA.name} · {t.sampleA.shortMetricLabel}
                  </div>
                  <h3 className="mt-1.5 text-[18px] font-bold leading-snug text-[#0F172A]">
                    {t.title}
                  </h3>
                  <p className="mt-1.5 line-clamp-2 text-[14.5px] leading-[1.68] text-[#475569]">
                    {t.oneLineHook}
                  </p>
                </div>
                <div className="text-right text-[13px] font-semibold text-[#64748B]">
                  자세히 보기 →
                </div>
              </Link>
            ))}
          </div>
        </section>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <section className="studio-card-flat p-6">
            <h2 className="text-[15px] font-bold text-[#0F172A]">수집된 글로벌 원본 기술</h2>
            <ul className="mt-3 divide-y divide-[#E2E8F0]">
              {builders.map((b) => (
                <li key={b.id} className="py-3">
                  <a
                    href={b.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[15px] font-bold text-[#0F172A] hover:underline"
                  >
                    {b.name} ↗
                  </a>
                  <span className="ml-2 text-[12.5px] text-[#64748B]">
                    {formatShortMetric(b)}
                  </span>
                  <p className="mt-1 text-[14px] text-[#475569]">{b.taglineKo}</p>
                </li>
              ))}
            </ul>
          </section>

          <section className="studio-card-flat p-6">
            <h2 className="text-[15px] font-bold text-[#2563EB]">연동된 실시간 AI 이슈</h2>
            <ul className="mt-3 divide-y divide-[#E2E8F0]">
              {radars.map((r) => (
                <li key={r.id} className="py-3">
                  <a
                    href={r.canonicalUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[15px] font-bold text-[#0F172A] hover:underline"
                  >
                    {r.titleKo} ↗
                  </a>
                  <p className="mt-1 text-[14px] text-[#475569]">
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
