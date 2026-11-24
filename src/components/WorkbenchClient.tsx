"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { DOMAIN_LIST, DOMAIN_MAP, MECHANISM_LIST, isValidDomainSlug } from "@/lib/domains";
import {
  decodeSavedParam,
  encodeSavedParam,
  loadSavedTreatmentsFromStorage,
  mergeSavedWithSeedIds,
  saveTreatmentsToStorage,
} from "@/lib/saved-store";
import {
  formatShortMetric,
  matchAiRadarFor,
  synthesizeTreatment,
} from "@/lib/synthesis-engine";
import { isXPostUrl } from "@/lib/x-oembed";
import type {
  AiRadarSignal,
  BuilderSignal,
  DomainSlug,
  MechanismId,
  SyncMeta,
  Treatment,
} from "@/lib/types";
import {
  ArrowRightIcon,
  BenchLogo,
  BookmarkIcon,
  ChipIcon,
  RadarIcon,
  RefreshIcon,
  XIcon,
} from "./Icons";
import { TreatmentModal, type ModalSelection } from "./TreatmentModal";
import { VisualBlueprintCard } from "./VisualBlueprintCard";

type DrawerMode = "none" | "ingredients" | "saved";
type IngredientTab = "builders" | "ai-radar";

interface WorkbenchClientProps {
  initialTreatments: Treatment[];
  initialBuilders: BuilderSignal[];
  initialRadars: AiRadarSignal[];
  initialSyncMeta: SyncMeta;
}

/**
 * Deterministic smart interleave so adjacent cards never repeat the same
 * domainSlug or sampleA.mechanism back-to-back (and SSR stays hydration-safe).
 */
function buildSmartDeck(
  items: Treatment[],
  domainFilter: DomainSlug | "all",
  salt = 0
): Treatment[] {
  const filtered =
    domainFilter === "all"
      ? [...items]
      : items.filter((t) => t.domainSlug === domainFilter);

  if (filtered.length <= 1) return filtered;

  // Deterministic rotation using salt so reset/filter gives fresh order
  const offset = Math.abs(salt) % filtered.length;
  const remaining = [...filtered.slice(offset), ...filtered.slice(0, offset)];
  const ordered: Treatment[] = [];

  while (remaining.length > 0) {
    const prev = ordered[ordered.length - 1];
    let pickIdx = 0;

    if (prev) {
      const idealIdx = remaining.findIndex(
        (cand) =>
          cand.domainSlug !== prev.domainSlug &&
          cand.sampleA.mechanism !== prev.sampleA.mechanism
      );
      if (idealIdx >= 0) {
        pickIdx = idealIdx;
      } else {
        const mechDiffIdx = remaining.findIndex(
          (cand) => cand.sampleA.mechanism !== prev.sampleA.mechanism
        );
        if (mechDiffIdx >= 0) {
          pickIdx = mechDiffIdx;
        } else {
          const domDiffIdx = remaining.findIndex(
            (cand) => cand.domainSlug !== prev.domainSlug
          );
          if (domDiffIdx >= 0) pickIdx = domDiffIdx;
        }
      }
    }

    const [picked] = remaining.splice(pickIdx, 1);
    ordered.push(picked);
  }

  return ordered;
}

