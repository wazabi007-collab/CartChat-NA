import type { MetadataRoute } from "next";

/**
 * The merchant-facing app. Shoppers get a per-store manifest instead
 * (src/app/s/[slug]/manifest.webmanifest), so their home screen shows the
 * merchant's shop rather than "OshiCart".
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/dashboard",
    name: "OshiCart — manage your store",
    short_name: "OshiCart",
    description:
      "Manage your OshiCart store, orders, and products from your phone.",
    start_url: "/dashboard",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#f8fafc",
    theme_color: "#159947",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
