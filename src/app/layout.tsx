import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
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
      { url: "/favicon.svg?v=3", type: "image/svg+xml" },
      { url: "/icon-32.png?v=3", sizes: "32x32", type: "image/png" },
      { url: "/icon-192.png?v=3", sizes: "192x192", type: "image/png" },
    ],
    shortcut: "/favicon.ico?v=3",
    apple: [{ url: "/apple-icon.png?v=3", sizes: "180x180", type: "image/png" }],
  },
  openGraph: {
    title: "OshiCart - Your Namibian Business, Online in Minutes",
    description: "Create a clean online store for shops, local vendors, food sellers, services, and WhatsApp businesses. Zero commission. Built for Namibia.",
    url: siteUrl,
    siteName: "OshiCart",
    locale: "en_NA",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "OshiCart - Sell Online in Namibia",
    description: "Create a clean online store in minutes. Local payments, WhatsApp orders, zero commission.",
  },
  robots: {
    index: true,
    follow: true,
  },
  alternates: {
    canonical: siteUrl,
  },
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
        <SpeedInsights />
        <Analytics />
      </body>
    </html>
  );
}
