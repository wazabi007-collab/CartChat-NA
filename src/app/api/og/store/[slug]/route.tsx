import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { TOWN_LABELS } from "@/lib/constants";
import { fetchAsPngDataUri } from "@/lib/og-image";

/**
 * The link-preview card for a storefront.
 *
 * Previously the raw merchant logo was used as og:image — an arbitrary square
 * stretched into WhatsApp's 1200x630 frame, which is where the ugly
 * blue-green previews came from. This renders the logo the way the site
 * does: on a white tile, beside the store's name, inside OshiCart branding.
 *
 * Service client, but only columns the storefront already shows publicly.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const origin = new URL(req.url).origin;

  const { data: merchant } = await createServiceClient()
    .from("merchants")
    .select("store_name, logo_url, town, is_active, store_status")
    .eq("store_slug", slug.toLowerCase())
    .single();

  // Unknown or unlisted store: fall back to the brand card rather than 404,
  // so a stale link pasted in a chat still previews as OshiCart.
  if (!merchant || !merchant.is_active || merchant.store_status !== "active") {
    return Response.redirect(`${origin}/api/og/default`, 302);
  }

  const town = merchant.town ? TOWN_LABELS[merchant.town] ?? merchant.town : null;
  const initial = (merchant.store_name.trim()[0] || "S").toUpperCase();

  // Merchant logos are WebP (upload pipeline) and satori cannot decode WebP —
  // normalise to PNG, or fall back to the letter tile.
  const logo = merchant.logo_url ? await fetchAsPngDataUri(merchant.logo_url, 400) : null;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          backgroundColor: "#f8fafc",
          position: "relative",
          padding: "0 80px",
          gap: 64,
        }}
      >
        {/* Logo tile — white card, logo contained, never stretched. */}
        <div
          style={{
            width: 260,
            height: 260,
            borderRadius: 32,
            backgroundColor: "#ffffff",
            border: "2px solid #e2e8f0",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          {logo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={logo}
              alt=""
              width={200}
              height={200}
              style={{ objectFit: "contain", borderRadius: 20 }}
            />
          ) : (
            <div
              style={{
                fontSize: 130,
                fontWeight: 700,
                color: "#008938",
              }}
            >
              {initial}
            </div>
          )}
        </div>

        <div style={{ display: "flex", flexDirection: "column", width: 700 }}>
          <div
            style={{
              fontSize:
                merchant.store_name.length > 26
                  ? 44
                  : merchant.store_name.length > 18
                  ? 54
                  : 66,
              fontWeight: 700,
              color: "#0b1220",
              lineHeight: 1.1,
            }}
          >
            {merchant.store_name}
          </div>

          {town && (
            <div style={{ marginTop: 14, fontSize: 32, color: "#526174" }}>
              {`${town}, Namibia`}
            </div>
          )}

          <div
            style={{
              marginTop: 30,
              display: "flex",
              alignItems: "center",
              gap: 14,
              fontSize: 28,
              fontWeight: 700,
              color: "#b47d00",
            }}
          >
            <span>Order on WhatsApp</span>
            <span style={{ color: "#94a3b8" }}>·</span>
            <span>Pay locally</span>
          </div>

          <div
            style={{
              marginTop: 26,
              fontSize: 26,
              fontWeight: 700,
              color: "#2b5ea7",
            }}
          >
            {`oshicart.com/s/${slug.toLowerCase()}`}
          </div>
        </div>

        {/* Brand corner + baseline. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`${origin}/icon-192.png`}
          alt=""
          width={56}
          height={56}
          style={{ position: "absolute", top: 36, right: 44, borderRadius: 14 }}
        />
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
        "Cache-Control": "public, max-age=600, s-maxage=3600, stale-while-revalidate=86400",
      },
    }
  );
}
