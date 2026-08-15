import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { fetchAsCoverPngDataUri } from "@/lib/og-image";

/**
 * A portrait product card for WhatsApp Status.
 *
 * Status is where Namibian merchants actually broadcast — this turns a
 * product into a postable image: photo, price, store, link. 1080x1350 (4:5)
 * posts cleanly to Status, Instagram and Facebook alike.
 *
 * Public data only: the product must be available and its store live.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ productId: string }> }
) {
  const { productId } = await params;
  const origin = new URL(req.url).origin;

  if (!/^[0-9a-f-]{36}$/.test(productId)) {
    return new Response("Not found", { status: 404 });
  }

  const { data: product } = await createServiceClient()
    .from("products")
    .select(
      "name, price_nad, images, is_available, item_type, merchants!inner(store_name, store_slug, is_active, store_status)"
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
    return new Response("Not found", { status: 404 });
  }

  const photoUrl = (product.images as string[] | null)?.[0] ?? null;
  // Product photos are WebP; satori cannot decode WebP. Cover-crop to the
  // hero size through sharp, or fall back to the letter tile.
  const photo = photoUrl ? await fetchAsCoverPngDataUri(photoUrl, 1080, 810) : null;
  const price = `N$${(product.price_nad / 100).toLocaleString("en-NA", {
    minimumFractionDigits: 2,
  })}`;
  const isService = product.item_type === "service";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          backgroundColor: "#f8fafc",
        }}
      >
        {/* Photo area — 1080x810, cover. Letter tile when no photo. */}
        {photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={photo}
            alt=""
            width={1080}
            height={810}
            style={{ objectFit: "cover" }}
          />
        ) : (
          <div
            style={{
              width: 1080,
              height: 810,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: "#e7f8ee",
              fontSize: 300,
              fontWeight: 700,
              color: "#008938",
            }}
          >
            {(product.name.trim()[0] || "P").toUpperCase()}
          </div>
        )}

        {/* Details */}
        <div
          style={{
            flexGrow: 1,
            display: "flex",
            flexDirection: "column",
            padding: "44px 60px 0",
          }}
        >
          <div
            style={{
              fontSize: product.name.length > 30 ? 48 : 58,
              fontWeight: 700,
              color: "#0b1220",
              lineHeight: 1.15,
            }}
          >
            {product.name}
          </div>

          <div
            style={{
              marginTop: 18,
              display: "flex",
              alignItems: "center",
              gap: 24,
            }}
          >
            <div style={{ fontSize: 72, fontWeight: 700, color: "#008938" }}>
              {price}
            </div>
            {isService && (
              <div
                style={{
                  fontSize: 30,
                  fontWeight: 700,
                  color: "#b47d00",
                  backgroundColor: "#fdf3dd",
                  padding: "8px 22px",
                  borderRadius: 999,
                }}
              >
                Book an appointment
              </div>
            )}
          </div>

          <div style={{ marginTop: 14, fontSize: 34, color: "#526174" }}>
            {merchant.store_name}
          </div>
        </div>

        {/* Footer bar: the call to action IS the link. */}
        <div
          style={{
            height: 110,
            backgroundColor: "#008938",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 60px",
          }}
        >
          <div style={{ fontSize: 34, fontWeight: 700, color: "#ffffff" }}>
            {isService ? "Book on WhatsApp" : "Order on WhatsApp"}
          </div>
          <div style={{ fontSize: 32, fontWeight: 700, color: "#d9f7e6" }}>
            {`oshicart.com/s/${merchant.store_slug}`}
          </div>
        </div>
      </div>
    ),
    {
      width: 1080,
      height: 1350,
      headers: {
        "Cache-Control": "public, max-age=600, s-maxage=3600, stale-while-revalidate=86400",
      },
    }
  );
}
