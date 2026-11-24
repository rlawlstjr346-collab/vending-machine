import { NextResponse } from "next/server";
import { loadSeedTreatments } from "@/lib/data-loader";
import { getSiteUrl } from "@/lib/site-url";

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export async function GET() {
  const siteUrl = getSiteUrl();
  const treatments = loadSeedTreatments();
  const buildDate = new Date().toUTCString();

  const itemsXml = treatments
    .map((t) => {
      const link = `${siteUrl}/treatment/${t.id}`;
      const pubDate = new Date(t.createdAt || Date.now()).toUTCString();
      const trackLabel = t.track === "culture" ? "글로벌 컬처 × 기술" : "테크 웨지 × AI 이슈";
      const fullSummary = [
        t.oneLineHook,
        `[시너지 인사이트] ${t.fusionStoryKo}`,
        `[재료 01] ${t.sampleA.name} (${t.sampleA.shortMetricLabel})`,
        `[재료 02] ${t.sampleB.platformId} — ${t.sampleB.titleKo}`,
        `[MVP 핵심 기능 3가지] 1) ${t.mvpFeatures[0]} 2) ${t.mvpFeatures[1]} 3) ${t.mvpFeatures[2]}`,
      ].join(" | ");

      return `    <item>
      <title>${escapeXml(t.title)}</title>
      <link>${escapeXml(link)}</link>
      <guid isPermaLink="true">${escapeXml(link)}</guid>
      <pubDate>${pubDate}</pubDate>
      <category>${escapeXml(trackLabel)}</category>
      <category>${escapeXml(t.domainLabel)}</category>
      <description>${escapeXml(fullSummary)}</description>
    </item>`;
    })
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>DISPENSER. — 글로벌 오픈소스 × AI·컬처 기획 아이디어 디스펜서</title>
    <link>${escapeXml(siteUrl)}</link>
    <atom:link href="${escapeXml(`${siteUrl}/rss.xml`)}" rel="self" type="application/rss+xml" />
    <description>GitHub 오픈소스, Show HN, TrustMRR 실물 기술과 AI Radar·19개 글로벌 컬처 매거진 이슈를 결합한 실행 가능한 웹 서비스 기획안 피드</description>
    <language>ko</language>
    <lastBuildDate>${buildDate}</lastBuildDate>
${itemsXml}
  </channel>
</rss>
`;

  return new NextResponse(xml, {
    status: 200,
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, max-age=600",
    },
  });
}
