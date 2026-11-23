import { ImageResponse } from "next/og";

export const dynamic = "force-dynamic";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
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
          padding: "64px",
          border: "1px solid #E5E7EB",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", fontSize: 32, fontWeight: 800, letterSpacing: "0.08em" }}>
            BENCH.
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 18,
              color: "#4B5563",
              border: "1px solid #E5E7EB",
              backgroundColor: "#FFFFFF",
              padding: "8px 16px",
            }}
          >
            OVERSEAS BUILDERS x AI RADAR WORKBENCH
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div style={{ display: "flex", fontSize: 52, fontWeight: 800, lineHeight: 1.2 }}>
            Overseas Builder Signals x AI Radar
          </div>
          <div style={{ display: "flex", fontSize: 36, fontWeight: 700, color: "#374151" }}>
            Editorial Sampling Workbench for 2-Week TF MVPs
          </div>
          <div style={{ display: "flex", fontSize: 22, color: "#4B5563" }}>
            Show HN / Product Hunt / TrustMRR / Uneed x AI Radar 100
          </div>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            borderTop: "1px solid #E5E7EB",
            paddingTop: "24px",
            fontSize: 18,
            color: "#4B5563",
          }}
        >
          <span style={{ display: "flex" }}>
            Commerce / Film Previs / Photo Lookbook / Music Sampling / Culture Map
          </span>
          <span style={{ display: "flex", color: "#111111", fontWeight: 700 }}>A-Z / B-C</span>
        </div>
      </div>
    ),
    { ...size }
  );
}
