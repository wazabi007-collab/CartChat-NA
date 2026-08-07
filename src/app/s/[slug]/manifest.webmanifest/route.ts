import { createClient } from "@/lib/supabase/server";

interface Props {
  params: Promise<{ slug: string }>;
}

/**
 * One installable app per store.
 *
 * `scope` and `start_url` are pinned to /s/[slug] so the installed app opens
 * that shop and treats the rest of OshiCart as external. The result on a
 * customer's home screen is the merchant's shop — their name, their logo — not
 * a generic "OshiCart" icon.
 *
 * Visibility matches the storefront itself: inactive or suspended stores 404
 * rather than staying installable.
 */
export async function GET(_request: Request, { params }: Props) {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: merchant } = await supabase
    .from("merchants")
    .select("store_name, description")
    .eq("store_slug", slug)
    .eq("is_active", true)
    .eq("store_status", "active")
    .single();

  if (!merchant) {
    return new Response("Not found", { status: 404 });
  }

  const storeName = merchant.store_name.trim();

  const manifest = {
    id: `/s/${slug}`,
    name: storeName,
    // Home screens truncate around 12 characters anyway.
    short_name: storeName.slice(0, 12),
    description:
      merchant.description || `Order from ${storeName} on OshiCart.`,
    start_url: `/s/${slug}`,
    scope: `/s/${slug}`,
    display: "standalone",
    orientation: "portrait",
    background_color: "#f8fafc",
    theme_color: "#159947",
    icons: [
      {
        src: `/s/${slug}/app-icon/192`,
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: `/s/${slug}/app-icon/512`,
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
    ],
  };

  return Response.json(manifest, {
    headers: {
      "Content-Type": "application/manifest+json",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
