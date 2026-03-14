import Link from "next/link";
import Image from "next/image";
import {
  ArrowRight,
  ShoppingCart,
  MessageCircle,
  CreditCard,
  BarChart3,
  Check,
} from "lucide-react";
import { VideoModalButton } from "@/components/video-modal";
import { PublicNavbar } from "@/components/public-navbar";
import { SupportButton } from "@/components/support-button";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      <PublicNavbar />
      <HeroSection />
      <HowItWorksSection />
      <FeaturesSection />
      <PricingSection />
      <KeySolutionsSection />
      <WhatsAppCTASection />
      <Footer />
      <SupportButton />
    </div>
  );
}

/* ─── Hero ────────────────────────────────────────────────── */
function HeroSection() {
  return (
    <section className="relative overflow-hidden">
      {/* ── Mobile layout: stacked (image + text below) ── */}
      <div className="md:hidden">
        <div className="relative w-full aspect-[4/3] overflow-hidden">
          <Image
            src="/hero-main-mobile.webp"
            alt="Namibian merchant showing OshiCart store on phone with craft products"
            fill
            className="object-cover object-center"
            priority
            sizes="100vw"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-white via-white/30 to-transparent" />
        </div>
        <div className="px-5 pb-8 -mt-12 relative z-10">
          <h1 className="text-3xl font-extrabold text-gray-900 leading-tight">
            Your Namibian Business,{" "}
            <span className="text-[#4A9B3E]">Online in 5 Minutes.</span>
          </h1>
          <p className="mt-3 text-base text-gray-700 leading-relaxed">
            Create your digital catalog, accept local payments, and manage
            orders effortlessly via WhatsApp.
          </p>
          <div className="mt-5 flex flex-col gap-3">
            <Link
              href="/signup"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-[#2B5EA7] text-white rounded-lg hover:bg-[#234B86] font-semibold text-sm shadow-lg shadow-[#2B5EA7]/25 transition-all"
            >
              Start Your Free Trial
              <ArrowRight size={18} />
            </Link>
            <VideoModalButton />
            <Link
              href="/stores"
              className="inline-flex items-center justify-center gap-2 px-6 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium text-sm transition-all"
            >
              <ShoppingCart size={16} />
              See current stores on OshiCart
            </Link>
          </div>
        </div>
      </div>

      {/* ── Desktop layout: overlay on wide banner ── */}
      <div className="hidden md:block relative w-full">
        <Image
          src="/hero-main.webp"
          alt="Namibian merchant showing OshiCart store on phone with craft products"
          width={1920}
          height={700}
          className="w-full h-auto object-cover"
          priority
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-white/90 via-white/60 to-transparent">
          <div className="max-w-6xl mx-auto px-6 h-full flex items-center">
            <div className="max-w-lg">
              <h1 className="text-5xl lg:text-[3.25rem] font-extrabold text-gray-900 leading-tight">
                Your Namibian Business,{" "}
                <span className="text-[#4A9B3E]">Online in 5 Minutes.</span>
              </h1>
              <p className="mt-4 text-lg text-gray-700 leading-relaxed">
                Create your digital catalog, accept local payments, and manage
                orders effortlessly via WhatsApp.
              </p>
              <div className="mt-6 flex flex-col gap-3">
                <div className="flex flex-row gap-3">
                  <Link
                    href="/signup"
                    className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-[#2B5EA7] text-white rounded-lg hover:bg-[#234B86] font-semibold text-base shadow-lg shadow-[#2B5EA7]/25 transition-all hover:shadow-xl hover:shadow-[#2B5EA7]/30"
                  >
                    Start Your Free Trial
                    <ArrowRight size={18} />
                  </Link>
                  <VideoModalButton />
                </div>
                <Link
                  href="/stores"
                  className="inline-flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
                >
                  <ShoppingCart size={16} />
                  See current stores on OshiCart
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─── How It Works ────────────────────────────────────────── */
function HowItWorksSection() {
  return (
    <section id="how-it-works" className="bg-white">
      <div className="text-center pt-16 pb-8 px-4">
        <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900">
          How It Works
        </h2>
        <p className="text-gray-500 mt-3 max-w-xl mx-auto">
          Three simple steps to start selling online in Namibia
        </p>
      </div>
      {/* Full-width banner image */}
      <div className="w-full">
        <Image
          src="/how-it-works-banner.webp"
          alt="How It Works: 1. Create Your Catalog, 2. Share Your Link, 3. Get Orders and Payments"
          width={1920}
          height={1072}
          className="w-full h-auto"
        />
      </div>
    </section>
  );
}

/* ─── Key Solutions ───────────────────────────────────────── */
function KeySolutionsSection() {
  return (
    <section className="py-20 md:py-28 px-4 sm:px-6 bg-gradient-to-b from-gray-50 to-white">
      <div className="max-w-6xl mx-auto">
        <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900 text-center">
          Key Solutions for Namibian Merchants
        </h2>

        <div className="mt-16 grid md:grid-cols-3 gap-8">
          {/* WhatsApp Integration */}
          <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100 hover:shadow-md transition-shadow text-center flex flex-col items-center">
            <div className="w-20 h-20 relative">
              <Image
                src="/whatsapp-icon.webp"
                alt="WhatsApp"
                fill
                className="object-contain"
              />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mt-5">
              WhatsApp Integration
            </h3>
            <p className="text-sm text-gray-500 mt-3">
              Order details straight to WhatsApp. Your customers never need to
              download a new app.
            </p>
          </div>

          {/* Local Payment Focus */}
          <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100 hover:shadow-md transition-shadow text-center">
            <h3 className="text-xl font-bold text-gray-900">
              Local Payment Focus
            </h3>
            <div className="mt-6 grid grid-cols-2 gap-3">
              <div className="flex items-center justify-center h-12 relative">
                <Image
                  src="/payment-eft.svg"
                  alt="EFT"
                  width={80}
                  height={32}
                  className="object-contain"
                />
              </div>
              <div className="flex items-center justify-center h-12 relative">
                <Image
                  src="/payment-paytoday.svg"
                  alt="PayToday"
                  width={100}
                  height={32}
                  className="object-contain"
                />
              </div>
              <div className="flex items-center justify-center h-12 relative">
                <Image
                  src="/payment-ewallet.svg"
                  alt="eWallet"
                  width={80}
                  height={32}
                  className="object-contain"
                />
              </div>
              <div className="flex items-center justify-center h-12 relative">
                <Image
                  src="/payment-cod.svg"
                  alt="Cash on Delivery"
                  width={100}
                  height={32}
                  className="object-contain"
                />
              </div>
            </div>
            <p className="text-sm text-gray-500 mt-5">
              Accept all popular Namibian payment methods. No international
              gateway fees.
            </p>
          </div>

          {/* Mobile-First Design */}
          <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100 hover:shadow-md transition-shadow text-center flex flex-col items-center">
            <div className="w-full h-32 relative">
              <Image
                src="/mobile-devices.svg"
                alt="Phone, tablet, and laptop showing OshiCart"
                fill
                className="object-contain"
              />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mt-5">
              Mobile-First Design
            </h3>
            <p className="text-sm text-gray-500 mt-3">
              Optimized for smartphones on any network. Fast loading even on 3G
              — built for Namibia&apos;s mobile-first market.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─── Features (Built for Namibian businesses) ────────────── */
function FeaturesSection() {
  return (
    <section className="py-16 px-4 sm:px-6">
      <div className="max-w-4xl mx-auto">
        <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900 text-center mb-12">
          Built for Namibian businesses
        </h2>
        <div className="grid md:grid-cols-2 gap-6">
          <Feature
            icon={<ShoppingCart size={24} />}
            title="Product Catalog"
            description="Add products with photos and prices in NAD. Customers browse on their phone — no app download needed."
          />
          <Feature
            icon={<CreditCard size={24} />}
            title="Local Payment Methods"
            description="Accept EFT with proof-of-payment upload, PayToday, eWallet, and Cash on Delivery. All popular Namibian payment options in one place."
          />
          <Feature
            icon={<MessageCircle size={24} />}
            title="WhatsApp Notifications"
            description="One-tap WhatsApp messages to customers when you confirm or complete their order."
          />
          <Feature
            icon={<BarChart3 size={24} />}
            title="Sales Analytics"
            description="Track views, orders, and revenue. Know your top products and busiest days."
          />
        </div>
      </div>
    </section>
  );
}

function Feature({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="flex gap-4 p-4">
      <div className="flex-shrink-0 text-[#2B5EA7]">{icon}</div>
      <div>
        <h4 className="font-medium text-gray-900">{title}</h4>
        <p className="text-sm text-gray-500 mt-1">{description}</p>
      </div>
    </div>
  );
}

/* ─── Pricing ─────────────────────────────────────────────── */
function PricingSection() {
  return (
    <section className="py-16 bg-gray-50 px-4 sm:px-6" id="pricing">
      <div className="max-w-5xl mx-auto">
        <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900 text-center mb-3">
          Simple pricing
        </h2>
        <p className="text-gray-500 text-center mb-12 max-w-xl mx-auto">
          Start free for 30 days. Upgrade when you&apos;re ready to grow.
        </p>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5 lg:gap-4 items-start pt-4">
          <PricingCard
            name="Oshi-Start"
            price="N$0"
            period="30-day trial"
            features={[
              "10 products",
              "20 orders/month",
              "Product catalog",
              "Order management",
              "EFT proof upload",
              "OshiCart branding",
            ]}
            cta="Start Free Trial"
            href="/signup"
            highlighted={false}
          />
          <PricingCard
            name="Oshi-Basic"
            price="N$199"
            period="/month"
            features={[
              "30 products",
              "200 orders/month",
              "No OshiCart branding",
              "Sales analytics",
              "Everything in Start",
            ]}
            cta="Get Started"
            href="/signup?tier=oshi_basic"
            highlighted={true}
            badge="Most Popular"
          />
          <PricingCard
            name="Oshi-Grow"
            price="N$399"
            period="/month"
            features={[
              "200 products",
              "500 orders/month",
              "Inventory tracking",
              "Coupon codes",
              "Everything in Basic",
            ]}
            cta="Get Started"
            href="/signup?tier=oshi_grow"
            highlighted={false}
          />
          <PricingCard
            name="Oshi-Pro"
            price="N$999"
            period="/month"
            features={[
              "Unlimited products",
              "Unlimited orders",
              "Import via API, Excel & CSV",
              "Priority support",
              "All features",
              "Everything in Grow",
            ]}
            cta="Get Started"
            href="/signup?tier=oshi_pro"
            highlighted={false}
          />
        </div>
      </div>
    </section>
  );
}

function PricingCard({
  name,
  price,
  period,
  features,
  cta,
  href,
  highlighted,
  badge,
}: {
  name: string;
  price: string;
  period: string;
  features: string[];
  cta: string;
  href: string;
  highlighted: boolean;
  badge?: string;
}) {
  return (
    <div
      className={`rounded-2xl border flex flex-col transition-all hover:shadow-lg ${
        highlighted
          ? "border-[#2B5EA7] ring-2 ring-[#2B5EA7] bg-white relative scale-[1.02]"
          : "bg-white hover:border-gray-300"
      }`}
    >
      {badge && (
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#2B5EA7] text-white text-[11px] font-bold px-4 py-1 rounded-full shadow-sm whitespace-nowrap z-10">
          {badge}
        </span>
      )}

      <div className={`px-6 pt-7 pb-5 ${highlighted ? "bg-blue-50/50" : ""}`}>
        <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">{name}</h4>
        <div className="mt-3 flex items-baseline gap-1">
          <span className="text-4xl font-extrabold text-gray-900 tracking-tight">{price}</span>
          <span className="text-gray-400 text-sm font-medium">{period}</span>
        </div>
      </div>

      <div className="px-6 pb-6 flex-1 flex flex-col">
        <ul className="space-y-3 flex-1">
          {features.map((f) => (
            <li key={f} className="flex items-start gap-2.5 text-sm text-gray-600 leading-snug">
              <Check size={16} className="text-[#4A9B3E] flex-shrink-0 mt-0.5" />
              <span>{f}</span>
            </li>
          ))}
        </ul>

        <Link
          href={href}
          className={`block text-center mt-6 py-3 rounded-xl text-sm font-semibold transition-all ${
            highlighted
              ? "bg-[#2B5EA7] text-white hover:bg-[#234B86] shadow-md shadow-[#2B5EA7]/20"
              : "bg-gray-900 text-white hover:bg-gray-800"
          }`}
        >
          {cta}
        </Link>
      </div>
    </div>
  );
}

/* ─── WhatsApp CTA ────────────────────────────────────────── */
function WhatsAppCTASection() {
  return (
    <section className="py-16 px-4 sm:px-6">
      <div className="max-w-2xl mx-auto text-center">
        <h3 className="text-2xl font-bold text-gray-900">
          Ready to grow your WhatsApp business?
        </h3>
        <p className="text-gray-500 mt-2">
          Join Namibian sellers who are saving hours every day with OshiCart.
        </p>
        <Link
          href="/signup"
          className="inline-flex items-center gap-2 mt-6 px-6 py-3 bg-[#2B5EA7] text-white rounded-lg hover:bg-[#234B86] font-medium"
        >
          Create Your Free Store <ArrowRight size={18} />
        </Link>
      </div>
    </section>
  );
}

/* ─── Footer ──────────────────────────────────────────────── */
function Footer() {
  return (
    <footer
      id="contact"
      className="bg-gray-900 text-gray-400 py-12 px-4 sm:px-6"
    >
      <div className="max-w-6xl mx-auto">
        <div className="grid md:grid-cols-3 gap-8 items-start">
          {/* Brand */}
          <div>
            <Image
              src="/logo.svg"
              alt="OshiCart"
              width={130}
              height={35}
              className="brightness-0 invert"
            />
            <p className="mt-3 text-sm text-gray-500">
              Empowering Local Commerce in Namibia
            </p>
          </div>

          {/* About Us */}
          <div id="about">
            <h4 className="text-white font-semibold mb-3">About Us</h4>
            <p className="text-sm text-gray-500 leading-relaxed">
              OshiCart is a Namibian-built platform helping small businesses sell
              online through WhatsApp. We make it easy to create a digital
              catalog, accept local payments, and manage orders.
            </p>
          </div>

          {/* Contact & Links */}
          <div>
            <h4 className="text-white font-semibold mb-3">Contact & Support</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <a
                  href="https://wa.me/264816274823?text=Hi%20OshiCart%2C%20I%20need%20help%20with..."
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-white transition-colors"
                >
                  WhatsApp: +264 81 627 4823
                </a>
              </li>
              <li>
                <a
                  href="mailto:info@octovianexus.com"
                  className="hover:text-white transition-colors"
                >
                  info@octovianexus.com
                </a>
              </li>
              <li className="pt-2">
                <Link
                  href="/stores"
                  className="hover:text-white transition-colors"
                >
                  Browse Stores
                </Link>
              </li>
              <li>
                <Link
                  href="/terms"
                  className="hover:text-white transition-colors"
                >
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link
                  href="/privacy"
                  className="hover:text-white transition-colors"
                >
                  Privacy Policy
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-10 pt-6 border-t border-gray-800 flex flex-col md:flex-row items-center justify-between gap-3 text-sm">
          <p>&copy; {new Date().getFullYear()} OshiCart. Made in Namibia.</p>
          <p className="text-gray-500">
            OshiCart is a product of Octovia Nexus Investments CC
          </p>
        </div>
      </div>
    </footer>
  );
}
