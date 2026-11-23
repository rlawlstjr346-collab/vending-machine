import type { Metadata } from "next";
import { getSiteUrl } from "@/lib/data-loader";
import "./globals.css";

const siteUrl = getSiteUrl();

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "BENCH. — 해외 신생 빌더 프로덕트 × AI Radar 기획 워크벤치",
    template: "%s | BENCH.",
  },
  description:
    "실리콘밸리 신규 런칭·검증 매출 프로덕트(Show HN, Product Hunt, TrustMRR, Uneed)와 AI Radar 최신 기술 시그널을 교차 샘플링해 2주 이내 TF용 서비스 기획 트리트먼트를 즉시 설계하는 에디토리얼 워크벤치.",
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
    title: "BENCH. — 해외 신생 빌더 × AI Radar 샘플링 기획 워크벤치",
    description:
      "해외 검증 프로덕트와 최신 AI 오픈소스·모델 시그널을 교차 합성해 실전 MVP 기획 트리트먼트를 즉시 도출합니다.",
  },
  twitter: {
    card: "summary_large_image",
    title: "BENCH. — 해외 신생 빌더 × AI Radar 기획 워크벤치",
    description:
      "해외 검증 프로덕트와 AI Radar 최신 기술을 샘플링해 2주 이내 TF용 MVP 기획안을 즉시 생성합니다.",
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
      <body className="bg-[#FAFAFA] text-[#111111] antialiased">{children}</body>
    </html>
  );
}
