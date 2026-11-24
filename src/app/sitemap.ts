import type { MetadataRoute } from "next";
import { loadSeedTreatments } from "@/lib/data-loader";
import { DOMAIN_LIST } from "@/lib/domains";
import { DISCOVER_HUBS } from "@/lib/seo-keywords";
import { getSiteUrl } from "@/lib/site-url";

export default function sitemap(): MetadataRoute.Sitemap {
  const siteUrl = getSiteUrl();
  const treatments = loadSeedTreatments();
  const now = new Date();

  return [
    {
      url: `${siteUrl}/`,
      lastModified: now,
      changeFrequency: "hourly",
      priority: 1.0,
    },
    ...DISCOVER_HUBS.map((hub) => ({
      url: `${siteUrl}/discover/${hub.slug}`,
      lastModified: now,
      changeFrequency: "daily" as const,
      priority: 0.92,
    })),
    ...DOMAIN_LIST.map((d) => ({
      url: `${siteUrl}/domain/${d.slug}`,
      lastModified: now,
      changeFrequency: "daily" as const,
      priority: 0.85,
    })),
    ...treatments.map((t) => ({
      url: `${siteUrl}/treatment/${t.id}`,
      lastModified: new Date(t.updatedAt || now),
      changeFrequency: "daily" as const,
      priority: 0.8,
    })),
  ];
}
