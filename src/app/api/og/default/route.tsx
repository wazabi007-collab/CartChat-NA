import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";

export const runtime = "edge";

/**
 * The link-preview card for oshicart.com itself.
 *
 * Replaces a static og-default.png that predated the Sunrise rebrand — a
 * blue-green gradient that looked nothing like the site. Generated in code so
 * the card can never drift from the brand again: light like the site, led by
 * the logo, one acacia line at the base.
 */
export async function GET(req: NextRequest) {
  const origin = new URL(req.url).origin;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#f8fafc",
          position: "relative",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`${origin}/oshicart-logo-v3.png`}
          alt=""
          height={130}
          style={{ objectFit: "contain" }}
        />

        <div
          style={{
            marginTop: 48,
            fontSize: 50,
            fontWeight: 700,
            color: "#0b1220",
            textAlign: "center",
          }}
        >
          Your Namibian business, online in minutes.
        </div>

        <div
          style={{
            marginTop: 28,
            display: "flex",
            alignItems: "center",
            gap: 18,
            fontSize: 30,
            fontWeight: 700,
            color: "#b47d00",
          }}
        >
          <span>Zero commission</span>
          <span style={{ color: "#94a3b8" }}>·</span>
          <span>WhatsApp orders</span>
          <span style={{ color: "#94a3b8" }}>·</span>
          <span>Local payments</span>
        </div>

        <div
          style={{
            marginTop: 40,
            fontSize: 28,
            fontWeight: 700,
            letterSpacing: 4,
            color: "#2b5ea7",
          }}
        >
          OSHICART.COM
        </div>

        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            width: "100%",
            height: 14,
            backgroundColor: "#008938",
          }}
        />
      </div>
    ),
    {
      width: 1200,
      height: 630,
      headers: {
        "Cache-Control": "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800",
      },
    }
  );
}
