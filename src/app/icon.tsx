import { ImageResponse } from "next/og";
import { brand } from "@/lib/brand";
import { SITE_NAME } from "@/lib/seo";

export const size = { width: 512, height: 512 };
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
          background: `linear-gradient(135deg, ${brand.ink} 0%, ${brand.green} 100%)`,
          color: brand.foreground,
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              fontSize: 120,
              fontWeight: 800,
              letterSpacing: "-0.04em",
              lineHeight: 1,
            }}
          >
            PT
          </div>
          <div
            style={{
              marginTop: 8,
              fontSize: 28,
              fontWeight: 600,
              color: brand.mint,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
            }}
          >
            {SITE_NAME.split(" ")[1]}
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
