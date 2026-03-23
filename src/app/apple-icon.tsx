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
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#1d4ed8",
          borderRadius: "32px",
          fontSize: 90,
          fontWeight: 700,
          color: "white",
          fontFamily: "sans-serif",
        }}
      >
        SV
      </div>
    ),
    { ...size }
  );
}
