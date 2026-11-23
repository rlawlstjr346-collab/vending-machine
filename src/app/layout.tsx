import type { Metadata } from "next";
import { getSiteUrl } from "@/lib/data-loader";
import "./globals.css";

const siteUrl = getSiteUrl();

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "BENCH. — 해외 신상 프로덕트 × AI 기술 기획 레이더",
    template: "%s | BENCH.",
  },
  description:
    "Show HN, Product Hunt, TrustMRR, Uneed의 해외 검증 프로덕트와 AI Radar 최신 기술 시그널을 조합해 1주일 안에 만들 수 있는 서비스 기획안을 제안하는 에디토리얼 워크벤치.",
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
    siteName: "BENCH.",
    title: "BENCH. — 해외 신상 프로덕트 × AI 기술 기획 레이더",
    description:
      "해외에서 반응이 검증된 서비스 아이디어와 최신 AI 기술을 조합해 누구나 바로 만들 수 있는 MVP 기획안을 제안합니다.",
  },
  twitter: {
    card: "summary_large_image",
    title: "BENCH. — 해외 신상 프로덕트 × AI 기술 기획 레이더",
    description:
      "해외 검증 프로덕트와 AI Radar 최신 기술로 실행 가능한 웹 서비스 기획안을 즉시 탐색하세요.",
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
      <body className="bg-[#F6F3EC] text-[#1E1C19] antialiased">{children}</body>
    </html>
  );
}
