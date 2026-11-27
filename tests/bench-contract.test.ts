import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  buildFeatureHighlightRules,
  buildHighlightSegments,
  buildSynergyHighlightRules,
} from "@/components/HighlightText";
import {
  createEmptyDeckMemory,
  drawNextDynamicCard,
  type DispenserDeckMemory,
} from "@/lib/dispenser-deck";
import { DOMAIN_LIST } from "@/lib/domains";
import {
  AI_RADAR_MAX_SIGNALS,
  formatRadarPlatformLabel,
  mergeAndBalanceRadarSignals,
  normalizeAiRadarFeed,
} from "@/lib/radar-adapter";
import {
  DISCOVER_HUBS,
  getDiscoverHub,
  getTreatmentsForDiscoverHub,
} from "@/lib/seo-keywords";
import { getSiteUrl } from "@/lib/site-url";
import {
  inferDomainSlugForPair,
  matchAiRadarFor,
  matchCultureFor,
  synthesizeTreatment,
  treatmentToCodingPrompt,
  treatmentToMarkdown,
} from "@/lib/synthesis-engine";
import { isValidHttpUrl } from "@/lib/text-clean";
import sitemap from "@/app/sitemap";
import robots from "@/app/robots";
import { GET as getRss } from "@/app/rss.xml/route";
import type {
  AiRadarSignal,
  BuilderSignal,
  CultureSignal,
  Treatment,
} from "@/lib/types";

const ROOT = process.cwd();
const PUBLIC_DATA = path.join(ROOT, "public", "data");

function readJson<T>(filePath: string): T {
  return JSON.parse(fs.readFileSync(filePath, "utf-8")) as T;
}

function collectSourceFiles(dir: string): string[] {
  const files: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectSourceFiles(full));
    } else if (/\.(ts|tsx|css|json)$/.test(entry.name)) {
      files.push(full);
    }
  }
  return files;
}

