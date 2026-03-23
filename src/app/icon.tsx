import { ImageResponse } from "next/og";

export const size = { width: 192, height: 192 };
export const contentType = "image/png";

export default function Icon() {
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
          fontSize: 80,
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
