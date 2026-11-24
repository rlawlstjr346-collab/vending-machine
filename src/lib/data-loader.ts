import fs from "node:fs";
import path from "node:path";
import type { AiRadarSignal, BuilderSignal, SyncMeta, Treatment } from "./types";

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

export function loadSeedTreatments(): Treatment[] {
  const payload = readJsonSafe<{ items?: Treatment[] }>("treatments-seed.json", {});
  return Array.isArray(payload.items) ? payload.items : [];
}

export function loadSyncMeta(): SyncMeta {
  return readJsonSafe<SyncMeta>("sync-meta.json", {
    syncedAt: new Date().toISOString(),
    counts: {
      aiRadar: 0,
      builderTotal: 0,
      bySource: {},
      verifiedRevenueCount: 0,
      verifiedMediaCount: 0,
      treatmentsSeed: 0,
    },
    sources: [],
  });
}

export function getSiteUrl(): string {
  const raw = process.env.NEXT_PUBLIC_SITE_URL || "https://dispenser-deck.vercel.app";
  return raw.replace(/\/+$/, "");
}
