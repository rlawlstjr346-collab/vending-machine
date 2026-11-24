import React, { Suspense } from "react";
import Link from "next/link";
import {
  loadAiRadarSignals,
  loadBuilderSignals,
  loadCultureSignals,
  loadSeedTreatments,
  loadSyncMeta,
} from "@/lib/data-loader";
import { DISCOVER_HUBS } from "@/lib/seo-keywords";
import { WorkbenchClient } from "@/components/WorkbenchClient";

function DispenserFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F7F8FA] text-[15px] font-medium text-[#64748B]">
      DISPENSER. 기획 카드를 불러오는 중입니다.
    </div>
  );
}

export default function HomePage() {
  const initialTreatments = loadSeedTreatments();
  const initialBuilders = loadBuilderSignals();
  const initialRadars = loadAiRadarSignals();
  const initialCultures = loadCultureSignals();
  const initialSyncMeta = loadSyncMeta();

  return (
    <>
      <Suspense fallback={<DispenserFallback />}>
        <WorkbenchClient
          initialTreatments={initialTreatments}
          initialBuilders={initialBuilders}
          initialRadars={initialRadars}
          initialCultures={initialCultures}
          initialSyncMeta={initialSyncMeta}
        />
      </Suspense>

      {/* Crawler-only semantic internal link graph (zero visible pixels on main UI) */}
      <nav aria-label="관련 기획 주제 및 아카이브" className="sr-only">
        <h2>기획 주제별 아이디어 허브</h2>
        <ul>
          {DISCOVER_HUBS.map((hub) => (
            <li key={hub.slug}>
              <Link href={`/discover/${hub.slug}`}>{hub.titleKo}</Link>
            </li>
          ))}
        </ul>
        <h2>최신 큐레이션 기획안 아카이브</h2>
        <ul>
          {initialTreatments.slice(0, 20).map((t) => (
            <li key={t.id}>
              <Link href={`/treatment/${t.id}`}>{t.title}</Link>
            </li>
          ))}
        </ul>
      </nav>
    </>
  );
}
