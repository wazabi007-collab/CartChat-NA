import { ImageResponse } from "next/og";
import sharp from "sharp";
import { createClient } from "@/lib/supabase/server";

const ALLOWED_SIZES = new Set([192, 512]);

/** Sand — the storefront background, used behind logos that have transparency. */
const BACKGROUND = { r: 248, g: 250, b: 252, alpha: 1 };

// sharp is a native module and needs the Node runtime.
export const runtime = "nodejs";

interface Props {
  params: Promise<{ slug: string; size: string }>;
}

/**
 * The store's app icon, rendered at exactly the size Chrome demands.
 *
 * Chrome refuses to offer installation unless the manifest supplies both a
 * 192px and a 512px icon, and merchant logos live on Supabase storage at
 * whatever dimensions and format they were uploaded in. Pointing the manifest
 * straight at them makes installation fail silently for most stores.
 *
 * Logos are normalised through sharp rather than handed to ImageResponse.
 * ImageResponse cannot decode WebP: it returns a valid, completely BLANK PNG
 * with a 200 status, which would have put an empty white square on customers'
 * home screens for every merchant with a .webp logo. sharp decodes WebP, AVIF,
 * PNG, JPEG and SVG, and a decode or network failure throws where we can catch
 * it and fall back.
 *
 * Merchants with no usable logo get a branded initial tile, so this route
 * always produces a real icon.
 */
export async function GET(_request: Request, { params }: Props) {
  const { slug, size: rawSize } = await params;
  const size = Number(rawSize);

  if (!ALLOWED_SIZES.has(size)) {
    return new Response("Not found", { status: 404 });
  }

  const supabase = await createClient();
  const { data: merchant } = await supabase
    .from("merchants")
    .select("store_name, logo_url")
    .eq("store_slug", slug)
    .eq("is_active", true)
    .eq("store_status", "active")
    .single();

  if (!merchant) {
    return new Response("Not found", { status: 404 });
  }

  const cacheHeaders = {
    "Content-Type": "image/png",
    "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
  };

  if (merchant.logo_url) {
    try {
      const response = await fetch(merchant.logo_url);
      if (response.ok) {
        const source = Buffer.from(await response.arrayBuffer());
        const png = await sharp(source)
          .resize(size, size, { fit: "contain", background: BACKGROUND })
          .flatten({ background: BACKGROUND })
          .png()
          .toBuffer();

        return new Response(new Uint8Array(png), { headers: cacheHeaders });
      }
    } catch {
      // Unreadable or unreachable logo — fall through to the initial tile.
    }
  }

  const initial = (merchant.store_name || "?").trim().charAt(0).toUpperCase() || "?";

  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: "100%",
          height: "100%",
          background: "#159947",
          color: "#ffffff",
          fontSize: size * 0.5,
          fontWeight: 700,
        }}
      >
        {initial}
      </div>
    ),
    {
      width: size,
      height: size,
      headers: {
        "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
      },
    }
  );
}
