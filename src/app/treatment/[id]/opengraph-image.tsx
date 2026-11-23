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

  const title = treatment?.title || "BENCH. Treatment Sheet";
  const domain = treatment?.domainLabel || "BENCH.";
  const sampleA = treatment
    ? `${treatment.sampleA.name} (${treatment.sampleA.tractionLabel})`
    : "Overseas Builder Signal";
  const sampleB = treatment?.sampleB.titleKo || "AI Radar Signal";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          backgroundColor: "#FAFAFA",
          color: "#111111",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "60px",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", fontSize: 28, fontWeight: 800, letterSpacing: "0.08em" }}>
            BENCH.
          </div>
          <div
            style={{
              display: "flex",
              backgroundColor: "#111111",
              color: "#FFFFFF",
              padding: "8px 18px",
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
          <div style={{ display: "flex", fontSize: 20, color: "#374151" }}>{`A: ${sampleA}`}</div>
          <div style={{ display: "flex", fontSize: 20, color: "#4B5563" }}>{`B: ${sampleB}`}</div>
        </div>

        <div
          style={{
            borderTop: "1px solid #E5E7EB",
            paddingTop: "20px",
            display: "flex",
            justifyContent: "space-between",
            fontSize: 18,
            color: "#4B5563",
          }}
        >
          <span style={{ display: "flex" }}>{treatment?.buildCadence || "2-Week TF Wedge"}</span>
          <span style={{ display: "flex", color: "#111111", fontWeight: 700 }}>
            BENCH. TREATMENT SHEET
          </span>
        </div>
      </div>
    ),
    { ...size }
  );
}
