import { NextResponse } from "next/server";
import { getSiteUrl, loadSeedTreatments } from "@/lib/data-loader";

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
      const pubDate = new Date(t.createdAt).toUTCString();
      const desc = `${t.oneLineHook} | 해외 근거: ${t.sampleA.name} (${t.sampleA.tractionLabel}) | AI 기술: ${t.sampleB.titleKo}`;
      return `    <item>
      <title>${escapeXml(t.title)}</title>
      <link>${escapeXml(link)}</link>
      <guid isPermaLink="true">${escapeXml(link)}</guid>
      <pubDate>${pubDate}</pubDate>
      <category>${escapeXml(t.domainLabel)}</category>
      <description>${escapeXml(desc)}</description>
    </item>`;
    })
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>BENCH. — 해외 신생 빌더 프로덕트 × AI Radar 기획 워크벤치</title>
    <link>${escapeXml(siteUrl)}</link>
    <atom:link href="${escapeXml(`${siteUrl}/rss.xml`)}" rel="self" type="application/rss+xml" />
    <description>해외 검증 프로덕트와 AI Radar 최신 기술 시그널을 교차 샘플링한 2주 이내 TF용 서비스 기획 트리트먼트 피드</description>
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
