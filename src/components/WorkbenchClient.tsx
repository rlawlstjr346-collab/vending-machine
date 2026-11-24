"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { DOMAIN_LIST, MECHANISM_LIST } from "@/lib/domains";
import {
  matchAiRadarFor,
  matchCultureFor,
  synthesizeTreatment,
} from "@/lib/synthesis-engine";
import type {
  AiRadarSignal,
  BuilderSignal,
  CultureSignal,
  DomainSlug,
  MechanismId,
  SyncMeta,
  Treatment,
  TreatmentTrack,
} from "@/lib/types";
import { DispenserLogo } from "./Icons";
import { TreatmentModal } from "./TreatmentModal";
import { VisualBlueprintCard } from "./VisualBlueprintCard";

interface WorkbenchClientProps {
  initialTreatments: Treatment[];
  initialBuilders: BuilderSignal[];
  initialRadars: AiRadarSignal[];
  initialCultures?: CultureSignal[];
  initialSyncMeta: SyncMeta;
}

/**
 * Strictly 1:1 interleaved deck (tech -> culture -> tech -> culture)
 * while keeping SSR hydration 100% deterministic.
 */
function buildInterleavedDeck(items: Treatment[], salt = 0): Treatment[] {
  if (items.length <= 1) return [...items];

  const techItems = items.filter((t) => t.track !== "culture");
  const cultureItems = items.filter((t) => t.track === "culture");

  if (techItems.length === 0 || cultureItems.length === 0) {
    const offset = Math.abs(salt) % items.length;
    return [...items.slice(offset), ...items.slice(0, offset)];
  }

  const tOff = Math.abs(salt) % techItems.length;
  const cOff = Math.abs(salt) % cultureItems.length;
  const rotTech = [...techItems.slice(tOff), ...techItems.slice(0, tOff)];
  const rotCulture = [...cultureItems.slice(cOff), ...cultureItems.slice(0, cOff)];

  const ordered: Treatment[] = [];
  const startWithCulture = salt % 2 === 1;
  const maxLen = Math.max(rotTech.length, rotCulture.length);
  for (let i = 0; i < maxLen; i += 1) {
    if (startWithCulture) {
      if (i < rotCulture.length) ordered.push(rotCulture[i]);
      if (i < rotTech.length) ordered.push(rotTech[i]);
    } else {
      if (i < rotTech.length) ordered.push(rotTech[i]);
      if (i < rotCulture.length) ordered.push(rotCulture[i]);
    }
  }
  return ordered;
}

