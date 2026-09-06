import type { Metadata } from "next";
import { PublicNavbar } from "@/components/public-navbar";
import { JsonLd } from "@/components/json-ld";
import { Hero } from "@/components/landing/hero";
import { PaymentTrustBar } from "@/components/landing/payment-trust-bar";
import { HowItWorks } from "@/components/landing/how-it-works";
import { SellAnything } from "@/components/landing/sell-anything";
import { StorefrontGallery } from "@/components/landing/storefront-gallery";
import { FeatureBlocks } from "@/components/landing/feature-blocks";
import { Pricing } from "@/components/landing/pricing";
import { FAQ } from "@/components/landing/faq";
import { CtaBar } from "@/components/landing/cta-bar";
import { Footer } from "@/components/footer";
import { SupportButton } from "@/components/support-button";
import { createServiceClient } from "@/lib/supabase/service";
import { unstable_cache } from "next/cache";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

const organizationSchema = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "OshiCart",
  url: "https://oshicart.com",
  description: "The Simplest Way to Sell Online in Namibia. Create your WhatsApp store in 5 minutes with zero transaction fees.",
  foundingLocation: { "@type": "Place", name: "Namibia" },
  parentOrganization: { "@type": "Organization", name: "Octovia Nexus Investments CC" },
  contactPoint: [
    { "@type": "ContactPoint", telephone: "+264816274823", contactType: "customer support", availableLanguage: "English" },
    { "@type": "ContactPoint", telephone: "+264816262961", contactType: "sales", availableLanguage: "English" },
  ],
};

/**
 * Live counts for the hero. Previously hard-coded ("34+ stores / 3,000+
 * products") while /stores listed 7 — the claim collapsed on the first click.
 * Internal/demo stores are excluded so the figure reflects real merchants.
 */
const getLiveCounts = unstable_cache(
  async () => {
    try {
      const service = createServiceClient();
      const [{ count: storeCount }, { count: productCount }] = await Promise.all([
        service
          .from("merchants")
          .select("id", { count: "exact", head: true })
          .eq("is_active", true)
          .eq("store_status", "active")
          .eq("is_demo", false),
        service
          .from("products")
          .select("id, merchants!inner(id)", { count: "exact", head: true })
          .eq("merchants.is_active", true)
          .eq("merchants.store_status", "active")
          .eq("merchants.is_demo", false)
          .eq("is_available", true)
          .is("deleted_at", null),
      ]);
      return {
        liveStoreCount: storeCount ?? 0,
        liveProductCount: productCount ?? 0,
      };
    } catch {
      return { liveStoreCount: 0, liveProductCount: 0 };
    }
  },
  ["landing-live-counts"],
  // Every visitor was paying two database round-trips before the first byte
  // of the homepage — the largest single contributor to a 4.8s LCP. These are
  // rounded marketing figures ("14+ stores"); five minutes stale is invisible,
  // and the store list itself was being fetched in full just to call .length.
  { revalidate: 300, tags: ["landing-live-counts"] }
);

export default async function Home() {
  const { liveStoreCount, liveProductCount } = await getLiveCounts();
  return (
    <div className="min-h-screen bg-white">
      <JsonLd data={organizationSchema} />
      <PublicNavbar />
      <main>
        <Hero liveStoreCount={liveStoreCount} liveProductCount={liveProductCount} />
        <PaymentTrustBar />
        <HowItWorks />
        <Pricing />
        <SellAnything />
        <StorefrontGallery />
        <FeatureBlocks />
        <FAQ />
        <CtaBar />
      </main>
      <Footer />
      <SupportButton />
    </div>
  );
}
