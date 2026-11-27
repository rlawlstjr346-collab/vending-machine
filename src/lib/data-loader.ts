import { readPublicJson } from "./publicFile";
import { emptySyncMeta, itemsOf } from "./data-payload";
import type {
  AiRadarSignal,
  BuilderSignal,
  CultureSignal,
  SyncMeta,
  Treatment,
} from "./types";

export { getSiteUrl } from "./site-url";

async function readJsonSafe<T>(filename: string, fallback: T): Promise<T> {
  try {
    return (await readPublicJson<T>(`data/${filename}`)) ?? fallback;
  } catch {
    return fallback;
  }
}

export async function loadBuilderSignals(): Promise<BuilderSignal[]> {
  return itemsOf(await readJsonSafe<{ items?: BuilderSignal[] }>("builder-signals.json", {}));
}

export async function loadAiRadarSignals(): Promise<AiRadarSignal[]> {
  return itemsOf(await readJsonSafe<{ items?: AiRadarSignal[] }>("ai-radar-signals.json", {}));
}

export async function loadCultureSignals(): Promise<CultureSignal[]> {
  return itemsOf(await readJsonSafe<{ items?: CultureSignal[] }>("culture-signals.json", {}));
}

export async function loadSeedTreatments(): Promise<Treatment[]> {
  return itemsOf(await readJsonSafe<{ items?: Treatment[] }>("treatments-seed.json", {}));
}

export async function loadSyncMeta(): Promise<SyncMeta> {
  return readJsonSafe<SyncMeta>("sync-meta.json", emptySyncMeta());
}
