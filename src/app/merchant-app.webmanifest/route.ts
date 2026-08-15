/**
 * The merchant app.
 *
 * A second installable app on the same origin, kept distinct from the shopper
 * app by `id` and `start_url`. A merchant installing from the dashboard gets
 * "OshiCart Dashboard" opening on their orders, not the store directory.
 *
 * Deliberately NOT served from under /dashboard. The auth middleware redirects
 * anything matching `startsWith("/dashboard")` to /login, and browsers fetch
 * manifests without credentials — so a manifest living there resolved to a
 * login page and merchants got no install prompt at all. It carries no secrets,
 * so serving it publicly is fine.
 *
 * It is a route handler rather than a manifest file because Next's manifest
 * convention only applies at the app root, which the shopper app occupies.
 */
export function GET() {
  const manifest = {
    id: "/dashboard",
    name: "OshiCart Dashboard",
    // Launchers abbreviate long labels, but this must not read as the shopper
    // app — the two sit side by side on a merchant's phone.
    short_name: "OshiCart Dashboard",
    description:
      "Manage your OshiCart store, orders, products, and customers.",
    start_url: "/dashboard",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#f8fafc",
    theme_color: "#008938",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };

  return Response.json(manifest, {
    headers: {
      "Content-Type": "application/manifest+json",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