export function WorkbenchClient({
  initialTreatments,
  initialBuilders,
  initialRadars,
  initialSyncMeta,
}: WorkbenchClientProps) {
  const searchParams = useSearchParams();
  const router = useRouter();

  const initialDomain: DomainSlug | "all" = (() => {
    const d = searchParams.get("domain");
    return d && isValidDomainSlug(d) ? d : "all";
  })();

  const [domainFilter, setDomainFilter] = useState<DomainSlug | "all">(initialDomain);
  const [builders, setBuilders] = useState<BuilderSignal[]>(initialBuilders);
  const [radars, setRadars] = useState<AiRadarSignal[]>(initialRadars);
  const [topicInput, setTopicInput] = useState("");
  const [activeTopic, setActiveTopic] = useState("");
  const [sourceFilter, setSourceFilter] = useState<string>("all");
  const [syncNotice, setSyncNotice] = useState<string>("");
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<string>(initialSyncMeta.syncedAt);

  const [drawerMode, setDrawerMode] = useState<DrawerMode>(() => {
    const t = searchParams.get("tab");
    if (t === "saved") return "saved";
    if (t === "builders" || t === "ai-radar") return "ingredients";
    return "none";
  });

  const [ingredientTab, setIngredientTab] = useState<IngredientTab>(() => {
    return searchParams.get("tab") === "ai-radar" ? "ai-radar" : "builders";
  });

  const [lineageMap, setLineageMap] = useState<Record<string, Treatment>>(() =>
    Object.fromEntries(initialTreatments.map((t) => [t.id, t]))
  );

  // Deck Queue + Cursor Index (History Stack built-in via deck[0..deckIndex])
  const [deck, setDeck] = useState<Treatment[]>(() => {
    const base = buildSmartDeck(initialTreatments, initialDomain, 0);
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

  // Synthesis counter ref so rapid next/wheel never produces duplicate seeds
  const synthCursorRef = useRef<number>(initialTreatments.length + 1);
  const lastWheelAtRef = useRef<number>(0);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

  // Open detail modal only when explicitly requested via button or ?treatment= URL
  const [modalSelection, setModalSelection] = useState<ModalSelection>(() => {
    const reqId = searchParams.get("treatment");
    if (reqId) {
      const found = initialTreatments.find((t) => t.id === reqId);
      if (found) return { type: "treatment", treatment: found };
    }
    return null;
  });

  const [savedTreatments, setSavedTreatments] = useState<Treatment[]>([]);

  useEffect(() => {
    const stored = loadSavedTreatmentsFromStorage(window.localStorage);
    const urlIds = decodeSavedParam(searchParams.get("saved"));
    const merged = mergeSavedWithSeedIds(stored, urlIds, initialTreatments);
    setSavedTreatments(merged);
    if (merged.length > 0) {
      setLineageMap((prev) => {
        const next = { ...prev };
        for (const item of merged) next[item.id] = item;
        return next;
      });
    }
  }, [initialTreatments, searchParams]);

  const savedIdSet = useMemo(
    () => new Set(savedTreatments.map((t) => t.id)),
    [savedTreatments]
  );

  const filteredBuilders = useMemo(() => {
    if (sourceFilter === "all") return builders;
    if (sourceFilter === "verified") return builders.filter((b) => b.verifiedRevenue);
    return builders.filter((b) => b.source === sourceFilter);
  }, [builders, sourceFilter]);

  const currentTreatment = deck[deckIndex] || deck[0] || initialTreatments[0];

  /**
   * Generates a guaranteed-fresh card cycling across all 6 MechanismIds and
   * cross-combining 88 builders x 100 AI Radars x 6 domains with zero duplicates.
   */
  const synthesizeInfiniteCard = useCallback(
    (
      existingDeck: Treatment[],
      targetFilter: DomainSlug | "all",
      topic: string,
      prevCard?: Treatment | null
    ): Treatment => {
      const seenIds = new Set(existingDeck.map((t) => t.id));
      const prevDom = prevCard?.domainSlug;
      const prevMech = prevCard?.sampleA.mechanism;

      for (let attempt = 0; attempt < 24; attempt += 1) {
        const step = synthCursorRef.current;
        synthCursorRef.current += 1;

        let domainSlug: DomainSlug;
        if (targetFilter === "all") {
          const domPool = DOMAIN_LIST.filter((d) => d.slug !== prevDom);
          const pickedDom = domPool[step % domPool.length] || DOMAIN_LIST[step % DOMAIN_LIST.length];
          domainSlug = pickedDom.slug;
        } else {
          domainSlug = targetFilter;
        }

        // Cycle evenly across all 6 MechanismIds so every wireframe archetype appears regularly
        const mechPool = MECHANISM_LIST.filter((m) => m.id !== prevMech);
        const targetMech: MechanismId =
          mechPool[step % mechPool.length]?.id || MECHANISM_LIST[step % MECHANISM_LIST.length].id;

        // Prefer a builder matching targetMech when available, otherwise cross-pollinate with override
        const mechBuilders = builders.filter((b) => b.mechanism === targetMech);
        const builderPool = mechBuilders.length > 0 ? mechBuilders : builders;
        const builder = builderPool[(step * 7 + attempt * 3) % builderPool.length] || builders[0];

        const radar = matchAiRadarFor(builder, domainSlug, radars, step + attempt);
        const candidate = synthesizeTreatment({
          builder,
          radar,
          domainSlug,
          customTopic: topic || null,
          variantIndex: step,
          mechanismOverride: targetMech,
        });

        if (!seenIds.has(candidate.id)) {
          return candidate;
        }
      }

      // Fallback guaranteed unique
      const step = synthCursorRef.current++;
      const fallbackDomain =
        targetFilter === "all" ? DOMAIN_LIST[step % DOMAIN_LIST.length].slug : targetFilter;
      const builder = builders[step % builders.length];
      const radar = matchAiRadarFor(builder, fallbackDomain, radars, step);
      return synthesizeTreatment({
        builder,
        radar,
        domainSlug: fallbackDomain,
        customTopic: topic || null,
        variantIndex: step,
        mechanismOverride: MECHANISM_LIST[step % MECHANISM_LIST.length].id,
      });
    },
    [builders, radars]
  );

  // Push a synthesized / selected treatment immediately as the active card right after current index
  const jumpToCard = useCallback((tr: Treatment, openModalAfter = false) => {
    setLineageMap((prev) => ({ ...prev, [tr.id]: tr }));
    setDeck((prevDeck) => {
      const existingIdx = prevDeck.findIndex((item) => item.id === tr.id);
      if (existingIdx >= 0) {
        setDeckIndex(existingIdx);
        return prevDeck;
      }
      const nextIdx = Math.min(prevDeck.length, deckIndex + 1);
      const nextDeck = [...prevDeck.slice(0, nextIdx), tr, ...prevDeck.slice(nextIdx)];
      setDeckIndex(nextIdx);
      return nextDeck;
    });
    setDrawerMode("none");
    if (openModalAfter) {
      setModalSelection({ type: "treatment", treatment: tr });
    }
  }, [deckIndex]);

  const handleNextCard = useCallback(() => {
    setDeck((prevDeck) => {
      if (deckIndex + 1 < prevDeck.length) {
        setDeckIndex(deckIndex + 1);
        return prevDeck;
      }
      const fresh = synthesizeInfiniteCard(
        prevDeck,
        domainFilter,
        activeTopic,
        prevDeck[deckIndex]
      );
      setLineageMap((prev) => ({ ...prev, [fresh.id]: fresh }));
      setDeckIndex(prevDeck.length);
      return [...prevDeck, fresh];
    });
  }, [deckIndex, domainFilter, activeTopic, synthesizeInfiniteCard]);

  const handlePrevCard = useCallback(() => {
    setDeckIndex((idx) => (idx > 0 ? idx - 1 : 0));
  }, []);

  // Switch Domain Filter & rebuild smart deck immediately
  const handleSelectDomain = useCallback(
    (nextDomain: DomainSlug | "all") => {
      setDomainFilter(nextDomain);
      setDrawerMode("none");
      setModalSelection(null);

      if (activeTopic) {
        const nextStep = synthCursorRef.current++;
        const domSlug =
          nextDomain === "all" ? DOMAIN_LIST[nextStep % DOMAIN_LIST.length].slug : nextDomain;
        const builder = builders[(nextStep * 5) % builders.length];
        const radar = matchAiRadarFor(builder, domSlug, radars, nextStep);
        const fresh = synthesizeTreatment({
          builder,
          radar,
          domainSlug: domSlug,
          customTopic: activeTopic,
          variantIndex: nextStep,
          mechanismOverride: MECHANISM_LIST[nextStep % MECHANISM_LIST.length].id,
        });
        setLineageMap((prev) => ({ ...prev, [fresh.id]: fresh }));
        setDeck([fresh]);
        setDeckIndex(0);
        return;
      }

      const freshDeck = buildSmartDeck(
        initialTreatments,
        nextDomain,
        synthCursorRef.current++
      );
      setDeck(freshDeck);
      setDeckIndex(0);
    },
    [activeTopic, builders, radars, initialTreatments]
  );

  // Reset to full random deck on BENCH. logo click
  const handleResetAll = useCallback(() => {
    setDomainFilter("all");
    setTopicInput("");
    setActiveTopic("");
    setSyncNotice("");
    setDrawerMode("none");
    setModalSelection(null);
    const freshDeck = buildSmartDeck(
      initialTreatments,
      "all",
      synthCursorRef.current++
    );
    setDeck(freshDeck);
    setDeckIndex(0);
  }, [initialTreatments]);

  // Custom Topic or X Post URL Generation
  const handleGenerateTopic = async (rawTopic: string) => {
    const trimmed = rawTopic.trim();
    setActiveTopic(trimmed);

    if (!trimmed) {
      const freshDeck = buildSmartDeck(
        initialTreatments,
        domainFilter,
        synthCursorRef.current++
      );
      setDeck(freshDeck);
      setDeckIndex(0);
      return;
    }

    const targetDomain: DomainSlug =
      domainFilter === "all" ? DOMAIN_LIST[0].slug : domainFilter;

    if (isXPostUrl(trimmed)) {
      setSyncNotice("X 공개 포스트를 읽어 새 블루프린트 카드를 만들고 있습니다.");
      try {
        const res = await fetch("/api/synthesize", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ xPostUrl: trimmed, domainSlug: targetDomain }),
        });
        if (res.ok) {
          const data = (await res.json()) as { treatment?: Treatment };
          if (data.treatment) {
            jumpToCard(data.treatment, false);
            setSyncNotice("X 포스트 기반 블루프린트 카드가 준비되었습니다.");
            return;
          }
        }
      } catch {
        setSyncNotice("링크를 읽지 못해 일반 주제로 블루프린트를 만들었습니다.");
      }
    }

    // Generate 6 varied-mechanism cards for the custom topic
    const regenerated = MECHANISM_LIST.map((mech, idx) => {
      const step = synthCursorRef.current++;
      const domSlug: DomainSlug =
        domainFilter === "all"
          ? DOMAIN_LIST[idx % DOMAIN_LIST.length].slug
          : domainFilter;
      const builder = builders[(step * 3 + idx) % builders.length];
      const radar = matchAiRadarFor(builder, domSlug, radars, step);
      return synthesizeTreatment({
        builder,
        radar,
        domainSlug: domSlug,
        customTopic: trimmed,
        variantIndex: step,
        mechanismOverride: mech.id,
      });
    });

    if (regenerated.length > 0) {
      setLineageMap((prev) => {
        const next = { ...prev };
        for (const t of regenerated) next[t.id] = t;
        return next;
      });
      setDeck(regenerated);
      setDeckIndex(0);
      setDrawerMode("none");
      setModalSelection(null);
      setSyncNotice(`"${trimmed}" 주제로 6종 화면 블루프린트를 생성했습니다.`);
    }
  };

  // [다른 분야로 비틀기] (A -> Z)
  const handleBranchDomain = useCallback(
    (base: Treatment, explicitDomain?: DomainSlug) => {
      const step = synthCursorRef.current++;
      const currentIdx = DOMAIN_LIST.findIndex((d) => d.slug === base.domainSlug);
      const nextDomain: DomainSlug =
        explicitDomain || DOMAIN_LIST[(currentIdx + 1) % DOMAIN_LIST.length].slug;

      const builder =
        builders.find((b) => b.id === base.sampleA.builderId) || builders[0];
      const radar = matchAiRadarFor(builder, nextDomain, radars, step);
      const branched = synthesizeTreatment({
        builder,
        radar,
        domainSlug: nextDomain,
        customTopic: activeTopic || null,
        variantIndex: step,
        mechanismOverride: base.sampleA.mechanism,
      });

      const wasModalOpen = modalSelection?.type === "treatment";
      jumpToCard(branched, wasModalOpen);
    },
    [builders, radars, activeTopic, modalSelection, jumpToCard]
  );

  // [인기 기능 더 섞기] (B -> C)
  const handleEvolveTreatment = useCallback(
    (parent: Treatment) => {
      const step = synthCursorRef.current++;
      const baseBuilder =
        builders.find((b) => b.id === parent.sampleA.builderId) || builders[0];
      const candidates = builders.filter(
        (b) =>
          b.id !== baseBuilder.id &&
          b.id !== parent.sampleA2?.builderId &&
          b.mechanism !== parent.sampleA.mechanism
      );
      const pool =
        candidates.length > 0
          ? candidates
          : builders.filter((b) => b.id !== baseBuilder.id);
      const addedBuilder = pool[step % pool.length] || builders[0];
      const radar =
        radars.find((r) => r.id === parent.sampleB.radarId) ||
        matchAiRadarFor(baseBuilder, parent.domainSlug, radars, step);

      setLineageMap((prev) => ({ ...prev, [parent.id]: parent }));
      const evolved = synthesizeTreatment({
        builder: baseBuilder,
        radar,
        domainSlug: parent.domainSlug,
        customTopic: parent.customTopic || activeTopic || null,
        variantIndex: step,
        parentTreatment: parent,
        addedBuilder,
        mechanismOverride: parent.sampleA.mechanism,
      });

      const wasModalOpen = modalSelection?.type === "treatment";
      jumpToCard(evolved, wasModalOpen);
    },
    [builders, radars, activeTopic, modalSelection, jumpToCard]
  );

  const handleSynthesizeFromBuilder = (builder: BuilderSignal) => {
    const step = synthCursorRef.current++;
    const domainSlug: DomainSlug =
      domainFilter === "all"
        ? DOMAIN_LIST[step % DOMAIN_LIST.length].slug
        : domainFilter;
    const radar = matchAiRadarFor(builder, domainSlug, radars, step);
    const fresh = synthesizeTreatment({
      builder,
      radar,
      domainSlug,
      customTopic: activeTopic || null,
      variantIndex: step,
    });
    setModalSelection(null);
    jumpToCard(fresh, false);
  };

  const handleSynthesizeFromRadar = (radar: AiRadarSignal) => {
    const step = synthCursorRef.current++;
    const domainSlug: DomainSlug =
      domainFilter === "all"
        ? DOMAIN_LIST[step % DOMAIN_LIST.length].slug
        : domainFilter;
    const builder = builders[step % builders.length];
    const fresh = synthesizeTreatment({
      builder,
      radar,
      domainSlug,
      customTopic: activeTopic || null,
      variantIndex: step,
      mechanismOverride: MECHANISM_LIST[step % MECHANISM_LIST.length].id,
    });
    setModalSelection(null);
    jumpToCard(fresh, false);
  };

  const handleToggleSave = (tr: Treatment) => {
    setSavedTreatments((prev) => {
      const exists = prev.some((item) => item.id === tr.id);
      const next = exists ? prev.filter((item) => item.id !== tr.id) : [tr, ...prev];
      saveTreatmentsToStorage(window.localStorage, next);
      return next;
    });
  };

  const handleCopySavedShareUrl = async () => {
    if (savedTreatments.length === 0) return;
    const encoded = encodeSavedParam(savedTreatments.map((t) => t.id));
    const url = new URL(window.location.href);
    url.searchParams.set("tab", "saved");
    url.searchParams.set("saved", encoded);
    try {
      await navigator.clipboard.writeText(url.toString());
      setSyncNotice("보관함 공유 링크를 클립보드에 복사했습니다.");
    } catch {}
    router.replace(`/?tab=saved&saved=${encodeURIComponent(encoded)}`, { scroll: false });
  };

  const handleLiveSync = async () => {
    setIsSyncing(true);
    try {
      const res = await fetch("/api/live-sync");
      if (res.ok) {
        const data = (await res.json()) as {
          syncedAt: string;
          liveShowHnAdded: number;
          aiRadars: AiRadarSignal[];
          builders: BuilderSignal[];
        };
        if (Array.isArray(data.aiRadars) && data.aiRadars.length > 0) setRadars(data.aiRadars);
        if (Array.isArray(data.builders) && data.builders.length > 0) setBuilders(data.builders);
        setLastSyncedAt(data.syncedAt);
        setSyncNotice(
          `최신 시그널 반영 완료 · 해외 원액 ${data.builders.length}건, AI 재료 ${data.aiRadars.length}건`
        );
      }
    } catch {
      setSyncNotice("최신 스냅샷을 유지하고 있습니다.");
    } finally {
      setIsSyncing(false);
    }
  };

  // Keyboard Navigation (Space / ArrowRight / ArrowDown -> Next, ArrowLeft / ArrowUp -> Prev)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && drawerMode !== "none" && !modalSelection) {
        setDrawerMode("none");
        return;
      }

      if (modalSelection || drawerMode !== "none") return;

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
  }, [modalSelection, drawerMode, handleNextCard, handlePrevCard]);

  // Stage Wheel Handler (320ms debounce, disabled while modal/drawer open)
  const handleStageWheel = (e: React.WheelEvent<HTMLElement>) => {
    if (modalSelection || drawerMode !== "none") return;
    if (Math.abs(e.deltaY) < 26) return;

    const now = Date.now();
    if (now - lastWheelAtRef.current < 320) return;
    lastWheelAtRef.current = now;

    if (e.deltaY > 0) {
      handleNextCard();
    } else {
      handlePrevCard();
    }
  };

  // Mobile Touch Swipe Handler (Left/Up -> Next, Right/Down -> Prev)
  const handleTouchStart = (e: React.TouchEvent<HTMLElement>) => {
    if (modalSelection || drawerMode !== "none") return;
    const t = e.touches[0];
    if (!t) return;
    touchStartRef.current = { x: t.clientX, y: t.clientY };
  };

  const handleTouchEnd = (e: React.TouchEvent<HTMLElement>) => {
    if (modalSelection || drawerMode !== "none") return;
    const start = touchStartRef.current;
    touchStartRef.current = null;
    const t = e.changedTouches[0];
    if (!start || !t) return;

    const dx = t.clientX - start.x;
    const dy = t.clientY - start.y;
    const absX = Math.abs(dx);
    const absY = Math.abs(dy);

    if (Math.max(absX, absY) < 48) return;

    if (absX >= absY) {
      if (dx < 0) handleNextCard();
      else handlePrevCard();
    } else {
      if (dy < 0) handleNextCard();
      else handlePrevCard();
    }
  };

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "";
    return `${d.getMonth() + 1}.${d.getDate()} ${String(d.getHours()).padStart(2, "0")}:${String(
      d.getMinutes()
    ).padStart(2, "0")}`;
  };

  return (
    <div className="flex min-h-screen flex-col bg-[#F7F8FA] text-[#0F172A]">
      {/* ── 1) SLIM PURE-WHITE TOP HEADER (h-16 desktop) ───────────────────── */}
      <header className="sticky top-0 z-30 border-b border-[#E5E7EB] bg-[#FFFFFF]">
        <div className="mx-auto flex min-h-16 w-full max-w-[1360px] flex-wrap items-center justify-between gap-2.5 px-4 py-2 sm:px-6">
          {/* Left: BENCH. Logo (resets to full random) */}
          <button
            type="button"
            onClick={handleResetAll}
            aria-label="BENCH 전체 랜덤 초기화"
            className="shrink-0 cursor-pointer"
          >
            <BenchLogo />
          </button>

          {/* Center: 1-Line Domain Filter Capsules + Short Inline Topic / X Input */}
          <div className="order-3 flex w-full items-center gap-2 overflow-x-auto pb-1 xl:order-2 xl:w-auto xl:flex-1 xl:justify-center xl:pb-0">
            <nav
              aria-label="분야 필터"
              className="flex shrink-0 items-center gap-1"
            >
              <button
                type="button"
                onClick={() => handleSelectDomain("all")}
                className={`shrink-0 rounded-full px-3 py-1.5 text-[12.5px] font-semibold transition-colors ${
                  domainFilter === "all"
                    ? "bg-[#0F172A] text-[#FFFFFF]"
                    : "border border-[#E5E7EB] bg-[#FFFFFF] text-[#475569] hover:border-[#0F172A] hover:text-[#0F172A]"
                }`}
              >
                전체 랜덤
              </button>

              {DOMAIN_LIST.map((d) => {
                const active = domainFilter === d.slug;
                return (
                  <button
                    key={d.slug}
                    type="button"
                    onClick={() => handleSelectDomain(d.slug)}
                    className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1.5 text-[12.5px] font-semibold transition-colors ${
                      active
                        ? "bg-[#0F172A] text-[#FFFFFF]"
                        : "border border-[#E5E7EB] bg-[#FFFFFF] text-[#475569] hover:border-[#0F172A] hover:text-[#0F172A]"
                    }`}
                  >
                    <span
                      className="h-1.5 w-1.5 rounded-full"
                      style={{ backgroundColor: d.color }}
                    />
                    <span>{d.shortLabel}</span>
                  </button>
                );
              })}
            </nav>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleGenerateTopic(topicInput);
              }}
              className="flex shrink-0 items-center gap-1.5"
            >
              <div className="flex w-[195px] items-center rounded-full border border-[#E5E7EB] bg-[#F8FAFC] px-3 py-1 focus-within:border-[#0F172A] focus-within:bg-[#FFFFFF] sm:w-[220px]">
                <input
                  type="text"
                  value={topicInput}
                  onChange={(e) => setTopicInput(e.target.value)}
                  placeholder="주제 키워드 또는 X 링크"
                  aria-label="주제 키워드 또는 X 링크 입력"
                  className="w-full bg-transparent text-[12.5px] text-[#0F172A] placeholder:text-[#64748B] focus:outline-none"
                />
                {topicInput && (
                  <button
                    type="button"
                    onClick={() => {
                      setTopicInput("");
                      handleGenerateTopic("");
                    }}
                    aria-label="입력 지우기"
                    className="ml-1 text-[#64748B] hover:text-[#0F172A]"
                  >
                    <XIcon className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
              <button
                type="submit"
                className="shrink-0 rounded-full bg-[#0F172A] px-3 py-1.5 text-[12.5px] font-bold text-[#FFFFFF] hover:bg-[#1E293B]"
              >
                뽑기
              </button>
            </form>
          </div>

          {/* Right: Overseas Ingredients Drawer + Saved Drawer */}
          <div className="order-2 flex shrink-0 items-center gap-2 xl:order-3">
            <button
              type="button"
              onClick={() => {
                setIngredientTab("builders");
                setDrawerMode((m) => (m === "ingredients" ? "none" : "ingredients"));
              }}
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12.5px] font-semibold transition-colors ${
                drawerMode === "ingredients"
                  ? "border-[#0F172A] bg-[#0F172A] text-[#FFFFFF]"
                  : "border-[#E5E7EB] bg-[#FFFFFF] text-[#1E293B] hover:border-[#0F172A]"
              }`}
            >
              <RadarIcon className="h-3.5 w-3.5" />
              <span>해외 원액</span>
              <span className="tnum opacity-75">({builders.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setDrawerMode((m) => (m === "saved" ? "none" : "saved"))}
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12.5px] font-semibold transition-colors ${
                drawerMode === "saved"
                  ? "border-[#0F172A] bg-[#0F172A] text-[#FFFFFF]"
                  : "border-[#E5E7EB] bg-[#FFFFFF] text-[#1E293B] hover:border-[#0F172A]"
              }`}
            >
              <BookmarkIcon className="h-3.5 w-3.5" filled={savedTreatments.length > 0} />
              <span>보관함</span>
              <span className="tnum opacity-75">({savedTreatments.length})</span>
            </button>
          </div>
        </div>
      </header>

      {/* ── 2) 1-SCREEN 1-CARD TIKTOK-STYLE RANDOM BLUEPRINT STAGE ─────────── */}
      <main
        onWheel={handleStageWheel}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        className="flex flex-1 flex-col items-center justify-center px-4 py-5 sm:px-6 lg:px-8"
      >
        <div className="w-full max-w-[1080px]">
          {/* Optional Compact Status / Topic Strip */}
          {(syncNotice || activeTopic) && (
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-[#E5E7EB] bg-[#FFFFFF] px-4 py-2 text-[13px] text-[#475569]">
              <div className="flex flex-wrap items-center gap-2">
                {activeTopic && (
                  <span>
                    <strong className="text-[#0F172A]">"{activeTopic}"</strong> 맞춤 덱 탐색 중
                  </span>
                )}
                {syncNotice && <span>{syncNotice}</span>}
              </div>
              <div className="flex items-center gap-3">
                {activeTopic && (
                  <button
                    type="button"
                    onClick={() => {
                      setTopicInput("");
                      handleGenerateTopic("");
                    }}
                    className="font-bold text-[#2563EB] hover:underline"
                  >
                    전체 랜덤으로 돌아가기
                  </button>
                )}
                {syncNotice && (
                  <button
                    type="button"
                    onClick={() => setSyncNotice("")}
                    className="font-semibold text-[#64748B] hover:text-[#0F172A]"
                  >
                    닫기
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Single Focused Visual Blueprint Card */}
          {currentTreatment && (
            <VisualBlueprintCard
              treatment={currentTreatment}
              cardPosition={deckIndex + 1}
              canGoPrev={deckIndex > 0}
              isSaved={savedIdSet.has(currentTreatment.id)}
              lineageMap={lineageMap}
              onPrev={handlePrevCard}
              onNext={handleNextCard}
              onOpenDetail={() =>
                setModalSelection({ type: "treatment", treatment: currentTreatment })
              }
              onToggleSave={handleToggleSave}
              onBranchDomain={(t) => handleBranchDomain(t)}
              onEvolveTreatment={(t) => handleEvolveTreatment(t)}
              onSelectLineage={(tr) => jumpToCard(tr, false)}
            />
          )}

          {/* Subtle Bottom Gesture / Deck Status Bar */}
          <div className="mt-3.5 flex flex-wrap items-center justify-between gap-2 px-1 text-[12px] text-[#64748B]">
            <span>
              Space · 방향키 · 마우스 휠 · 스와이프로 다음 아이디어를 즉시 넘겨보세요
            </span>
            <span className="tnum">
              해외 검증 {builders.length} × AI Radar {radars.length} 실시간 교차 합성
            </span>
          </div>
        </div>
      </main>

      {/* ── 3) RIGHT SLIDE-OVER DRAWER (INGREDIENTS / SAVED) ───────────────── */}
      {drawerMode !== "none" && (
        <div className="fixed inset-0 z-40 flex justify-end">
          <button
            type="button"
            aria-label="드로어 닫기"
            tabIndex={-1}
            onClick={() => setDrawerMode("none")}
            className="fixed inset-0 cursor-default bg-[#0F172A]/35 backdrop-blur-[2px]"
          />

          <aside
            role="dialog"
            aria-modal="true"
            aria-label={drawerMode === "ingredients" ? "해외 원액 및 AI 기술 재료" : "내 보관함"}
            className="relative z-10 flex h-full w-[min(94vw,460px)] flex-col border-l border-[#E5E7EB] bg-[#FFFFFF] shadow-[0_10px_40px_rgba(15,23,42,0.12)]"
          >
            {/* Drawer Header */}
            <div className="flex items-center justify-between gap-3 border-b border-[#E5E7EB] px-5 py-4">
              <div>
                <h2 className="text-[17px] font-bold text-[#0F172A]">
                  {drawerMode === "ingredients" ? "원재료 탐색" : "내 보관함"}
                </h2>
                <p className="mt-0.5 text-[12.5px] text-[#64748B]">
                  {drawerMode === "ingredients"
                    ? "원하는 해외 서비스나 AI 기술을 눌러 즉시 블루프린트를 생성하세요."
                    : "저장해 둔 카드를 다시 열거나 링크 하나로 팀과 공유하세요."}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setDrawerMode("none")}
                aria-label="닫기"
                className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-[#E5E7EB] bg-[#FFFFFF] text-[#475569] hover:border-[#0F172A] hover:text-[#0F172A]"
              >
                <XIcon className="h-4 w-4" />
              </button>
            </div>

            {/* DRAWER BODY A: INGREDIENTS (BUILDERS + AI RADAR) */}
            {drawerMode === "ingredients" && (
              <>
                <div className="border-b border-[#E5E7EB] px-5 py-3 space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setIngredientTab("builders")}
                        className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12.5px] font-bold ${
                          ingredientTab === "builders"
                            ? "bg-[#0F172A] text-[#FFFFFF]"
                            : "border border-[#E5E7EB] bg-[#FFFFFF] text-[#475569]"
                        }`}
                      >
                        <RadarIcon className="h-3.5 w-3.5" />
                        <span>해외 성공 서비스 ({builders.length})</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setIngredientTab("ai-radar")}
                        className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12.5px] font-bold ${
                          ingredientTab === "ai-radar"
                            ? "bg-[#0F172A] text-[#FFFFFF]"
                            : "border border-[#E5E7EB] bg-[#FFFFFF] text-[#475569]"
                        }`}
                      >
                        <ChipIcon className="h-3.5 w-3.5" />
                        <span>AI 기술 ({radars.length})</span>
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={handleLiveSync}
                      disabled={isSyncing}
                      className="inline-flex items-center gap-1 rounded-full border border-[#E5E7EB] bg-[#F8FAFC] px-2.5 py-1 text-[11.5px] font-semibold text-[#475569] hover:border-[#0F172A] hover:text-[#0F172A]"
                    >
                      <RefreshIcon className="h-3 w-3" />
                      <span>{isSyncing ? "갱신 중" : formatTime(lastSyncedAt)}</span>
                    </button>
                  </div>

                  {ingredientTab === "builders" && (
                    <div className="flex flex-wrap items-center gap-1">
                      {[
                        { id: "all", label: "전체" },
                        { id: "verified", label: "수익 검증 (MRR)" },
                        { id: "show_hn", label: "Show HN" },
                        { id: "product_hunt", label: "Product Hunt" },
                        { id: "uneed", label: "Uneed" },
                      ].map((tab) => (
                        <button
                          key={tab.id}
                          type="button"
                          onClick={() => setSourceFilter(tab.id)}
                          className={`rounded-full px-2.5 py-1 text-[11.5px] font-semibold ${
                            sourceFilter === tab.id
                              ? "bg-[#0F172A] text-[#FFFFFF]"
                              : "border border-[#E2E8F0] bg-[#F8FAFC] text-[#475569] hover:border-[#0F172A]"
                          }`}
                        >
                          {tab.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex-1 space-y-2.5 overflow-y-auto p-5">
                  {ingredientTab === "builders" &&
                    filteredBuilders.map((b) => (
                      <div
                        key={b.id}
                        className="rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] p-4"
                      >
                        <div className="flex items-center justify-between gap-2 text-[11.5px]">
                          <span
                            className={`font-bold ${
                              b.verifiedRevenue ? "text-[#059669]" : "text-[#EA580C]"
                            }`}
                          >
                            {formatShortMetric(b)}
                          </span>
                          <span className="text-[#64748B]">{b.mechanismLabel}</span>
                        </div>
                        <div className="mt-1.5 text-[15px] font-bold text-[#0F172A]">
                          {b.name}
                        </div>
                        <p className="mt-1 line-clamp-2 text-[13px] leading-[1.6] text-[#475569]">
                          {b.taglineKo}
                        </p>
                        <div className="mt-3 flex items-center justify-between gap-2">
                          <a
                            href={b.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[12px] font-semibold text-[#64748B] hover:text-[#0F172A] hover:underline"
                          >
                            원본 사이트 ↗
                          </a>
                          <button
                            type="button"
                            onClick={() => handleSynthesizeFromBuilder(b)}
                            className="inline-flex items-center gap-1 rounded-full bg-[#0F172A] px-3 py-1.5 text-[12px] font-bold text-[#FFFFFF] hover:bg-[#1E293B]"
                          >
                            <span>아이디어 뽑기</span>
                            <ArrowRightIcon className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                    ))}

                  {ingredientTab === "ai-radar" &&
                    radars.map((r) => (
                      <div
                        key={r.id}
                        className="rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] p-4"
                      >
                        <div className="flex items-center justify-between gap-2 text-[11.5px]">
                          <span className="font-bold text-[#2563EB]">{r.platformId}</span>
                          <span className="text-[#64748B]">{r.planningMeta.signalType}</span>
                        </div>
                        <div className="mt-1.5 text-[14.5px] font-bold leading-snug text-[#0F172A]">
                          {r.titleKo}
                        </div>
                        <p className="mt-1 line-clamp-2 text-[13px] leading-[1.6] text-[#475569]">
                          {r.planningMeta.benchmarkPoint || r.whatKo}
                        </p>
                        <div className="mt-3 flex items-center justify-between gap-2">
                          <a
                            href={r.canonicalUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[12px] font-semibold text-[#64748B] hover:text-[#0F172A] hover:underline"
                          >
                            기술 원문 ↗
                          </a>
                          <button
                            type="button"
                            onClick={() => handleSynthesizeFromRadar(r)}
                            className="inline-flex items-center gap-1 rounded-full bg-[#0F172A] px-3 py-1.5 text-[12px] font-bold text-[#FFFFFF] hover:bg-[#1E293B]"
                          >
                            <span>아이디어 뽑기</span>
                            <ArrowRightIcon className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                    ))}
                </div>
              </>
            )}

            {/* DRAWER BODY B: SAVED BOOKMARKS */}
            {drawerMode === "saved" && (
              <div className="flex flex-1 flex-col overflow-hidden">
                {savedTreatments.length > 0 && (
                  <div className="flex items-center justify-between gap-2 border-b border-[#E5E7EB] bg-[#F8FAFC] px-5 py-3 text-[12.5px] text-[#475569]">
                    <span>저장한 카드 {savedTreatments.length}장</span>
                    <button
                      type="button"
                      onClick={handleCopySavedShareUrl}
                      className="rounded-full bg-[#0F172A] px-3.5 py-1.5 text-[12px] font-bold text-[#FFFFFF] hover:bg-[#1E293B]"
                    >
                      보관함 공유 링크 복사
                    </button>
                  </div>
                )}

                <div className="flex-1 space-y-2.5 overflow-y-auto p-5">
                  {savedTreatments.length === 0 ? (
                    <div className="rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] px-5 py-12 text-center">
                      <p className="text-[15px] font-bold text-[#0F172A]">
                        아직 저장한 블루프린트가 없습니다.
                      </p>
                      <p className="mt-1.5 text-[13px] leading-[1.6] text-[#64748B]">
                        카드 우측 상단 [저장] 버튼을 누르면 이곳에 차곡차곡 모입니다.
                      </p>
                    </div>
                  ) : (
                    savedTreatments.map((item) => {
                      const d = DOMAIN_MAP[item.domainSlug];
                      return (
                        <div
                          key={item.id}
                          className="rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] p-4"
                        >
                          <div className="flex items-center justify-between gap-2 text-[11.5px]">
                            <span
                              className="inline-flex items-center gap-1.5 font-bold"
                              style={{ color: d?.color || "#2563EB" }}
                            >
                              <span
                                className="h-1.5 w-1.5 rounded-full"
                                style={{ backgroundColor: d?.color || "#2563EB" }}
                              />
                              {item.domainLabel}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleToggleSave(item)}
                              className="font-semibold text-[#64748B] hover:text-[#0F172A]"
                            >
                              삭제
                            </button>
                          </div>
                          <div className="mt-1.5 text-[15px] font-bold leading-snug text-[#0F172A]">
                            {item.title}
                          </div>
                          <p className="mt-1 line-clamp-1 text-[13px] text-[#475569]">
                            {item.oneLineHook}
                          </p>
                          <div className="mt-3 flex items-center justify-between">
                            <span className="text-[12px] font-medium text-[#64748B]">
                              {item.sampleA.name}
                            </span>
                            <button
                              type="button"
                              onClick={() => jumpToCard(item, false)}
                              className="inline-flex items-center gap-1 rounded-full border border-[#E5E7EB] bg-[#FFFFFF] px-3 py-1 text-[12px] font-bold text-[#0F172A] hover:border-[#0F172A]"
                            >
                              <span>카드로 보기</span>
                              <ArrowRightIcon className="h-3 w-3" />
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </aside>
        </div>
      )}

      {/* ── 4) PURE-WHITE DETAIL SPEC & PROMPT MODAL ──────────────────────── */}
      <TreatmentModal
        selection={modalSelection}
        savedIdSet={savedIdSet}
        lineageMap={lineageMap}
        onClose={() => setModalSelection(null)}
        onSelectTreatment={(tr) => jumpToCard(tr, true)}
        onBranchDomain={handleBranchDomain}
        onEvolveTreatment={handleEvolveTreatment}
        onToggleSave={handleToggleSave}
        onSynthesizeFromBuilder={handleSynthesizeFromBuilder}
        onSynthesizeFromRadar={handleSynthesizeFromRadar}
      />
    </div>
  );
}
