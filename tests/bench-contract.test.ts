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
  treatmentToAgyPrompt,
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
    } else if (/\.(ts|tsx|css)$/.test(entry.name)) {
      files.push(full);
    }
  }
  return files;
}

describe("BENCH. Contract Tests", () => {
  const buildersPayload = readJson<{ count: number; items: BuilderSignal[] }>(
    path.join(PUBLIC_DATA, "builder-signals.json")
  );
  const radarPayload = readJson<{ count: number; items: AiRadarSignal[] }>(
    path.join(PUBLIC_DATA, "ai-radar-signals.json")
  );
  const treatmentsPayload = readJson<{ count: number; items: Treatment[] }>(
    path.join(PUBLIC_DATA, "treatments-seed.json")
  );

  it("1) verifies >= 45 real overseas builder signals & AI Radar 100 signals integrity", () => {
    expect(buildersPayload.items.length).toBeGreaterThanOrEqual(45);
    expect(radarPayload.items.length).toBeGreaterThanOrEqual(80);
    expect(treatmentsPayload.items.length).toBe(40);

    const sources = new Set(buildersPayload.items.map((b) => b.source));
    expect(sources.size).toBeGreaterThanOrEqual(3);

    for (const b of buildersPayload.items) {
      expect(isValidHttpUrl(b.url)).toBe(true);
      expect(b.name.trim().length).toBeGreaterThan(0);
      expect(b.taglineKo.trim().length).toBeGreaterThan(0);
    }

    for (const r of radarPayload.items) {
      expect(isValidHttpUrl(r.canonicalUrl)).toBe(true);
      expect(r.planningMeta.signalType.trim().length).toBeGreaterThan(0);
      expect(r.planningMeta.productDomain.trim().length).toBeGreaterThan(0);
    }
  });

  it("2) guarantees zero forbidden placeholders, zero dead '#' links, and zero raw '==' markers", () => {
    const forbiddenTextRe = /(준비\s*중|coming\s+soon|샘플\s*데이터)/i;
    const rawHighlightRe = /==[^=\s][^=]*==/;

    for (const file of ["builder-signals.json", "ai-radar-signals.json", "treatments-seed.json"]) {
      const raw = fs.readFileSync(path.join(PUBLIC_DATA, file), "utf-8");
      expect(raw, `Forbidden placeholder in ${file}`).not.toMatch(forbiddenTextRe);
      expect(raw, `Raw '==' marker leaked in ${file}`).not.toMatch(rawHighlightRe);
    }

    const srcFiles = collectSourceFiles(path.join(ROOT, "src"));
    for (const filePath of srcFiles) {
      const content = fs.readFileSync(filePath, "utf-8");
      if (filePath.endsWith("text-clean.ts") || filePath.endsWith("synthesize/route.ts")) {
        continue;
      }
      expect(content, `Forbidden placeholder in ${filePath}`).not.toMatch(forbiddenTextRe);
      expect(content, `Dead href="#" in ${filePath}`).not.toMatch(/href=["']#["']/);
    }

    for (const t of treatmentsPayload.items) {
      expect(isValidHttpUrl(t.sampleA.url)).toBe(true);
      expect(isValidHttpUrl(t.sampleB.canonicalUrl)).toBe(true);
      expect(t.mvpFeatures).toHaveLength(3);
      expect(t.scopeCutoff.length).toBeGreaterThanOrEqual(2);
      expect(t.targetKpis.length).toBeGreaterThanOrEqual(2);
    }
  });

  it("3) enforces zero decorative animations, zero scale/gradient/blur gimmicks in src/", () => {
    const forbiddenStyleRe =
      /\b(animate-bounce|animate-pulse|animate-spin|animate-ping|scale-105|scale-110|hover:scale-|bg-gradient-to|blur-3xl|backdrop-blur)\b/;
    const srcFiles = collectSourceFiles(path.join(ROOT, "src"));
    for (const filePath of srcFiles) {
      const content = fs.readFileSync(filePath, "utf-8");
      expect(content, `Forbidden animation/gimmick class in ${filePath}`).not.toMatch(
        forbiddenStyleRe
      );
    }
  });

  it("4) validates A -> Z parallel domain branching, B -> C chained evolution, and custom topic synthesis", () => {
    const builderA = buildersPayload.items[0];
    const builderA2 = buildersPayload.items[1];
    const radarB = matchAiRadarFor(builderA, "kream-commerce", radarPayload.items, 0);

    const treatmentB = synthesizeTreatment({
      builder: builderA,
      radar: radarB,
      domainSlug: "kream-commerce",
      variantIndex: 1,
    });
    expect(treatmentB.lineage.map((n) => n.step)).toEqual(["A", "B"]);

    // A -> Z parallel branch to another domain keeping Sample A
    const radarZ = matchAiRadarFor(builderA, "film-previs", radarPayload.items, 2);
    const treatmentZ = synthesizeTreatment({
      builder: builderA,
      radar: radarZ,
      domainSlug: "film-previs",
      variantIndex: 2,
    });
    expect(treatmentZ.sampleA.builderId).toBe(treatmentB.sampleA.builderId);
    expect(treatmentZ.domainSlug).toBe("film-previs");
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

    // Custom topic real-time synthesis + export outputs
    const customTr = synthesizeTreatment({
      builder: builderA,
      radar: radarB,
      domainSlug: "culture-map",
      customTopic: "성수동 팝업 웨이팅 지도",
      variantIndex: 4,
    });
    expect(customTr.title).toContain("성수동 팝업 웨이팅 지도");
    expect(treatmentToMarkdown(customTr)).toContain(customTr.sampleA.url);
    expect(treatmentToAgyPrompt(customTr)).toContain("MVP 핵심 기능 딱 3가지");
  });

  it("5) validates saved-store serialization and SEO routes (sitemap, robots, rss.xml)", async () => {
    const sampleIds = treatmentsPayload.items.slice(0, 3).map((t) => t.id);
    const encoded = encodeSavedParam(sampleIds);
    const decoded = decodeSavedParam(encoded);
    expect(decoded).toEqual(sampleIds);

    const merged = mergeSavedWithSeedIds([], decoded, treatmentsPayload.items);
    expect(merged.map((t) => t.id)).toEqual(sampleIds);

    const sm = sitemap();
    expect(sm.length).toBeGreaterThanOrEqual(1 + DOMAIN_LIST.length + 40);
    expect(sm.some((entry) => entry.url.endsWith("/domain/kream-commerce"))).toBe(true);

    const rb = robots();
    expect(rb.sitemap).toMatch(/\/sitemap\.xml$/);

    const rssRes = await getRss();
    expect(rssRes.status).toBe(200);
    const rssXml = await rssRes.text();
    expect(rssXml).toContain('<rss version="2.0"');
    expect(rssXml).toContain("<item>");
  });
});
