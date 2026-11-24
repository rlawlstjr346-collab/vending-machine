"use client";

import React from "react";
import { DOMAIN_MAP } from "@/lib/domains";
import type { DomainSlug, MechanismId, Treatment } from "@/lib/types";

export interface WireframeArchetypeMeta {
  id: MechanismId;
  badge: string;
  label: string;
  steps: [string, string, string];
}

export const WIREFRAME_ARCHETYPES: Record<MechanismId, WireframeArchetypeMeta> = {
  "visual-price-match": {
    id: "visual-price-match",
    badge: "시각·시세 비교",
    label: "이미지 스캔 · 유사 매물 시세 보드",
    steps: ["사진·링크 입력", "유사도·시세 분석", "대안 3종 비교"],
  },
  "timestamp-archive": {
    id: "timestamp-archive",
    badge: "구간 채집",
    label: "타임라인 컷 추출 · 컬러 팔레트 보드",
    steps: ["영상·글 링크", "핵심 구간 자동 추출", "스틸·팔레트 카드"],
  },
  "geo-curation": {
    id: "geo-curation",
    badge: "취향 지도",
    label: "스팟 핀 미니맵 · 취향 큐레이션 카드",
    steps: ["장소·테마 선택", "취향·동선 묶기", "지도·코스 카드"],
  },
  "canvas-compare": {
    id: "canvas-compare",
    badge: "나란히 비교",
    label: "3열 스펙·시안 비교 · 추천 결정 보드",
    steps: ["후보 2~3개 등록", "기준별 자동 정렬", "베스트 1초 확정"],
  },
  "audio-stem": {
    id: "audio-stem",
    badge: "사운드 스템",
    label: "웨이브폼 · 3레인 스템 분리 스케치",
    steps: ["오디오·음성 입력", "트랙·무드 자동 분리", "루프·체크리스트"],
  },
  "drop-validation": {
    id: "drop-validation",
    badge: "수요 검증",
    label: "드롭 프리뷰 티켓 · 실시간 투표 게이지",
    steps: ["초안·드롭 공개", "실시간 투표 집계", "대기자·수요 확보"],
  },
};

interface DomainWireframeContext {
  pathSlug: string;
  keyword: string;
  items: [string, string, string];
  prices: [string, string, string];
  spots: [string, string, string, string];
  tags: [string, string, string];
  palette: [string, string, string, string, string];
}

const DOMAIN_CONTEXT: Record<DomainSlug, DomainWireframeContext> = {
  "brand-commerce": {
    pathSlug: "commerce-dig",
    keyword: "빈티지 워크재킷",
    items: ["아카이브 캔버스 자켓", "워시드 데님 블루종", "헤비 트윌 초어코트"],
    prices: ["14.8만원", "11.2만원", "17.5만원"],
    spots: ["성수 팝업", "한남 쇼룸", "연남 빈티지", "을지로 편집샵"],
    tags: ["실루엣 94%", "소재 매칭", "중고 최저가"],
    palette: ["#0F172A", "#EA580C", "#94A3B8", "#334155", "#FDBA74"],
  },
  "cinema-video": {
    pathSlug: "cinema-cut",
    keyword: "네온 야경 트래킹 컷",
    items: ["광각 로우앵글 컷", "실루엣 백라이트 컷", "핸드헬드 클로즈업"],
    prices: ["00:18", "01:04", "02:32"],
    spots: ["오프닝 씬", "전환 컷", "클라이맥스", "엔딩 샷"],
    tags: ["35mm 렌즈", "로우키 조명", "색온도 4200K"],
    palette: ["#0F172A", "#2563EB", "#38BDF8", "#64748B", "#DBEAFE"],
  },
  "photo-visual": {
    pathSlug: "photo-board",
    keyword: "필름 룩북 셀렉트",
    items: ["자연광 포트레이트 A", "스튜디오 콘트라스트 B", "소프트 그레인 컷 C"],
    prices: ["A컷 추천", "톤 보정", "비교 후보"],
    spots: ["자연광 존", "호리존 A", "야외 테라스", "암실 톤"],
    tags: ["따뜻한 하이라이트", "선명도 96%", "클라이언트 픽"],
    palette: ["#1E293B", "#D97706", "#F59E0B", "#94A3B8", "#FEF3C7"],
  },
  "music-audio": {
    pathSlug: "audio-sketch",
    keyword: "4마디 로우파이 루프",
    items: ["보컬 · 멜로디", "드럼 · 리듬", "질감 · 앰비언스"],
    prices: ["118 BPM", "F minor", "4마디 루프"],
    spots: ["인트로 루프", "메인 비트", "브릿지 신스", "아웃트로"],
    tags: ["118 BPM", "로우파이 질감", "4마디 루프"],
    palette: ["#1E293B", "#9333EA", "#A855F7", "#64748B", "#E9D5FF"],
  },
  "local-archive": {
    pathSlug: "local-map",
    keyword: "주말 전시·서점 동선",
    items: ["성수 독립서점 아카이브", "을지로 바이닐 리스닝바", "서촌 사진 갤러리"],
    prices: ["도보 6분", "예약 불필요", "마감 D-3"],
    spots: ["독립서점", "바이닐 바", "사진 전시", "로스터리"],
    tags: ["조용한 공간", "반나절 코스", "주말 오픈"],
    palette: ["#0F172A", "#059669", "#34D399", "#64748B", "#D1FAE5"],
  },
  "creator-tool": {
    pathSlug: "maker-kit",
    keyword: "1분 요약 워크플로",
    items: ["자동 요약 템플릿 A", "체크리스트 변환 B", "공유 카드 출력 C"],
    prices: ["3초 완료", "원클릭 복사", "팀 공유"],
    spots: ["입력 단계", "규칙 필터", "카드 미리보기", "링크 배포"],
    tags: ["로그인 불필요", "즉시 미리보기", "마크다운 출력"],
    palette: ["#0F172A", "#4F46E5", "#818CF8", "#64748B", "#E0E7FF"],
  },
};

