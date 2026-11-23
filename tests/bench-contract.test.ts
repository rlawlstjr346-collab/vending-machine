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

describe("BENCH. Warm Nordic Contract Tests", () => {
  const buildersPayload = readJson<{ count: number; items: BuilderSignal[] }>(
    path.join(PUBLIC_DATA, "builder-signals.json")
  );
  const radarPayload = readJson<{ count: number; items: AiRadarSignal[] }>(
    path.join(PUBLIC_DATA, "ai-radar-signals.json")
  );
  const treatmentsPayload = readJson<{ count: number; items: Treatment[] }>(
    path.join(PUBLIC_DATA, "treatments-seed.json")
  );

  it("1) guarantees zero personal-only terms ('KREAM', '직장인 TF', '취업', 'agy') across UI & treatments-seed.json", () => {
    const personalTermRe = /(KREAM|직장인\s*TF|취업|\bagy\b)/i;

    const seedRaw = fs.readFileSync(path.join(PUBLIC_DATA, "treatments-seed.json"), "utf-8");
    expect(seedRaw).not.toMatch(personalTermRe);

    const srcFiles = collectSourceFiles(path.join(ROOT, "src"));
    for (const filePath of srcFiles) {
      if (filePath.endsWith("translation-cache.json")) continue;
      const content = fs.readFileSync(filePath, "utf-8");
      expect(content, `Personal-only term found in ${filePath}`).not.toMatch(personalTermRe);
    }
  });

  it("2) validates 6 universal domains, real signal integrity, and natural non-robotic Korean titles", () => {
    expect(DOMAIN_LIST.map((d) => d.slug)).toEqual([
      "brand-commerce",
      "cinema-video",
      "photo-visual",
      "music-audio",
      "local-archive",
      "creator-tool",
    ]);

    expect(buildersPayload.items.length).toBeGreaterThanOrEqual(45);
    expect(radarPayload.items.length).toBeGreaterThanOrEqual(80);
    expect(treatmentsPayload.items.length).toBeGreaterThanOrEqual(36);

    const uniqueTitles = new Set(treatmentsPayload.items.map((t) => t.title));
    expect(uniqueTitles.size).toBe(treatmentsPayload.items.length);

    const roboticTitleRe = /×.*방식의|요소를 참고해|영역 서비스의 핵심 워크플로/;
    for (const t of treatmentsPayload.items) {
      expect(t.title).not.toMatch(roboticTitleRe);
      expect(t.oneLineHook).not.toMatch(roboticTitleRe);
      expect(t.mvpFeatures).toHaveLength(3);
      expect(isValidHttpUrl(t.sampleA.url)).toBe(true);
      expect(isValidHttpUrl(t.sampleB.canonicalUrl)).toBe(true);
    }
  });

  it("3) guarantees zero raw '==' markers, zero placeholders, zero dead '#' links, and zero flashy animations", () => {
    const forbiddenTextRe = /(준비\s*중|coming\s+soon|샘플\s*데이터)/i;
    const rawHighlightRe = /==[^=\s][^=]*==/;
    const forbiddenAnimRe =
      /\b(animate-bounce|animate-pulse|animate-spin|animate-ping|scale-105|scale-110|hover:scale-|bg-gradient-to|blur-3xl)\b/;

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
    }
  });

  it("4) validates A -> Z parallel domain branching, B -> C chained evolution, and custom topic synthesis", () => {
    const builderA = buildersPayload.items[0];
    const builderA2 = buildersPayload.items[1];
    const radarB = matchAiRadarFor(builderA, "brand-commerce", radarPayload.items, 0);

    const treatmentB = synthesizeTreatment({
      builder: builderA,
      radar: radarB,
      domainSlug: "brand-commerce",
      variantIndex: 1,
    });
    expect(treatmentB.lineage.map((n) => n.step)).toEqual(["A", "B"]);

    // A -> Z parallel domain branch keeping Sample A
    const radarZ = matchAiRadarFor(builderA, "cinema-video", radarPayload.items, 2);
    const treatmentZ = synthesizeTreatment({
      builder: builderA,
      radar: radarZ,
      domainSlug: "cinema-video",
      variantIndex: 2,
    });
    expect(treatmentZ.sampleA.builderId).toBe(treatmentB.sampleA.builderId);
    expect(treatmentZ.domainSlug).toBe("cinema-video");
    expect(treatmentZ.id).not.toBe(treatmentB.id);

    // B -> C chained evolution grafting Sample A2
    const treatmentC = synthesizeTreatment({
      builder: builderA,
      radar: radarB,
      domainSlug: treatmentB.domainSlug,
      variantIndex: 3,
      parentTreatment: treatmentB,
      addedBuilder: builderA2,
    });
    expect(treatmentC.lineage.map((n) => n.step)).toEqual(["A", "B", "C"]);
    expect(treatmentC.sampleA2?.builderId).toBe(builderA2.id);
    expect(treatmentC.parentTreatmentId).toBe(treatmentB.id);

    // Custom topic synthesis + universal coding prompt output
    const customTr = synthesizeTreatment({
      builder: builderA,
      radar: radarB,
      domainSlug: "local-archive",
      customTopic: "필름카메라",
      variantIndex: 4,
    });
    expect(customTr.title).toContain("필름카메라");
    expect(treatmentToMarkdown(customTr)).toContain(customTr.sampleA.url);
    const prompt = treatmentToCodingPrompt(customTr);
    expect(prompt).toContain("반드시 구현할 핵심 기능 3가지");
    expect(prompt).not.toMatch(/\bagy\b/i);
  });

  it("5) validates saved-store serialization and SEO routes (sitemap, robots, rss.xml)", async () => {
    const sampleIds = treatmentsPayload.items.slice(0, 3).map((t) => t.id);
    const encoded = encodeSavedParam(sampleIds);
    const decoded = decodeSavedParam(encoded);
    expect(decoded).toEqual(sampleIds);

    const merged = mergeSavedWithSeedIds([], decoded, treatmentsPayload.items);
    expect(merged.map((t) => t.id)).toEqual(sampleIds);

    const sm = sitemap();
    expect(sm.length).toBeGreaterThanOrEqual(1 + DOMAIN_LIST.length + treatmentsPayload.items.length);
    expect(sm.some((entry) => entry.url.endsWith("/domain/brand-commerce"))).toBe(true);

    const rb = robots();
    expect(rb.sitemap).toMatch(/\/sitemap\.xml$/);

    const rssRes = await getRss();
    expect(rssRes.status).toBe(200);
    const rssXml = await rssRes.text();
    expect(rssXml).toContain('<rss version="2.0"');
    expect(rssXml).toContain("<item>");
  });
});
