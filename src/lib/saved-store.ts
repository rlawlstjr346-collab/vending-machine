import type { Treatment } from "./types";

export const SAVED_STORAGE_KEY = "bench.saved.treatments.v1";

export function encodeSavedParam(ids: string[]): string {
  const unique = Array.from(new Set(ids.map((id) => id.trim()).filter(Boolean)));
  return unique.slice(0, 24).join(",");
}

export function decodeSavedParam(param: string | null | undefined): string[] {
  if (!param) return [];
  return Array.from(
    new Set(
      param
        .split(",")
        .map((part) => part.trim())
        .filter((part) => /^[a-zA-Z0-9_-]{3,80}$/.test(part))
    )
  ).slice(0, 24);
}

export function loadSavedTreatmentsFromStorage(
  storage: Pick<Storage, "getItem"> | null | undefined
): Treatment[] {
  if (!storage) return [];
  try {
    const raw = storage.getItem(SAVED_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item): item is Treatment =>
        Boolean(item && typeof item === "object" && typeof item.id === "string" && typeof item.title === "string")
    );
  } catch {
    return [];
  }
}

export function saveTreatmentsToStorage(
  storage: Pick<Storage, "setItem"> | null | undefined,
  treatments: Treatment[]
): void {
  if (!storage) return;
  try {
    storage.setItem(SAVED_STORAGE_KEY, JSON.stringify(treatments.slice(0, 40)));
  } catch {
    // Ignore quota errors gracefully
  }
}

export function mergeSavedWithSeedIds(
  stored: Treatment[],
  urlIds: string[],
  seedPool: Treatment[]
): Treatment[] {
  const byId = new Map<string, Treatment>();
  for (const t of stored) {
    byId.set(t.id, t);
  }
  const seedMap = new Map(seedPool.map((t) => [t.id, t]));
  for (const id of urlIds) {
    if (!byId.has(id) && seedMap.has(id)) {
      byId.set(id, seedMap.get(id)!);
    }
  }
  return Array.from(byId.values());
}
