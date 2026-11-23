import type { MetadataRoute } from "next";
import { DOMAIN_LIST } from "@/lib/domains";
import { getSiteUrl, loadSeedTreatments } from "@/lib/data-loader";

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
    ...DOMAIN_LIST.map((d) => ({
      url: `${siteUrl}/domain/${d.slug}`,
      lastModified: now,
      changeFrequency: "daily" as const,
      priority: 0.9,
    })),
    ...treatments.map((t) => ({
      url: `${siteUrl}/treatment/${t.id}`,
      lastModified: new Date(t.updatedAt || now),
      changeFrequency: "daily" as const,
      priority: 0.8,
    })),
  ];
}
