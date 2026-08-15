import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Analytics } from "@vercel/analytics/next";
import { ServiceWorkerRegister } from "@/components/pwa/service-worker-register";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

// Mono is only used for payment references, coupon codes and invoice fields —
// none of which appear on the landing or storefront pages. Preloading it site-
// wide downloaded a font file most visitors never render (and produced a
// "preloaded but not used" console warning on every page). It still loads
// normally via the CSS variable wherever font-mono is actually applied.
const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  preload: false,
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://oshicart.com";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "OshiCart - Your Namibian Business, Online in Minutes",
    template: "%s | OshiCart",
  },
  description:
    "Create a clean online store for your Namibian shop, vendor table, food business, salon, service, or WhatsApp side hustle. Local payments, WhatsApp orders, zero commission.",
  keywords: [
    "OshiCart",
    "online store Namibia",
    "WhatsApp store",
    "sell online Namibia",
    "e-commerce Namibia",
    "Namibian business",
    "PayToday",
    "EFT Namibia",
    "mobile store",
    "product catalog",
    "order management",
    "FNB Pay2Cell",
    "MTC Maris Namibia",
  ],
  authors: [{ name: "Octovia Nexus Investments CC" }],
  creator: "OshiCart",
  icons: {
    icon: [
      { url: "/favicon.svg?v=4", type: "image/svg+xml" },
      { url: "/icon-32.png?v=4", sizes: "32x32", type: "image/png" },
      { url: "/icon-192.png?v=4", sizes: "192x192", type: "image/png" },
    ],
    shortcut: "/favicon.ico?v=4",
    apple: [{ url: "/apple-icon.png?v=4", sizes: "180x180", type: "image/png" }],
  },
  // Without this, iOS "Add to Home Screen" opens the site inside Safari chrome
  // — a bookmark rather than an app. Storefronts override the title with the
  // merchant's own store name.
  appleWebApp: {
    capable: true,
    title: "OshiCart",
    statusBarStyle: "default",
  },
  // Next emits the modern `mobile-web-app-capable`. iOS only honours the
  // manifest's display mode from 16.4 onward, and second-hand iPhones running
  // older versions are common here, so the legacy tag is set explicitly.
  // Inherited by every route, including storefronts.
  other: {
    "apple-mobile-web-app-capable": "yes",
  },
  openGraph: {
    title: "OshiCart - Your Namibian Business, Online in Minutes",
    description: "Create a clean online store for shops, local vendors, food sellers, services, and WhatsApp businesses. Zero commission. Built for Namibia.",
    url: siteUrl,
    siteName: "OshiCart",
    locale: "en_NA",
    type: "website",
    images: [{ url: "/api/og/default", width: 1200, height: 630, alt: "OshiCart — Your Namibian business, online in minutes" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "OshiCart - Sell Online in Namibia",
    description: "Create a clean online store in minutes. Local payments, WhatsApp orders, zero commission.",
    images: ["/api/og/default"],
  },
  robots: {
    index: true,
    follow: true,
  },
  alternates: {
    canonical: siteUrl,
  },
};

// Next requires themeColor on the viewport export, not in `metadata`. This is
// the colour the phone paints the status bar with once the app is installed.
export const viewport: Viewport = {
  themeColor: "#008938",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
        <ServiceWorkerRegister />
        <SpeedInsights />
        <Analytics />
      </body>
    </html>
  );
}
