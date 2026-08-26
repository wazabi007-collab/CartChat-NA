import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // AVIF first, WebP as the fallback. Photographs encode roughly 20-30%
    // smaller as AVIF, and a storefront is almost entirely photographs -- the
    // Octovia grid alone transfers ~750KB of them. Browsers that cannot decode
    // AVIF get WebP automatically. The slower first encode is paid once per
    // image thanks to the year-long cache below.
    formats: ["image/avif", "image/webp"],
    // Product image URLs are content-addressed (random filename per upload), so the
    // optimized output is effectively immutable. Cache it for a year on the Vercel CDN
    // and in the browser instead of revalidating against the storage origin (which
    // currently serves Cache-Control: no-cache) every 60s.
    minimumCacheTTL: 31536000,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "pcseqiaqeiiaiqxqtfmw.supabase.co",
      },
    ],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "X-XSS-Protection", value: "1; mode=block" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(self)" },
        ],
      },
    ];
  },
};

export default nextConfig;
