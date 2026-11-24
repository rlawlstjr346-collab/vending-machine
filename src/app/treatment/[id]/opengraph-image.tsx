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

  const title = treatment?.title || "DISPENSER. Product Idea";
  const trackBadge =
    treatment?.track === "culture"
      ? `GLOBAL CULTURE · ${treatment.sampleB.platformId}`
      : `TECH WEDGE · ${treatment?.buildCadence || "5~7일 MVP"}`;
  const sampleA = treatment
    ? `${treatment.sampleA.name} (${treatment.sampleA.shortMetricLabel})`
    : "Global Open-Source Signal";
  const sampleB = treatment?.sampleB.titleKo || "Live AI & Culture Signal";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          backgroundColor: "#FFFFFF",
          color: "#0F172A",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "60px 68px",
          border: "16px solid #F7F8FA",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
            <div
              style={{
                width: "38px",
                height: "38px",
                borderRadius: "9px",
                backgroundColor: "#0F172A",
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                padding: "8px",
                gap: "4px",
              }}
            >
              <div style={{ width: "22px", height: "3px", borderRadius: "2px", backgroundColor: "#FFFFFF", display: "flex" }} />
              <div style={{ width: "22px", height: "3px", borderRadius: "2px", backgroundColor: "#CBD5E1", display: "flex" }} />
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "22px" }}>
                <div style={{ width: "12px", height: "3px", borderRadius: "2px", backgroundColor: "#94A3B8", display: "flex" }} />
                <div style={{ width: "5px", height: "5px", borderRadius: "9999px", backgroundColor: "#FF4F00", display: "flex" }} />
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "baseline", fontSize: 32, fontWeight: 900, letterSpacing: "-0.04em" }}>
              <span>DISPENSER</span>
              <span style={{ color: "#FF4F00" }}>.</span>
            </div>
          </div>
          <div
            style={{
              display: "flex",
              backgroundColor: "#0F172A",
              color: "#FFFFFF",
              borderRadius: "9999px",
              padding: "9px 20px",
              fontSize: 16,
              fontWeight: 700,
            }}
          >
            {trackBadge}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
          <div style={{ display: "flex", fontSize: 40, fontWeight: 800, lineHeight: 1.28, letterSpacing: "-0.03em" }}>
            {title}
          </div>
          <div style={{ display: "flex", fontSize: 21, fontWeight: 700, color: "#1E293B" }}>
            01 · {sampleA}
          </div>
          <div style={{ display: "flex", fontSize: 20, color: "#475569" }}>
            02 · {sampleB}
          </div>
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
          <span style={{ display: "flex" }}>{treatment?.buildCadence || "5~7일 MVP"} · MVP 3 Features &amp; Coding Prompt</span>
          <span style={{ display: "flex", color: "#0F172A", fontWeight: 800 }}>
            DISPENSER<span style={{ color: "#FF4F00" }}>.</span>
          </span>
        </div>
      </div>
    ),
    { ...size }
  );
}
