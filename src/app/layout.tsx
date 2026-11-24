import type { Metadata } from "next";
import { getSiteUrl } from "@/lib/data-loader";
import "./globals.css";

const siteUrl = getSiteUrl();

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "DISPENSER — 글로벌 오픈소스 × 실시간 AI 이슈 기획 디스펜서",
    template: "%s | DISPENSER",
  },
  description:
    "GitHub 급상승 오픈소스, Reddit, Show HN, Product Hunt, TrustMRR, Uneed의 실물 기술과 AI Radar 실시간 이슈를 결합해 바로 만들 수 있는 웹 서비스 기획안을 한 장씩 배출하는 DISPENSER.",
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
    siteName: "DISPENSER",
    title: "DISPENSER — 글로벌 오픈소스 × 실시간 AI 이슈 기획 디스펜서",
    description:
      "실제 시연 영상과 오픈소스 기술, 최신 AI 이슈를 교차 조합해 1주일 안에 구현할 웹 서비스 기획안을 무작위로 탐색하세요.",
  },
  twitter: {
    card: "summary_large_image",
    title: "DISPENSER — 글로벌 오픈소스 × 실시간 AI 이슈 기획 디스펜서",
    description:
      "GitHub 오픈소스·해외 신상 프로덕트와 AI Radar 실시간 이슈로 실행 가능한 웹 기획안을 한 장씩 탐색하세요.",
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
  return (
    <html lang="ko">
      <head>
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css"
        />
      </head>
      <body className="bg-[#F7F8FA] text-[#0F172A] antialiased">{children}</body>
    </html>
  );
}
