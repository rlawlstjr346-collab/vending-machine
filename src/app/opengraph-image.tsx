import { ImageResponse } from "next/og";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
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
          padding: "64px 72px",
          border: "16px solid #F7F8FA",
          fontFamily: "sans-serif",
        }}
      >
        {/* Top Row: Precision Industrial Mark + Track Badge */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            <div
              style={{
                width: "44px",
                height: "44px",
                borderRadius: "10px",
                backgroundColor: "#0F172A",
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                padding: "10px",
                gap: "5px",
                position: "relative",
              }}
            >
              <div style={{ width: "24px", height: "3.5px", borderRadius: "2px", backgroundColor: "#FFFFFF", display: "flex" }} />
              <div style={{ width: "24px", height: "3.5px", borderRadius: "2px", backgroundColor: "#CBD5E1", display: "flex" }} />
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "24px" }}>
                <div style={{ width: "14px", height: "3.5px", borderRadius: "2px", backgroundColor: "#94A3B8", display: "flex" }} />
                <div style={{ width: "6px", height: "6px", borderRadius: "9999px", backgroundColor: "#FF4F00", display: "flex" }} />
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "baseline", fontSize: 38, fontWeight: 900, letterSpacing: "-0.04em" }}>
              <span>DISPENSER</span>
              <span style={{ color: "#FF4F00" }}>.</span>
            </div>
          </div>

          <div
            style={{
              display: "flex",
              fontSize: 17,
              fontWeight: 700,
              color: "#334155",
              border: "1px solid #E2E8F0",
              borderRadius: "9999px",
              backgroundColor: "#F8FAFC",
              padding: "10px 20px",
            }}
          >
            TECH WEDGE 50 : GLOBAL CULTURE 50
          </div>
        </div>

        {/* Center: Editorial Hooking Headline */}
        <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
          <div style={{ display: "flex", fontSize: 54, fontWeight: 800, lineHeight: 1.22, letterSpacing: "-0.03em", color: "#0F172A" }}>
            Open Source × AI &amp; Culture Idea Dispenser
          </div>
          <div style={{ display: "flex", fontSize: 25, fontWeight: 600, color: "#475569", lineHeight: 1.45 }}>
            GitHub · Show HN · TrustMRR × AI Radar &amp; 19 Global Culture Magazines
          </div>
        </div>

        {/* Bottom Meta Bar */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            borderTop: "1px solid #E2E8F0",
            paddingTop: "24px",
            fontSize: 18,
            color: "#64748B",
          }}
        >
          <span style={{ display: "flex" }}>
            Demo Media · 3-Step Tech Digest · Highlighted Coding Prompt
          </span>
          <span style={{ display: "flex", color: "#0F172A", fontWeight: 800 }}>
            DISPENSER<span style={{ color: "#FF4F00" }}>.</span>
          </span>
        </div>
      </div>
    ),
    { ...size }
  );
}
