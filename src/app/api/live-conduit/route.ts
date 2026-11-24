import { NextRequest, NextResponse } from "next/server";
import { MECHANISM_MAP } from "@/lib/domains";
import { buildTechDigestKo, classifyMechanism } from "@/lib/synthesis-engine";
import { isValidHttpUrl, sanitizeEditorialText, slugifyAscii } from "@/lib/text-clean";
import type { BuilderSignal, CultureSignal, CultureVertical, DomainSlug } from "@/lib/types";

export const dynamic = "force-dynamic";

const UA =
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";
const REDDIT_UA = "DISPENSER-LiveConduit/1.0 (https://vending-machine.vercel.app)";

const GITHUB_ROTATION_TOPICS = [
  "topic:ai",
  "topic:developer-tools",
  "topic:automation",
  "topic:audio OR topic:video",
  "topic:design OR topic:canvas",
  "topic:cli OR topic:terminal",
  "topic:self-hosted OR topic:local-first",
  "topic:creative-coding OR topic:webgl",
];

const REDDIT_ROTATION = [
  "SideProject",
  "LocalLLaMA",
  "InternetIsBeautiful",
  "selfhosted",
  "indiehackers",
  "webdev",
];

const CULTURE_RSS_ROTATION: Array<{
  id: string;
  name: string;
  url: string;
  vertical: CultureVertical;
  verticalLabel: string;
  domainSlug: DomainSlug;
  whyKo: string;
}> = [
  {
    id: "hypebeast",
    name: "Hypebeast",
    url: "https://hypebeast.com/feed",
    vertical: "fashion-youth",
    verticalLabel: "패션 · 유스컬처",
    domainSlug: "brand-commerce",
    whyKo: "스트리트웨어·한정판 드롭·글로벌 브랜드 협업 수요가 모이는 컬처 허브입니다.",
  },
  {
    id: "colossal",
    name: "Colossal",
    url: "https://www.thisiscolossal.com/feed/",
    vertical: "photo-visual-art",
    verticalLabel: "시각예술 · 공예",
    domainSlug: "photo-visual",
    whyKo: "시각예술·설치미술·오브제 실험을 선명하게 다루는 글로벌 아트 매거진입니다.",
  },
  {
    id: "cdm",
    name: "CDM",
    url: "https://cdm.link/feed/",
    vertical: "music-sound",
    verticalLabel: "사운드테크 · 신스",
    domainSlug: "music-audio",
    whyKo: "신시사이저·오디오 소프트웨어·오픈소스 악기 최전선을 다루는 매체입니다.",
  },
  {
    id: "dezeen",
    name: "Dezeen",
    url: "https://www.dezeen.com/feed/",
    vertical: "architecture-object",
    verticalLabel: "건축 · 공간",
    domainSlug: "local-archive",
    whyKo: "세계 최신 건축·공간·오브제 디자인이 매일 공개되는 글로벌 미디어입니다.",
  },
  {
    id: "letterboxd",
    name: "Letterboxd Journal",
    url: "https://letterboxd.com/journal/rss/",
    vertical: "cinema-directing",
    verticalLabel: "시네마 · 연출",
    domainSlug: "cinema-video",
    whyKo: "전 세계 시네필의 감상 취향과 큐레이션 리스트 문화가 집결하는 저널입니다.",
  },
  {
    id: "kottke",
    name: "Kottke.org",
    url: "https://feeds.kottke.org/main",
    vertical: "archive-curation",
    verticalLabel: "크리에이티브 큐레이션",
    domainSlug: "local-archive",
    whyKo: "예술·과학·웹 문화의 기발한 교차점을 선별해 온 고감도 큐레이션 블로그입니다.",
  },
];

function quickHash(input: string): string {
  let h = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h >>> 0).toString(36);
}

