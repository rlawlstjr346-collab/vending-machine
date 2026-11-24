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
          backgroundColor: "#F7F8FA",
          color: "#0F172A",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "64px",
          border: "1px solid #E5E7EB",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: 34, fontWeight: 800 }}>
            <span>BENCH</span>
            <span
              style={{
                width: "12px",
                height: "12px",
                borderRadius: "9999px",
                backgroundColor: "#2563EB",
                display: "flex",
              }}
            />
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 18,
              color: "#475569",
              border: "1px solid #E5E7EB",
              borderRadius: "9999px",
              backgroundColor: "#FFFFFF",
              padding: "8px 18px",
            }}
          >
            OVERSEAS BUILDERS x AI RADAR
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div style={{ display: "flex", fontSize: 52, fontWeight: 800, lineHeight: 1.2 }}>
            Visual Product Blueprint Deck
          </div>
          <div style={{ display: "flex", fontSize: 28, fontWeight: 600, color: "#475569" }}>
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
            color: "#64748B",
          }}
        >
          <span style={{ display: "flex" }}>
            Brand Commerce · Cinema · Photo · Music · Local Archive · Creator Tool
          </span>
          <span style={{ display: "flex", color: "#0F172A", fontWeight: 700 }}>BENCH.</span>
        </div>
      </div>
    ),
    { ...size }
  );
}
