import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          backgroundColor: "#0F172A",
          borderRadius: "38px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
          fontFamily: "sans-serif",
        }}
      >
        <span
          style={{
            color: "#FFFFFF",
            fontSize: 112,
            fontWeight: 900,
            letterSpacing: "-0.05em",
            lineHeight: 1,
            marginRight: "10px",
            display: "flex",
          }}
        >
          D
        </span>
        <span
          style={{
            width: "26px",
            height: "26px",
            borderRadius: "9999px",
            backgroundColor: "#FF4F00",
            position: "absolute",
            right: "30px",
            bottom: "36px",
            display: "flex",
          }}
        />
      </div>
    ),
    { ...size }
  );
}
