import React, { Suspense } from "react";
import {
  loadAiRadarSignals,
  loadBuilderSignals,
  loadCultureSignals,
  loadSeedTreatments,
  loadSyncMeta,
} from "@/lib/data-loader";
import { WorkbenchClient } from "@/components/WorkbenchClient";

function DispenserFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F7F8FA] text-[15px] font-medium text-[#64748B]">
      DISPENSER 기획 카드를 불러오는 중입니다.
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
    <Suspense fallback={<DispenserFallback />}>
      <WorkbenchClient
        initialTreatments={initialTreatments}
        initialBuilders={initialBuilders}
        initialRadars={initialRadars}
        initialCultures={initialCultures}
        initialSyncMeta={initialSyncMeta}
      />
    </Suspense>
  );
}