function stripXmlTags(input: string): string {
  return String(input || "")
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

async function fetchShowHnPage(page: number): Promise<BuilderSignal[]> {
  try {
    const url = `https://hn.algolia.com/api/v1/search_by_date?tags=show_hn&hitsPerPage=18&page=${page}`;
    const res = await fetch(url, {
      headers: { "User-Agent": UA },
      signal: AbortSignal.timeout(6000),
    });
    if (!res.ok) return [];
    const data = (await res.json()) as { hits?: Array<Record<string, unknown>> };
    const nowIso = new Date().toISOString();
    const out: BuilderSignal[] = [];

    for (const h of data.hits || []) {
      const targetUrl = String(h.url || "").trim();
      if (!isValidHttpUrl(targetUrl)) continue;
      const rawTitle = sanitizeEditorialText(String(h.title || ""))
        .replace(/^Show\s+HN\s*[:–—-]\s*/i, "")
        .trim();
      if (!rawTitle || rawTitle.length < 4) continue;
      const parts = rawTitle.split(/\s+[–—-]\s+|\s*:\s+/);
      const name =
        parts.length >= 2 && parts[0].length <= 42
          ? parts[0].trim()
          : rawTitle.split(/\s+/).slice(0, 4).join(" ");
      const tagline = parts.length >= 2 ? parts.slice(1).join(" — ").trim() : rawTitle;
      const points = Number(h.points || 1);
      const comments = Number(h.num_comments || 0);
      const mech = classifyMechanism(`${name} ${tagline}`, "show_hn", "points");

      const b: BuilderSignal = {
        id: `builder-conduit-hn-${String(h.objectID || quickHash(targetUrl))}`,
        name,
        slug: slugifyAscii(`hn-${name}-${quickHash(targetUrl).slice(0, 5)}`),
        source: "show_hn",
        sourceLabel: "Show HN",
        url: targetUrl,
        discussionUrl: h.objectID
          ? `https://news.ycombinator.com/item?id=${String(h.objectID)}`
          : null,
        taglineEn: tagline,
        taglineKo: tagline,
        summaryKo: `${name}: ${tagline}`,
        painPointKo: "Show HN 다중 페이지 실시간 수맥에서 포착된 빌더 프로젝트입니다.",
        tractionLabel: `HN ${points} pts · 댓글 ${comments}`,
        tractionValue: points * 10 + comments * 3,
        tractionType: "points",
        mrrUsd: null,
        mechanism: mech,
        mechanismLabel: MECHANISM_MAP[mech].label,
        tags: ["show-hn", "conduit"],
        publishedAt: String(h.created_at || nowIso),
        fetchedAt: nowIso,
        verifiedRevenue: false,
        demoVideoUrl: null,
        previewImageUrl: null,
        mediaSourceLabel: null,
      };
      b.techDigestKo = buildTechDigestKo(b, mech);
      out.push(b);
    }
    return out;
  } catch {
    return [];
  }
}

async function fetchGithubConduit(cursor: number): Promise<BuilderSignal[]> {
  try {
    const topicQuery = GITHUB_ROTATION_TOPICS[cursor % GITHUB_ROTATION_TOPICS.length];
    const daysBack = 60 + (cursor % 4) * 30;
    const since = new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10);
    const page = (Math.floor(cursor / GITHUB_ROTATION_TOPICS.length) % 3) + 1;
    const q = encodeURIComponent(`created:>${since} stars:>40 (${topicQuery})`);
    const url = `https://api.github.com/search/repositories?q=${q}&sort=stars&order=desc&per_page=14&page=${page}`;
    const res = await fetch(url, {
      headers: {
        "User-Agent": UA,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
      signal: AbortSignal.timeout(6000),
    });
    if (!res.ok) return [];
    const data = (await res.json()) as { items?: Array<Record<string, unknown>> };
    const nowIso = new Date().toISOString();
    const out: BuilderSignal[] = [];

    for (const repo of data.items || []) {
      const fullName = String(repo.full_name || "");
      const htmlUrl = String(repo.html_url || "");
      const desc = sanitizeEditorialText(String(repo.description || ""));
      if (!fullName || !isValidHttpUrl(htmlUrl) || desc.length < 10) continue;
      if (repo.fork || repo.archived) continue;
      const repoName = fullName.split("/")[1] || fullName;
      const stars = Number(repo.stargazers_count || 0);
      const starsFmt = stars >= 1000 ? `${(stars / 1000).toFixed(1)}k` : String(stars);
      const topics = Array.isArray(repo.topics)
        ? repo.topics.map((t) => String(t)).slice(0, 5)
        : [];
      const mech = classifyMechanism(`${repoName} ${desc} ${topics.join(" ")}`, "github_trending", "stars");

      const b: BuilderSignal = {
        id: `builder-conduit-gh-${quickHash(fullName)}`,
        name: repoName,
        slug: slugifyAscii(`gh-${repoName}-${quickHash(fullName).slice(0, 5)}`),
        source: "github_trending",
        sourceLabel: "GitHub",
        url: htmlUrl,
        discussionUrl:
          typeof repo.homepage === "string" && isValidHttpUrl(repo.homepage)
            ? repo.homepage
            : htmlUrl,
        taglineEn: desc.slice(0, 200),
        taglineKo: desc.slice(0, 200),
        summaryKo: `${repoName}: ${desc.slice(0, 180)}`,
        painPointKo: `GitHub에서 ★${starsFmt} 스타를 모으고 있는 최신 오픈소스(${fullName})입니다.`,
        tractionLabel: `GitHub ★${starsFmt}`,
        tractionValue: Math.min(40000, stars * 5),
        tractionType: "stars",
        mrrUsd: null,
        mechanism: mech,
        mechanismLabel: MECHANISM_MAP[mech].label,
        tags: ["github", "open-source", ...topics].slice(0, 6),
        publishedAt: String(repo.created_at || nowIso),
        fetchedAt: nowIso,
        verifiedRevenue: false,
        demoVideoUrl: null,
        previewImageUrl: null,
        mediaSourceLabel: null,
      };
      b.techDigestKo = buildTechDigestKo(b, mech);
      out.push(b);
    }
    return out;
  } catch {
    return [];
  }
}

async function fetchRedditConduit(cursor: number): Promise<BuilderSignal[]> {
  try {
    const sub = REDDIT_ROTATION[cursor % REDDIT_ROTATION.length];
    const sort = cursor % 2 === 0 ? "hot" : "top";
    const url = `https://www.reddit.com/r/${sub}/${sort}.json?limit=15&t=month`;
    const res = await fetch(url, {
      headers: { "User-Agent": REDDIT_UA, Accept: "application/json" },
      signal: AbortSignal.timeout(6000),
    });
    if (!res.ok) return [];
    const data = (await res.json()) as {
      data?: { children?: Array<{ data?: Record<string, unknown> }> };
    };
    const nowIso = new Date().toISOString();
    const out: BuilderSignal[] = [];

    for (const child of data.data?.children || []) {
      const p = child?.data;
      if (!p || p.stickied || p.over_18 || !p.title) continue;
      const ups = Number(p.ups || p.score || 0);
      if (ups < 10) continue;
      const discussionUrl = `https://www.reddit.com${String(p.permalink || "")}`;
      const dest = String(p.url_overridden_by_dest || "");
      const externalUrl =
        isValidHttpUrl(dest) && !/i\.redd\.it|v\.redd\.it|reddit\.com\/gallery/i.test(dest)
          ? dest
          : discussionUrl;
      if (!isValidHttpUrl(externalUrl)) continue;

      const rawTitle = sanitizeEditorialText(String(p.title || ""));
      if (rawTitle.length < 6) continue;
      const split = rawTitle.split(/\s+[–—:-]\s+|\s*\|\s*/);
      const name =
        split.length >= 2 && split[0].length <= 36
          ? split[0].trim()
          : rawTitle.split(/\s+/).slice(0, 4).join(" ");
      const mech = classifyMechanism(rawTitle, "reddit", "upvotes");

      const b: BuilderSignal = {
        id: `builder-conduit-rd-${String(p.id || quickHash(externalUrl))}`,
        name: name.slice(0, 48),
        slug: slugifyAscii(`rd-${sub}-${String(p.id || quickHash(externalUrl))}`),
        source: "reddit",
        sourceLabel: `r/${sub}`,
        url: externalUrl,
        discussionUrl,
        taglineEn: rawTitle.slice(0, 200),
        taglineKo: rawTitle.slice(0, 200),
        summaryKo: `${name}: ${rawTitle.slice(0, 180)}`,
        painPointKo: `Reddit r/${sub}에서 추천 ${ups}개를 받은 커뮤니티 프로젝트입니다.`,
        tractionLabel: `r/${sub} ▲${ups}`,
        tractionValue: ups * 8,
        tractionType: "upvotes",
        mrrUsd: null,
        mechanism: mech,
        mechanismLabel: MECHANISM_MAP[mech].label,
        tags: ["reddit", sub.toLowerCase()],
        publishedAt:
          typeof p.created_utc === "number"
            ? new Date(p.created_utc * 1000).toISOString()
            : nowIso,
        fetchedAt: nowIso,
        verifiedRevenue: false,
        demoVideoUrl: null,
        previewImageUrl: null,
        mediaSourceLabel: null,
      };
      b.techDigestKo = buildTechDigestKo(b, mech);
      out.push(b);
      if (out.length >= 10) break;
    }
    return out;
  } catch {
    return [];
  }
}

async function fetchCultureConduit(cursor: number): Promise<CultureSignal[]> {
  const feed = CULTURE_RSS_ROTATION[cursor % CULTURE_RSS_ROTATION.length];
  try {
    const res = await fetch(feed.url, {
      headers: {
        "User-Agent": UA,
        Accept: "application/rss+xml,application/atom+xml,application/xml,text/xml",
      },
      signal: AbortSignal.timeout(6000),
    });
    if (!res.ok) return [];
    const xml = await res.text();
    const isAtom = /<entry[\s>]/i.test(xml) && !/<item[\s>]/i.test(xml);
    const blocks = isAtom
      ? xml.match(/<entry[\s>][\s\S]*?<\/entry>/gi) || []
      : xml.match(/<item[\s>][\s\S]*?<\/item>/gi) || [];

    const nowIso = new Date().toISOString();
    const out: CultureSignal[] = [];

    for (const block of blocks.slice(0, 10)) {
      const titleM = block.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
      const titleEn = sanitizeEditorialText(stripXmlTags(titleM ? titleM[1] : ""));
      if (!titleEn || titleEn.length < 6) continue;

      let link = "";
      if (isAtom) {
        const altM =
          block.match(/<link[^>]+rel=["']alternate["'][^>]+href=["']([^"']+)["']/i) ||
          block.match(/<link[^>]+href=["']([^"']+)["']/i);
        link = altM ? altM[1].trim() : "";
      } else {
        const linkM = block.match(/<link[^>]*>([\s\S]*?)<\/link>/i);
        link = stripXmlTags(linkM ? linkM[1] : "");
      }
      if (!isValidHttpUrl(link)) continue;

      const descM =
        block.match(/<description[^>]*>([\s\S]*?)<\/description>/i) ||
        block.match(/<summary[^>]*>([\s\S]*?)<\/summary>/i);
      const excerpt = sanitizeEditorialText(stripXmlTags(descM ? descM[1] : "") || titleEn).slice(
        0,
        200
      );

      const mediaM =
        block.match(/<media:(?:content|thumbnail)[^>]+url=["']([^"']+)["']/i) ||
        block.match(/<img[^>]+src=["']([^"']+)["']/i);
      const rawImg = mediaM ? mediaM[1].trim() : "";
      const previewImageUrl =
        isValidHttpUrl(rawImg) && !/\.svg(\?|$)|pixel|1x1/i.test(rawImg) ? rawImg : null;

      let sourceDomain = "";
      try {
        sourceDomain = new URL(link).hostname.replace(/^www\./, "");
      } catch {
        sourceDomain = new URL(feed.url).hostname.replace(/^www\./, "");
      }

      out.push({
        id: `culture-conduit-${feed.id}-${quickHash(link)}`,
        titleEn,
        titleKo: titleEn,
        sourceId: feed.id,
        sourceName: feed.name,
        sourceDomain,
        cultureVertical: feed.vertical,
        cultureVerticalLabel: feed.verticalLabel,
        domainSlug: feed.domainSlug,
        canonicalUrl: link,
        publishedAt: nowIso,
        fetchedAt: nowIso,
        excerptEn: excerpt,
        phenomenonKo: excerpt,
        whyTrendingKo: feed.whyKo,
        previewImageUrl,
        tags: [feed.vertical, feed.id, "live-conduit"],
      });
    }
    return out;
  } catch {
    return [];
  }
}

export async function GET(request: NextRequest) {
  const rawCursor = Number(request.nextUrl.searchParams.get("cursor") || "0");
  const cursor = Number.isFinite(rawCursor) && rawCursor >= 0 ? Math.floor(rawCursor) : 0;
  const hnPage = (cursor % 6) + 1;

  const [hnBuilders, ghBuilders, rdBuilders, freshCultures] = await Promise.all([
    fetchShowHnPage(hnPage),
    fetchGithubConduit(cursor),
    fetchRedditConduit(cursor),
    fetchCultureConduit(cursor),
  ]);

  const seenUrl = new Set<string>();
  const builders: BuilderSignal[] = [];
  for (const b of [...ghBuilders, ...hnBuilders, ...rdBuilders]) {
    const key = b.url.toLowerCase().replace(/\/+$/, "");
    if (!seenUrl.has(key)) {
      seenUrl.add(key);
      builders.push(b);
    }
  }

  return NextResponse.json({
    cursor,
    nextCursor: cursor + 1,
    fetchedAt: new Date().toISOString(),
    counts: {
      builders: builders.length,
      cultures: freshCultures.length,
    },
    builders,
    cultures: freshCultures,
  });
}
