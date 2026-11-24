import { NextResponse } from "next/server";
import {
  loadAiRadarSignals,
  loadBuilderSignals,
  loadCultureSignals,
  loadSyncMeta,
} from "@/lib/data-loader";
import { MECHANISM_MAP } from "@/lib/domains";
import {
  AI_RADAR_MAX_SIGNALS,
  mergeAndBalanceRadarSignals,
  normalizeAiRadarFeed,
} from "@/lib/radar-adapter";
import { buildTechDigestKo, classifyMechanism } from "@/lib/synthesis-engine";
import { isValidHttpUrl, sanitizeEditorialText, slugifyAscii } from "@/lib/text-clean";
import type { AiRadarSignal, BuilderSignal } from "@/lib/types";

// Reflects remote rlawlstjr346-collab/ai-radar updates within 3 minutes
export const revalidate = 180;

const AI_RADAR_PLANNING_URL =
  "https://raw.githubusercontent.com/rlawlstjr346-collab/ai-radar/main/web/public/data/planning-feed.json";
const AI_RADAR_LIVE_URL =
  "https://raw.githubusercontent.com/rlawlstjr346-collab/ai-radar/main/web/public/live-feed.json";
const SHOW_HN_LIVE_URL =
  "https://hn.algolia.com/api/v1/search_by_date?tags=show_hn&hitsPerPage=20";
const UA =
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

export async function GET() {
  const localRadars = loadAiRadarSignals();
  const localBuilders = loadBuilderSignals();
  const localCultures = loadCultureSignals();
  const syncMeta = loadSyncMeta();

  let mergedRadars: AiRadarSignal[] = mergeAndBalanceRadarSignals(
    localRadars,
    [],
    AI_RADAR_MAX_SIGNALS
  );
  let mergedBuilders: BuilderSignal[] = [...localBuilders];
  let liveRadarFetched = false;
  let liveShowHnAdded = 0;

  try {
    const [planRes, liveRes] = await Promise.all([
      fetch(AI_RADAR_PLANNING_URL, {
        headers: { "User-Agent": UA },
        next: { revalidate: 180 },
        signal: AbortSignal.timeout(8000),
      }),
      fetch(AI_RADAR_LIVE_URL, {
        headers: { "User-Agent": UA },
        next: { revalidate: 180 },
        signal: AbortSignal.timeout(8000),
      }),
    ]);

    const planJson = planRes.ok ? await planRes.json().catch(() => null) : null;
    const liveJson = liveRes.ok ? await liveRes.json().catch(() => null) : null;

    if (planJson || liveJson) {
      const normalized = normalizeAiRadarFeed(
        planJson,
        liveJson,
        localRadars,
        AI_RADAR_MAX_SIGNALS
      );
      if (normalized.length > 0) {
        // Merge remote planning + live signals with preserved local snapshot using
        // the balanced 220-signal per-platform quota selector (zero URL dupes).
        mergedRadars = mergeAndBalanceRadarSignals(
          normalized,
          localRadars,
          AI_RADAR_MAX_SIGNALS
        );
        liveRadarFetched = true;
      }
    }
  } catch {
    // Fall back silently to local synced snapshot
  }

  try {
    const res = await fetch(SHOW_HN_LIVE_URL, {
      headers: { "User-Agent": UA },
      next: { revalidate: 180 },
      signal: AbortSignal.timeout(7000),
    });
    if (res.ok) {
      const data = (await res.json()) as { hits?: Array<Record<string, unknown>> };
      const existingUrls = new Set(
        mergedBuilders.map((b) => b.url.toLowerCase().replace(/\/+$/, ""))
      );
      const fresh: BuilderSignal[] = [];
      const nowIso = new Date().toISOString();

      for (const h of data.hits || []) {
        const url = String(h.url || "").trim();
        if (!isValidHttpUrl(url)) continue;
        const norm = url.toLowerCase().replace(/\/+$/, "");
        if (existingUrls.has(norm)) continue;
        existingUrls.add(norm);

        const rawTitle = sanitizeEditorialText(String(h.title || ""))
          .replace(/^Show\s+HN\s*[:–—-]\s*/i, "")
          .trim();
        if (!rawTitle) continue;
        const parts = rawTitle.split(/\s+[–—-]\s+|\s*:\s+/);
        const name =
          parts.length >= 2 && parts[0].length <= 42
            ? parts[0].trim()
            : rawTitle.split(/\s+/).slice(0, 4).join(" ");
        const tagline = parts.length >= 2 ? parts.slice(1).join(" — ").trim() : rawTitle;
        const points = Number(h.points || 1);
        const comments = Number(h.num_comments || 0);
        const mech = classifyMechanism(`${name} ${tagline}`, "show_hn", "points");

        const item: BuilderSignal = {
          id: `builder-hn-live-${String(h.objectID || slugifyAscii(name))}`,
          name,
          slug: slugifyAscii(`${name}-${String(h.objectID || "live")}`),
          source: "show_hn",
          sourceLabel: "Show HN",
          url,
          discussionUrl: h.objectID
            ? `https://news.ycombinator.com/item?id=${String(h.objectID)}`
            : null,
          taglineEn: tagline,
          taglineKo: tagline,
          summaryKo: `${name}: ${tagline}`,
          painPointKo: "Show HN 실시간 스트림에서 포착된 신규 빌더 런칭 프로젝트입니다.",
          tractionLabel: `HN ${points} pts · 댓글 ${comments}`,
          tractionValue: points * 10 + comments * 3,
          tractionType: "points",
          mrrUsd: null,
          mechanism: mech,
          mechanismLabel: MECHANISM_MAP[mech].label,
          tags: ["show-hn", "live"],
          publishedAt: String(h.created_at || nowIso),
          fetchedAt: nowIso,
          verifiedRevenue: false,
          demoVideoUrl: null,
          previewImageUrl: null,
          mediaSourceLabel: null,
        };
        item.techDigestKo = buildTechDigestKo(item, mech);
        fresh.push(item);
      }
      if (fresh.length > 0) {
        mergedBuilders = [...fresh, ...mergedBuilders];
        liveShowHnAdded = fresh.length;
      }
    }
  } catch {
    // Keep local snapshot
  }

  return NextResponse.json({
    syncedAt: new Date().toISOString(),
    seedSyncedAt: syncMeta.syncedAt,
    liveRadarFetched,
    liveShowHnAdded,
    counts: {
      aiRadar: mergedRadars.length,
      cultures: localCultures.length,
      builders: mergedBuilders.length,
      verifiedMedia: mergedBuilders.filter((b) => b.demoVideoUrl || b.previewImageUrl).length,
    },
    aiRadars: mergedRadars,
    cultures: localCultures,
    builders: mergedBuilders,
  });
}
