import { inferDomainSlugForPair, synthesizeTreatment } from "./synthesis-engine";
import type {
  AiRadarSignal,
  BuilderSignal,
  CultureSignal,
  Treatment,
  TreatmentTrack,
} from "./types";

export const DECK_MEMORY_KEY = "dispenser_deck_memory_v3";
export const MAX_SEEN_PAIRS = 3000;
export const COOLDOWN_WINDOW = 28;

export interface DispenserDeckMemory {
  seenPairs: string[];
  recentBuilderKeys: string[];
  recentIssueKeys: string[];
  lastTrack: TreatmentTrack | null;
}

export function createEmptyDeckMemory(): DispenserDeckMemory {
  return {
    seenPairs: [],
    recentBuilderKeys: [],
    recentIssueKeys: [],
    lastTrack: null,
  };
}

function normalizeUrlKey(url?: string | null): string {
  if (!url) return "";
  return url.trim().toLowerCase().replace(/\/+$/, "");
}

export function getBuilderCanonicalKey(builder: BuilderSignal): string {
  return normalizeUrlKey(builder.url) || builder.id;
}

export function getIssueCanonicalKey(issue: AiRadarSignal | CultureSignal): string {
  return normalizeUrlKey(issue.canonicalUrl) || issue.id;
}

/**
 * Cryptographically strong uniform random integer in [0, max).
 */
export function cryptoRandomIndex(max: number): number {
  if (max <= 1) return 0;
  const g = globalThis as unknown as {
    crypto?: { getRandomValues?: (arr: Uint32Array) => Uint32Array };
  };
  if (g.crypto && typeof g.crypto.getRandomValues === "function") {
    const limit = Math.floor(0x100000000 / max) * max;
    const buf = new Uint32Array(1);
    for (let i = 0; i < 8; i += 1) {
      g.crypto.getRandomValues(buf);
      if (buf[0] < limit) return buf[0] % max;
    }
    return buf[0] % max;
  }
  return Math.floor(Math.random() * max);
}

export function loadDeckMemory(): DispenserDeckMemory {
  if (typeof window === "undefined") return createEmptyDeckMemory();
  try {
    const raw = window.localStorage.getItem(DECK_MEMORY_KEY);
    if (!raw) return createEmptyDeckMemory();
    const parsed = JSON.parse(raw) as Partial<DispenserDeckMemory>;
    return {
      seenPairs: Array.isArray(parsed.seenPairs)
        ? parsed.seenPairs.filter((s): s is string => typeof s === "string").slice(-MAX_SEEN_PAIRS)
        : [],
      recentBuilderKeys: Array.isArray(parsed.recentBuilderKeys)
        ? parsed.recentBuilderKeys
            .filter((s): s is string => typeof s === "string")
            .slice(-COOLDOWN_WINDOW)
        : [],
      recentIssueKeys: Array.isArray(parsed.recentIssueKeys)
        ? parsed.recentIssueKeys
            .filter((s): s is string => typeof s === "string")
            .slice(-COOLDOWN_WINDOW)
        : [],
      lastTrack:
        parsed.lastTrack === "tech" || parsed.lastTrack === "culture" ? parsed.lastTrack : null,
    };
  } catch {
    return createEmptyDeckMemory();
  }
}

export function saveDeckMemory(memory: DispenserDeckMemory): void {
  if (typeof window === "undefined") return;
  try {
    const payload: DispenserDeckMemory = {
      seenPairs: memory.seenPairs.slice(-MAX_SEEN_PAIRS),
      recentBuilderKeys: memory.recentBuilderKeys.slice(-COOLDOWN_WINDOW),
      recentIssueKeys: memory.recentIssueKeys.slice(-COOLDOWN_WINDOW),
      lastTrack: memory.lastTrack,
    };
    window.localStorage.setItem(DECK_MEMORY_KEY, JSON.stringify(payload));
  } catch {
    // Ignore quota or privacy-mode storage errors
  }
}

