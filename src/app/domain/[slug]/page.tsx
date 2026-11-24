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
import { BenchLogo } from "@/components/Icons";

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
  if (!isValidDomainSlug(slug)) return { title: "분야별 기획 모음" };
  const domain = DOMAIN_MAP[slug];
  const siteUrl = getSiteUrl();
  const canonical = `${siteUrl}/domain/${domain.slug}`;
  return {
    title: `${domain.label} 서비스 기획 아이디어 모음`,
    description: `${domain.tagline}. 해외 검증 프로덕트와 최신 AI 기술을 결합한 실행 기획안.`,
    alternates: { canonical },
    openGraph: {
      type: "website",
      url: canonical,
      title: `${domain.label} — BENCH.`,
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

      <header className="border-b border-[#E5E7EB] bg-[#FFFFFF]">
        <div className="mx-auto flex min-h-16 max-w-[960px] flex-wrap items-center justify-between gap-3 px-5 py-3 sm:px-8">
          <Link href="/" aria-label="BENCH 홈">
            <BenchLogo />
          </Link>
          <div className="flex flex-wrap items-center gap-1.5 text-[13px]">
            {DOMAIN_LIST.map((d) => (
              <Link
                key={d.slug}
                href={`/domain/${d.slug}`}
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 font-medium ${
                  d.slug === slug
                    ? "bg-[#0F172A] font-semibold text-[#FFFFFF]"
                    : "border border-[#E5E7EB] bg-[#FFFFFF] text-[#475569] hover:border-[#0F172A] hover:text-[#0F172A]"
                }`}
              >
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: d.color }}
                />
                <span>{d.label}</span>
              </Link>
            ))}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[960px] space-y-8 px-5 py-8 sm:px-8 sm:py-10">
        <section className="studio-card p-7">
          <span
            className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[13px] font-semibold"
            style={{ backgroundColor: domain.softBg, color: domain.color }}
          >
            <span
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: domain.color }}
            />
            {domain.label}
          </span>
          <h1 className="mt-3 text-[26px] font-bold tracking-[-0.025em] text-[#0F172A] sm:text-[30px]">
            {domain.label} 서비스 기획 아이디어
          </h1>
          <p className="mt-2 text-[15.5px] leading-[1.75] text-[#475569]">
            {domain.description}
          </p>
          <div className="mt-5">
            <Link
              href={`/?domain=${domain.slug}`}
              className="inline-flex items-center rounded-full bg-[#0F172A] px-4 py-2 text-[14px] font-semibold text-[#FFFFFF] hover:bg-[#1E293B]"
            >
              이 분야로 비주얼 덱 열기 →
            </Link>
          </div>
        </section>

        <section>
          <h2 className="text-[16px] font-bold text-[#0F172A]">
            추천 기획안 ({treatments.length}선)
          </h2>
          <div className="mt-3.5 grid grid-cols-1 gap-3.5 md:grid-cols-2">
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
                  <h3 className="mt-1.5 text-[17.5px] font-bold leading-snug text-[#0F172A]">
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
            <h2 className="text-[15px] font-bold text-[#EA580C]">참고 해외 신상 서비스</h2>
            <ul className="mt-3 divide-y divide-[#E2E8F0]">
              {builders.map((b) => (
                <li key={b.id} className="py-3">
                  <a
                    href={b.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[14.5px] font-bold text-[#0F172A] hover:underline"
                  >
                    {b.name} ↗
                  </a>
                  <span className="ml-2 text-[12.5px] text-[#64748B]">
                    {formatShortMetric(b)}
                  </span>
                  <p className="mt-1 text-[13.5px] text-[#475569]">{b.taglineKo}</p>
                </li>
              ))}
            </ul>
          </section>

          <section className="studio-card-flat p-6">
            <h2 className="text-[15px] font-bold text-[#2563EB]">연동된 최신 AI 기술</h2>
            <ul className="mt-3 divide-y divide-[#E2E8F0]">
              {radars.map((r) => (
                <li key={r.id} className="py-3">
                  <a
                    href={r.canonicalUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[14.5px] font-bold text-[#0F172A] hover:underline"
                  >
                    {r.titleKo} ↗
                  </a>
                  <p className="mt-1 text-[13.5px] text-[#475569]">
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
