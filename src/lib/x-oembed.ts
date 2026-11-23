import { classifyMechanism } from "./synthesis-engine";
import { MECHANISM_MAP } from "./domains";
import { decodeHtmlEntities, sanitizeEditorialText, slugifyAscii } from "./text-clean";
import type { BuilderSignal } from "./types";

const X_STATUS_RE = /^https?:\/\/(?:www\.)?(?:x\.com|twitter\.com)\/([A-Za-z0-9_]{1,20})\/status\/(\d+)/i;

export function isXPostUrl(url: string): boolean {
  return X_STATUS_RE.test(url.trim());
}

export async function fetchXOembedSignal(
  postUrl: string,
  userAgent = "Mozilla/5.0 (compatible; BENCH-EditorialSync/1.0; +https://github.com/rlawlstjr346-collab/vending-machine)"
): Promise<BuilderSignal | null> {
  const match = postUrl.trim().match(X_STATUS_RE);
  if (!match) return null;
  const [, handle, statusId] = match;
  const canonicalUrl = `https://x.com/${handle}/status/${statusId}`;
  const oembedUrl = `https://publish.twitter.com/oembed?url=${encodeURIComponent(canonicalUrl)}&omit_script=true`;

  try {
    const res = await fetch(oembedUrl, {
      headers: {
        "User-Agent": userAgent,
        Accept: "application/json",
      },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      author_name?: string;
      author_url?: string;
      html?: string;
      url?: string;
    };
    const rawHtml = data.html || "";
    const pMatch = rawHtml.match(/<p[^>]*>([\s\S]*?)<\/p>/i);
    const strippedText = decodeHtmlEntities(
      (pMatch ? pMatch[1] : rawHtml).replace(/<[^>]+>/g, " ")
    )
      .replace(/\s+/g, " ")
      .trim();

    const authorName = sanitizeEditorialText(data.author_name || `@${handle}`);
    const excerpt = sanitizeEditorialText(strippedText).slice(0, 180) || `${authorName}의 X 런칭 포스트`;
    const mechanism = classifyMechanism(excerpt, "x_oembed", "launch");
    const nowIso = new Date().toISOString();

    return {
      id: `builder-x-${statusId}`,
      name: `${authorName} (@${handle})`,
      slug: slugifyAscii(`x-${handle}-${statusId}`),
      source: "x_oembed",
      sourceLabel: "X oEmbed",
      url: canonicalUrl,
      discussionUrl: canonicalUrl,
      taglineEn: excerpt,
      taglineKo: excerpt,
      summaryKo: `X 빌더 ${authorName}(@${handle})가 공개한 런칭 포스트: ${excerpt}`,
      painPointKo: "공식 보도 전 X 타임라인에서 먼저 공개된 빌더 데모의 핵심 사용 맥락을 즉시 포착합니다.",
      tractionLabel: `X 런칭 @${handle}`,
      tractionValue: 50,
      tractionType: "launch",
      mrrUsd: null,
      mechanism,
      mechanismLabel: MECHANISM_MAP[mechanism].label,
      tags: ["x-launch", handle.toLowerCase()],
      publishedAt: nowIso,
      fetchedAt: nowIso,
      verifiedRevenue: false,
    };
  } catch {
    return null;
  }
}