function getContext(treatment: Treatment): {
  ctx: DomainWireframeContext;
  subject: string;
  accent: string;
  softBg: string;
} {
  const domain = DOMAIN_MAP[treatment.domainSlug];
  const base = DOMAIN_CONTEXT[treatment.domainSlug] || DOMAIN_CONTEXT["creator-tool"];
  const subject = treatment.customTopic?.trim() || base.keyword;
  return {
    ctx: base,
    subject,
    accent: domain?.color || "#2563EB",
    softBg: domain?.softBg || "#EFF6FF",
  };
}

interface ProductWireframePreviewProps {
  treatment: Treatment;
}

export function ProductWireframePreview({ treatment }: ProductWireframePreviewProps) {
  const mechId: MechanismId =
    treatment.sampleA.mechanism in WIREFRAME_ARCHETYPES
      ? treatment.sampleA.mechanism
      : "drop-validation";
  const meta = WIREFRAME_ARCHETYPES[mechId];
  const { ctx, subject, accent, softBg } = getContext(treatment);
  const urlSlug = treatment.customTopic
    ? encodeURIComponent(treatment.customTopic.slice(0, 12))
    : ctx.pathSlug;

  return (
    <div
      className="flex h-full flex-col overflow-hidden rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC]"
      aria-label={`${meta.label} 화면 미리보기`}
    >
      {/* Mini Browser Chrome Bar */}
      <div className="flex items-center justify-between gap-2 border-b border-[#E2E8F0] bg-[#FFFFFF] px-3.5 py-2.5">
        <div className="flex min-w-0 items-center gap-2">
          <div className="flex items-center gap-1.5" aria-hidden="true">
            <span className="h-2.5 w-2.5 rounded-full bg-[#CBD5E1]" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#CBD5E1]" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#CBD5E1]" />
          </div>
          <div className="truncate rounded-md border border-[#E2E8F0] bg-[#F8FAFC] px-2.5 py-0.5 text-[11.5px] font-medium text-[#64748B]">
            bench.app/{urlSlug}
          </div>
        </div>
        <span
          className="shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-bold"
          style={{ backgroundColor: softBg, color: accent }}
        >
          {meta.badge}
        </span>
      </div>

      {/* 3-Step Visual Flow Strip */}
      <div className="flex flex-wrap items-center justify-between gap-1.5 border-b border-[#E2E8F0] bg-[#FFFFFF] px-3.5 py-2 text-[11.5px]">
        <div className="flex flex-wrap items-center gap-1.5 text-[#475569]">
          <span className="inline-flex items-center gap-1 font-semibold text-[#0F172A]">
            <span
              className="inline-flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-bold text-[#FFFFFF]"
              style={{ backgroundColor: accent }}
            >
              1
            </span>
            {meta.steps[0]}
          </span>
          <span className="text-[#94A3B8]">→</span>
          <span className="inline-flex items-center gap-1 font-medium text-[#475569]">
            <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-[#E2E8F0] text-[10px] font-bold text-[#0F172A]">
              2
            </span>
            {meta.steps[1]}
          </span>
          <span className="text-[#94A3B8]">→</span>
          <span className="inline-flex items-center gap-1 font-medium text-[#475569]">
            <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-[#E2E8F0] text-[10px] font-bold text-[#0F172A]">
              3
            </span>
            {meta.steps[2]}
          </span>
        </div>
        <span className="text-[11px] font-medium text-[#64748B]">첫 화면 미리보기</span>
      </div>

      {/* Interactive-Look Static Vector Wireframe Canvas */}
      <div className="flex flex-1 flex-col justify-center p-3.5 sm:p-4">
        {/* 1) VISUAL PRICE MATCH */}
        {mechId === "visual-price-match" && (
          <div className="flex flex-col gap-3">
            <div className="grid grid-cols-12 items-stretch gap-2.5">
              {/* Left Drop / Scan Frame */}
              <div className="col-span-5 flex flex-col justify-between rounded-xl border border-dashed border-[#CBD5E1] bg-[#FFFFFF] p-3">
                <div className="flex items-center justify-between text-[10.5px] font-semibold text-[#64748B]">
                  <span>① 입력 스캔</span>
                  <span style={{ color: accent }}>AI 매칭</span>
                </div>
                <div className="my-2 flex flex-1 flex-col items-center justify-center rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] p-2.5">
                  <svg viewBox="0 0 64 48" className="h-12 w-16" fill="none" aria-hidden="true">
                    <path d="M8 15V8H15M49 8H56V15M56 33V40H49M15 40H8V33" stroke={accent} strokeWidth="2.2" strokeLinecap="round" />
                    <rect x="18" y="14" width="28" height="20" rx="3" fill="#FFFFFF" stroke="#94A3B8" strokeWidth="1.5" />
                    <circle cx="26" cy="21" r="2.5" fill={accent} />
                    <path d="M21 31L28 24L34 29L39 25L43 31" stroke="#475569" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <span className="mt-1.5 max-w-full truncate rounded-full bg-[#FFFFFF] px-2 py-0.5 text-[10.5px] font-bold text-[#0F172A] border border-[#E2E8F0]">
                    {subject}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[10px] text-[#64748B]">
                  <span>사진·URL 드롭</span>
                  <span className="font-semibold text-[#0F172A]">분석 완료</span>
                </div>
              </div>

              {/* Right 3 Matched Cards */}
              <div className="col-span-7 flex flex-col gap-1.5">
                {ctx.items.map((label, idx) => (
                  <div
                    key={label}
                    className="flex items-center justify-between gap-2 rounded-xl border bg-[#FFFFFF] px-2.5 py-2"
                    style={{
                      borderColor: idx === 0 ? accent : "#E2E8F0",
                    }}
                  >
                    <div className="flex min-w-0 items-center gap-2">
                      <span
                        className="h-7 w-7 shrink-0 rounded-lg border border-[#E2E8F0]"
                        style={{
                          backgroundColor: idx === 0 ? softBg : "#F8FAFC",
                        }}
                      />
                      <div className="min-w-0">
                        <div className="truncate text-[11.5px] font-bold text-[#0F172A]">
                          {treatment.customTopic ? `${subject} 대안 ${idx + 1}` : label}
                        </div>
                        <div className="text-[10px] text-[#64748B]">
                          유사도 {96 - idx * 4}% · {ctx.tags[idx]}
                        </div>
                      </div>
                    </div>
                    <span
                      className="tnum shrink-0 rounded-md px-2 py-0.5 text-[11px] font-bold"
                      style={{
                        backgroundColor: idx === 0 ? softBg : "#F8FAFC",
                        color: idx === 0 ? accent : "#1E293B",
                      }}
                    >
                      {ctx.prices[idx]}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Bottom Price Range Bar Chart */}
            <div className="rounded-xl border border-[#E2E8F0] bg-[#FFFFFF] px-3 py-2.5">
              <div className="flex items-center justify-between text-[10.5px]">
                <span className="font-bold text-[#0F172A]">③ 실시간 시세 범위</span>
                <span className="tnum font-semibold" style={{ color: accent }}>
                  추천 적정가 구간
                </span>
              </div>
              <div className="mt-2 flex items-center gap-2">
                <span className="tnum text-[10px] text-[#64748B]">최저</span>
                <div className="relative h-2 flex-1 rounded-full bg-[#E2E8F0]">
                  <div
                    className="absolute left-[22%] top-0 h-2 w-[48%] rounded-full"
                    style={{ backgroundColor: accent }}
                  />
                  <span className="absolute left-[46%] top-[-3px] h-3.5 w-3.5 rounded-full border-2 border-[#FFFFFF] bg-[#0F172A]" />
                </div>
                <span className="tnum text-[10px] text-[#64748B]">최고</span>
              </div>
            </div>
          </div>
        )}

        {/* 2) TIMESTAMP ARCHIVE */}
        {mechId === "timestamp-archive" && (
          <div className="flex flex-col gap-2.5">
            {/* Top Video Player Frame + Timeline Markers */}
            <div className="rounded-xl border border-[#E2E8F0] bg-[#FFFFFF] p-3">
              <div className="relative flex h-24 items-center justify-center rounded-lg border border-[#E2E8F0] bg-[#0F172A]">
                <svg viewBox="0 0 240 80" className="h-full w-full" fill="none" aria-hidden="true">
                  <line x1="80" y1="0" x2="80" y2="80" stroke="#334155" strokeDasharray="3 3" />
                  <line x1="160" y1="0" x2="160" y2="80" stroke="#334155" strokeDasharray="3 3" />
                  <circle cx="120" cy="40" r="14" fill="#FFFFFF" />
                  <path d="M116 34L127 40L116 46V34Z" fill="#0F172A" />
                </svg>
                <span className="absolute left-2.5 top-2 rounded-md bg-[#1E293B] px-2 py-0.5 text-[10.5px] font-semibold text-[#FFFFFF]">
                  {subject}
                </span>
                <span className="tnum absolute bottom-2 right-2.5 rounded bg-[#1E293B] px-1.5 py-0.5 text-[10px] font-semibold text-[#E2E8F0]">
                  01:04 / 03:42
                </span>
              </div>

              {/* Timeline Marker Bar */}
              <div className="mt-2.5">
                <div className="relative h-2 rounded-full bg-[#E2E8F0]">
                  <div
                    className="h-2 w-[45%] rounded-full"
                    style={{ backgroundColor: accent }}
                  />
                  <span className="absolute left-[18%] top-[-3px] h-3.5 w-1.5 rounded-sm bg-[#0F172A]" />
                  <span
                    className="absolute left-[45%] top-[-3px] h-3.5 w-1.5 rounded-sm"
                    style={{ backgroundColor: accent }}
                  />
                  <span className="absolute left-[74%] top-[-3px] h-3.5 w-1.5 rounded-sm bg-[#0F172A]" />
                </div>
                <div className="mt-1.5 flex items-center justify-between text-[10px] text-[#64748B]">
                  <span className="tnum font-semibold text-[#0F172A]">00:18 도입</span>
                  <span className="tnum font-bold" style={{ color: accent }}>
                    01:04 핵심 컷
                  </span>
                  <span className="tnum font-semibold text-[#0F172A]">02:32 마무리</span>
                </div>
              </div>
            </div>

            {/* Extracted 5-Color Swatches */}
            <div className="flex items-center justify-between gap-2 rounded-xl border border-[#E2E8F0] bg-[#FFFFFF] px-3 py-2">
              <span className="text-[10.5px] font-bold text-[#0F172A]">추출 팔레트</span>
              <div className="flex items-center gap-1.5">
                {ctx.palette.map((hex) => (
                  <span
                    key={hex}
                    className="h-4 w-7 rounded border border-[#E2E8F0]"
                    style={{ backgroundColor: hex }}
                    title={hex}
                  />
                ))}
              </div>
            </div>

            {/* 3 Scene Still Cards */}
            <div className="grid grid-cols-3 gap-2">
              {ctx.items.map((item, idx) => (
                <div
                  key={item}
                  className="rounded-xl border border-[#E2E8F0] bg-[#FFFFFF] p-2"
                >
                  <div
                    className="mb-1.5 h-8 rounded-md border border-[#E2E8F0]"
                    style={{ backgroundColor: idx === 1 ? softBg : "#F8FAFC" }}
                  />
                  <div className="truncate text-[10.5px] font-bold text-[#0F172A]">
                    {treatment.customTopic ? `${subject} #${idx + 1}` : item}
                  </div>
                  <div className="tnum text-[9.5px] text-[#64748B]">
                    {idx === 0 ? "00:18" : idx === 1 ? "01:04" : "02:32"} 저장
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 3) GEO CURATION */}
        {mechId === "geo-curation" && (
          <div className="grid grid-cols-12 items-stretch gap-2.5">
            {/* Left Vector Street Mini-Map + 4 Color Pins */}
            <div className="col-span-7 relative overflow-hidden rounded-xl border border-[#E2E8F0] bg-[#FFFFFF] p-2.5">
              <div className="mb-1.5 flex items-center justify-between text-[10.5px]">
                <span className="font-bold text-[#0F172A]">취향 스팟 지도</span>
                <span className="rounded-full bg-[#F8FAFC] px-2 py-0.5 text-[10px] font-semibold text-[#475569] border border-[#E2E8F0]">
                  4곳 매칭
                </span>
              </div>
              <svg viewBox="0 0 220 148" className="h-36 w-full rounded-lg bg-[#F8FAFC]" fill="none" aria-hidden="true">
                {/* City Blocks */}
                <rect x="12" y="14" width="52" height="36" rx="4" fill="#FFFFFF" stroke="#E2E8F0" />
                <rect x="78" y="14" width="60" height="36" rx="4" fill="#FFFFFF" stroke="#E2E8F0" />
                <rect x="152" y="14" width="56" height="46" rx="4" fill="#FFFFFF" stroke="#E2E8F0" />
                <rect x="12" y="64" width="64" height="42" rx="4" fill="#FFFFFF" stroke="#E2E8F0" />
                <rect x="90" y="64" width="48" height="70" rx="4" fill="#FFFFFF" stroke="#E2E8F0" />
                <rect x="152" y="74" width="56" height="60" rx="4" fill="#FFFFFF" stroke="#E2E8F0" />
                <rect x="12" y="116" width="64" height="20" rx="4" fill="#FFFFFF" stroke="#E2E8F0" />
                {/* Route Line */}
                <path d="M46 38 L108 48 L114 96 L176 92" stroke={accent} strokeWidth="2" strokeDasharray="4 3" />
                {/* 4 Pin Markers */}
                <circle cx="46" cy="38" r="6" fill="#0F172A" />
                <circle cx="108" cy="48" r="11" fill={softBg} stroke={accent} strokeWidth="1.5" />
                <circle cx="108" cy="48" r="5" fill={accent} />
                <circle cx="114" cy="96" r="6" fill="#475569" />
                <circle cx="176" cy="92" r="6" fill="#0F172A" />
              </svg>
              <div className="mt-1.5 flex flex-wrap gap-1">
                {ctx.spots.map((spot, idx) => (
                  <span
                    key={spot}
                    className="rounded-md px-1.5 py-0.5 text-[10px] font-semibold"
                    style={{
                      backgroundColor: idx === 1 ? softBg : "#F8FAFC",
                      color: idx === 1 ? accent : "#475569",
                    }}
                  >
                    {idx + 1}. {spot}
                  </span>
                ))}
              </div>
            </div>

            {/* Right Selected Spot Curation Card */}
            <div className="col-span-5 flex flex-col justify-between rounded-xl border border-[#E2E8F0] bg-[#FFFFFF] p-3">
              <div>
                <span
                  className="inline-block rounded-full px-2 py-0.5 text-[10px] font-bold"
                  style={{ backgroundColor: softBg, color: accent }}
                >
                  선택된 스팟
                </span>
                <div className="mt-2 text-[13px] font-bold leading-snug text-[#0F172A]">
                  {treatment.customTopic ? `${subject} 추천 스팟` : ctx.items[0]}
                </div>
                <div className="mt-1 text-[11px] text-[#64748B]">{ctx.spots[1]} · {ctx.prices[0]}</div>
                <div className="mt-2.5 flex flex-wrap gap-1">
                  {ctx.tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-md border border-[#E2E8F0] bg-[#F8FAFC] px-1.5 py-0.5 text-[10px] font-medium text-[#475569]"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>
              <div className="mt-3 rounded-lg bg-[#0F172A] px-2.5 py-1.5 text-center text-[11px] font-semibold text-[#FFFFFF]">
                내 코스에 담기
              </div>
            </div>
          </div>
        )}

        {/* 4) CANVAS COMPARE */}
        {mechId === "canvas-compare" && (
          <div className="flex flex-col gap-2.5">
            {/* Top Filter Switch Bar */}
            <div className="flex items-center justify-between gap-2 rounded-xl border border-[#E2E8F0] bg-[#FFFFFF] px-3 py-2">
              <span className="truncate text-[11.5px] font-bold text-[#0F172A]">
                {subject} 후보 비교
              </span>
              <div className="flex items-center gap-1 text-[10.5px]">
                <span className="rounded-md bg-[#0F172A] px-2 py-0.5 font-semibold text-[#FFFFFF]">
                  추천순
                </span>
                <span className="rounded-md bg-[#F8FAFC] px-2 py-0.5 font-medium text-[#64748B]">
                  가격순
                </span>
                <span className="rounded-md bg-[#F8FAFC] px-2 py-0.5 font-medium text-[#64748B]">
                  차이만
                </span>
              </div>
            </div>

            {/* 3-Column Side-by-Side Board */}
            <div className="grid grid-cols-3 gap-2">
              {ctx.items.map((item, idx) => {
                const isBest = idx === 1;
                return (
                  <div
                    key={item}
                    className="flex flex-col justify-between rounded-xl border bg-[#FFFFFF] p-2.5"
                    style={{
                      borderColor: isBest ? accent : "#E2E8F0",
                      borderWidth: isBest ? "1.5px" : "1px",
                    }}
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-[#64748B]">
                          후보 {idx === 0 ? "A" : idx === 1 ? "B" : "C"}
                        </span>
                        {isBest && (
                          <span
                            className="rounded-full px-1.5 py-0.5 text-[9.5px] font-bold"
                            style={{ backgroundColor: softBg, color: accent }}
                          >
                            최적 픽
                          </span>
                        )}
                      </div>
                      <div
                        className="mt-2 h-11 rounded-lg border border-[#E2E8F0]"
                        style={{ backgroundColor: isBest ? softBg : "#F8FAFC" }}
                      />
                      <div className="mt-2 truncate text-[11.5px] font-bold text-[#0F172A]">
                        {treatment.customTopic ? `${subject} 안 ${idx + 1}` : item}
                      </div>
                      <div className="mt-2 space-y-1.5">
                        {[82 - idx * 8, isBest ? 96 : 70, 75 + idx * 5].map((pct, barIdx) => (
                          <div key={barIdx} className="h-1.5 w-full rounded-full bg-[#E2E8F0]">
                            <div
                              className="h-1.5 rounded-full"
                              style={{
                                width: `${pct}%`,
                                backgroundColor: isBest ? accent : "#64748B",
                              }}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                    <div
                      className="mt-2.5 rounded-md py-1 text-center text-[10.5px] font-bold"
                      style={{
                        backgroundColor: isBest ? "#0F172A" : "#F8FAFC",
                        color: isBest ? "#FFFFFF" : "#475569",
                      }}
                    >
                      {isBest ? "선택 완료 ✓" : "비교 선택"}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 5) AUDIO STEM */}
        {mechId === "audio-stem" && (
          <div className="flex flex-col gap-2.5">
            {/* Waveform Bar Graph */}
            <div className="rounded-xl border border-[#E2E8F0] bg-[#FFFFFF] p-3">
              <div className="mb-2 flex items-center justify-between text-[11px]">
                <span className="font-bold text-[#0F172A]">{subject}</span>
                <span className="tnum font-semibold" style={{ color: accent }}>
                  00:16 / 00:32
                </span>
              </div>
              <svg viewBox="0 0 280 42" className="h-11 w-full" fill="none" aria-hidden="true">
                {[12, 22, 34, 18, 28, 38, 24, 16, 30, 36, 20, 26, 39, 31, 18, 25, 35, 22, 14, 29, 37, 24, 19, 32, 26, 15, 21, 12].map(
                  (h, i) => (
                    <rect
                      key={i}
                      x={i * 10 + 1}
                      y={21 - h / 2}
                      width="6"
                      height={h}
                      rx="3"
                      fill={i < 14 ? accent : "#CBD5E1"}
                    />
                  )
                )}
                <line x1="140" y1="0" x2="140" y2="42" stroke="#0F172A" strokeWidth="1.5" />
              </svg>
            </div>

            {/* 3 Stem Separation Lanes */}
            <div className="space-y-1.5">
              {[
                { name: "보컬 · 멜로디", level: "78%", active: true },
                { name: "드럼 · 리듬", level: "62%", active: true },
                { name: "질감 · 앰비언스", level: "44%", active: false },
              ].map((lane) => (
                <div
                  key={lane.name}
                  className="flex items-center gap-2.5 rounded-xl border border-[#E2E8F0] bg-[#FFFFFF] px-3 py-2"
                >
                  <span className="w-24 shrink-0 truncate text-[11px] font-bold text-[#0F172A]">
                    {lane.name}
                  </span>
                  <div className="h-2 flex-1 rounded-full bg-[#E2E8F0]">
                    <div
                      className="h-2 rounded-full"
                      style={{
                        width: lane.level,
                        backgroundColor: lane.active ? accent : "#94A3B8",
                      }}
                    />
                  </div>
                  <div className="flex shrink-0 gap-1 text-[9.5px] font-bold">
                    <span className="rounded border border-[#E2E8F0] bg-[#F8FAFC] px-1.5 py-0.5 text-[#475569]">
                      M
                    </span>
                    <span
                      className="rounded px-1.5 py-0.5"
                      style={{
                        backgroundColor: lane.active ? softBg : "#F8FAFC",
                        color: lane.active ? accent : "#64748B",
                      }}
                    >
                      S
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* BPM / Mood Matching Chips */}
            <div className="flex flex-wrap items-center gap-1.5">
              {["118 BPM", "F minor", "루프 4마디", ctx.tags[0]].map((chip) => (
                <span
                  key={chip}
                  className="tnum rounded-full border border-[#E2E8F0] bg-[#FFFFFF] px-2.5 py-0.5 text-[10.5px] font-semibold text-[#1E293B]"
                >
                  {chip}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* 6) DROP VALIDATION */}
        {mechId === "drop-validation" && (
          <div className="flex flex-col gap-2.5">
            {/* Drop Preview Ticket */}
            <div className="rounded-xl border border-[#E2E8F0] bg-[#FFFFFF] p-3.5">
              <div className="flex items-center justify-between gap-2">
                <span
                  className="rounded-full px-2.5 py-0.5 text-[10.5px] font-bold"
                  style={{ backgroundColor: softBg, color: accent }}
                >
                  LIVE 수요 검증
                </span>
                <span className="tnum text-[11px] font-semibold text-[#64748B]">
                  마감 23:14 남음
                </span>
              </div>
              <div className="mt-2 text-[14px] font-bold text-[#0F172A]">
                {subject} — 첫 베타 오픈 투표
              </div>
              <div className="mt-1 text-[11.5px] text-[#475569]">
                링크 하나로 관심도와 사전 대기 수요를 먼저 확인합니다.
              </div>

              {/* Demand Gauge Bar */}
              <div className="mt-3">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-bold text-[#0F172A]">출시 찬성률</span>
                  <span className="tnum font-bold" style={{ color: accent }}>
                    78% · 412표 참여
                  </span>
                </div>
                <div className="mt-1.5 h-2.5 w-full rounded-full bg-[#E2E8F0]">
                  <div
                    className="h-2.5 w-[78%] rounded-full"
                    style={{ backgroundColor: accent }}
                  />
                </div>
              </div>
            </div>

            {/* Vote Actions + Earlybird Counter */}
            <div className="grid grid-cols-12 gap-2">
              <div className="col-span-5 rounded-xl bg-[#0F172A] px-3 py-2.5 text-center text-[11.5px] font-bold text-[#FFFFFF]">
                써보고 싶어요 (+1)
              </div>
              <div className="col-span-3 rounded-xl border border-[#E2E8F0] bg-[#FFFFFF] px-2 py-2.5 text-center text-[11.5px] font-semibold text-[#475569]">
                보류
              </div>
              <div className="col-span-4 flex flex-col items-center justify-center rounded-xl border border-[#E2E8F0] bg-[#FFFFFF] px-2 py-1.5">
                <span className="tnum text-[12.5px] font-extrabold text-[#0F172A]">184명</span>
                <span className="text-[9.5px] font-medium text-[#64748B]">얼리버드 대기</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
