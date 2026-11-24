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
    <div className="flex min-h-screen items-center justify-center bg-[#F7F8FA] text-[14px] font-medium text-[#64748B]">
      비주얼 아이디어 덱을 불러오는 중입니다.
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
