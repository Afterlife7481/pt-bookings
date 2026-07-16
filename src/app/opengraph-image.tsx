import { ImageResponse } from "next/og";
import { SITE_NAME } from "@/lib/seo";

export const alt = "PT Bookings — personal trainer scheduling software for the UK";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: 64,
          background: "linear-gradient(135deg, #020617 0%, #0f172a 50%, #064e3b 100%)",
          color: "#ffffff",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <p
          style={{
            margin: 0,
            fontSize: 22,
            fontWeight: 600,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: "#6ee7b7",
          }}
        >
          Built for UK personal trainers
        </p>
        <h1
          style={{
            margin: "16px 0 0",
            fontSize: 64,
            fontWeight: 800,
            lineHeight: 1.1,
            maxWidth: 900,
          }}
        >
          {SITE_NAME}
        </h1>
        <p
          style={{
            margin: "24px 0 0",
            fontSize: 28,
            lineHeight: 1.4,
            color: "#cbd5e1",
            maxWidth: 820,
          }}
        >
          Free scheduling, client portal links, recurring sessions &amp; last-minute
          fill-ins
        </p>
      </div>
    ),
    { ...size },
  );
}
