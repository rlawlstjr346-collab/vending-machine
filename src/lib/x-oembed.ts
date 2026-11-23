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
  userAgent = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"
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
      html?: string;
    };
    const rawHtml = data.html || "";
    const pMatch = rawHtml.match(/<p[^>]*>([\s\S]*?)<\/p>/i);
    const strippedText = decodeHtmlEntities(
      (pMatch ? pMatch[1] : rawHtml).replace(/<[^>]+>/g, " ")
    )
      .replace(/\s+/g, " ")
      .trim();

    const authorName = sanitizeEditorialText(data.author_name || `@${handle}`);
    const excerpt = sanitizeEditorialText(strippedText).slice(0, 180) || `${authorName}의 X 공개 포스트`;
    const mechanism = classifyMechanism(excerpt, "x_oembed", "launch");
    const nowIso = new Date().toISOString();

    return {
      id: `builder-x-${statusId}`,
      name: `${authorName} (@${handle})`,
      slug: slugifyAscii(`x-${handle}-${statusId}`),
      source: "x_oembed",
      sourceLabel: "X 공개 포스트",
      url: canonicalUrl,
      discussionUrl: canonicalUrl,
      taglineEn: excerpt,
      taglineKo: excerpt,
      summaryKo: `${authorName}(@${handle})가 공유한 프로덕트 소식: ${excerpt}`,
      painPointKo: "해외 메이커가 X에 직접 공개한 최신 데모에서 핵심 기능을 뽑아 정리했습니다.",
      tractionLabel: `X @${handle}`,
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