describe("DISPENSER. Production Release Contract Tests", () => {
  const buildersPayload = readJson<{ count: number; items: BuilderSignal[] }>(
    path.join(PUBLIC_DATA, "builder-signals.json")
  );
  const radarPayload = readJson<{ count: number; items: AiRadarSignal[] }>(
    path.join(PUBLIC_DATA, "ai-radar-signals.json")
  );
  const culturePayload = readJson<{ count: number; items: CultureSignal[] }>(
    path.join(PUBLIC_DATA, "culture-signals.json")
  );
  const treatmentsPayload = readJson<{ count: number; items: Treatment[] }>(
    path.join(PUBLIC_DATA, "treatments-seed.json")
  );

  it("1) guarantees DISPENSER. branding, precision logo & favicon routes, and zero legacy/forbidden residue", () => {
    const legacyBrandRe = /\bBENCH\./;
    const personalTermRe = /(KREAM|직장인\s*TF|취업|\bagy\b)/i;

    const layoutSrc = fs.readFileSync(path.join(ROOT, "src/app/layout.tsx"), "utf-8");
    const iconsSrc = fs.readFileSync(path.join(ROOT, "src/components/Icons.tsx"), "utf-8");
    expect(layoutSrc).toContain("DISPENSER");
    expect(layoutSrc).toContain("NAVER_SITE_VERIFICATION");
    expect(layoutSrc).toContain("GOOGLE_SITE_VERIFICATION");
    expect(iconsSrc).toContain("DispenserLogo");
    expect(iconsSrc).toContain("#FF4F00");
    expect(fs.existsSync(path.join(ROOT, "src/app/icon.tsx"))).toBe(true);
    expect(fs.existsSync(path.join(ROOT, "src/app/apple-icon.tsx"))).toBe(true);
    expect(fs.existsSync(path.join(ROOT, "public/dispenser-indexnow-9f4c2a8e7b1d6e3a.txt"))).toBe(true);

    for (const dataFile of ["treatments-seed.json", "culture-signals.json"]) {
      const raw = fs.readFileSync(path.join(PUBLIC_DATA, dataFile), "utf-8");
      expect(raw, `Legacy BENCH. found in ${dataFile}`).not.toMatch(legacyBrandRe);
      expect(raw, `Forbidden personal term found in ${dataFile}`).not.toMatch(personalTermRe);
    }

    const srcFiles = collectSourceFiles(path.join(ROOT, "src"));
    for (const filePath of srcFiles) {
      if (filePath.endsWith("translation-cache.json")) continue;
      const content = fs.readFileSync(filePath, "utf-8");
      expect(content, `Legacy BENCH. found in ${filePath}`).not.toMatch(legacyBrandRe);
      expect(content, `Forbidden personal term found in ${filePath}`).not.toMatch(personalTermRe);
    }
  });

  it("2) guarantees deleted dead legacy files and intact fluid FHD/4K DISPENSER. card & modal", () => {
    expect(fs.existsSync(path.join(ROOT, "src/components/ProductWireframePreview.tsx"))).toBe(false);
    expect(fs.existsSync(path.join(ROOT, "src/lib/saved-store.ts"))).toBe(false);
    expect(fs.existsSync(path.join(ROOT, "public/bench-indexnow-9f4c2a8e7b1d6e3a.txt"))).toBe(false);

    const cardSrc = fs.readFileSync(
      path.join(ROOT, "src/components/VisualBlueprintCard.tsx"),
      "utf-8"
    );
    expect(cardSrc).not.toContain("ProductWireframePreview");
    expect(cardSrc).toContain("w-[min(88vw,2040px)]");
    expect(cardSrc).toContain("HighlightText");
    expect(cardSrc).toContain("원본 기술 핵심 메커니즘 요약");
    expect(cardSrc).toContain("기술 × 이슈 시너지 인사이트");
    expect(cardSrc).toContain("글로벌 컬처 시그널");

    const modalSrc = fs.readFileSync(
      path.join(ROOT, "src/components/TreatmentModal.tsx"),
      "utf-8"
    );
    expect(modalSrc).toContain("w-[min(88vw,1080px)]");
    expect(modalSrc).toContain("구현 프롬프트 미리보기");
    expect(modalSrc).toContain("HighlightText");

    const stageSrc = fs.readFileSync(
      path.join(ROOT, "src/components/WorkbenchClient.tsx"),
      "utf-8"
    );
    expect(stageSrc).toContain("DispenserLogo");
    expect(stageSrc).toContain("w-[min(88vw,2040px)]");
    expect(stageSrc).not.toContain("전체 랜덤");
    expect(stageSrc).not.toContain("해외 원액");
    expect(stageSrc).not.toContain("보관함");
  });

  it("3) validates global culture-signals.json (>= 60 items, >= 10 distinct overseas domains, valid HTTP(S) URLs)", () => {
    expect(culturePayload.items.length).toBeGreaterThanOrEqual(60);

    const domains = new Set<string>();
    for (const c of culturePayload.items) {
      expect(isValidHttpUrl(c.canonicalUrl), `Invalid culture URL: ${c.canonicalUrl}`).toBe(true);
      if (c.previewImageUrl) {
        expect(isValidHttpUrl(c.previewImageUrl), `Invalid culture image: ${c.previewImageUrl}`).toBe(
          true
        );
      }
      expect(c.titleKo.length).toBeGreaterThan(3);
      expect(c.sourceName.length).toBeGreaterThan(1);
      domains.add(c.sourceDomain || new URL(c.canonicalUrl).hostname.replace(/^www\./, ""));
    }

    expect(domains.size).toBeGreaterThanOrEqual(10);
  });

  it("4) validates 60 curated seed treatments have 50:50 tech/culture balance (45%~55%), no 3+ consecutive same-track streak, question titles, and full specs", () => {
    expect(buildersPayload.items.length).toBeGreaterThanOrEqual(45);
    expect(radarPayload.items.length).toBeGreaterThanOrEqual(80);
    expect(treatmentsPayload.items.length).toBeGreaterThanOrEqual(56);

    const total = treatmentsPayload.items.length;
    const techCount = treatmentsPayload.items.filter((t) => t.track === "tech").length;
    const cultureCount = treatmentsPayload.items.filter((t) => t.track === "culture").length;
    expect(techCount + cultureCount).toBe(total);

    const techRatio = techCount / total;
    const cultureRatio = cultureCount / total;
    expect(techRatio).toBeGreaterThanOrEqual(0.45);
    expect(techRatio).toBeLessThanOrEqual(0.55);
    expect(cultureRatio).toBeGreaterThanOrEqual(0.45);
    expect(cultureRatio).toBeLessThanOrEqual(0.55);

    for (let i = 2; i < treatmentsPayload.items.length; i += 1) {
      const a = treatmentsPayload.items[i - 2].track;
      const b = treatmentsPayload.items[i - 1].track;
      const c = treatmentsPayload.items[i].track;
      expect(a === b && b === c, `3 consecutive '${c}' cards at index ${i}`).toBe(false);
    }

    const uniqueTitles = new Set(treatmentsPayload.items.map((t) => t.title));
    expect(uniqueTitles.size).toBe(total);

    const roboticTitleRe = /×.*방식의|요소를 참고해|영역 서비스의 핵심 워크플로/;
    for (const t of treatmentsPayload.items) {
      expect(t.title.endsWith("?"), `Title must end with '?': ${t.title}`).toBe(true);
      expect(t.title).not.toMatch(roboticTitleRe);
      expect(t.oneLineHook.length).toBeGreaterThanOrEqual(15);
      expect(t.oneLineHook).not.toMatch(roboticTitleRe);
      expect(t.fusionStoryKo.length).toBeGreaterThanOrEqual(80);
      expect(t.techDigestKo.inputKo.length).toBeGreaterThan(5);
      expect(t.techDigestKo.coreEngineKo.length).toBeGreaterThan(5);
      expect(t.techDigestKo.outputKo.length).toBeGreaterThan(5);
      expect(t.techDigestKo.summaryKo.length).toBeGreaterThan(5);
      expect(t.mvpFeatures).toHaveLength(3);
      expect(isValidHttpUrl(t.sampleA.url)).toBe(true);
      expect(isValidHttpUrl(t.sampleB.canonicalUrl)).toBe(true);
      if (t.demoVideoUrl) expect(isValidHttpUrl(t.demoVideoUrl)).toBe(true);
      if (t.previewImageUrl) expect(isValidHttpUrl(t.previewImageUrl)).toBe(true);
    }
  });

  it("5) guarantees zero raw '==' markers, zero placeholders, zero dead '#' links, zero banned animations, and zero oatmeal/beige HEX", () => {
    const forbiddenTextRe = /(준비\s*중|coming\s+soon|샘플\s*데이터)/i;
    const rawHighlightRe = /==[^=\s][^=]*==/;
    const forbiddenAnimRe =
      /\b(animate-bounce|animate-pulse|animate-spin|animate-ping|scale-105|scale-110|hover:scale-|bg-gradient-to|blur-3xl)\b/;
    const oatmealHexRe =
      /#(F6F3EC|FFFCF7|F9F5EC|FBF7EE|EBE5D8|E7E0D3|ECE5D8|C5BCA8|D8CEBC|E5DEC9|F5EFE4)\b/i;

    for (const file of [
      "builder-signals.json",
      "ai-radar-signals.json",
      "culture-signals.json",
      "treatments-seed.json",
    ]) {
      const raw = fs.readFileSync(path.join(PUBLIC_DATA, file), "utf-8");
      expect(raw, `Forbidden placeholder in ${file}`).not.toMatch(forbiddenTextRe);
      expect(raw, `Raw '==' marker leaked in ${file}`).not.toMatch(rawHighlightRe);
    }

    const srcFiles = collectSourceFiles(path.join(ROOT, "src"));
    for (const filePath of srcFiles) {
      if (filePath.endsWith("text-clean.ts") || filePath.endsWith("translation-cache.json")) continue;
      const content = fs.readFileSync(filePath, "utf-8");
      expect(content, `Forbidden placeholder in ${filePath}`).not.toMatch(forbiddenTextRe);
      expect(content, `Raw '==' marker leaked in ${filePath}`).not.toMatch(rawHighlightRe);
      expect(content, `Dead href="#" in ${filePath}`).not.toMatch(/href=["']#["']/);
      expect(content, `Forbidden animation class in ${filePath}`).not.toMatch(forbiddenAnimRe);
      expect(content, `Residual oatmeal/beige HEX found in ${filePath}`).not.toMatch(oatmealHexRe);
    }
  });

  it("6) validates HighlightText dual highlighter (<mark> amber/sky) without raw '==' and pure plain-text prompt copy", () => {
    const techSample = treatmentsPayload.items.find((t) => t.track === "tech")!;
    const cultureSample = treatmentsPayload.items.find((t) => t.track === "culture")!;

    for (const sample of [techSample, cultureSample]) {
      const synergySegs = buildHighlightSegments(sample.fusionStoryKo, {
        rules: buildSynergyHighlightRules(sample),
        autoVariant: "amber",
        autoTechSky: true,
        maxHighlights: 3,
      });
      expect(synergySegs.map((s) => s.text).join("")).toBe(sample.fusionStoryKo);
      expect(synergySegs.some((s) => s.variant === "amber" || s.variant === "sky")).toBe(true);

      const featSegs = buildHighlightSegments(sample.mvpFeatures[0], {
        rules: buildFeatureHighlightRules(sample.mvpFeatures[0]),
        autoVariant: "amber",
        maxHighlights: 2,
      });
      expect(featSegs.map((s) => s.text).join("")).toBe(sample.mvpFeatures[0]);
      expect(featSegs.some((s) => s.variant === "amber")).toBe(true);

      const plainPrompt = treatmentToCodingPrompt(sample);
      expect(plainPrompt).toContain("반드시 구현할 핵심 기능 3가지");
      expect(plainPrompt).not.toMatch(/<\/?mark/i);
      expect(plainPrompt).not.toMatch(/==[^=\s][^=]*==/);
    }
  });

  it("7) validates runtime dual-track synthesis (tech + culture) produces question headlines and clean coding prompts", () => {
    const builderA = buildersPayload.items[0];
    const radarB = matchAiRadarFor(builderA, "creator-tool", radarPayload.items, 0);
    const cultureC = matchCultureFor(builderA, "cinema-video", culturePayload.items, 0);
    expect(cultureC).not.toBeNull();

    const techTr = synthesizeTreatment({
      builder: builderA,
      radar: radarB,
      track: "tech",
      domainSlug: "creator-tool",
      variantIndex: 7,
    });
    expect(techTr.track).toBe("tech");
    expect(techTr.title.endsWith("?")).toBe(true);

    const cultureTr = synthesizeTreatment({
      builder: builderA,
      radar: radarB,
      culture: cultureC,
      track: "culture",
      domainSlug: "cinema-video",
      variantIndex: 8,
    });
    expect(cultureTr.track).toBe("culture");
    expect(cultureTr.sampleB.sourceType).toBe("culture");
    expect(cultureTr.title.endsWith("?")).toBe(true);
    expect(treatmentToMarkdown(cultureTr)).toContain(cultureTr.sampleB.canonicalUrl);

    const prompt = treatmentToCodingPrompt(cultureTr);
    expect(prompt).toContain("반드시 구현할 핵심 기능 3가지");
    expect(prompt).toContain("글로벌 컬처 시그널");
    expect(prompt).not.toMatch(/\bagy\b/i);
  });

  it("8) validates 8 programmatic /discover/[slug] SEO hubs, auto site-url resolution, full sitemap, robots, and RSS 2.0", async () => {
    expect(DISCOVER_HUBS).toHaveLength(8);
    expect(DISCOVER_HUBS.map((h) => h.slug)).toEqual([
      "ai-service-ideas",
      "side-project-mvp",
      "vibe-coding-topics",
      "startup-benchmarking",
      "opensource-product-ideas",
      "brand-digital-campaign",
      "media-art-cinema-web",
      "micro-saas-trends",
    ]);

    for (const hub of DISCOVER_HUBS) {
      expect(getDiscoverHub(hub.slug)).toBeDefined();
      expect(hub.titleKo.length).toBeGreaterThan(10);
      expect(hub.titleEn.length).toBeGreaterThan(10);
      expect(hub.keywords.length).toBeGreaterThanOrEqual(4);
      const matched = getTreatmentsForDiscoverHub(hub, treatmentsPayload.items);
      expect(matched.length, `Hub ${hub.slug} should match treatments`).toBeGreaterThanOrEqual(8);
    }

    const siteUrl = getSiteUrl();
    expect(isValidHttpUrl(siteUrl)).toBe(true);

    const sm = await sitemap();
    expect(sm.length).toBe(1 + DISCOVER_HUBS.length + DOMAIN_LIST.length + treatmentsPayload.items.length);
    for (const hub of DISCOVER_HUBS) {
      expect(sm.some((entry) => entry.url === `${siteUrl}/discover/${hub.slug}`)).toBe(true);
    }
    for (const t of treatmentsPayload.items) {
      expect(sm.some((entry) => entry.url === `${siteUrl}/treatment/${t.id}`)).toBe(true);
    }

    const rb = robots();
    expect(rb.sitemap).toBe(`${siteUrl}/sitemap.xml`);

    const rssRes = await getRss();
    expect(rssRes.status).toBe(200);
    const rssXml = await rssRes.text();
    expect(rssXml).toContain('<rss version="2.0"');
    expect(rssXml).toContain("DISPENSER.");
    expect(rssXml).not.toContain("BENCH.");
    expect((rssXml.match(/<item>/g) || []).length).toBe(treatmentsPayload.items.length);
  });

  it("9) proves dynamic N x M semantic uniqueness: 1 Builder A paired with 10 distinct issues (5 tech + 5 culture) yields 10 unique question headlines & fusion stories with zero template recycling", () => {
    expect(buildersPayload.items.length).toBeGreaterThanOrEqual(150);
    expect(culturePayload.items.length).toBeGreaterThanOrEqual(100);

    const builderA = buildersPayload.items[0];
    const fiveRadars = radarPayload.items.slice(0, 5);
    const fiveCultures = culturePayload.items.slice(0, 5);
    expect(fiveRadars).toHaveLength(5);
    expect(fiveCultures).toHaveLength(5);

    const titles = new Set<string>();
    const stories = new Set<string>();
    const hooks = new Set<string>();
    const roboticRe = /×.*방식의|요소를 참고해|영역 서비스의 핵심 워크플로|와\s+.+를\s+결합한\s+서비스/;

    for (let i = 0; i < 5; i += 1) {
      const trTech = synthesizeTreatment({
        builder: builderA,
        radar: fiveRadars[i],
        track: "tech",
        domainSlug: inferDomainSlugForPair(builderA, fiveRadars[i]),
        variantIndex: i,
      });
      expect(trTech.title.endsWith("?")).toBe(true);
      expect(trTech.title).not.toMatch(roboticRe);
      expect(trTech.fusionStoryKo).not.toMatch(roboticRe);
      expect((trTech.highlightPhrases || []).length).toBeGreaterThanOrEqual(1);
      titles.add(trTech.title);
      stories.add(trTech.fusionStoryKo);
      hooks.add(trTech.oneLineHook);

      const trCulture = synthesizeTreatment({
        builder: builderA,
        radar: fiveRadars[i],
        culture: fiveCultures[i],
        track: "culture",
        domainSlug: fiveCultures[i].domainSlug,
        variantIndex: i,
      });
      expect(trCulture.title.endsWith("?")).toBe(true);
      expect(trCulture.title).not.toMatch(roboticRe);
      expect(trCulture.fusionStoryKo).not.toMatch(roboticRe);
      expect((trCulture.highlightPhrases || []).length).toBeGreaterThanOrEqual(1);
      titles.add(trCulture.title);
      stories.add(trCulture.fusionStoryKo);
      hooks.add(trCulture.oneLineHook);
    }

    expect(titles.size).toBe(10);
    expect(stories.size).toBe(10);
    expect(hooks.size).toBe(10);
  });

  it("10) proves 80 consecutive dynamic dispenser draws enforce zero pair duplicates, zero 20-card window repeats, and strict 1:1 tech/culture alternation", () => {
    let memory: DispenserDeckMemory = createEmptyDeckMemory();
    const seenPairs = new Set<string>();
    const builderHistory: string[] = [];
    const issueHistory: string[] = [];
    const trackHistory: string[] = [];

    for (let step = 0; step < 80; step += 1) {
      const drawn = drawNextDynamicCard({
        builders: buildersPayload.items,
        radars: radarPayload.items,
        cultures: culturePayload.items,
        memory,
      });
      memory = drawn.memory;

      // 0 exact (A x B) pair duplicates across all 80 draws
      expect(seenPairs.has(drawn.pairKey), `Duplicate pair at step ${step}: ${drawn.pairKey}`).toBe(
        false
      );
      seenPairs.add(drawn.pairKey);

      // 0 identical builder or identical issue within the preceding 20-card sliding window
      const prev20Builders = builderHistory.slice(-20);
      const prev20Issues = issueHistory.slice(-20);
      expect(
        prev20Builders.includes(drawn.builderKey),
        `Builder repeated within 20-card window at step ${step}: ${drawn.builderKey}`
      ).toBe(false);
      expect(
        prev20Issues.includes(drawn.issueKey),
        `Issue repeated within 20-card window at step ${step}: ${drawn.issueKey}`
      ).toBe(false);

      builderHistory.push(drawn.builderKey);
      issueHistory.push(drawn.issueKey);
      trackHistory.push(drawn.track);

      // Strict 1:1 tech <-> culture alternation
      if (step > 0) {
        expect(drawn.track).not.toBe(trackHistory[step - 1]);
      }
    }

    expect(seenPairs.size).toBe(80);
    expect(trackHistory.filter((t) => t === "tech").length).toBe(40);
    expect(trackHistory.filter((t) => t === "culture").length).toBe(40);
  });

  it("11) proves AI Radar schema-flexible adapter absorbs future Chinese & unknown platforms with zero code edits", () => {
    const futurePlanningPayload = {
      signals: [
        {
          id: "cn-xhs-001",
          title_ko: "샤오홍슈에서 폭증 중인 AI 포토카드 보정 워크플로",
          original_title: "小红书爆火AI小卡修图工作流",
          platform_id: "xiaohongshu",
          category: "cn_creator",
          canonical_url: "https://www.xiaohongshu.com/explore/67890abcdef",
          highlight_summary: "중국 크리에이터들이 로컬 이미지 모델로 즉석 보정 템플릿을 공유하고 있습니다.",
          planning_meta: {
            signal_type: "creator_trend",
            product_domain: "visual-creator",
            benchmark_point: "원클릭 스타일 프리셋",
          },
          entities: ["Xiaohongshu", "Flux"],
        },
        {
          id: "cn-bili-002",
          title_ko: "비리비리 개발자 채널의 실시간 AI 더빙 자막 파이프라인",
          original_title: "B站实时AI配音字幕开源项目",
          platform_id: "bilibili",
          category: "cn_video",
          canonical_url: "https://www.bilibili.com/video/BV1xx411c7mD",
          highlight_summary: "긴 테크 영상을 30초 만에 다국어 더빙·요약하는 오픈소스 데모가 화제입니다.",
          entities: ["Bilibili"],
        },
      ],
    };

    const futureLivePayload = {
      items: [
        {
          id: "future-src-003",
          titleKo: "미지의 차세대 소스에서 포착된 로컬 브라우저 에이전트 표준",
          platformId: "unknown_future_source",
          category: "future_protocol",
          canonicalUrl: "https://future-source.dev/posts/local-browser-agent",
          whatKo: "신규 에이전트 통신 규격으로 설치 없이 브라우저 탭을 자동화하는 실험이 공개됐습니다.",
          thumbnailUrl: "https://future-source.dev/og/agent.png",
        },
      ],
    };

    const normalized = normalizeAiRadarFeed(futurePlanningPayload, futureLivePayload);
    expect(normalized).toHaveLength(3);

    const xhs = normalized.find((s) => s.id === "cn-xhs-001")!;
    const bili = normalized.find((s) => s.id === "cn-bili-002")!;
    const futureSrc = normalized.find((s) => s.id === "future-src-003")!;

    expect(xhs.platformLabel).toBe("샤오홍슈 (小红书)");
    expect(bili.platformLabel).toBe("비리비리 (Bilibili)");
    expect(futureSrc.platformLabel).toBe("Unknown Future Source");
    expect(formatRadarPlatformLabel("weibo")).toBe("웨이보 (Weibo)");
    expect(formatRadarPlatformLabel("qbitai")).toBe("QbitAI · 양자위");

    const builderA = buildersPayload.items[0];
    for (const sig of normalized) {
      const tr = synthesizeTreatment({
        builder: builderA,
        radar: sig,
        track: "tech",
        domainSlug: inferDomainSlugForPair(builderA, sig),
      });
      expect(tr.title.endsWith("?")).toBe(true);
      expect(tr.sampleB.platformLabel).toBe(sig.platformLabel);
      expect(tr.fusionStoryKo.length).toBeGreaterThan(80);
      expect(tr.mvpFeatures).toHaveLength(3);
    }
  });

  it("12) validates AI Radar 5 Chinese sources (v2ex, juejin, qbitai, synced/jiqizhixin, 36kr-ai) schema normalization, quota-preserving 220 cap, synthesis, and synced presence", () => {
    expect(AI_RADAR_MAX_SIGNALS).toBe(220);

    // Exact label mappings & variant keys for all 5 Chinese sources
    expect(formatRadarPlatformLabel("v2ex")).toBe("V2EX · 인디빌더");
    expect(formatRadarPlatformLabel("v2ex-ai")).toBe("V2EX · 인디빌더");
    expect(formatRadarPlatformLabel("juejin")).toBe("Juejin · 굴진");
    expect(formatRadarPlatformLabel("qbitai")).toBe("QbitAI · 양자위");
    expect(formatRadarPlatformLabel("qbit-ai")).toBe("QbitAI · 양자위");
    expect(formatRadarPlatformLabel("jiqizhixin")).toBe("Synced · 기기지심");
    expect(formatRadarPlatformLabel("synced")).toBe("Synced · 기기지심");
    expect(formatRadarPlatformLabel("36kr-ai")).toBe("36Kr AI");
    expect(formatRadarPlatformLabel("36kr")).toBe("36Kr AI");

    // Simulate > 220 incoming signals where the 5 Chinese sources sit beyond index 100 in live-feed
    const bulkPlanningSignals = Array.from({ length: 240 }, (_, i) => ({
      id: `bulk-en-${i}`,
      title_ko: `글로벌 AI 인프라 업데이트 신호 ${i + 1}`,
      original_title: `Global AI Infra Update Signal ${i + 1}`,
      platform_id: i % 2 === 0 ? "openai" : "anthropic",
      category: "industry",
      canonical_url: `https://example-ai-news.dev/articles/${i}`,
      published_at: new Date(Date.now() - i * 60_000).toISOString(),
      importance_score: 25,
      highlight_summary: `글로벌 AI 워크플로 자동화 벤치마크 변화 ${i + 1}`,
    }));

    const cnFiveLiveItems = [
      {
        id: "cn-v2ex-live",
        title_ko: "Pure Swift 기반 macOS 메뉴바 AI 에이전트 공간 분석 오픈소스 도구",
        original_title: "[开源自荐] Peek：纯 Swift 原生 macOS 菜单栏工具",
        platform_id: "v2ex",
        category: "dev",
        canonical_url: "https://v2ex.com/t/1259404",
        published_at: new Date(Date.now() - 3600_000 * 5).toISOString(),
        importance_score: 28.25,
        what_ko: "로컬 맥 환경에서 AI 에이전트 디스크·하드웨어 점유를 실시간 추적하는 인디빌더 프로젝트입니다.",
      },
      {
        id: "cn-juejin-live",
        title_ko: "코드 모드 토큰 절감 36회 실측: 대용량 작업 84% 절감 분석",
        original_title: "Code Mode 省不省 Token？实测 36 次",
        platform_id: "juejin",
        category: "dev",
        canonical_url: "https://juejin.cn/post/7711297298265800730",
        published_at: new Date(Date.now() - 3600_000 * 6).toISOString(),
        importance_score: 27.28,
        what_ko: "에이전트 툴 호출 방식에 따른 실제 토큰 비용 편차를 36회 벤치마크로 공개했습니다.",
      },
      {
        id: "cn-qbitai-live",
        title_ko: "Ant OceanBase, 호수-창고 통합 AI 데이터 플랫폼 OceanLake 오픈소스 공개",
        original_title: "蚂蚁OceanBase发布湖库一体AI数据平台OceanLake",
        platform_id: "qbitai",
        category: "industry",
        canonical_url: "https://qbitai.com/2026/11/512330.html",
        published_at: new Date(Date.now() - 3600_000 * 7).toISOString(),
        importance_score: 28.9,
        what_ko: "실시간 벡터·정형 데이터 파이프라인을 하나로 통합한 AI 데이터 엔진을 오픈소스로 풀었습니다.",
      },
      {
        id: "cn-synced-live",
        title_ko: "DeepSeek 및 FlashAttention 프로덕션 AI 커널 최초 형식 검증 달성",
        original_title: "全球首次，DeepSeek与FlashAttention生产级AI算子获得形式化验证",
        platform_id: "jiqizhixin",
        category: "research",
        canonical_url: "https://syncedreview.com/2026/11/deepseek-flashattention-verify",
        published_at: new Date(Date.now() - 3600_000 * 8).toISOString(),
        importance_score: 24.32,
        what_ko: "고속 어텐션 연산 커널의 수치 안정성을 수학적으로 검증한 연구 성과가 발표됐습니다.",
      },
      {
        id: "cn-36kr-live",
        title_ko: "GPT·Claude·Gemini 동일 무대 추론 벤치마크 최신 성적표 공개",
        original_title: "GPT、Claude、Gemini同台竞技，最新成绩来了",
        platform_id: "36kr-ai",
        category: "industry",
        canonical_url: "https://36kr.com/p/4083223643542401",
        published_at: new Date(Date.now() - 3600_000 * 9).toISOString(),
        importance_score: 28.79,
        what_ko: "주요 프런티어 모델의 실전 코딩·문서 작업 정확도와 비용 효율을 정밀 비교했습니다.",
      },
    ];

    const balanced = normalizeAiRadarFeed(
      { signals: bulkPlanningSignals },
      { items: cnFiveLiveItems }
    );
    expect(balanced).toHaveLength(220);

    // Every single one of the 5 Chinese sources must survive the 220 cap via platform quota
    const expectedMap: Record<string, string> = {
      v2ex: "V2EX · 인디빌더",
      juejin: "Juejin · 굴진",
      qbitai: "QbitAI · 양자위",
      jiqizhixin: "Synced · 기기지심",
      "36kr-ai": "36Kr AI",
    };

    const builderA = buildersPayload.items[0];
    for (const [pid, expectedLabel] of Object.entries(expectedMap)) {
      const sig = balanced.find((s) => s.platformId === pid);
      expect(sig, `Chinese source '${pid}' must survive balanced 220 quota`).toBeDefined();
      expect(sig!.platformLabel).toBe(expectedLabel);

      const tr = synthesizeTreatment({
        builder: builderA,
        radar: sig!,
        track: "tech",
        domainSlug: inferDomainSlugForPair(builderA, sig!),
      });
      expect(tr.title.endsWith("?")).toBe(true);
      expect(tr.sampleB.platformLabel).toBe(expectedLabel);
      expect(tr.fusionStoryKo.length).toBeGreaterThan(80);
      expect(tr.mvpFeatures).toHaveLength(3);
    }

    // Merging with duplicate URLs must stay deduped and capped at 220
    const reMerged = mergeAndBalanceRadarSignals(balanced, balanced, AI_RADAR_MAX_SIGNALS);
    expect(reMerged).toHaveLength(220);
    const uniqueUrls = new Set(reMerged.map((r) => r.canonicalUrl.toLowerCase().replace(/\/+$/, "")));
    expect(uniqueUrls.size).toBe(220);

    // Verify live synced public/data/ai-radar-signals.json reflects the 5 Chinese sources
    expect(radarPayload.items.length).toBeLessThanOrEqual(220);
    for (const [pid, expectedLabel] of Object.entries(expectedMap)) {
      const syncedItems = radarPayload.items.filter((r) => r.platformId === pid);
      expect(syncedItems.length, `Synced ai-radar-signals.json must include '${pid}'`).toBeGreaterThanOrEqual(1);
      for (const item of syncedItems) {
        expect(item.platformLabel).toBe(expectedLabel);
      }
    }
  });
});
