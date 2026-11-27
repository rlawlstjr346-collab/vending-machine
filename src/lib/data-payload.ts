import type { SyncMeta } from "./types";

/** `{ items: [...] }` payload -> items (shared by the server loader and the browser loader). */
export function itemsOf<T>(payload: { items?: T[] } | null | undefined): T[] {
  return payload && Array.isArray(payload.items) ? payload.items : [];
}

/** Placeholder meta used when sync-meta.json is missing. */
export function emptySyncMeta(): SyncMeta {
  return {
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
  };
}
