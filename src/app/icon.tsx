import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          backgroundColor: "#0F172A",
          borderRadius: "8px",
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
            fontSize: 20,
            fontWeight: 900,
            letterSpacing: "-0.04em",
            lineHeight: 1,
            marginRight: "2px",
            display: "flex",
          }}
        >
          D
        </span>
        <span
          style={{
            width: "5px",
            height: "5px",
            borderRadius: "9999px",
            backgroundColor: "#FF4F00",
            position: "absolute",
            right: "5px",
            bottom: "6px",
            display: "flex",
          }}
        />
      </div>
    ),
    { ...size }
  );
}
