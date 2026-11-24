"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  createEmptyDeckMemory,
  drawNextDynamicCard,
  loadDeckMemory,
  mergeUniqueBuilders,
  mergeUniqueCultures,
  mergeUniqueRadars,
  saveDeckMemory,
  type DispenserDeckMemory,
} from "@/lib/dispenser-deck";
import { inferDomainSlugForPair, synthesizeTreatment } from "@/lib/synthesis-engine";
import type {
  AiRadarSignal,
  BuilderSignal,
  CultureSignal,
  SyncMeta,
  Treatment,
} from "@/lib/types";
import { DispenserLogo } from "./Icons";
import { TreatmentModal } from "./TreatmentModal";
import { VisualBlueprintCard } from "./VisualBlueprintCard";

interface WorkbenchClientProps {
  /** Used ONLY for explicit `/?treatment=<id>` deep-link lookup, never played sequentially on `/`. */
  initialTreatments: Treatment[];
  initialBuilders: BuilderSignal[];
  initialRadars: AiRadarSignal[];
  initialCultures?: CultureSignal[];
  initialSyncMeta: SyncMeta;
}

/**
 * Deterministic SSR-only first paint card so hydration matches 100%,
 * immediately replaced on client mount with a true crypto-random N x M card.
 */
function buildDeterministicSsrCard(
  builders: BuilderSignal[],
  radars: AiRadarSignal[],
  cultures: CultureSignal[]
): Treatment | null {
  const b = builders[0];
  const r = radars[0];
  if (!b || !r) return null;
  return synthesizeTreatment({
    builder: b,
    radar: r,
    culture: cultures[0] || null,
    track: "tech",
    domainSlug: inferDomainSlugForPair(b, r),
    variantIndex: 0,
  });
}

