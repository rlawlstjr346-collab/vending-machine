import type { Metadata } from "next";
import { getSiteUrl } from "@/lib/data-loader";
import "./globals.css";

const siteUrl = getSiteUrl();

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "BENCH. — 해외 신상 프로덕트 × AI 기술 비주얼 기획 덱",
    template: "%s | BENCH.",
  },
  description:
    "Show HN, Product Hunt, TrustMRR, Uneed의 해외 검증 프로덕트와 AI Radar 최신 기술 시그널을 1화면 1카드 비주얼 블루프린트로 탐색하는 서비스 기획 덱.",
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
    title: "BENCH. — 해외 신상 프로덕트 × AI 기술 비주얼 기획 덱",
    description:
      "해외에서 반응이 검증된 서비스 아이디어와 최신 AI 기술을 조합해 1주일 안에 만들 수 있는 웹 서비스 화면과 기획안을 한 장씩 탐색하세요.",
  },
  twitter: {
    card: "summary_large_image",
    title: "BENCH. — 해외 신상 프로덕트 × AI 기술 비주얼 기획 덱",
    description:
      "해외 검증 프로덕트와 AI Radar 최신 기술로 실행 가능한 웹 서비스 기획안을 1장씩 바로 탐색하세요.",
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
