"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { DOMAIN_LIST, DOMAIN_MAP, isValidDomainSlug } from "@/lib/domains";
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
  ShuffleIcon,
  WorkbenchIcon,
  XIcon,
} from "./Icons";
import { TreatmentModal, type ModalSelection } from "./TreatmentModal";

type ActiveView = "radar" | "builders" | "ai-radar" | "saved";

interface WorkbenchClientProps {
  initialTreatments: Treatment[];
  initialBuilders: BuilderSignal[];
  initialRadars: AiRadarSignal[];
  initialSyncMeta: SyncMeta;
}

const VIEW_META: Record<ActiveView, { title: string; subtitle: string }> = {
  radar: {
    title: "기획 레이더",
    subtitle: "해외에서 반응이 검증된 서비스 아이디어와 최신 AI 기술을 엮은 실행 기획안입니다.",
  },
  builders: {
    title: "해외 신상 원액",
    subtitle: "Show HN, Product Hunt, TrustMRR, Uneed에서 수집한 실제 해외 런칭 사례입니다.",
  },
  "ai-radar": {
    title: "AI 기술 재료",
    subtitle: "AI Radar에서 실시간 연동된 최신 오픈소스·모델 시그널 100선입니다.",
  },
  saved: {
    title: "내 보관함",
    subtitle: "저장해 둔 기획안을 한곳에서 다시 읽고 링크로 팀과 공유할 수 있습니다.",
  },
};

