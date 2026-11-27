"use client";

import dynamic from "next/dynamic";
import { Suspense, useEffect, useState } from "react";
import { emptySyncMeta, itemsOf } from "@/lib/data-payload";
import type { AiRadarSignal, BuilderSignal, CultureSignal, SyncMeta, Treatment } from "@/lib/types";
import { DispenserFallback } from "./DispenserFallback";

/**
 * The workbench is browser-only: instead of the Worker serializing ~1.3 MB of signals into
 * every HTML response, the browser reads the same public/data/*.json files straight from the
 * static assets CDN (zero Worker CPU).
 */
const WorkbenchClient = dynamic(() => import("./WorkbenchClient").then((mod) => mod.WorkbenchClient), {
  ssr: false,
  loading: () => <DispenserFallback />,
});

interface WorkbenchData {
  initialTreatments: Treatment[];
  initialBuilders: BuilderSignal[];
  initialRadars: AiRadarSignal[];
  initialCultures: CultureSignal[];
  initialSyncMeta: SyncMeta;
}

// Same contract as the server readJsonSafe: a missing/broken file falls back instead of failing.
function readJson<T>(file: string): Promise<T | null> {
  return fetch(`/data/${file}`)
    .then((res) => (res.ok ? (res.json() as Promise<T>) : null))
    .catch(() => null);
}

async function loadWorkbenchData(): Promise<WorkbenchData> {
  const [treatments, builders, radars, cultures, syncMeta] = await Promise.all([
    readJson<{ items?: Treatment[] }>("treatments-seed.json"),
    readJson<{ items?: BuilderSignal[] }>("builder-signals.json"),
    readJson<{ items?: AiRadarSignal[] }>("ai-radar-signals.json"),
    readJson<{ items?: CultureSignal[] }>("culture-signals.json"),
    readJson<SyncMeta>("sync-meta.json"),
  ]);
  return {
    initialTreatments: itemsOf(treatments),
    initialBuilders: itemsOf(builders),
    initialRadars: itemsOf(radars),
    initialCultures: itemsOf(cultures),
    initialSyncMeta: syncMeta ?? emptySyncMeta(),
  };
}

export function WorkbenchLoader() {
  const [data, setData] = useState<WorkbenchData | null>(null);

  useEffect(() => {
    let alive = true;
    void import("./WorkbenchClient");
    loadWorkbenchData().then((next) => alive && setData(next));
    return () => {
      alive = false;
    };
  }, []);

  if (!data) return <DispenserFallback />;
  return (
    <Suspense fallback={<DispenserFallback />}>
      <WorkbenchClient {...data} />
    </Suspense>
  );
}
