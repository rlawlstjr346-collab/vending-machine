import type { Metadata } from "next";
import { getSiteUrl } from "@/lib/site-url";
import "./globals.css";

const siteUrl = getSiteUrl();

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "DISPENSER. — AI 서비스·사이드 프로젝트·글로벌 컬처 기획 아이디어 디스펜서",
    template: "%s | DISPENSER.",
  },
  description:
    "AI 서비스 기획 아이디어, 1인 개발 사이드 프로젝트, 바이브코딩 주제, 해외 스타트업 벤치마킹을 GitHub 급상승 오픈소스와 AI Radar·19개 글로벌 컬처 매거진 실데이터로 1장씩 배출하는 기획 디스펜서.",
  keywords: [
    "AI 서비스 기획 아이디어",
    "사이드 프로젝트 아이디어",
    "바이브코딩 프로젝트 추천",
    "해외 스타트업 벤치마킹",
    "마이크로 SaaS 수익 모델",
    "깃허브 오픈소스 활용 기획",
    "1인 개발 주말 MVP",
    "브랜드 인터랙티브 캠페인",
    "크리에이티브 웹 기획",
    "DISPENSER",
  ],
  alternates: {
    canonical: siteUrl,
    types: {
      "application/rss+xml": `${siteUrl}/rss.xml`,
    },
  },
  openGraph: {
    type: "website",
    locale: "ko_KR",
    url: siteUrl,
    siteName: "DISPENSER.",
    title: "DISPENSER. — 글로벌 오픈소스 × AI·컬처 기획 아이디어 디스펜서",
    description:
      "GitHub 오픈소스, Show HN, TrustMRR 실물 기술과 AI Radar·글로벌 19개 컬처 매거진 이슈를 50:50으로 결합해 1주일 MVP 기획안과 코딩 프롬프트를 한 장씩 제공합니다.",
  },
  twitter: {
    card: "summary_large_image",
    title: "DISPENSER. — 글로벌 오픈소스 × AI·컬처 기획 아이디어 디스펜서",
    description:
      "AI 서비스 기획, 사이드 프로젝트 MVP, 바이브코딩 주제를 실데이터 시연 영상과 초기 프롬프트로 바로 탐색하세요.",
  },
  verification: {
    google: process.env.GOOGLE_SITE_VERIFICATION || undefined,
    other: process.env.NAVER_SITE_VERIFICATION
      ? { "naver-site-verification": process.env.NAVER_SITE_VERIFICATION }
      : undefined,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const websiteJsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "DISPENSER.",
    alternateName: "DISPENSER 기획 아이디어 디스펜서",
    url: siteUrl,
    inLanguage: "ko-KR",
    description:
      "GitHub 오픈소스·해외 신상 프로덕트와 AI Radar·글로벌 컬처 시그널을 교차 조합해 실행 가능한 웹 서비스 기획안과 코딩 프롬프트를 제공하는 디스펜서.",
  };

  return (
    <html lang="ko">
      <head>
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css"
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }}
        />
      </head>
      <body className="bg-[#F7F8FA] text-[#0F172A] antialiased">{children}</body>
    </html>
  );
}