export function WorkbenchClient({
  initialTreatments,
  initialBuilders,
  initialRadars,
  initialCultures = [],
  initialSyncMeta,
}: WorkbenchClientProps) {
  const searchParams = useSearchParams();
  const requestedTreatmentId = searchParams.get("treatment");

  const [builders, setBuilders] = useState<BuilderSignal[]>(initialBuilders);
  const [radars, setRadars] = useState<AiRadarSignal[]>(initialRadars);
  const [cultures, setCultures] = useState<CultureSignal[]>(initialCultures);
  const [syncedAt, setSyncedAt] = useState<string>(initialSyncMeta.syncedAt);

  const buildersRef = useRef<BuilderSignal[]>(initialBuilders);
  const radarsRef = useRef<AiRadarSignal[]>(initialRadars);
  const culturesRef = useRef<CultureSignal[]>(initialCultures);
  const memoryRef = useRef<DispenserDeckMemory>(createEmptyDeckMemory());
  const drawCountRef = useRef<number>(0);
  const conduitCursorRef = useRef<number>(0);
  const conduitInFlightRef = useRef<boolean>(false);

  const [deck, setDeck] = useState<Treatment[]>(() => {
    if (requestedTreatmentId) {
      const found = initialTreatments.find((t) => t.id === requestedTreatmentId);
      if (found) return [found];
    }
    const ssrCard = buildDeterministicSsrCard(initialBuilders, initialRadars, initialCultures);
    return ssrCard ? [ssrCard] : initialTreatments.slice(0, 1);
  });

  const [deckIndex, setDeckIndex] = useState<number>(0);
  const [modalTreatment, setModalTreatment] = useState<Treatment | null>(() => {
    if (requestedTreatmentId) {
      const found = initialTreatments.find((t) => t.id === requestedTreatmentId);
      if (found) return found;
    }
    return null;
  });

  const lastWheelAtRef = useRef<number>(0);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    buildersRef.current = builders;
  }, [builders]);

  useEffect(() => {
    radarsRef.current = radars;
  }, [radars]);

  useEffect(() => {
    culturesRef.current = cultures;
  }, [cultures]);

  // Background pool expansion via /api/live-conduit as user explores deeper
  const triggerLiveConduit = useCallback(() => {
    if (conduitInFlightRef.current) return;
    conduitInFlightRef.current = true;
    const cursor = conduitCursorRef.current;
    conduitCursorRef.current += 1;

    fetch(`/api/live-conduit?cursor=${cursor}`)
      .then((res) => (res.ok ? res.json() : null))
      .then(
        (
          data: {
            builders?: BuilderSignal[];
            cultures?: CultureSignal[];
          } | null
        ) => {
          if (!data) return;
          if (Array.isArray(data.builders) && data.builders.length > 0) {
            setBuilders((prev) => {
              const merged = mergeUniqueBuilders(prev, data.builders || []);
              buildersRef.current = merged;
              return merged;
            });
          }
          if (Array.isArray(data.cultures) && data.cultures.length > 0) {
            setCultures((prev) => {
              const merged = mergeUniqueCultures(prev, data.cultures || []);
              culturesRef.current = merged;
              return merged;
            });
          }
        }
      )
      .catch(() => {})
      .finally(() => {
        conduitInFlightRef.current = false;
      });
  }, []);

  // On client mount: load sliding-cooldown memory & immediately dispense a fresh crypto-random N x M card
  useEffect(() => {
    const loadedMemory = loadDeckMemory();
    memoryRef.current = loadedMemory;

    if (!requestedTreatmentId && buildersRef.current.length > 0) {
      const drawn = drawNextDynamicCard({
        builders: buildersRef.current,
        radars: radarsRef.current,
        cultures: culturesRef.current,
        memory: loadedMemory,
      });
      memoryRef.current = drawn.memory;
      saveDeckMemory(drawn.memory);
      drawCountRef.current = 1;
      setDeck([drawn.treatment]);
      setDeckIndex(0);
    }
  }, [requestedTreatmentId]);

  // Silent live-sync refresh on mount (3-min revalidated AI Radar + Show HN auto-absorption)
  useEffect(() => {
    let active = true;
    fetch("/api/live-sync")
      .then((res) => (res.ok ? res.json() : null))
      .then(
        (
          data: {
            syncedAt?: string;
            builders?: BuilderSignal[];
            aiRadars?: AiRadarSignal[];
            cultures?: CultureSignal[];
          } | null
        ) => {
          if (!active || !data) return;
          if (Array.isArray(data.builders) && data.builders.length > 0) {
            setBuilders((prev) => {
              const merged = mergeUniqueBuilders(prev, data.builders || []);
              buildersRef.current = merged;
              return merged;
            });
          }
          if (Array.isArray(data.aiRadars) && data.aiRadars.length > 0) {
            setRadars((prev) => {
              const merged = mergeUniqueRadars(prev, data.aiRadars || []);
              radarsRef.current = merged;
              return merged;
            });
          }
          if (Array.isArray(data.cultures) && data.cultures.length > 0) {
            setCultures((prev) => {
              const merged = mergeUniqueCultures(prev, data.cultures || []);
              culturesRef.current = merged;
              return merged;
            });
          }
          if (data.syncedAt) setSyncedAt(data.syncedAt);
        }
      )
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  const currentTreatment = deck[deckIndex] || deck[0];

  const drawFreshCard = useCallback((): Treatment => {
    const drawn = drawNextDynamicCard({
      builders: buildersRef.current,
      radars: radarsRef.current,
      cultures: culturesRef.current,
      memory: memoryRef.current,
    });
    memoryRef.current = drawn.memory;
    saveDeckMemory(drawn.memory);
    drawCountRef.current += 1;

    // Stream fresh external builders & culture signals in background every 6 flips
    if (drawCountRef.current % 6 === 0) {
      triggerLiveConduit();
    }
    return drawn.treatment;
  }, [triggerLiveConduit]);

  const handleNextCard = useCallback(() => {
    setDeck((prevDeck) => {
      if (deckIndex + 1 < prevDeck.length) {
        setDeckIndex(deckIndex + 1);
        return prevDeck;
      }
      const fresh = drawFreshCard();
      setDeckIndex(prevDeck.length);
      return [...prevDeck, fresh];
    });
  }, [deckIndex, drawFreshCard]);

  const handlePrevCard = useCallback(() => {
    setDeckIndex((idx) => (idx > 0 ? idx - 1 : 0));
  }, []);

  const handleShuffleDeck = useCallback(() => {
    const fresh = drawFreshCard();
    setDeck([fresh]);
    setDeckIndex(0);
    setModalTreatment(null);
  }, [drawFreshCard]);

  // Keyboard navigation: Space / ArrowRight / ArrowDown -> Next, ArrowLeft / ArrowUp -> Prev
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (modalTreatment) return;
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName?.toUpperCase();
      if (tag === "INPUT" || tag === "TEXTAREA" || target?.isContentEditable) return;

      if (e.key === " " || e.key === "ArrowDown" || e.key === "ArrowRight") {
        e.preventDefault();
        handleNextCard();
      } else if (e.key === "ArrowUp" || e.key === "ArrowLeft") {
        e.preventDefault();
        handlePrevCard();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [modalTreatment, handleNextCard, handlePrevCard]);

  // Stage Wheel navigation (debounced 320ms)
  const handleStageWheel = (e: React.WheelEvent<HTMLElement>) => {
    if (modalTreatment) return;
    if (Math.abs(e.deltaY) < 28) return;
    const now = Date.now();
    if (now - lastWheelAtRef.current < 320) return;
    lastWheelAtRef.current = now;

    if (e.deltaY > 0) handleNextCard();
    else handlePrevCard();
  };

  // Mobile Touch Swipe navigation
  const handleTouchStart = (e: React.TouchEvent<HTMLElement>) => {
    if (modalTreatment) return;
    const t = e.touches[0];
    if (!t) return;
    touchStartRef.current = { x: t.clientX, y: t.clientY };
  };

  const handleTouchEnd = (e: React.TouchEvent<HTMLElement>) => {
    if (modalTreatment) return;
    const start = touchStartRef.current;
    touchStartRef.current = null;
    const t = e.changedTouches[0];
    if (!start || !t) return;

    const dx = t.clientX - start.x;
    const dy = t.clientY - start.y;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 50) return;

    if (Math.abs(dx) >= Math.abs(dy)) {
      if (dx < 0) handleNextCard();
      else handlePrevCard();
    } else {
      if (dy < 0) handleNextCard();
      else handlePrevCard();
    }
  };

  const syncLabel = (() => {
    const d = new Date(syncedAt);
    if (Number.isNaN(d.getTime())) return "";
    return `${d.getMonth() + 1}.${d.getDate()} ${String(d.getHours()).padStart(2, "0")}:${String(
      d.getMinutes()
    ).padStart(2, "0")}`;
  })();

  return (
    <div className="flex min-h-screen flex-col bg-[#F7F8FA] text-[#0F172A]">
      <main
        onWheel={handleStageWheel}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        className="flex flex-1 flex-col items-center justify-center px-3 py-[clamp(1.25rem,2vh,2.5rem)] sm:px-6"
      >
        {/* Minimal Stage Top Corners: Scales proportionally across FHD & 4K */}
        <div className="mx-auto mb-[clamp(1rem,1.4vh,1.75rem)] flex w-[min(88vw,2040px)] flex-wrap items-center justify-between gap-3 px-1">
          <button
            type="button"
            onClick={handleShuffleDeck}
            aria-label="DISPENSER 새 랜덤 조합 뽑기"
            className="cursor-pointer"
          >
            <DispenserLogo />
          </button>

          <div className="flex flex-wrap items-center gap-x-3.5 gap-y-1 text-[clamp(0.82rem,0.72vw,1.02rem)] font-medium text-[#64748B]">
            <span className="tnum inline-flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-[#10B981]" aria-hidden="true" />
              <span>
                실시간 동기화 · 기술 {builders.length} · AI {radars.length} · 컬처 {cultures.length}
                {syncLabel ? ` (${syncLabel})` : ""}
              </span>
            </span>
            <span className="hidden text-[#CBD5E1] sm:inline" aria-hidden="true">
              |
            </span>
            <span className="font-semibold text-[#475569]">Space · 다음 아이디어</span>
          </div>
        </div>

        {/* Single Large-Scale Fluid Editorial Card */}
        {currentTreatment && (
          <VisualBlueprintCard
            treatment={currentTreatment}
            cardPosition={deckIndex + 1}
            canGoPrev={deckIndex > 0}
            onPrev={handlePrevCard}
            onNext={handleNextCard}
            onOpenDetail={() => setModalTreatment(currentTreatment)}
          />
        )}
      </main>

      {/* Centered Proportional Detail Spec & Highlighted Coding Prompt Popup Modal */}
      <TreatmentModal
        treatment={modalTreatment}
        onClose={() => setModalTreatment(null)}
      />
    </div>
  );
}
