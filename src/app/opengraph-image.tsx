import { ImageResponse } from "next/og";

import { siteConfig } from "@/config/site";

export const alt = `${siteConfig.name} — considered menswear, shipped across Egypt`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/**
 * The card every shared link shows unless a page brings its own — product
 * pages do, with the product photograph. Drawn from type alone, in the
 * storefront's black and white, so it needs no asset that could go missing.
 */
export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#0a0a0a",
          color: "#ffffff",
          padding: "72px 80px",
        }}
      >
        <div style={{ display: "flex", fontSize: 22, letterSpacing: 8, opacity: 0.55 }}>
          MENSWEAR · CAIRO
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", fontSize: 150, fontWeight: 800, letterSpacing: 30 }}>
            {siteConfig.name}
          </div>
          <div style={{ display: "flex", marginTop: 20, fontSize: 36, opacity: 0.7, maxWidth: 900 }}>
            {siteConfig.tagline}
          </div>
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            borderTop: "2px solid #2a2a2a",
            paddingTop: 28,
            fontSize: 24,
            opacity: 0.6,
          }}
        >
          <span>Shipped across Egypt</span>
          <span>Cash on delivery · Card · Wallet</span>
        </div>
      </div>
    ),
    size,
  );
}
