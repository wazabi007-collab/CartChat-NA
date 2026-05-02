import type { Metadata } from "next";
import { PublicNavbar } from "@/components/public-navbar";
import { JsonLd } from "@/components/json-ld";
import { Hero } from "@/components/landing/hero";
import { PaymentTrustBar } from "@/components/landing/payment-trust-bar";
import { HowItWorks } from "@/components/landing/how-it-works";
import { StorefrontGallery } from "@/components/landing/storefront-gallery";
import { FeatureBlocks } from "@/components/landing/feature-blocks";
import { Pricing } from "@/components/landing/pricing";
import { FAQ } from "@/components/landing/faq";
import { CtaBar } from "@/components/landing/cta-bar";
import { Footer } from "@/components/footer";
import { SupportButton } from "@/components/support-button";

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

export default function Home() {
  return (
    <div className="min-h-screen bg-white">
      <JsonLd data={organizationSchema} />
      <PublicNavbar />
      <main>
        <Hero />
        <PaymentTrustBar />
        <HowItWorks />
        <StorefrontGallery />
        <FeatureBlocks />
        <Pricing />
        <FAQ />
        <CtaBar />
      </main>
      <Footer />
      <SupportButton />
    </div>
  );
}
