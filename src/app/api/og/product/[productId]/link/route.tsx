import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { fetchAsPngDataUri } from "@/lib/og-image";
import { socialPriceLabel } from "@/lib/quote";

/**
 * The link-preview card for a single product.
 *
 * Deliberately separate from the portrait card one segment up: that one is
 * 1080x1350 for WhatsApp Status, this is the 1200x630 landscape frame every
 * link unfurler (WhatsApp chat, Facebook, X, Slack) crops to. Product pages
 * used to hand the raw product photo to og:image while still declaring
 * 1200x630, so an arbitrary aspect ratio was stretched into a landscape frame
 * — and photoless products borrowed the store card, which shows no product at
 * all.
 *
 * Service client, but only columns the product page already shows publicly.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ productId: string }> }
) {
  const { productId } = await params;
  const origin = new URL(req.url).origin;

  // Unknown, unlisted or malformed: fall back to the brand card rather than
  // 404, so a stale link pasted in a chat still previews as OshiCart.
  if (!/^[0-9a-f-]{36}$/.test(productId)) {
    return Response.redirect(`${origin}/api/og/default`, 302);
  }

  const { data: product } = await createServiceClient()
    .from("products")
    .select(
      "name, price_nad, images, is_available, item_type, product_variants(price_nad, is_available), merchants!inner(store_name, store_slug, is_active, store_status)"
    )
    .eq("id", productId)
    .is("deleted_at", null)
    .single();

  const merchant = product?.merchants as unknown as {
    store_name: string;
    store_slug: string;
    is_active: boolean;
    store_status: string;
  } | null;

  if (
    !product ||
    !product.is_available ||
    !merchant?.is_active ||
    merchant.store_status !== "active"
  ) {
    return Response.redirect(`${origin}/api/og/default`, 302);
  }

  const photoUrl = (product.images as string[] | null)?.[0] ?? null;
  // Product photos are WebP (upload pipeline) and satori cannot decode WebP —
  // normalise to PNG, or fall back to the letter tile. `fit: "inside"` keeps
  // the photo's own aspect ratio: a tall bottle is contained in the tile, not
  // cropped or squashed to fill it.
  const photo = photoUrl ? await fetchAsPngDataUri(photoUrl, 400) : null;
  const price = socialPriceLabel(product);
  const isService = product.item_type === "service";
  // Merchants type full sentences into product names; past ~72 characters the
  // heading pushes the price out of the frame however small the type gets.
  const name =
    product.name.length > 72
      ? `${product.name.slice(0, 71).trimEnd()}…`
      : product.name;

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
          padding: "0 72px",
          gap: 56,
        }}
      >
        {/* Photo tile — white card, photo contained, never stretched. */}
        <div
          style={{
            width: 400,
            height: 400,
            borderRadius: 32,
            backgroundColor: "#ffffff",
            border: "2px solid #e2e8f0",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          {photo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={photo}
              alt=""
              width={340}
              height={340}
              style={{ objectFit: "contain", borderRadius: 20 }}
            />
          ) : (
            <div style={{ fontSize: 190, fontWeight: 700, color: "#008938" }}>
              {(product.name.trim()[0] || "P").toUpperCase()}
            </div>
          )}
        </div>

        <div style={{ display: "flex", flexDirection: "column", width: 600 }}>
          <div style={{ fontSize: 30, color: "#526174" }}>
            {merchant.store_name}
          </div>

          <div
            style={{
              marginTop: 10,
              fontSize: name.length > 42 ? 40 : name.length > 24 ? 50 : 60,
              fontWeight: 700,
              color: "#0b1220",
              lineHeight: 1.1,
            }}
          >
            {name}
          </div>

          <div
            style={{
              marginTop: 20,
              fontSize: price === "Request a quote" ? 44 : 64,
              fontWeight: 700,
              color: "#008938",
            }}
          >
            {price}
          </div>

          <div
            style={{
              marginTop: 26,
              display: "flex",
              alignItems: "center",
              gap: 14,
              fontSize: 28,
              fontWeight: 700,
              color: "#b47d00",
            }}
          >
            <span>{price === "Request a quote" ? "Enquire on WhatsApp" : isService ? "Book on WhatsApp" : "Order on WhatsApp"}</span>
            <span style={{ color: "#94a3b8" }}>·</span>
            <span>Pay locally</span>
          </div>

          <div
            style={{
              marginTop: 22,
              fontSize: 26,
              fontWeight: 700,
              color: "#2b5ea7",
            }}
          >
            {`oshicart.com/s/${merchant.store_slug}`}
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
