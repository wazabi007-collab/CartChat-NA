import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    formats: ["image/webp"],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "pcseqiaqeiiaiqxqtfmw.supabase.co",
      },
    ],
  },
};

export default nextConfig;
