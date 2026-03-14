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
    default: "OshiCart — The Simplest Way to Sell Online in Namibia",
    template: "%s | OshiCart",
  },
  description:
    "Create your WhatsApp store in 5 minutes. Free product catalog, order management, and local payments — built for Namibia. Zero transaction fees.",
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
    "MoMo Namibia",
  ],
  authors: [{ name: "Octovia Nexus Investments CC" }],
  creator: "OshiCart",
  icons: {
    icon: "/icon.svg",
    apple: "/icon.svg",
  },
  manifest: "/manifest.json",
  openGraph: {
    title: "OshiCart — The Simplest Way to Sell Online in Namibia",
    description: "Create your WhatsApp store in 5 minutes. Zero transaction fees. Keep 100% of your profits. Built for Namibian businesses.",
    url: siteUrl,
    siteName: "OshiCart",
    locale: "en_NA",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "OshiCart — Sell Online in Namibia",
    description: "Create your WhatsApp store in 5 minutes. Zero transaction fees. Built for Namibia.",
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