export function WorkbenchClient({
  initialTreatments,
  initialBuilders,
  initialRadars,
  initialCultures = [],
  initialSyncMeta,
}: WorkbenchClientProps) {
  const searchParams = useSearchParams();
  const [builders, setBuilders] = useState<BuilderSignal[]>(initialBuilders);
  const [radars, setRadars] = useState<AiRadarSignal[]>(initialRadars);
  const [cultures, setCultures] = useState<CultureSignal[]>(initialCultures);
  const [syncedAt, setSyncedAt] = useState<string>(initialSyncMeta.syncedAt);

  const [deck, setDeck] = useState<Treatment[]>(() => {
    const base = buildInterleavedDeck(initialTreatments, 0);
    const reqId = searchParams.get("treatment");
    if (reqId) {
      const found = initialTreatments.find((t) => t.id === reqId);
      if (found) {
        return [found, ...base.filter((item) => item.id !== found.id)];
      }
    }
    return base;
  });

  const [deckIndex, setDeckIndex] = useState<number>(0);
  const [modalTreatment, setModalTreatment] = useState<Treatment | null>(() => {
    const reqId = searchParams.get("treatment");
    if (reqId) {
      const found = initialTreatments.find((t) => t.id === reqId);
      if (found) return found;
    }
    return null;
  });

  const synthCursorRef = useRef<number>(initialTreatments.length + 1);
  const lastWheelAtRef = useRef<number>(0);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

  // Silent live-sync refresh on mount so collected counts & pool stay fresh
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
            setBuilders(data.builders);
          }
          if (Array.isArray(data.aiRadars) && data.aiRadars.length > 0) {
            setRadars(data.aiRadars);
          }
          if (Array.isArray(data.cultures) && data.cultures.length > 0) {
            setCultures(data.cultures);
          }
          if (data.syncedAt) setSyncedAt(data.syncedAt);
        }
      )
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  const currentTreatment = deck[deckIndex] || deck[0] || initialTreatments[0];

  /**
   * Infinite runtime synthesis strictly alternating 1:1 (tech <-> culture)
   * across AI Radar and Global Culture signals even after hundreds of Space presses.
   */
  const synthesizeInfiniteCard = useCallback(
    (existingDeck: Treatment[], prevCard?: Treatment | null): Treatment => {
      const seenIds = new Set(existingDeck.map((t) => t.id));
      const prevDom = prevCard?.domainSlug;
      const prevMech = prevCard?.sampleA.mechanism;
      const nextTrack: TreatmentTrack =
        cultures.length > 0 && prevCard?.track !== "culture" ? "culture" : "tech";

      for (let attempt = 0; attempt < 24; attempt += 1) {
        const step = synthCursorRef.current;
        synthCursorRef.current += 1;

        const domPool = DOMAIN_LIST.filter((d) => d.slug !== prevDom);
        const domainSlug: DomainSlug =
          domPool[step % domPool.length]?.slug || DOMAIN_LIST[step % DOMAIN_LIST.length].slug;

        const mechPool = MECHANISM_LIST.filter((m) => m.id !== prevMech);
        const targetMech: MechanismId =
          mechPool[step % mechPool.length]?.id || MECHANISM_LIST[step % MECHANISM_LIST.length].id;

        const builder = builders[(step * 11 + attempt * 5) % builders.length] || builders[0];
        const radar = matchAiRadarFor(builder, domainSlug, radars, step + attempt);
        const culture =
          nextTrack === "culture"
            ? matchCultureFor(builder, domainSlug, cultures, step + attempt)
            : null;

        const candidate = synthesizeTreatment({
          builder,
          radar,
          culture,
          track: culture ? "culture" : "tech",
          domainSlug: culture ? culture.domainSlug : domainSlug,
          variantIndex: step,
          mechanismOverride: targetMech,
        });

        if (!seenIds.has(candidate.id)) return candidate;
      }

      const step = synthCursorRef.current++;
      const fallbackDomain = DOMAIN_LIST[step % DOMAIN_LIST.length].slug;
      const builder = builders[step % builders.length];
      const radar = matchAiRadarFor(builder, fallbackDomain, radars, step);
      const culture =
        nextTrack === "culture" ? matchCultureFor(builder, fallbackDomain, cultures, step) : null;
      return synthesizeTreatment({
        builder,
        radar,
        culture,
        track: culture ? "culture" : "tech",
        domainSlug: culture ? culture.domainSlug : fallbackDomain,
        variantIndex: step,
      });
    },
    [builders, radars, cultures]
  );

  const handleNextCard = useCallback(() => {
    setDeck((prevDeck) => {
      if (deckIndex + 1 < prevDeck.length) {
        setDeckIndex(deckIndex + 1);
        return prevDeck;
      }
      const fresh = synthesizeInfiniteCard(prevDeck, prevDeck[deckIndex]);
      setDeckIndex(prevDeck.length);
      return [...prevDeck, fresh];
    });
  }, [deckIndex, synthesizeInfiniteCard]);

  const handlePrevCard = useCallback(() => {
    setDeckIndex((idx) => (idx > 0 ? idx - 1 : 0));
  }, []);

  const handleShuffleDeck = useCallback(() => {
    const salt = Math.floor(Math.random() * Math.max(1, initialTreatments.length));
    const freshDeck = buildInterleavedDeck(initialTreatments, salt + synthCursorRef.current++);
    setDeck(freshDeck);
    setDeckIndex(0);
    setModalTreatment(null);
  }, [initialTreatments]);

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
            aria-label="DISPENSER 새 랜덤 순서로 섞기"
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