function filterBySlidingCooldown<T>(
  items: T[],
  keyFn: (item: T) => string,
  recentQueue: string[],
  windowSize: number
): T[] {
  if (items.length <= 1) return items;
  // Try full cooldown window first; relax gracefully only when pool itself is smaller than cooldown
  const windows = [windowSize, 20, 12, 6, 2, 0];
  for (const w of windows) {
    if (w > windowSize) continue;
    if (w === 0) return items;
    const blocked = new Set(recentQueue.slice(-w));
    const filtered = items.filter((item) => !blocked.has(keyFn(item)));
    if (filtered.length > 0) return filtered;
  }
  return items;
}

export interface DrawDynamicCardOptions {
  builders: BuilderSignal[];
  radars: AiRadarSignal[];
  cultures: CultureSignal[];
  memory: DispenserDeckMemory;
  forceTrack?: TreatmentTrack;
  randomIndexFn?: (max: number) => number;
}

export interface DrawDynamicCardResult {
  treatment: Treatment;
  memory: DispenserDeckMemory;
  pairKey: string;
  builderKey: string;
  issueKey: string;
  track: TreatmentTrack;
}

/**
 * Draws a brand-new N x M (Builder A x Issue B) combination on demand using
 * cryptographic entropy, strictly alternating 50:50 tech/culture, permanently
 * excluding already-seen (A x B) pairs (up to 3,000), and enforcing a 28-card
 * sliding cooldown on individual builders and issues so re-pairing is unlocked
 * only after cooldown expiry with a completely new partner.
 */
export function drawNextDynamicCard(
  options: DrawDynamicCardOptions
): DrawDynamicCardResult {
  const {
    builders,
    radars,
    cultures,
    memory,
    forceTrack,
    randomIndexFn = cryptoRandomIndex,
  } = options;

  if (builders.length === 0) {
    throw new Error("At least one builder signal is required.");
  }
  if (radars.length === 0 && cultures.length === 0) {
    throw new Error("At least one radar or culture signal is required.");
  }

  let nextTrack: TreatmentTrack;
  if (forceTrack === "culture" && cultures.length > 0) {
    nextTrack = "culture";
  } else if (forceTrack === "tech" && radars.length > 0) {
    nextTrack = "tech";
  } else if (cultures.length === 0) {
    nextTrack = "tech";
  } else if (radars.length === 0) {
    nextTrack = "culture";
  } else if (memory.lastTrack === "tech") {
    nextTrack = "culture";
  } else if (memory.lastTrack === "culture") {
    nextTrack = "tech";
  } else {
    nextTrack = randomIndexFn(2) === 0 ? "tech" : "culture";
  }

  const seenPairSet = new Set(memory.seenPairs);

  const eligibleBuilders = filterBySlidingCooldown(
    builders,
    getBuilderCanonicalKey,
    memory.recentBuilderKeys,
    COOLDOWN_WINDOW
  );

  const rawIssues: Array<AiRadarSignal | CultureSignal> =
    nextTrack === "culture" ? cultures : radars;
  const eligibleIssues = filterBySlidingCooldown(
    rawIssues,
    getIssueCanonicalKey,
    memory.recentIssueKeys,
    COOLDOWN_WINDOW
  );

  let chosenBuilder: BuilderSignal | null = null;
  let chosenIssue: AiRadarSignal | CultureSignal | null = null;
  let chosenPairKey = "";

  // 1) High-entropy random probing within cooldown-safe eligible pools
  const maxProbes = Math.min(96, eligibleBuilders.length * eligibleIssues.length + 12);
  for (let i = 0; i < maxProbes; i += 1) {
    const b = eligibleBuilders[randomIndexFn(eligibleBuilders.length)];
    const iss = eligibleIssues[randomIndexFn(eligibleIssues.length)];
    const pKey = `${getBuilderCanonicalKey(b)}::${getIssueCanonicalKey(iss)}`;
    if (!seenPairSet.has(pKey)) {
      chosenBuilder = b;
      chosenIssue = iss;
      chosenPairKey = pKey;
      break;
    }
  }

  // 2) Deterministic random-offset scan over eligible pools if random probes hit seen pairs
  if (!chosenBuilder || !chosenIssue) {
    const bStart = randomIndexFn(eligibleBuilders.length);
    const iStart = randomIndexFn(eligibleIssues.length);
    outer: for (let bi = 0; bi < eligibleBuilders.length; bi += 1) {
      const b = eligibleBuilders[(bStart + bi) % eligibleBuilders.length];
      const bKey = getBuilderCanonicalKey(b);
      for (let ii = 0; ii < eligibleIssues.length; ii += 1) {
        const iss = eligibleIssues[(iStart + ii) % eligibleIssues.length];
        const pKey = `${bKey}::${getIssueCanonicalKey(iss)}`;
        if (!seenPairSet.has(pKey)) {
          chosenBuilder = b;
          chosenIssue = iss;
          chosenPairKey = pKey;
          break outer;
        }
      }
    }
  }

  // 3) Final fallback across full pools (only if every eligible pair has already been seen)
  if (!chosenBuilder || !chosenIssue) {
    chosenBuilder = eligibleBuilders[randomIndexFn(eligibleBuilders.length)] || builders[0];
    chosenIssue = eligibleIssues[randomIndexFn(eligibleIssues.length)] || rawIssues[0];
    chosenPairKey = `${getBuilderCanonicalKey(chosenBuilder)}::${getIssueCanonicalKey(chosenIssue)}`;
  }

  const builderKey = getBuilderCanonicalKey(chosenBuilder);
  const issueKey = getIssueCanonicalKey(chosenIssue);
  const entropyVariant = randomIndexFn(100000);

  const treatment =
    nextTrack === "culture"
      ? synthesizeTreatment({
          builder: chosenBuilder,
          radar: radars[randomIndexFn(Math.max(1, radars.length))] || radars[0],
          culture: chosenIssue as CultureSignal,
          track: "culture",
          domainSlug: (chosenIssue as CultureSignal).domainSlug,
          variantIndex: entropyVariant,
        })
      : synthesizeTreatment({
          builder: chosenBuilder,
          radar: chosenIssue as AiRadarSignal,
          culture: null,
          track: "tech",
          domainSlug: inferDomainSlugForPair(chosenBuilder, chosenIssue as AiRadarSignal),
          variantIndex: entropyVariant,
        });

  const nextMemory: DispenserDeckMemory = {
    seenPairs: [...memory.seenPairs, chosenPairKey].slice(-MAX_SEEN_PAIRS),
    recentBuilderKeys: [...memory.recentBuilderKeys, builderKey].slice(-COOLDOWN_WINDOW),
    recentIssueKeys: [...memory.recentIssueKeys, issueKey].slice(-COOLDOWN_WINDOW),
    lastTrack: nextTrack,
  };

  return {
    treatment,
    memory: nextMemory,
    pairKey: chosenPairKey,
    builderKey,
    issueKey,
    track: nextTrack,
  };
}

