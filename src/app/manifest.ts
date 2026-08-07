import type { MetadataRoute } from "next";

/**
 * The shopper app.
 *
 * Opens the store directory rather than any single shop: someone who installs
 * OshiCart from one storefront should still be able to browse and buy from
 * every other store without leaving the app. `scope` is the whole site for the
 * same reason — a narrower scope would kick shoppers out to the browser the
 * moment they opened a store.
 *
 * Merchants get a separate app from /dashboard/manifest.webmanifest.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/stores",
    name: "OshiCart",
    short_name: "OshiCart",
    description:
      "Browse Namibian shops, order on WhatsApp, and pay locally.",
    start_url: "/stores",
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
