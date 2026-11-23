import React, { Suspense } from "react";
import {
  loadAiRadarSignals,
  loadBuilderSignals,
  loadSeedTreatments,
  loadSyncMeta,
} from "@/lib/data-loader";
import { WorkbenchClient } from "@/components/WorkbenchClient";

function WorkbenchFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#FAFAFA] text-xs font-medium text-[#4B5563]">
      BENCH. 워크벤치를 불러오는 중입니다.
    </div>
  );
}

export default function HomePage() {
  const initialTreatments = loadSeedTreatments();
  const initialBuilders = loadBuilderSignals();
  const initialRadars = loadAiRadarSignals();
  const initialSyncMeta = loadSyncMeta();

  return (
    <Suspense fallback={<WorkbenchFallback />}>
      <WorkbenchClient
        initialTreatments={initialTreatments}
        initialBuilders={initialBuilders}
        initialRadars={initialRadars}
        initialSyncMeta={initialSyncMeta}
      />
    </Suspense>
  );
}