/**
 * Deduplicating pool expanders used when /api/live-sync or /api/live-conduit
 * streams fresh external builders, AI Radar signals, or culture signals into memory.
 */
export function mergeUniqueBuilders(
  existing: BuilderSignal[],
  incoming: BuilderSignal[]
): BuilderSignal[] {
  if (!incoming || incoming.length === 0) return existing;
  const seen = new Set(existing.map(getBuilderCanonicalKey));
  const added: BuilderSignal[] = [];
  for (const b of incoming) {
    const key = getBuilderCanonicalKey(b);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    added.push(b);
  }
  return added.length > 0 ? [...existing, ...added] : existing;
}

export function mergeUniqueRadars(
  existing: AiRadarSignal[],
  incoming: AiRadarSignal[]
): AiRadarSignal[] {
  if (!incoming || incoming.length === 0) return existing;
  const byKey = new Map<string, AiRadarSignal>();
  // Incoming fresh signals take precedence (e.g. updated AI Radar entries)
  for (const r of incoming) {
    const key = getIssueCanonicalKey(r);
    if (key && !byKey.has(key)) byKey.set(key, r);
  }
  for (const r of existing) {
    const key = getIssueCanonicalKey(r);
    if (key && !byKey.has(key)) byKey.set(key, r);
  }
  return Array.from(byKey.values());
}

export function mergeUniqueCultures(
  existing: CultureSignal[],
  incoming: CultureSignal[]
): CultureSignal[] {
  if (!incoming || incoming.length === 0) return existing;
  const seen = new Set(existing.map(getIssueCanonicalKey));
  const added: CultureSignal[] = [];
  for (const c of incoming) {
    const key = getIssueCanonicalKey(c);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    added.push(c);
  }
  return added.length > 0 ? [...existing, ...added] : existing;
}
