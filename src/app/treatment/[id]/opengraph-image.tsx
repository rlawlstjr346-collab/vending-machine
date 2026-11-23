import { ImageResponse } from "next/og";
import { loadSeedTreatments } from "@/lib/data-loader";

export const dynamic = "force-dynamic";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function TreatmentOpenGraphImage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const treatment = loadSeedTreatments().find((t) => t.id === id);

  const title = treatment?.title || "BENCH. Product Idea";
  const domain = treatment?.domainLabel || "BENCH.";
  const sampleA = treatment
    ? `${treatment.sampleA.name} (${treatment.sampleA.shortMetricLabel})`
    : "Overseas Builder Signal";
  const sampleB = treatment?.sampleB.titleKo || "AI Radar Signal";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          backgroundColor: "#F6F3EC",
          color: "#1E1C19",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "60px",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", fontSize: 30, fontWeight: 800 }}>BENCH.</div>
          <div
            style={{
              display: "flex",
              backgroundColor: "#23201C",
              color: "#FFFCF7",
              borderRadius: "9999px",
              padding: "8px 20px",
              fontSize: 18,
              fontWeight: 700,
            }}
          >
            {domain}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
          <div style={{ display: "flex", fontSize: 42, fontWeight: 800, lineHeight: 1.25 }}>
            {title}
          </div>
          <div style={{ display: "flex", fontSize: 20, color: "#3D3831" }}>{sampleA}</div>
          <div style={{ display: "flex", fontSize: 20, color: "#6E675C" }}>{sampleB}</div>
        </div>

        <div
          style={{
            borderTop: "1px solid #E7E0D3",
            paddingTop: "20px",
            display: "flex",
            justifyContent: "space-between",
            fontSize: 18,
            color: "#6E675C",
          }}
        >
          <span style={{ display: "flex" }}>{treatment?.buildCadence || "3~7일 MVP"}</span>
          <span style={{ display: "flex", color: "#23201C", fontWeight: 700 }}>BENCH.</span>
        </div>
      </div>
    ),
    { ...size }
  );
}