export function WorkbenchClient({
  initialTreatments,
  initialBuilders,
  initialRadars,
  initialSyncMeta,
}: WorkbenchClientProps) {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [activeView, setActiveView] = useState<ActiveView>(() => {
    const t = searchParams.get("tab");
    if (t === "builders" || t === "ai-radar" || t === "saved") return t;
    return "radar";
  });

  const [domainFilter, setDomainFilter] = useState<DomainSlug | "all">(() => {
    const d = searchParams.get("domain");
    return d && isValidDomainSlug(d) ? d : "all";
  });

  const [builders, setBuilders] = useState<BuilderSignal[]>(initialBuilders);
  const [radars, setRadars] = useState<AiRadarSignal[]>(initialRadars);
  const [treatments, setTreatments] = useState<Treatment[]>(initialTreatments);
  const [topicInput, setTopicInput] = useState("");
  const [activeTopic, setActiveTopic] = useState("");
  const [sourceFilter, setSourceFilter] = useState<string>("all");
  const [comboCounter, setComboCounter] = useState<number>(initialTreatments.length);
  const [syncNotice, setSyncNotice] = useState<string>("");
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<string>(initialSyncMeta.syncedAt);

  const [lineageMap, setLineageMap] = useState<Record<string, Treatment>>(() =>
    Object.fromEntries(initialTreatments.map((t) => [t.id, t]))
  );

  // First entry shows clean centered feed; opens modal only on click or ?treatment= URL
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

  const domainCounts = useMemo(() => {
    const map: Record<string, number> = { all: treatments.length };
    for (const d of DOMAIN_LIST) {
      map[d.slug] = treatments.filter((t) => t.domainSlug === d.slug).length;
    }
    return map;
  }, [treatments]);

  const displayedTreatments = useMemo(() => {
    if (domainFilter === "all") return treatments;
    return treatments.filter((t) => t.domainSlug === domainFilter);
  }, [treatments, domainFilter]);

  const filteredBuilders = useMemo(() => {
    if (sourceFilter === "all") return builders;
    if (sourceFilter === "verified") return builders.filter((b) => b.verifiedRevenue);
    return builders.filter((b) => b.source === sourceFilter);
  }, [builders, sourceFilter]);

  const openTreatmentModal = useCallback((tr: Treatment, prependToList = false) => {
    setLineageMap((prev) => ({ ...prev, [tr.id]: tr }));
    if (prependToList) {
      setTreatments((prev) => [tr, ...prev.filter((item) => item.id !== tr.id)]);
    }
    setModalSelection({ type: "treatment", treatment: tr });
  }, []);

  const closeModal = useCallback(() => {
    setModalSelection(null);
  }, []);

  // Generate ideas from user's custom topic (or X URL via oEmbed)
  const handleGenerateTopic = async (rawTopic: string) => {
    const trimmed = rawTopic.trim();
    setActiveTopic(trimmed);

    if (!trimmed) {
      setTreatments(initialTreatments);
      return;
    }

    const targetDomain: DomainSlug =
      domainFilter === "all" ? DOMAIN_LIST[0].slug : domainFilter;

    if (isXPostUrl(trimmed)) {
      setSyncNotice("X 공개 포스트를 읽어 새 기획안을 만들고 있습니다.");
      try {
        const res = await fetch("/api/synthesize", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ xPostUrl: trimmed, domainSlug: targetDomain }),
        });
        if (res.ok) {
          const data = (await res.json()) as { treatment?: Treatment };
          if (data.treatment) {
            openTreatmentModal(data.treatment, true);
            setActiveView("radar");
            setSyncNotice("X 포스트 기반 기획안이 완성되었습니다.");
            return;
          }
        }
      } catch {
        setSyncNotice("링크를 읽지 못해 일반 주제로 아이디어를 만들었습니다.");
      }
    }

    const pickedBuilders = builders.slice(0, 6);
    const regenerated = pickedBuilders.map((builder, idx) => {
      const domSlug: DomainSlug =
        domainFilter === "all"
          ? DOMAIN_LIST[idx % DOMAIN_LIST.length].slug
          : domainFilter;
      const radar = matchAiRadarFor(builder, domSlug, radars, comboCounter + idx);
      return synthesizeTreatment({
        builder,
        radar,
        domainSlug: domSlug,
        customTopic: trimmed,
        variantIndex: comboCounter + idx + 1,
      });
    });

    if (regenerated.length > 0) {
      setLineageMap((prev) => {
        const next = { ...prev };
        for (const t of regenerated) next[t.id] = t;
        return next;
      });
      setTreatments((prev) => [
        ...regenerated,
        ...prev.filter((p) => !regenerated.some((r) => r.id === p.id)),
      ]);
      setComboCounter((c) => c + regenerated.length);
      setActiveView("radar");
      setModalSelection({ type: "treatment", treatment: regenerated[0] });
    }
  };

  // [새로 섞기] — fresh combination & opens immediately in modal
  const handleShuffleIdea = () => {
    const nextIdx = comboCounter + 1;
    setComboCounter(nextIdx);
    const domainSlug: DomainSlug =
      domainFilter === "all"
        ? DOMAIN_LIST[nextIdx % DOMAIN_LIST.length].slug
        : domainFilter;
    const builder = builders[(nextIdx * 7) % builders.length];
    const radar = matchAiRadarFor(builder, domainSlug, radars, nextIdx);
    const fresh = synthesizeTreatment({
      builder,
      radar,
      domainSlug,
      customTopic: activeTopic || null,
      variantIndex: nextIdx,
    });
    setActiveView("radar");
    openTreatmentModal(fresh, true);
  };

  // [같은 해외 사례로 다른 분야 아이디어 뽑기] (A -> Z)
  const handleBranchDomain = (base: Treatment, explicitDomain?: DomainSlug) => {
    const nextIdx = comboCounter + 1;
    setComboCounter(nextIdx);
    const currentIndex = DOMAIN_LIST.findIndex((d) => d.slug === base.domainSlug);
    const nextDomain: DomainSlug =
      explicitDomain || DOMAIN_LIST[(currentIndex + 1) % DOMAIN_LIST.length].slug;

    const builder =
      builders.find((b) => b.id === base.sampleA.builderId) || builders[0];
    const radar = matchAiRadarFor(builder, nextDomain, radars, nextIdx);
    const branched = synthesizeTreatment({
      builder,
      radar,
      domainSlug: nextDomain,
      customTopic: activeTopic || null,
      variantIndex: nextIdx,
    });
    openTreatmentModal(branched, true);
  };

  // [여기에 다른 해외 인기 기능 하나 더 합치기] (B -> C)
  const handleEvolveTreatment = (parent: Treatment) => {
    const nextIdx = comboCounter + 1;
    setComboCounter(nextIdx);
    const baseBuilder =
      builders.find((b) => b.id === parent.sampleA.builderId) || builders[0];
    const candidates = builders.filter(
      (b) =>
        b.id !== baseBuilder.id &&
        b.id !== parent.sampleA2?.builderId &&
        b.mechanism !== baseBuilder.mechanism
    );
    const pool = candidates.length > 0 ? candidates : builders.filter((b) => b.id !== baseBuilder.id);
    const addedBuilder = pool[nextIdx % pool.length] || builders[0];
    const radar =
      radars.find((r) => r.id === parent.sampleB.radarId) ||
      matchAiRadarFor(baseBuilder, parent.domainSlug, radars, nextIdx);

    setLineageMap((prev) => ({ ...prev, [parent.id]: parent }));
    const evolved = synthesizeTreatment({
      builder: baseBuilder,
      radar,
      domainSlug: parent.domainSlug,
      customTopic: parent.customTopic || activeTopic || null,
      variantIndex: nextIdx,
      parentTreatment: parent,
      addedBuilder,
    });
    openTreatmentModal(evolved, true);
  };

  const handleSynthesizeFromBuilder = (builder: BuilderSignal) => {
    const nextIdx = comboCounter + 1;
    setComboCounter(nextIdx);
    const domainSlug: DomainSlug =
      domainFilter === "all"
        ? DOMAIN_LIST[nextIdx % DOMAIN_LIST.length].slug
        : domainFilter;
    const radar = matchAiRadarFor(builder, domainSlug, radars, nextIdx);
    const fresh = synthesizeTreatment({
      builder,
      radar,
      domainSlug,
      customTopic: activeTopic || null,
      variantIndex: nextIdx,
    });
    setActiveView("radar");
    openTreatmentModal(fresh, true);
  };

  const handleSynthesizeFromRadar = (radar: AiRadarSignal) => {
    const nextIdx = comboCounter + 1;
    setComboCounter(nextIdx);
    const domainSlug: DomainSlug =
      domainFilter === "all"
        ? DOMAIN_LIST[nextIdx % DOMAIN_LIST.length].slug
        : domainFilter;
    const builder = builders[nextIdx % builders.length];
    const fresh = synthesizeTreatment({
      builder,
      radar,
      domainSlug,
      customTopic: activeTopic || null,
      variantIndex: nextIdx,
    });
    setActiveView("radar");
    openTreatmentModal(fresh, true);
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
      setSyncNotice("보관함 공유 링크를 복사했습니다.");
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
          `최신 데이터 반영 완료 · 해외 사례 ${data.builders.length}건, AI 재료 ${data.aiRadars.length}건`
        );
      }
    } catch {
      setSyncNotice("최신 스냅샷을 유지하고 있습니다.");
    } finally {
      setIsSyncing(false);
    }
  };

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "";
    return `${d.getMonth() + 1}.${d.getDate()} ${String(d.getHours()).padStart(2, "0")}:${String(
      d.getMinutes()
    ).padStart(2, "0")}`;
  };

  const menuItems: Array<{
    id: ActiveView;
    label: string;
    count: number;
    Icon: typeof WorkbenchIcon;
  }> = [
    { id: "radar", label: "기획 레이더", count: displayedTreatments.length, Icon: WorkbenchIcon },
    { id: "builders", label: "해외 신상 원액", count: builders.length, Icon: RadarIcon },
    { id: "ai-radar", label: "AI 기술 재료", count: radars.length, Icon: ChipIcon },
    { id: "saved", label: "내 보관함", count: savedTreatments.length, Icon: BookmarkIcon },
  ];

  // Editorial Rhythm for Planning Radar: #1 Lead, #2~3 2-column grid, #4+ 1-column stack
  const leadTreatment = displayedTreatments[0] || null;
  const featurePair = displayedTreatments.slice(1, 3);
  const streamRest = displayedTreatments.slice(3);

  const renderTreatmentCard = (item: Treatment, variant: "lead" | "feature" | "stream") => {
    const domain = DOMAIN_MAP[item.domainSlug];
    const isLead = variant === "lead";
    return (
      <article
        key={item.id}
        role="button"
        tabIndex={0}
        onClick={() => openTreatmentModal(item)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            openTreatmentModal(item);
          }
        }}
        className={`${
          isLead ? "nordic-lead-card p-6 sm:p-7" : "nordic-card p-5 sm:p-6"
        } flex h-full cursor-pointer flex-col justify-between gap-3.5 text-left`}
      >
        <div className="flex flex-col gap-2.5">
          {/* 1-line micro-tag */}
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] font-medium">
            <span
              className="inline-flex items-center gap-1.5 font-semibold"
              style={{ color: domain?.color || "#C85A32" }}
            >
              <span
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: domain?.color || "#C85A32" }}
              />
              {item.domainLabel}
            </span>
            <span className="text-[#C5BCA8]">·</span>
            <span className="font-semibold text-[#1E1C19]">{item.sampleA.name}</span>
            <span className="tnum text-[#6E675C]">{item.sampleA.shortMetricLabel}</span>
          </div>

          {/* Intuitive Korean Service Title */}
          <h2
            className={
              isLead
                ? "text-[21px] font-bold leading-[1.36] tracking-[-0.02em] text-[#1E1C19] sm:text-[23px]"
                : "text-[18px] font-bold leading-[1.4] tracking-[-0.018em] text-[#1E1C19] sm:text-[19px]"
            }
          >
            {item.title}
          </h2>

          {/* Clear 2~3 line summary */}
          <p
            className={`${
              isLead ? "line-clamp-3 text-[15.5px]" : "line-clamp-2 text-[15px]"
            } leading-[1.68] text-[#4A443C]`}
          >
            {item.oneLineHook}
          </p>
        </div>

        {/* Bottom-right subtle action */}
        <div className="flex items-center justify-end pt-1">
          <span className="inline-flex items-center gap-1 text-[13.5px] font-semibold text-[#6E675C]">
            <span>자세히 보기</span>
            <ArrowRightIcon className="h-3.5 w-3.5" />
          </span>
        </div>
      </article>
    );
  };

  return (
    <div className="min-h-screen bg-[#F6F3EC] text-[#1E1C19]">
      {/* ── MOBILE TOP BAR (<lg) ─────────────────────────────────────────── */}
      <header className="sticky top-0 z-30 border-b border-[#E7E0D3] bg-[#F6F3EC]/95 px-5 py-4 lg:hidden">
        <div className="flex items-center justify-between gap-3">
          <Link href="/" aria-label="BENCH 홈">
            <BenchLogo />
          </Link>
          <button
            type="button"
            onClick={handleLiveSync}
            disabled={isSyncing}
            className="inline-flex items-center gap-1.5 rounded-full border border-[#E7E0D3] bg-[#FFFCF7] px-3 py-1 text-[12.5px] font-medium text-[#3D3831]"
          >
            <RefreshIcon className="h-3.5 w-3.5" />
            <span>{isSyncing ? "갱신 중" : formatTime(lastSyncedAt)}</span>
          </button>
        </div>

        {/* Mobile Menu Chips */}
        <div className="mt-3 flex items-center gap-1.5 overflow-x-auto pb-1">
          {menuItems.map(({ id, label, count }) => {
            const active = activeView === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => setActiveView(id)}
                className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[13.5px] ${
                  active
                    ? "bg-[#EBE5D8] font-bold text-[#1E1C19]"
                    : "font-medium text-[#6E675C]"
                }`}
              >
                <span>{label}</span>
                <span className="tnum text-[12px] text-[#6E675C]">{count}</span>
              </button>
            );
          })}
        </div>

        {/* Mobile Domain Chips */}
        {activeView === "radar" && (
          <div className="mt-2 flex items-center gap-1.5 overflow-x-auto pb-0.5">
            <button
              type="button"
              onClick={() => setDomainFilter("all")}
              className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1 text-[13px] ${
                domainFilter === "all"
                  ? "bg-[#23201C] font-semibold text-[#FFFCF7]"
                  : "border border-[#E7E0D3] bg-[#FFFCF7] font-medium text-[#3D3831]"
              }`}
            >
              전체
            </button>
            {DOMAIN_LIST.map((d) => {
              const active = domainFilter === d.slug;
              return (
                <button
                  key={d.slug}
                  type="button"
                  onClick={() => setDomainFilter(d.slug)}
                  className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1 text-[13px] ${
                    active
                      ? "bg-[#23201C] font-semibold text-[#FFFCF7]"
                      : "border border-[#E7E0D3] bg-[#FFFCF7] font-medium text-[#3D3831]"
                  }`}
                >
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: d.color }}
                  />
                  <span>{d.label}</span>
                </button>
              );
            })}
          </div>
        )}
      </header>

      {/* ── AI RADAR CENTERED 2-COLUMN CONTAINER (max-w-[1080px]) ─────────── */}
      <div className="mx-auto flex w-full max-w-[1080px] items-start gap-12 px-5 py-8 sm:px-8 sm:py-10">
        {/* LEFT SLIM SIDEBAR (w-[210px] shrink-0, desktop) */}
        <aside className="sticky top-10 hidden w-[210px] shrink-0 flex-col justify-between gap-8 lg:flex">
          <div className="flex flex-col gap-7">
            <div className="px-2">
              <Link href="/" aria-label="BENCH 홈">
                <BenchLogo />
              </Link>
              <p className="mt-2 text-[12.5px] leading-snug text-[#6E675C]">
                해외 신상 프로덕트 × AI 기술 기획 레이더
              </p>
            </div>

            {/* 4 Primary Menus */}
            <nav aria-label="주요 메뉴" className="flex flex-col gap-1">
              {menuItems.map(({ id, label, count, Icon }) => {
                const active = activeView === id;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setActiveView(id)}
                    className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-[15px] ${
                      active
                        ? "bg-[#EBE5D8] font-bold text-[#1E1C19]"
                        : "font-medium text-[#3D3831] hover:bg-[#EBE5D8]/60 hover:text-[#1E1C19]"
                    }`}
                  >
                    <span className="inline-flex items-center gap-2.5">
                      <Icon className="h-4 w-4 shrink-0" />
                      <span>{label}</span>
                    </span>
                    <span className="tnum text-[13px] text-[#6E675C]">{count}</span>
                  </button>
                );
              })}
            </nav>

            {/* 6 Universal Domains */}
            <section aria-label="분야 필터">
              <div className="border-b-[1.5px] border-[#1E1C19] px-2 pb-2 text-[13.5px] font-bold text-[#1E1C19]">
                분야
              </div>
              <div className="mt-2 flex flex-col gap-0.5">
                <button
                  type="button"
                  onClick={() => {
                    setDomainFilter("all");
                    setActiveView("radar");
                  }}
                  className={`flex w-full items-center justify-between rounded-xl px-2.5 py-2 text-left text-[14.5px] ${
                    domainFilter === "all" && activeView === "radar"
                      ? "bg-[#EBE5D8] font-bold text-[#1E1C19]"
                      : "font-medium text-[#3D3831] hover:bg-[#EBE5D8]/60"
                  }`}
                >
                  <span className="inline-flex items-center gap-2.5">
                    <span className="h-2 w-2 rounded-full bg-[#1E1C19]" />
                    <span>전체</span>
                  </span>
                  <span className="tnum text-[13px] text-[#6E675C]">{domainCounts.all}</span>
                </button>

                {DOMAIN_LIST.map((domain) => {
                  const active = domainFilter === domain.slug && activeView === "radar";
                  return (
                    <button
                      key={domain.slug}
                      type="button"
                      onClick={() => {
                        setDomainFilter(domain.slug);
                        setActiveView("radar");
                      }}
                      className={`flex w-full items-center justify-between rounded-xl px-2.5 py-2 text-left text-[14.5px] ${
                        active
                          ? "bg-[#EBE5D8] font-bold text-[#1E1C19]"
                          : "font-medium text-[#3D3831] hover:bg-[#EBE5D8]/60"
                      }`}
                    >
                      <span className="inline-flex items-center gap-2.5 truncate">
                        <span
                          className="h-2 w-2 shrink-0 rounded-full"
                          style={{ backgroundColor: domain.color }}
                        />
                        <span className="truncate">{domain.label}</span>
                      </span>
                      <span className="tnum text-[13px] text-[#6E675C]">
                        {domainCounts[domain.slug] ?? 0}
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>
          </div>

          {/* Quiet Footer */}
          <div className="border-t border-[#E7E0D3] px-2 pt-4">
            <button
              type="button"
              onClick={handleLiveSync}
              disabled={isSyncing}
              className="inline-flex items-center gap-1.5 text-[12.5px] font-medium text-[#6E675C] hover:text-[#1E1C19]"
            >
              <RefreshIcon className="h-3.5 w-3.5" />
              <span>
                {isSyncing ? "실데이터 갱신 중" : `최근 동기화 · ${formatTime(lastSyncedAt)}`}
              </span>
            </button>
          </div>
        </aside>

        {/* ── CENTER FOCUSED FEED AREA (max-w-[760px]) ────────────────────── */}
        <main className="min-w-0 flex-1 max-w-[760px]">
          {/* Section Title & Subtitle */}
          <header className="border-b border-[#E7E0D3] pb-5">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <div className="flex flex-wrap items-baseline gap-2.5">
                <h1 className="text-[26px] font-bold leading-tight tracking-[-0.025em] text-[#1E1C19] sm:text-[30px]">
                  {VIEW_META[activeView].title}
                </h1>
                {activeView === "radar" && domainFilter !== "all" && (
                  <span
                    className="text-[15px] font-semibold"
                    style={{ color: DOMAIN_MAP[domainFilter].color }}
                  >
                    · {DOMAIN_MAP[domainFilter].label}
                  </span>
                )}
              </div>
              <span className="tnum text-[14px] font-medium text-[#6E675C]">
                {activeView === "radar"
                  ? `${displayedTreatments.length}건`
                  : activeView === "builders"
                  ? `${filteredBuilders.length}건`
                  : activeView === "ai-radar"
                  ? `${radars.length}건`
                  : `${savedTreatments.length}건`}
              </span>
            </div>
            <p className="mt-1.5 text-[15px] leading-relaxed text-[#6E675C]">
              {VIEW_META[activeView].subtitle}
            </p>

            {/* Clean 1-Line Custom Topic Input Bar */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleGenerateTopic(topicInput);
              }}
              className="mt-4 flex flex-col gap-2 sm:flex-row"
            >
              <div className="flex flex-1 items-center rounded-xl border border-[#E7E0D3] bg-[#FFFCF7] px-3.5 focus-within:border-[#23201C]">
                <input
                  type="text"
                  value={topicInput}
                  onChange={(e) => setTopicInput(e.target.value)}
                  placeholder="관심 있는 주제를 입력해 보세요 (예: 필름카메라, 독립출판, 빈티지 가구, 러닝)"
                  aria-label="관심 있는 주제 입력"
                  className="w-full bg-transparent py-2.5 text-[14.5px] text-[#1E1C19] placeholder:text-[#6E675C] focus:outline-none"
                />
                {topicInput && (
                  <button
                    type="button"
                    onClick={() => {
                      setTopicInput("");
                      handleGenerateTopic("");
                    }}
                    aria-label="입력 지우기"
                    className="ml-1 text-[#6E675C] hover:text-[#1E1C19]"
                  >
                    <XIcon className="h-4 w-4" />
                  </button>
                )}
              </div>

              <div className="flex shrink-0 gap-2">
                <button
                  type="submit"
                  className="inline-flex flex-1 items-center justify-center rounded-xl bg-[#23201C] px-4 py-2.5 text-[14px] font-semibold text-[#FFFCF7] hover:bg-[#36322C] sm:flex-initial"
                >
                  아이디어 뽑기
                </button>
                <button
                  type="button"
                  onClick={handleShuffleIdea}
                  className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-[#E7E0D3] bg-[#FFFCF7] px-3.5 py-2.5 text-[14px] font-semibold text-[#3D3831] hover:border-[#23201C] hover:text-[#1E1C19]"
                >
                  <ShuffleIcon className="h-3.5 w-3.5" />
                  <span>새로 섞기</span>
                </button>
              </div>
            </form>

            {syncNotice && (
              <div className="mt-3 flex items-center justify-between rounded-xl border border-[#E7E0D3] bg-[#F9F5EC] px-3.5 py-2 text-[13.5px] text-[#3D3831]">
                <span>{syncNotice}</span>
                <button
                  type="button"
                  onClick={() => setSyncNotice("")}
                  className="font-semibold text-[#6E675C] hover:text-[#1E1C19]"
                >
                  닫기
                </button>
              </div>
            )}
          </header>

          {/* ── VIEW 1: 기획 레이더 (AI Radar 1:1 Card Rhythm) ─────────────── */}
          {activeView === "radar" && (
            <div className="mt-6 space-y-4">
              {activeTopic && (
                <div className="flex items-center justify-between rounded-xl border border-[#E7E0D3] bg-[#FBF7EE] px-4 py-2.5 text-[13.5px] text-[#3D3831]">
                  <span>
                    <strong className="text-[#1E1C19]">"{activeTopic}"</strong> 주제로 맞춤 기획안을 뽑았습니다.
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setTopicInput("");
                      handleGenerateTopic("");
                    }}
                    className="font-semibold text-[#C85A32] hover:underline"
                  >
                    전체 보기로 돌아가기
                  </button>
                </div>
              )}

              {/* 1) Featured Lead Card */}
              {leadTreatment && renderTreatmentCard(leadTreatment, "lead")}

              {/* 2) 2-Column Balanced Pair (#2 & #3) */}
              {featurePair.length > 0 && (
                <div className="grid grid-cols-1 gap-3.5 md:grid-cols-2">
                  {featurePair.map((item) => renderTreatmentCard(item, "feature"))}
                </div>
              )}

              {/* 3) Airy 1-Column Card Stack (#4+) */}
              {streamRest.length > 0 && (
                <div className="space-y-3.5">
                  {streamRest.map((item) => renderTreatmentCard(item, "stream"))}
                </div>
              )}
            </div>
          )}

          {/* ── VIEW 2: 해외 신상 원액 ────────────────────────────────────── */}
          {activeView === "builders" && (
            <div className="mt-5 space-y-4">
              <div className="flex flex-wrap items-center gap-1.5">
                {[
                  { id: "all", label: "전체" },
                  { id: "verified", label: "검증 수익 (MRR)" },
                  { id: "show_hn", label: "Show HN" },
                  { id: "product_hunt", label: "Product Hunt" },
                  { id: "uneed", label: "Uneed" },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setSourceFilter(tab.id)}
                    className={`rounded-full px-3.5 py-1.5 text-[13.5px] font-medium ${
                      sourceFilter === tab.id
                        ? "bg-[#23201C] font-semibold text-[#FFFCF7]"
                        : "border border-[#E7E0D3] bg-[#FFFCF7] text-[#3D3831] hover:border-[#23201C]"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <div className="space-y-3.5">
                {filteredBuilders.map((b) => (
                  <article
                    key={b.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => setModalSelection({ type: "builder", builder: b })}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setModalSelection({ type: "builder", builder: b });
                      }
                    }}
                    className="nordic-card flex cursor-pointer flex-col gap-2.5 p-5 sm:p-6"
                  >
                    <div className="flex flex-wrap items-center gap-2 text-[13px]">
                      <span
                        className="inline-flex items-center gap-1.5 font-semibold"
                        style={{ color: b.verifiedRevenue ? "#3F6A52" : "#C85A32" }}
                      >
                        <span
                          className="h-2 w-2 rounded-full"
                          style={{ backgroundColor: b.verifiedRevenue ? "#3F6A52" : "#C85A32" }}
                        />
                        {b.sourceLabel}
                      </span>
                      <span className="text-[#C5BCA8]">·</span>
                      <span className="tnum font-semibold text-[#1E1C19]">
                        {formatShortMetric(b)}
                      </span>
                      <span className="text-[#C5BCA8]">·</span>
                      <span className="text-[#6E675C]">{b.mechanismLabel}</span>
                    </div>

                    <h2 className="text-[18px] font-bold leading-snug text-[#1E1C19] sm:text-[19px]">
                      {b.name}
                    </h2>
                    <p className="line-clamp-2 text-[15px] leading-[1.68] text-[#4A443C]">
                      {b.taglineKo}
                    </p>

                    <div className="flex items-center justify-end pt-1">
                      <span className="inline-flex items-center gap-1 text-[13.5px] font-semibold text-[#6E675C]">
                        <span>자세히 보기</span>
                        <ArrowRightIcon className="h-3.5 w-3.5" />
                      </span>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          )}

          {/* ── VIEW 3: AI 기술 재료 ──────────────────────────────────────── */}
          {activeView === "ai-radar" && (
            <div className="mt-5 space-y-3.5">
              {radars.map((r) => (
                <article
                  key={r.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => setModalSelection({ type: "radar", radar: r })}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setModalSelection({ type: "radar", radar: r });
                    }
                  }}
                  className="nordic-card flex cursor-pointer flex-col gap-2.5 p-5 sm:p-6"
                >
                  <div className="flex flex-wrap items-center gap-2 text-[13px]">
                    <span className="inline-flex items-center gap-1.5 font-semibold text-[#3B6380]">
                      <span className="h-2 w-2 rounded-full bg-[#3B6380]" />
                      {r.platformId}
                    </span>
                    <span className="text-[#C5BCA8]">·</span>
                    <span className="text-[#6E675C]">{r.planningMeta.signalType}</span>
                  </div>

                  <h2 className="text-[18px] font-bold leading-snug text-[#1E1C19] sm:text-[19px]">
                    {r.titleKo}
                  </h2>
                  <p className="line-clamp-2 text-[15px] leading-[1.68] text-[#4A443C]">
                    {r.whatKo || r.highlightSummary}
                  </p>

                  <div className="flex items-center justify-end pt-1">
                    <span className="inline-flex items-center gap-1 text-[13.5px] font-semibold text-[#6E675C]">
                      <span>자세히 보기</span>
                      <ArrowRightIcon className="h-3.5 w-3.5" />
                    </span>
                  </div>
                </article>
              ))}
            </div>
          )}

          {/* ── VIEW 4: 내 보관함 ─────────────────────────────────────────── */}
          {activeView === "saved" && (
            <div className="mt-5 space-y-4">
              {savedTreatments.length > 0 && (
                <div className="flex items-center justify-between rounded-xl border border-[#E7E0D3] bg-[#FFFCF7] px-4 py-3 text-[13.5px] text-[#3D3831]">
                  <span>저장한 기획안을 링크 하나로 공유할 수 있습니다.</span>
                  <button
                    type="button"
                    onClick={handleCopySavedShareUrl}
                    className="rounded-full bg-[#23201C] px-3.5 py-1.5 text-[13px] font-semibold text-[#FFFCF7]"
                  >
                    보관함 링크 복사
                  </button>
                </div>
              )}

              {savedTreatments.length === 0 ? (
                <div className="nordic-card px-6 py-14 text-center">
                  <p className="text-[16px] font-bold text-[#1E1C19]">
                    아직 저장한 기획안이 없습니다.
                  </p>
                  <p className="mt-2 text-[14.5px] text-[#6E675C]">
                    마음에 드는 기획 카드를 눌러 [보관함에 저장]을 누르면 이곳에 차곡차곡 모입니다.
                  </p>
                  <button
                    type="button"
                    onClick={() => setActiveView("radar")}
                    className="mt-5 rounded-full bg-[#23201C] px-5 py-2.5 text-[14px] font-semibold text-[#FFFCF7]"
                  >
                    기획 레이더 보러 가기
                  </button>
                </div>
              ) : (
                <div className="space-y-3.5">
                  {savedTreatments.map((item) => renderTreatmentCard(item, "stream"))}
                </div>
              )}
            </div>
          )}
        </main>
      </div>

      {/* ── AI RADAR STYLE CENTERED FOCUS MODAL ───────────────────────────── */}
      <TreatmentModal
        selection={modalSelection}
        savedIdSet={savedIdSet}
        lineageMap={lineageMap}
        onClose={closeModal}
        onSelectTreatment={(tr) => openTreatmentModal(tr, false)}
        onBranchDomain={handleBranchDomain}
        onEvolveTreatment={handleEvolveTreatment}
        onToggleSave={handleToggleSave}
        onSynthesizeFromBuilder={handleSynthesizeFromBuilder}
        onSynthesizeFromRadar={handleSynthesizeFromRadar}
      />
    </div>
  );
}
