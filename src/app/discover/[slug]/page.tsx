import React from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { loadSeedTreatments } from "@/lib/data-loader";
import {
  DISCOVER_HUBS,
  getDiscoverHub,
  getTreatmentsForDiscoverHub,
} from "@/lib/seo-keywords";
import { getSiteUrl } from "@/lib/site-url";
import { DispenserLogo } from "@/components/Icons";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return DISCOVER_HUBS.map((h) => ({ slug: h.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const hub = getDiscoverHub(slug);
  if (!hub) return { title: "기획 아이디어 허브" };

  const siteUrl = getSiteUrl();
  const canonical = `${siteUrl}/discover/${hub.slug}`;
  return {
    title: `${hub.seoTitle} (${hub.titleEn})`,
    description: hub.descriptionKo,
    keywords: hub.keywords,
    alternates: { canonical },
    openGraph: {
      type: "website",
      locale: "ko_KR",
      url: canonical,
      siteName: "DISPENSER.",
      title: `${hub.seoTitle} | DISPENSER.`,
      description: hub.descriptionKo,
    },
    twitter: {
      card: "summary_large_image",
      title: `${hub.seoTitle} | DISPENSER.`,
      description: hub.descriptionKo,
    },
  };
}

export default async function DiscoverHubPage({ params }: PageProps) {
  const { slug } = await params;
  const hub = getDiscoverHub(slug);
  if (!hub) notFound();

  const allTreatments = await loadSeedTreatments();
  const matched = getTreatmentsForDiscoverHub(hub, allTreatments, 18);
  const siteUrl = getSiteUrl();
  const canonical = `${siteUrl}/discover/${hub.slug}`;

  const collectionJsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: hub.titleKo,
    alternateName: hub.titleEn,
    description: hub.descriptionKo,
    url: canonical,
    inLanguage: "ko-KR",
    isPartOf: {
      "@type": "WebSite",
      name: "DISPENSER.",
      url: siteUrl,
    },
  };

  const itemListJsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: hub.titleKo,
    numberOfItems: matched.length,
    itemListElement: matched.map((t, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: t.title,
      url: `${siteUrl}/treatment/${t.id}`,
      description: t.oneLineHook,
    })),
  };

  return (
    <div className="min-h-screen bg-[#F7F8FA] text-[#0F172A]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListJsonLd) }}
      />

      <main className="mx-auto max-w-[1120px] space-y-8 px-5 py-8 sm:px-8 sm:py-12">
        {/* Top Navigation */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <Link href="/" aria-label="DISPENSER. 홈으로 이동">
            <DispenserLogo />
          </Link>
          <Link
            href="/"
            className="inline-flex h-11 items-center rounded-xl bg-[#0F172A] px-5 text-[14.5px] font-bold text-[#FFFFFF] hover:bg-[#1E293B]"
          >
            DISPENSER 메인에서 랜덤 뽑기 →
          </Link>
        </div>

        {/* Editorial Hero */}
        <section className="studio-card p-7 sm:p-10">
          <div className="flex flex-wrap items-center gap-2 text-[13px] font-bold text-[#64748B]">
            <span className="rounded-full bg-[#F1F5F9] px-3 py-1 text-[#0F172A]">
              {hub.labelKo}
            </span>
            <span>·</span>
            <span>{hub.titleEn}</span>
          </div>

          <h1 className="mt-4 text-[26px] font-extrabold leading-[1.3] tracking-[-0.03em] text-[#0F172A] sm:text-[36px]">
            {hub.titleKo}
          </h1>
          <p className="mt-3.5 text-[16.5px] leading-[1.75] text-[#475569]">
            {hub.introKo}
          </p>

          <div className="mt-5 flex flex-wrap gap-2">
            {hub.keywords.map((kw) => (
              <span
                key={kw}
                className="rounded-full border border-[#E2E8F0] bg-[#F8FAFC] px-3 py-1 text-[12.5px] font-semibold text-[#475569]"
              >
                #{kw}
              </span>
            ))}
          </div>
        </section>

        {/* Matched Treatment Cards */}
        <section>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-[18px] font-extrabold text-[#0F172A]">
              추천 기획 블루프린트 ({matched.length}선)
            </h2>
            <span className="text-[13.5px] font-medium text-[#64748B]">
              모든 카드에 MVP 핵심 기능 3가지와 초기 코딩 프롬프트가 포함됩니다
            </span>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
            {matched.map((t) => (
              <Link
                key={t.id}
                href={`/treatment/${t.id}`}
                className="studio-card-flat flex flex-col justify-between gap-4 p-6"
              >
                <div>
                  <div className="flex flex-wrap items-center justify-between gap-2 text-[12.5px] font-semibold text-[#64748B]">
                    <span>
                      {t.sampleA.name} · {t.sampleA.shortMetricLabel}
                    </span>
                    <span className="rounded-full bg-[#F8FAFC] px-2.5 py-0.5 text-[#334155] ring-1 ring-[#E2E8F0]">
                      {t.track === "culture"
                        ? `컬처 · ${t.sampleB.platformId}`
                        : `AI · ${t.sampleB.platformId}`}
                    </span>
                  </div>
                  <h3 className="mt-2.5 text-[19px] font-bold leading-[1.38] text-[#0F172A]">
                    {t.title}
                  </h3>
                  <p className="mt-2 line-clamp-2 text-[15px] leading-[1.7] text-[#475569]">
                    {t.oneLineHook}
                  </p>
                </div>

                <div className="flex items-center justify-between border-t border-[#EDF2F7] pt-3.5 text-[13px] font-semibold">
                  <span className="text-[#64748B]">{t.buildCadence}</span>
                  <span className="text-[#0F172A]">기획안 · 프롬프트 보기 →</span>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* Cross-Link to Other 7 Programmatic SEO Hubs */}
        <section className="studio-card-flat p-6 sm:p-8">
          <h2 className="text-[16px] font-bold text-[#0F172A]">다른 기획 주제 탐색하기</h2>
          <nav aria-label="관련 기획 허브 목록" className="mt-4 grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
            {DISCOVER_HUBS.map((other) => {
              const active = other.slug === hub.slug;
              return (
                <Link
                  key={other.slug}
                  href={`/discover/${other.slug}`}
                  className={`rounded-xl border px-4 py-3 text-[13.5px] font-semibold transition-colors ${
                    active
                      ? "border-[#0F172A] bg-[#0F172A] text-[#FFFFFF]"
                      : "border-[#E2E8F0] bg-[#F8FAFC] text-[#1E293B] hover:border-[#0F172A] hover:bg-[#FFFFFF]"
                  }`}
                >
                  {other.labelKo}
                </Link>
              );
            })}
          </nav>
        </section>

        {/* Bottom CTA */}
        <div className="flex justify-center pt-2">
          <Link
            href="/"
            className="inline-flex h-13 items-center rounded-2xl bg-[#0F172A] px-8 text-[15.5px] font-bold text-[#FFFFFF] hover:bg-[#1E293B]"
          >
            DISPENSER 메인에서 랜덤 뽑기 →
          </Link>
        </div>
      </main>
    </div>
  );
}
