"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { DOMAIN_LIST, isValidDomainSlug } from "@/lib/domains";
import {
  decodeSavedParam,
  encodeSavedParam,
  loadSavedTreatmentsFromStorage,
  mergeSavedWithSeedIds,
  saveTreatmentsToStorage,
} from "@/lib/saved-store";
import { matchAiRadarFor, synthesizeTreatment } from "@/lib/synthesis-engine";
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
  ExternalLinkIcon,
  RadarIcon,
  RefreshIcon,
  ShuffleIcon,
  WorkbenchIcon,
  XIcon,
} from "./Icons";
import { TreatmentDetailSheet } from "./TreatmentDetailSheet";

type ActiveTab = "workbench" | "builders" | "ai-radar" | "saved";

interface WorkbenchClientProps {
  initialTreatments: Treatment[];
  initialBuilders: BuilderSignal[];
  initialRadars: AiRadarSignal[];
  initialSyncMeta: SyncMeta;
}

export function WorkbenchClient({
  initialTreatments,
  initialBuilders,
  initialRadars,
  initialSyncMeta,
}: WorkbenchClientProps) {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<ActiveTab>(() => {
    const t = searchParams.get("tab");
    if (t === "builders" || t === "ai-radar" || t === "saved") return t;
    return "workbench";
  });

  const [domainFilter, setDomainFilter] = useState<DomainSlug | "all">(() => {
    const d = searchParams.get("domain");
    return d && isValidDomainSlug(d) ? d : "all";
  });

  const [builders, setBuilders] = useState<BuilderSignal[]>(initialBuilders);
  const [radars, setRadars] = useState<AiRadarSignal[]>(initialRadars);
  const [treatments, setTreatments] = useState<Treatment[]>(initialTreatments);
  const [customTopicInput, setCustomTopicInput] = useState("");
  const [activeTopic, setActiveTopic] = useState<string>("");
  const [sourceFilter, setSourceFilter] = useState<string>("all");
  const [verifiedOnly, setVerifiedOnly] = useState<boolean>(false);
  const [radarSignalTypeFilter, setRadarSignalTypeFilter] = useState<string>("all");
  const [comboCounter, setComboCounter] = useState<number>(initialTreatments.length);
  const [mobileShowDetail, setMobileShowDetail] = useState<boolean>(false);
  const [syncNotice, setSyncNotice] = useState<string>("");
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<string>(initialSyncMeta.syncedAt);

  const [lineageMap, setLineageMap] = useState<Record<string, Treatment>>(() =>
    Object.fromEntries(initialTreatments.map((t) => [t.id, t]))
  );

  const [selectedId, setSelectedId] = useState<string>(() => {
    const reqId = searchParams.get("treatment");
    if (reqId && initialTreatments.some((t) => t.id === reqId)) return reqId;
    return initialTreatments[0]?.id || "";
  });

  const [savedTreatments, setSavedTreatments] = useState<Treatment[]>([]);

  // Hydrate saved treatments from localStorage + ?saved= URL parameter
  useEffect(() => {
    const stored = loadSavedTreatmentsFromStorage(window.localStorage);
    const urlIds = decodeSavedParam(searchParams.get("saved"));
    const merged = mergeSavedWithSeedIds(stored, urlIds, initialTreatments);
    setSavedTreatments(merged);
    if (urlIds.length > 0 && merged.length > 0) {
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

  const selectedTreatment: Treatment = useMemo(() => {
    return (
      lineageMap[selectedId] ||
      treatments.find((t) => t.id === selectedId) ||
      savedTreatments.find((t) => t.id === selectedId) ||
      treatments[0]
    );
  }, [lineageMap, selectedId, treatments, savedTreatments]);

  const registerAndSelect = (tr: Treatment, prependToList = true) => {
    setLineageMap((prev) => ({ ...prev, [tr.id]: tr }));
    if (prependToList) {
      setTreatments((prev) => [tr, ...prev.filter((item) => item.id !== tr.id)]);
    }
    setSelectedId(tr.id);
    setMobileShowDetail(true);
  };

  // Filtered Workbench Treatments (or re-synthesized immediately when custom topic is active)
  const displayedTreatments = useMemo(() => {
    const list =
      domainFilter === "all"
        ? treatments
        : treatments.filter((t) => t.domainSlug === domainFilter);
    return list;
  }, [treatments, domainFilter]);

  const filteredBuilders = useMemo(() => {
    return builders.filter((b) => {
      if (sourceFilter !== "all" && b.source !== sourceFilter) return false;
      if (verifiedOnly && !b.verifiedRevenue) return false;
      return true;
    });
  }, [builders, sourceFilter, verifiedOnly]);

  const radarSignalTypes = useMemo(() => {
    return Array.from(new Set(radars.map((r) => r.planningMeta.signalType))).sort();
  }, [radars]);

  const filteredRadars = useMemo(() => {
    if (radarSignalTypeFilter === "all") return radars;
    return radars.filter((r) => r.planningMeta.signalType === radarSignalTypeFilter);
  }, [radars, radarSignalTypeFilter]);

  // Real-time custom topic re-synthesis (and X URL oEmbed intake)
  const applyCustomTopic = async (rawTopic: string) => {
    const trimmed = rawTopic.trim();
    setActiveTopic(trimmed);

    if (!trimmed) {
      setTreatments(initialTreatments);
      if (initialTreatments[0]) setSelectedId(initialTreatments[0].id);
      return;
    }

    const targetDomain: DomainSlug =
      domainFilter === "all" ? DOMAIN_LIST[0].slug : domainFilter;

    if (isXPostUrl(trimmed)) {
      setSyncNotice("X 런칭 포스트를 oEmbed로 추출해 합성 중입니다.");
      try {
        const res = await fetch("/api/synthesize", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ xPostUrl: trimmed, domainSlug: targetDomain }),
        });
        if (res.ok) {
          const data = (await res.json()) as { treatment?: Treatment };
          if (data.treatment) {
            registerAndSelect(data.treatment, true);
            setActiveTab("workbench");
            setSyncNotice("X oEmbed 런칭 포스트 기반 기획안이 생성되었습니다.");
            return;
          }
        }
      } catch {
        setSyncNotice("X 포스트 조회에 실패해 일반 주제로 합성합니다.");
      }
    }

    // Deterministic 0ms instant batch re-synthesis of top 6 diverse overseas signals for this topic
    const pickedBuilders = builders.slice(0, 6);
    const regenerated = pickedBuilders.map((builder, idx) => {
      const domSlug: DomainSlug =
        domainFilter === "all"
          ? DOMAIN_LIST[idx % DOMAIN_LIST.length].slug
          : domainFilter;
      const radar = matchAiRadarFor(builder, domSlug, radars, idx);
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
      setSelectedId(regenerated[0].id);
      setComboCounter((c) => c + regenerated.length);
      setActiveTab("workbench");
    }
  };

  // [새 조합 뽑기] button — instant 0ms new cross-combination
  const handleDrawNewCombination = () => {
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
    registerAndSelect(fresh, true);
    setActiveTab("workbench");
  };

  // [이 재료로 기획 뽑기 ->] from Overseas Builder Radar
  const handlePickBuilder = (builder: BuilderSignal) => {
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
    registerAndSelect(fresh, true);
    setActiveTab("workbench");
  };

  // [이 재료로 기획 뽑기 ->] from AI Radar Technical Ingredients
  const handlePickRadar = (radar: AiRadarSignal) => {
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
    registerAndSelect(fresh, true);
    setActiveTab("workbench");
  };

  // [같은 해외 근거로 다른 도메인 뽑기 (A -> Z)]
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
    registerAndSelect(branched, true);
  };

  // [다른 해외 기능 추가 샘플링 (B -> C 진화)]
  const handleEvolveTreatment = (parent: Treatment) => {
    const nextIdx = comboCounter + 1;
    setComboCounter(nextIdx);
    const baseBuilder =
      builders.find((b) => b.id === parent.sampleA.builderId) || builders[0];

    // Pick a distinct overseas product with a complementary mechanism
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

    // Ensure parent is stored in lineageMap for instant breadcrumb navigation
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
    registerAndSelect(evolved, true);
  };

  const handleToggleSave = (tr: Treatment) => {
    setSavedTreatments((prev) => {
      const exists = prev.some((item) => item.id === tr.id);
      const next = exists
        ? prev.filter((item) => item.id !== tr.id)
        : [tr, ...prev];
      saveTreatmentsToStorage(window.localStorage, next);
      return next;
    });
  };

  const handleCopyShareUrl = async () => {
    const ids = savedTreatments.some((t) => t.id === selectedTreatment.id)
      ? savedTreatments.map((t) => t.id)
      : [selectedTreatment.id, ...savedTreatments.map((t) => t.id)];
    const encoded = encodeSavedParam(ids);
    const url = new URL(window.location.href);
    url.searchParams.set("tab", "saved");
    url.searchParams.set("saved", encoded);
    url.searchParams.set("treatment", selectedTreatment.id);
    try {
      await navigator.clipboard.writeText(url.toString());
    } catch {
      // Ignore clipboard permission errors
    }
    router.replace(`/?tab=saved&saved=${encodeURIComponent(encoded)}&treatment=${encodeURIComponent(selectedTreatment.id)}`, {
      scroll: false,
    });
  };

  // Runtime live sync against /api/live-sync (AI Radar Raw + Show HN live)
  const handleLiveSync = async () => {
    setIsSyncing(true);
    setSyncNotice("AI Radar 원격 피드와 Show HN 신규 시그널을 동기화하는 중입니다.");
    try {
      const res = await fetch("/api/live-sync");
      if (res.ok) {
        const data = (await res.json()) as {
          syncedAt: string;
          liveRadarFetched: boolean;
          liveShowHnAdded: number;
          aiRadars: AiRadarSignal[];
          builders: BuilderSignal[];
        };
        if (Array.isArray(data.aiRadars) && data.aiRadars.length > 0) {
          setRadars(data.aiRadars);
        }
        if (Array.isArray(data.builders) && data.builders.length > 0) {
          setBuilders(data.builders);
        }
        setLastSyncedAt(data.syncedAt);
        setSyncNotice(
          `동기화 완료: AI Radar ${data.aiRadars.length}건 · 해외 빌더 ${data.builders.length}건 (신규 Show HN +${data.liveShowHnAdded})`
        );
      }
    } catch {
      setSyncNotice("원격 동기화에 일시적 지연이 발생해 로컬 스냅샷을 유지합니다.");
    } finally {
      setIsSyncing(false);
    }
  };

  const formatShortDate = (iso: string) => {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "";
    return `${d.getMonth() + 1}.${d.getDate()} ${String(d.getHours()).padStart(2, "0")}:${String(
      d.getMinutes()
    ).padStart(2, "0")}`;
  };

  return (
    <div className="flex min-h-screen w-full flex-col bg-[#FAFAFA] text-[#111111] lg:h-screen lg:flex-row lg:overflow-hidden">
      {/* ── LEFT SLIM NAVIGATION (220px) ──────────────────────────────────── */}
      <aside className="flex w-full shrink-0 flex-col justify-between border-b border-[#E5E7EB] bg-[#FFFFFF] lg:w-[220px] lg:border-b-0 lg:border-r">
        <div>
          <div className="flex items-center justify-between border-b border-[#E5E7EB] px-5 py-4">
            <Link href="/" aria-label="BENCH 홈">
              <BenchLogo className="h-5 w-auto" />
            </Link>
            <span className="font-mono text-[10px] font-semibold uppercase tracking-wider text-[#4B5563]">
              ED.01
            </span>
          </div>

          <nav aria-label="주 내비게이션" className="grid grid-cols-2 gap-1 p-3 lg:grid-cols-1">
            {[
              {
                id: "workbench" as const,
                label: "기획 워크벤치",
                count: displayedTreatments.length,
                Icon: WorkbenchIcon,
              },
              {
                id: "builders" as const,
                label: "해외 원액 레이더",
                count: builders.length,
                Icon: RadarIcon,
              },
              {
                id: "ai-radar" as const,
                label: "AI 기술 재료",
                count: radars.length,
                Icon: ChipIcon,
              },
              {
                id: "saved" as const,
                label: "보관함",
                count: savedTreatments.length,
                Icon: BookmarkIcon,
              },
            ].map(({ id, label, count, Icon }) => {
              const active = activeTab === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => {
                    setActiveTab(id);
                    setMobileShowDetail(false);
                  }}
                  className={`flex items-center justify-between border px-3 py-2 text-left text-xs font-semibold ${
                    active
                      ? "border-[#111111] bg-[#111111] text-[#FFFFFF]"
                      : "border-transparent bg-transparent text-[#374151] hover:border-[#E5E7EB] hover:bg-[#FAFAFA] hover:text-[#111111]"
                  }`}
                >
                  <span className="inline-flex items-center gap-2">
                    <Icon className="h-3.5 w-3.5 shrink-0" />
                    <span>{label}</span>
                  </span>
                  <span
                    className={`font-mono text-[11px] ${
                      active ? "text-[#FFFFFF]" : "text-[#4B5563]"
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </nav>

          {/* Bottom Quick Domain Lenses */}
          <div className="hidden border-t border-[#E5E7EB] px-4 py-4 lg:block">
            <div className="text-[11px] font-bold uppercase tracking-wider text-[#4B5563]">
              도메인 렌즈
            </div>
            <ul className="mt-2 space-y-1">
              {DOMAIN_LIST.map((domain) => {
                const isActive = domainFilter === domain.slug;
                return (
                  <li key={domain.slug} className="flex items-center justify-between gap-1">
                    <button
                      type="button"
                      onClick={() => {
                        setDomainFilter(isActive ? "all" : domain.slug);
                        setActiveTab("workbench");
                      }}
                      className={`flex-1 px-2 py-1 text-left text-xs font-medium ${
                        isActive
                          ? "bg-[#111111] text-[#FFFFFF]"
                          : "text-[#374151] hover:bg-[#FAFAFA] hover:text-[#111111]"
                      }`}
                    >
                      {domain.label}
                    </button>
                    <Link
                      href={`/domain/${domain.slug}`}
                      title={`${domain.label} 허브 페이지`}
                      className="p-1 text-[#4B5563] hover:text-[#111111]"
                    >
                      <ExternalLinkIcon className="h-3 w-3" />
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>

        {/* Bottom Live Signal Sync Footer */}
        <div className="hidden border-t border-[#E5E7EB] bg-[#FAFAFA] p-4 lg:block">
          <div className="flex items-center justify-between text-[11px] text-[#4B5563]">
            <span>실데이터 스냅샷</span>
            <span className="font-mono">{formatShortDate(lastSyncedAt)}</span>
          </div>
          <div className="mt-1.5 flex items-center gap-3 text-[11px] font-medium text-[#374151]">
            <span className="inline-flex items-center gap-1">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-[#15803D]" />
              수익 {builders.filter((b) => b.verifiedRevenue).length}
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-[#D9381E]" />
              AI {radars.length}
            </span>
          </div>
          <button
            type="button"
            onClick={handleLiveSync}
            disabled={isSyncing}
            className="mt-2.5 flex w-full items-center justify-center gap-1.5 border border-[#E5E7EB] bg-[#FFFFFF] px-2.5 py-1.5 text-xs font-semibold text-[#111111] hover:border-[#111111] disabled:opacity-60"
          >
            <RefreshIcon className="h-3.5 w-3.5" />
            <span>{isSyncing ? "동기화 실행 중" : "실시간 수맥 동기화"}</span>
          </button>
        </div>
      </aside>

      {/* ── CENTER LIST & CONTROL PANEL ───────────────────────────────────── */}
      <main
        className={`${
          mobileShowDetail ? "hidden lg:flex" : "flex"
        } min-w-0 flex-1 flex-col bg-[#FAFAFA] lg:h-screen lg:overflow-hidden`}
      >
        {/* Top Domain Filter Bar + Inline Custom Topic Input + Draw Button */}
        <header className="shrink-0 border-b border-[#E5E7EB] bg-[#FFFFFF] px-5 py-3.5">
          {/* Domain Filter Strip */}
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => setDomainFilter("all")}
              className={`border px-2.5 py-1 text-xs font-semibold ${
                domainFilter === "all"
                  ? "border-[#111111] bg-[#111111] text-[#FFFFFF]"
                  : "border-[#E5E7EB] bg-[#FFFFFF] text-[#374151] hover:border-[#111111] hover:text-[#111111]"
              }`}
            >
              전체
            </button>
            {DOMAIN_LIST.map((domain) => {
              const active = domainFilter === domain.slug;
              return (
                <button
                  key={domain.slug}
                  type="button"
                  onClick={() => setDomainFilter(domain.slug)}
                  className={`border px-2.5 py-1 text-xs font-semibold ${
                    active
                      ? "border-[#111111] bg-[#111111] text-[#FFFFFF]"
                      : "border-[#E5E7EB] bg-[#FFFFFF] text-[#374151] hover:border-[#111111] hover:text-[#111111]"
                  }`}
                >
                  {domain.label}
                </button>
              );
            })}
          </div>

          {/* Inline Custom Topic Input + [새 조합 뽑기] */}
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                applyCustomTopic(customTopicInput);
              }}
              className="flex flex-1 items-center border border-[#E5E7EB] bg-[#FAFAFA] focus-within:border-[#111111] focus-within:bg-[#FFFFFF]"
            >
              <input
                type="text"
                value={customTopicInput}
                onChange={(e) => {
                  const val = e.target.value;
                  setCustomTopicInput(val);
                  if (!isXPostUrl(val)) {
                    applyCustomTopic(val);
                  }
                }}
                placeholder="내가 만들고 싶은 주제 직접 입력 (예: 성수 팝업 웨이팅 지도, 필름 카메라 시세표 또는 X URL)"
                aria-label="내가 만들고 싶은 주제 직접 입력"
                className="w-full bg-transparent px-3 py-2 text-xs text-[#111111] placeholder:text-[#4B5563] focus:outline-none"
              />
              {customTopicInput && (
                <button
                  type="button"
                  onClick={() => {
                    setCustomTopicInput("");
                    applyCustomTopic("");
                  }}
                  aria-label="입력 지우기"
                  className="px-2 text-[#4B5563] hover:text-[#111111]"
                >
                  <XIcon className="h-3.5 w-3.5" />
                </button>
              )}
              <button
                type="submit"
                className="shrink-0 border-l border-[#E5E7EB] px-3 py-2 text-xs font-semibold text-[#111111] hover:bg-[#111111] hover:text-[#FFFFFF]"
              >
                재합성
              </button>
            </form>

            <button
              type="button"
              onClick={handleDrawNewCombination}
              className="inline-flex shrink-0 items-center justify-center gap-1.5 border border-[#111111] bg-[#111111] px-4 py-2 text-xs font-semibold text-[#FFFFFF] hover:bg-[#374151]"
            >
              <ShuffleIcon className="h-3.5 w-3.5" />
              <span>새 조합 뽑기</span>
            </button>
          </div>

          {syncNotice && (
            <div className="mt-2 flex items-center justify-between border border-[#E5E7EB] bg-[#FAFAFA] px-3 py-1.5 text-xs text-[#374151]">
              <span>{syncNotice}</span>
              <button
                type="button"
                onClick={() => setSyncNotice("")}
                className="text-[#4B5563] hover:text-[#111111]"
              >
                닫기
              </button>
            </div>
          )}
        </header>

        {/* Scrollable Editorial Feed Area */}
        <div className="flex-1 overflow-y-auto">
          {/* VIEW 1: 기획 워크벤치 */}
          {activeTab === "workbench" && (
            <div>
              <div className="flex items-center justify-between border-b border-[#E5E7EB] bg-[#FAFAFA] px-5 py-2.5 text-xs text-[#4B5563]">
                <span>
                  합성 트리트먼트{" "}
                  <strong className="font-mono text-[#111111]">
                    {displayedTreatments.length}
                  </strong>
                  건{activeTopic ? ` · 맞춤 주제 "${activeTopic}" 적용` : ""}
                </span>
                <span>클릭 즉시 우측 시트에 전문 오픈</span>
              </div>

              <ul className="divide-y divide-[#E5E7EB] bg-[#FFFFFF]">
                {displayedTreatments.map((item) => {
                  const isSelected = selectedTreatment?.id === item.id;
                  return (
                    <li key={item.id}>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedId(item.id);
                          setMobileShowDetail(true);
                        }}
                        className={`block w-full px-5 py-4 text-left ${
                          isSelected
                            ? "border-l-2 border-l-[#111111] bg-[#FAFAFA]"
                            : "border-l-2 border-l-transparent bg-[#FFFFFF] hover:bg-[#FAFAFA]"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2 text-[11px]">
                          <div className="flex items-center gap-2">
                            <span
                              className={`inline-block h-1.5 w-1.5 rounded-full ${
                                item.sampleA.verifiedRevenue
                                  ? "bg-[#15803D]"
                                  : "bg-[#D9381E]"
                              }`}
                            />
                            <span className="font-semibold text-[#111111]">
                              {item.domainLabel}
                            </span>
                            <span className="text-[#4B5563]">·</span>
                            <span className="text-[#4B5563]">{item.buildCadence}</span>
                            {item.sampleA2 && (
                              <span className="border border-[#111111] bg-[#111111] px-1.5 py-0.2 font-mono text-[10px] text-[#FFFFFF]">
                                B→C
                              </span>
                            )}
                          </div>
                          <span className="font-mono text-[#4B5563]">
                            {item.sampleA.tractionLabel}
                          </span>
                        </div>

                        <h3 className="mt-1.5 text-sm font-bold leading-snug text-[#111111]">
                          {item.title}
                        </h3>
                        <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-[#374151]">
                          {item.oneLineHook}
                        </p>

                        <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-[#4B5563]">
                          <span>
                            <strong className="text-[#111111]">A</strong> {item.sampleA.name} (
                            {item.sampleA.sourceLabel})
                          </span>
                          <span>×</span>
                          <span className="truncate max-w-[260px]">
                            <strong className="text-[#111111]">B</strong> {item.sampleB.titleKo}
                          </span>
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          {/* VIEW 2: 해외 원액 레이더 */}
          {activeTab === "builders" && (
            <div>
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#E5E7EB] bg-[#FAFAFA] px-5 py-2.5">
                <div className="flex flex-wrap items-center gap-1.5">
                  {[
                    { id: "all", label: "전체 수맥" },
                    { id: "trustmrr", label: "TrustMRR (검증 매출)" },
                    { id: "show_hn", label: "Show HN" },
                    { id: "product_hunt", label: "Product Hunt" },
                    { id: "uneed", label: "Uneed" },
                  ].map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setSourceFilter(s.id)}
                      className={`border px-2.5 py-1 text-xs font-medium ${
                        sourceFilter === s.id
                          ? "border-[#111111] bg-[#111111] text-[#FFFFFF]"
                          : "border-[#E5E7EB] bg-[#FFFFFF] text-[#374151] hover:border-[#111111]"
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
                <label className="inline-flex cursor-pointer items-center gap-1.5 text-xs font-medium text-[#374151]">
                  <input
                    type="checkbox"
                    checked={verifiedOnly}
                    onChange={(e) => setVerifiedOnly(e.target.checked)}
                    className="accent-[#111111]"
                  />
                  <span>검증 수익만</span>
                </label>
              </div>

              <ul className="divide-y divide-[#E5E7EB] bg-[#FFFFFF]">
                {filteredBuilders.map((b) => (
                  <li key={b.id} className="px-5 py-4 hover:bg-[#FAFAFA]">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2 text-[11px]">
                          <span
                            className={`inline-block h-1.5 w-1.5 rounded-full ${
                              b.verifiedRevenue ? "bg-[#15803D]" : "bg-[#D9381E]"
                            }`}
                          />
                          <span className="font-semibold text-[#111111]">{b.sourceLabel}</span>
                          <span className="font-mono font-semibold text-[#374151]">
                            {b.tractionLabel}
                          </span>
                          <span className="border border-[#E5E7EB] bg-[#FAFAFA] px-1.5 py-0.5 text-[#374151]">
                            {b.mechanismLabel}
                          </span>
                        </div>

                        <div className="mt-1.5 flex items-center gap-2">
                          <a
                            href={b.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-sm font-bold text-[#111111] underline decoration-[#E5E7EB] underline-offset-4 hover:decoration-[#111111]"
                          >
                            <span>{b.name}</span>
                            <ExternalLinkIcon className="h-3 w-3 shrink-0" />
                          </a>
                        </div>

                        <p className="mt-1 text-xs leading-relaxed text-[#374151]">
                          {b.taglineKo}
                        </p>
                        <p className="mt-1 text-[11px] leading-relaxed text-[#4B5563]">
                          {b.painPointKo}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => handlePickBuilder(b)}
                        className="inline-flex shrink-0 items-center gap-1 border border-[#111111] bg-[#FFFFFF] px-3 py-1.5 text-xs font-semibold text-[#111111] hover:bg-[#111111] hover:text-[#FFFFFF]"
                      >
                        <span>이 재료로 기획 뽑기</span>
                        <ArrowRightIcon className="h-3 w-3" />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* VIEW 3: AI 기술 재료 (AI Radar 100선) */}
          {activeTab === "ai-radar" && (
            <div>
              <div className="flex flex-wrap items-center gap-1.5 border-b border-[#E5E7EB] bg-[#FAFAFA] px-5 py-2.5">
                <button
                  type="button"
                  onClick={() => setRadarSignalTypeFilter("all")}
                  className={`border px-2.5 py-1 text-xs font-medium ${
                    radarSignalTypeFilter === "all"
                      ? "border-[#111111] bg-[#111111] text-[#FFFFFF]"
                      : "border-[#E5E7EB] bg-[#FFFFFF] text-[#374151]"
                  }`}
                >
                  전체 ({radars.length})
                </button>
                {radarSignalTypes.map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setRadarSignalTypeFilter(st)}
                    className={`border px-2.5 py-1 font-mono text-[11px] font-medium ${
                      radarSignalTypeFilter === st
                        ? "border-[#111111] bg-[#111111] text-[#FFFFFF]"
                        : "border-[#E5E7EB] bg-[#FFFFFF] text-[#374151]"
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>

              <ul className="divide-y divide-[#E5E7EB] bg-[#FFFFFF]">
                {filteredRadars.map((r) => (
                  <li key={r.id} className="px-5 py-4 hover:bg-[#FAFAFA]">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2 text-[11px]">
                          <span className="inline-block h-1.5 w-1.5 rounded-full bg-[#D9381E]" />
                          <span className="font-mono font-semibold text-[#111111]">
                            {r.platformId}
                          </span>
                          <span className="border border-[#E5E7EB] bg-[#FAFAFA] px-1.5 py-0.5 font-mono text-[#374151]">
                            {r.planningMeta.signalType}
                          </span>
                          <span className="font-mono text-[#4B5563]">
                            Score {r.importanceScore.toFixed(1)}
                          </span>
                        </div>

                        <a
                          href={r.canonicalUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-1.5 inline-flex items-start gap-1 text-sm font-bold text-[#111111] underline decoration-[#E5E7EB] underline-offset-4 hover:decoration-[#111111]"
                        >
                          <span>{r.titleKo}</span>
                          <ExternalLinkIcon className="mt-0.5 h-3 w-3 shrink-0" />
                        </a>

                        <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-[#374151]">
                          {r.whatKo || r.highlightSummary}
                        </p>
                        <div className="mt-1.5 text-[11px] text-[#4B5563]">
                          벤치마크 포인트: {r.planningMeta.benchmarkPoint}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handlePickRadar(r)}
                        className="inline-flex shrink-0 items-center gap-1 border border-[#111111] bg-[#FFFFFF] px-3 py-1.5 text-xs font-semibold text-[#111111] hover:bg-[#111111] hover:text-[#FFFFFF]"
                      >
                        <span>이 재료로 기획 뽑기</span>
                        <ArrowRightIcon className="h-3 w-3" />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* VIEW 4: 보관함 */}
          {activeTab === "saved" && (
            <div>
              <div className="flex items-center justify-between border-b border-[#E5E7EB] bg-[#FAFAFA] px-5 py-2.5 text-xs text-[#4B5563]">
                <span>
                  저장된 기획 트리트먼트{" "}
                  <strong className="font-mono text-[#111111]">
                    {savedTreatments.length}
                  </strong>
                  건 (로컬 보관 + 공유 URL 연동)
                </span>
                {savedTreatments.length > 0 && (
                  <button
                    type="button"
                    onClick={handleCopyShareUrl}
                    className="border border-[#111111] bg-[#FFFFFF] px-2.5 py-1 font-semibold text-[#111111] hover:bg-[#111111] hover:text-[#FFFFFF]"
                  >
                    보관함 URL 복사
                  </button>
                )}
              </div>

              {savedTreatments.length === 0 ? (
                <div className="p-8 text-center">
                  <p className="text-sm font-semibold text-[#111111]">
                    보관함에 채택된 기획안이 아직 없습니다.
                  </p>
                  <p className="mt-1.5 text-xs text-[#4B5563]">
                    우측 상세 시트 하단의 [보관함 저장]을 누르면 즉시 여기에 누적되고 공유 URL로 팀에 전달할 수 있습니다.
                  </p>
                  <button
                    type="button"
                    onClick={() => setActiveTab("workbench")}
                    className="mt-4 border border-[#111111] bg-[#111111] px-4 py-2 text-xs font-semibold text-[#FFFFFF]"
                  >
                    기획 워크벤치로 이동
                  </button>
                </div>
              ) : (
                <ul className="divide-y divide-[#E5E7EB] bg-[#FFFFFF]">
                  {savedTreatments.map((item) => (
                    <li
                      key={item.id}
                      className="flex items-start justify-between gap-3 px-5 py-4 hover:bg-[#FAFAFA]"
                    >
                      <button
                        type="button"
                        onClick={() => {
                          setLineageMap((prev) => ({ ...prev, [item.id]: item }));
                          setSelectedId(item.id);
                          setMobileShowDetail(true);
                        }}
                        className="min-w-0 flex-1 text-left"
                      >
                        <div className="text-[11px] font-semibold text-[#4B5563]">
                          {item.domainLabel} · {item.buildCadence}
                        </div>
                        <div className="mt-1 text-sm font-bold text-[#111111]">
                          {item.title}
                        </div>
                        <p className="mt-1 line-clamp-1 text-xs text-[#374151]">
                          {item.oneLineHook}
                        </p>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleToggleSave(item)}
                        className="shrink-0 border border-[#E5E7EB] px-2.5 py-1 text-xs text-[#4B5563] hover:border-[#111111] hover:text-[#111111]"
                      >
                        제거
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      </main>

      {/* ── RIGHT FIXED TREATMENT DETAIL SHEET (480px~540px) ──────────────── */}
      <section
        aria-label="기획 트리트먼트 상세 시트"
        className={`${
          mobileShowDetail ? "block" : "hidden lg:block"
        } w-full shrink-0 border-l border-[#E5E7EB] bg-[#FFFFFF] lg:h-screen lg:w-[490px] xl:w-[520px] 2xl:w-[540px]`}
      >
        {selectedTreatment && (
          <TreatmentDetailSheet
            treatment={selectedTreatment}
            isSaved={savedIdSet.has(selectedTreatment.id)}
            lineageMap={lineageMap}
            onSelectTreatment={(tr) => {
              setLineageMap((prev) => ({ ...prev, [tr.id]: tr }));
              setSelectedId(tr.id);
            }}
            onBranchDomain={handleBranchDomain}
            onEvolveTreatment={handleEvolveTreatment}
            onToggleSave={handleToggleSave}
            onCopyShareUrl={handleCopyShareUrl}
            onBackToList={() => setMobileShowDetail(false)}
          />
        )}
      </section>
    </div>
  );
}
