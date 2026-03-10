import type { NextConfig } from "next";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "http://localhost:8090";
const supabaseHostname = new URL(supabaseUrl).hostname;

const nextConfig: NextConfig = {
  output: "standalone",
  images: {
    formats: ["image/webp"],
    remotePatterns: [
      {
        protocol: "https",
        hostname: supabaseHostname,
      },
      {
        protocol: "http",
        hostname: supabaseHostname,
      },
      {
        protocol: "http",
        hostname: "localhost",
      },
      {
        protocol: "http",
        hostname: "kong",
      },
    ],
  },
};

export default nextConfig;
