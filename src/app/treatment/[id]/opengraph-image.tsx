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

  const title = treatment?.title || "DISPENSER Product Idea";
  const cadence = treatment?.buildCadence || "5~7일 MVP";
  const sampleA = treatment
    ? `${treatment.sampleA.name} (${treatment.sampleA.shortMetricLabel})`
    : "Global Open-Source Signal";
  const sampleB = treatment?.sampleB.titleKo || "Live AI Radar Signal";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          backgroundColor: "#F7F8FA",
          color: "#0F172A",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "60px",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: 30, fontWeight: 800, letterSpacing: "0.05em" }}>
            <span>DISPENSER</span>
            <span
              style={{
                width: "10px",
                height: "10px",
                borderRadius: "9999px",
                backgroundColor: "#2563EB",
                display: "flex",
              }}
            />
          </div>
          <div
            style={{
              display: "flex",
              backgroundColor: "#0F172A",
              color: "#FFFFFF",
              borderRadius: "9999px",
              padding: "8px 20px",
              fontSize: 18,
              fontWeight: 700,
            }}
          >
            {cadence}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
          <div style={{ display: "flex", fontSize: 42, fontWeight: 800, lineHeight: 1.25 }}>
            {title}
          </div>
          <div style={{ display: "flex", fontSize: 20, color: "#1E293B" }}>{sampleA}</div>
          <div style={{ display: "flex", fontSize: 20, color: "#64748B" }}>{sampleB}</div>
        </div>

        <div
          style={{
            borderTop: "1px solid #E2E8F0",
            paddingTop: "20px",
            display: "flex",
            justifyContent: "space-between",
            fontSize: 18,
            color: "#64748B",
          }}
        >
          <span style={{ display: "flex" }}>Global Open Source × Live AI Issue</span>
          <span style={{ display: "flex", color: "#0F172A", fontWeight: 800 }}>DISPENSER</span>
        </div>
      </div>
    ),
    { ...size }
  );
}
