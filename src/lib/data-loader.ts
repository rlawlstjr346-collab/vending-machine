import fs from "node:fs";
import path from "node:path";
import type {
  AiRadarSignal,
  BuilderSignal,
  CultureSignal,
  SyncMeta,
  Treatment,
} from "./types";

export { getSiteUrl } from "./site-url";

const DATA_DIR = path.join(process.cwd(), "public", "data");

function readJsonSafe<T>(filename: string, fallback: T): T {
  const fullPath = path.join(DATA_DIR, filename);
  try {
    if (!fs.existsSync(fullPath)) return fallback;
    const raw = fs.readFileSync(fullPath, "utf-8");
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function loadBuilderSignals(): BuilderSignal[] {
  const payload = readJsonSafe<{ items?: BuilderSignal[] }>("builder-signals.json", {});
  return Array.isArray(payload.items) ? payload.items : [];
}

export function loadAiRadarSignals(): AiRadarSignal[] {
  const payload = readJsonSafe<{ items?: AiRadarSignal[] }>("ai-radar-signals.json", {});
  return Array.isArray(payload.items) ? payload.items : [];
}

export function loadCultureSignals(): CultureSignal[] {
  const payload = readJsonSafe<{ items?: CultureSignal[] }>("culture-signals.json", {});
  return Array.isArray(payload.items) ? payload.items : [];
}

export function loadSeedTreatments(): Treatment[] {
  const payload = readJsonSafe<{ items?: Treatment[] }>("treatments-seed.json", {});
  return Array.isArray(payload.items) ? payload.items : [];
}

export function loadSyncMeta(): SyncMeta {
  return readJsonSafe<SyncMeta>("sync-meta.json", {
    syncedAt: new Date().toISOString(),
    counts: {
      aiRadar: 0,
      cultureTotal: 0,
      cultureDomains: 0,
      builderTotal: 0,
      bySource: {},
      cultureBySource: {},
      verifiedRevenueCount: 0,
      verifiedMediaCount: 0,
      verifiedCultureMediaCount: 0,
      treatmentsSeed: 0,
      treatmentsByTrack: { tech: 0, culture: 0 },
    },
    sources: [],
  });
}
