export type DomainSlug =
  | "brand-commerce"
  | "cinema-video"
  | "photo-visual"
  | "music-audio"
  | "local-archive"
  | "creator-tool";

export type MechanismId =
  | "visual-price-match"
  | "timestamp-archive"
  | "geo-curation"
  | "canvas-compare"
  | "audio-stem"
  | "drop-validation";

export type BuilderSourceId =
  | "show_hn"
  | "product_hunt"
  | "trustmrr"
  | "uneed"
  | "x_oembed";

export interface BuilderSignal {
  id: string;
  name: string;
  slug: string;
  source: BuilderSourceId;
  sourceLabel: string;
  url: string;
  discussionUrl?: string | null;
  taglineEn: string;
  taglineKo: string;
  summaryKo: string;
  painPointKo: string;
  tractionLabel: string;
  tractionValue: number;
  tractionType: "mrr" | "points" | "launch" | "rank";
  mrrUsd?: number | null;
  mechanism: MechanismId;
  mechanismLabel: string;
  tags: string[];
  publishedAt: string;
  fetchedAt: string;
  verifiedRevenue: boolean;
}

export interface AiRadarPlanningMeta {
  signalType: string;
  productDomain: string;
  benchmarkPoint: string;
  actionableIdea: string;
}

export interface AiRadarUtilityTip {
  whenNeeded: string;
  workUtility: string;
  practicalTip: string;
}

export interface AiRadarSignal {
  id: string;
  titleKo: string;
  originalTitle: string;
  platformId: string;
  authorHandle?: string | null;
  category: string;
  lifecycleStatus: string;
  canonicalUrl: string;
  publishedAt: string;
  fetchedAt: string;
  importanceScore: number;
  sourceCount: number;
  benefitTag?: string | null;
  highlightSummary: string;
  whatKo: string;
  whyKo: string;
  utilityTip?: AiRadarUtilityTip | null;
  planningMeta: AiRadarPlanningMeta;
  entities: string[];
}

export interface TreatmentLineageNode {
  step: "A" | "B" | "C";
  label: string;
  title: string;
  treatmentId?: string;
  builderId?: string;
  builderName?: string;
}

export interface TreatmentSampleA {
  builderId: string;
  name: string;
  url: string;
  sourceLabel: string;
  tractionLabel: string;
  shortMetricLabel: string;
  verifiedRevenue: boolean;
  mechanism: MechanismId;
  mechanismLabel: string;
  overseasProofKo: string;
}

export interface TreatmentSampleA2 {
  builderId: string;
  name: string;
  url: string;
  sourceLabel: string;
  tractionLabel: string;
  mechanismLabel: string;
  addedFeatureKo: string;
}

export interface TreatmentSampleB {
  radarId: string;
  titleKo: string;
  canonicalUrl: string;
  platformId: string;
  signalType: string;
  productDomain: string;
  benchmarkPoint: string;
  bottleneckSolvedKo: string;
}

export interface Treatment {
  id: string;
  slug: string;
  createdAt: string;
  updatedAt: string;
  domainSlug: DomainSlug;
  domainLabel: string;
  domainColor: string;
  customTopic?: string | null;
  title: string;
  oneLineHook: string;
  firstThreeSecondsUx: string;
  buildCadence: string;
  sampleA: TreatmentSampleA;
  sampleA2?: TreatmentSampleA2 | null;
  sampleB: TreatmentSampleB;
  twistSummaryKo: string;
  mvpFeatures: [string, string, string];
  scopeCutoff: string[];
  targetKpis: string[];
  lineage: TreatmentLineageNode[];
  synthesisMode: "deterministic" | "llm-gemini" | "llm-anthropic";
  parentTreatmentId?: string | null;
  variantIndex?: number;
}

export interface SyncMeta {
  syncedAt: string;
  counts: {
    aiRadar: number;
    builderTotal: number;
    bySource: Record<string, number>;
    verifiedRevenueCount: number;
    treatmentsSeed: number;
  };
  sources: Array<{
    id: string;
    label: string;
    status: number | string;
    count: number;
    cached304?: boolean;
    note?: string;
  }>;
}
