import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { DOMAIN_LIST } from "@/lib/domains";
import {
  decodeSavedParam,
  encodeSavedParam,
  mergeSavedWithSeedIds,
} from "@/lib/saved-store";
import {
  matchAiRadarFor,
  synthesizeTreatment,
  treatmentToCodingPrompt,
  treatmentToMarkdown,
} from "@/lib/synthesis-engine";
import { isValidHttpUrl } from "@/lib/text-clean";
import sitemap from "@/app/sitemap";
import robots from "@/app/robots";
import { GET as getRss } from "@/app/rss.xml/route";
import type { AiRadarSignal, BuilderSignal, Treatment } from "@/lib/types";

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

describe("DISPENSER Editorial Signal Dispenser Contract Tests", () => {
  const buildersPayload = readJson<{ count: number; items: BuilderSignal[] }>(
    path.join(PUBLIC_DATA, "builder-signals.json")
  );
  const radarPayload = readJson<{ count: number; items: AiRadarSignal[] }>(
    path.join(PUBLIC_DATA, "ai-radar-signals.json")
  );
  const treatmentsPayload = readJson<{ count: number; items: Treatment[] }>(
    path.join(PUBLIC_DATA, "treatments-seed.json")
  );

  it("1) guarantees DISPENSER branding with zero legacy BENCH. residue and zero forbidden terms", () => {
    const legacyBrandRe = /\bBENCH\./;
    const personalTermRe = /(KREAM|직장인\s*TF|취업|\bagy\b)/i;

    const layoutSrc = fs.readFileSync(path.join(ROOT, "src/app/layout.tsx"), "utf-8");
    const iconsSrc = fs.readFileSync(path.join(ROOT, "src/components/Icons.tsx"), "utf-8");
    expect(layoutSrc).toContain("DISPENSER");
    expect(iconsSrc).toContain("DISPENSER");

    const seedRaw = fs.readFileSync(path.join(PUBLIC_DATA, "treatments-seed.json"), "utf-8");
    expect(seedRaw).not.toMatch(legacyBrandRe);
    expect(seedRaw).not.toMatch(personalTermRe);

    const srcFiles = collectSourceFiles(path.join(ROOT, "src"));
    for (const filePath of srcFiles) {
      if (filePath.endsWith("translation-cache.json")) continue;
      const content = fs.readFileSync(filePath, "utf-8");
      expect(content, `Legacy BENCH. found in ${filePath}`).not.toMatch(legacyBrandRe);
      expect(content, `Forbidden personal term found in ${filePath}`).not.toMatch(personalTermRe);
    }
  });

  it("2) guarantees zero fake ProductWireframePreview usage and clean DISPENSER main card", () => {
    const fakePreviewPath = path.join(ROOT, "src/components/ProductWireframePreview.tsx");
    expect(fs.existsSync(fakePreviewPath)).toBe(false);

    const cardSrc = fs.readFileSync(
      path.join(ROOT, "src/components/VisualBlueprintCard.tsx"),
      "utf-8"
    );
    expect(cardSrc).not.toContain("ProductWireframePreview");
    expect(cardSrc).toContain("max-w-[1340px]");
    expect(cardSrc).toContain("원본 기술 핵심 메커니즘 요약");
    expect(cardSrc).toContain("기술 × 이슈 시너지 인사이트");

    const stageSrc = fs.readFileSync(
      path.join(ROOT, "src/components/WorkbenchClient.tsx"),
      "utf-8"
    );
    expect(stageSrc).toContain("DispenserLogo");
    expect(stageSrc).not.toContain("전체 랜덤");
    expect(stageSrc).not.toContain("해외 원액");
    expect(stageSrc).not.toContain("보관함");
  });

  it("3) validates all 50 curated seed treatments have question headlines ('?'), fusionStoryKo, techDigestKo, and valid HTTP URLs", () => {
    expect(buildersPayload.items.length).toBeGreaterThanOrEqual(45);
    expect(radarPayload.items.length).toBeGreaterThanOrEqual(80);
    expect(treatmentsPayload.items.length).toBe(50);

    const uniqueTitles = new Set(treatmentsPayload.items.map((t) => t.title));
    expect(uniqueTitles.size).toBe(50);

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

  it("4) guarantees zero raw '==' markers, zero placeholders, zero dead '#' links, zero banned animations, and zero oatmeal/beige HEX", () => {
    const forbiddenTextRe = /(준비\s*중|coming\s+soon|샘플\s*데이터)/i;
    const rawHighlightRe = /==[^=\s][^=]*==/;
    const forbiddenAnimRe =
      /\b(animate-bounce|animate-pulse|animate-spin|animate-ping|scale-105|scale-110|hover:scale-|bg-gradient-to|blur-3xl)\b/;
    const oatmealHexRe =
      /#(F6F3EC|FFFCF7|F9F5EC|FBF7EE|EBE5D8|E7E0D3|ECE5D8|C5BCA8|D8CEBC|E5DEC9|F5EFE4)\b/i;

    for (const file of ["builder-signals.json", "ai-radar-signals.json", "treatments-seed.json"]) {
      const raw = fs.readFileSync(path.join(PUBLIC_DATA, file), "utf-8");
      expect(raw, `Forbidden placeholder in ${file}`).not.toMatch(forbiddenTextRe);
      expect(raw, `Raw '==' marker leaked in ${file}`).not.toMatch(rawHighlightRe);
    }

    const srcFiles = collectSourceFiles(path.join(ROOT, "src"));
    for (const filePath of srcFiles) {
      if (filePath.endsWith("text-clean.ts") || filePath.endsWith("translation-cache.json")) continue;
      const content = fs.readFileSync(filePath, "utf-8");
      expect(content, `Forbidden placeholder in ${filePath}`).not.toMatch(forbiddenTextRe);
      expect(content, `Dead href="#" in ${filePath}`).not.toMatch(/href=["']#["']/);
      expect(content, `Forbidden animation class in ${filePath}`).not.toMatch(forbiddenAnimRe);
      expect(content, `Residual oatmeal/beige HEX found in ${filePath}`).not.toMatch(oatmealHexRe);
    }
  });

  it("5) validates runtime synthesis produces natural question headlines, fusionStoryKo, techDigestKo, and clean coding prompts", () => {
    const builderA = buildersPayload.items[0];
    const radarB = matchAiRadarFor(builderA, "creator-tool", radarPayload.items, 0);

    const synthesized = synthesizeTreatment({
      builder: builderA,
      radar: radarB,
      domainSlug: "creator-tool",
      variantIndex: 7,
    });
    expect(synthesized.title.endsWith("?")).toBe(true);
    expect(synthesized.fusionStoryKo.length).toBeGreaterThanOrEqual(60);
    expect(synthesized.techDigestKo.inputKo.length).toBeGreaterThan(5);
    expect(synthesized.mvpFeatures).toHaveLength(3);
    expect(treatmentToMarkdown(synthesized)).toContain(synthesized.sampleA.url);

    const prompt = treatmentToCodingPrompt(synthesized);
    expect(prompt).toContain("반드시 구현할 핵심 기능 3가지");
    expect(prompt).not.toMatch(/\bagy\b/i);
  });

  it("6) validates SEO routes (/sitemap.xml, /rss.xml, /robots.txt, /treatment/[id]) and saved-store helpers", async () => {
    const sampleIds = treatmentsPayload.items.slice(0, 3).map((t) => t.id);
    const encoded = encodeSavedParam(sampleIds);
    expect(decodeSavedParam(encoded)).toEqual(sampleIds);
    expect(mergeSavedWithSeedIds([], sampleIds, treatmentsPayload.items).map((t) => t.id)).toEqual(
      sampleIds
    );

    const sm = sitemap();
    expect(sm.length).toBeGreaterThanOrEqual(1 + DOMAIN_LIST.length + treatmentsPayload.items.length);
    expect(sm.some((entry) => entry.url.includes(`/treatment/${treatmentsPayload.items[0].id}`))).toBe(
      true
    );

    const rb = robots();
    expect(rb.sitemap).toMatch(/\/sitemap\.xml$/);

    const rssRes = await getRss();
    expect(rssRes.status).toBe(200);
    const rssXml = await rssRes.text();
    expect(rssXml).toContain('<rss version="2.0"');
    expect(rssXml).toContain("DISPENSER");
    expect(rssXml).not.toContain("BENCH.");
    expect(rssXml).toContain("<item>");

    // Verify treatment static params route exists and loads all 50 IDs
    const treatmentPageSrc = fs.readFileSync(
      path.join(ROOT, "src/app/treatment/[id]/page.tsx"),
      "utf-8"
    );
    expect(treatmentPageSrc).toContain("generateStaticParams");
    expect(treatmentPageSrc).toContain("DISPENSER");
  });
});
