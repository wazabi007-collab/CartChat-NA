import Link from "next/link";
import {
  ShoppingCart,
  MessageCircle,
  CreditCard,
  BarChart3,
  ArrowRight,
  Check,
} from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-900">OshiCart</h1>
          <div className="flex items-center gap-3">
            <Link
              href="/stores"
              className="text-sm text-gray-600 hover:text-gray-900"
            >
              Browse Stores
            </Link>
            <Link
              href="/login"
              className="text-sm text-gray-600 hover:text-gray-900"
            >
              Sign in
            </Link>
            <Link
              href="/signup"
              className="text-sm px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
            >
              Create Free Store
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="py-16 md:py-24 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl md:text-5xl font-bold text-gray-900 leading-tight">
            Your WhatsApp store.
            <br />
            <span className="text-green-600">Live in 5 minutes.</span>
          </h2>
          <p className="text-lg text-gray-500 mt-4 max-w-xl mx-auto">
            Stop juggling WhatsApp messages, screenshots, and EFT proofs.
            OshiCart gives your business a professional catalog, order
            management, and payment tracking — all through WhatsApp.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/signup"
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium text-lg"
            >
              Create Free Store <ArrowRight size={20} />
            </Link>
          </div>
          <p className="text-sm text-gray-400 mt-3">
30-day free trial. No credit card needed.
          </p>
        </div>
      </section>

      {/* How it works */}
      <section className="py-16 bg-gray-50 px-4">
        <div className="max-w-4xl mx-auto">
          <h3 className="text-2xl font-bold text-gray-900 text-center mb-12">
            How it works
          </h3>
          <div className="grid md:grid-cols-3 gap-8">
            <Step
              number="1"
              title="Set up your store"
              description="Add your products, prices, and bank details. Takes under 5 minutes."
            />
            <Step
              number="2"
              title="Share on WhatsApp"
              description="Get a store link. Share it in your WhatsApp status, groups, and chats."
            />
            <Step
              number="3"
              title="Receive orders"
              description="Customers browse, order, and upload proof of payment. You confirm and fulfill."
            />
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 px-4">
        <div className="max-w-4xl mx-auto">
          <h3 className="text-2xl font-bold text-gray-900 text-center mb-12">
            Built for Namibian businesses
          </h3>
          <div className="grid md:grid-cols-2 gap-6">
            <Feature
              icon={<ShoppingCart size={24} />}
              title="Product Catalog"
              description="Add products with photos and prices in NAD. Customers browse on their phone — no app download needed."
            />
            <Feature
              icon={<CreditCard size={24} />}
              title="EFT Payment Proof"
              description="Customers upload proof-of-payment after EFT. You see it right in your dashboard. No more chasing screenshots."
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

      {/* Pricing */}
      <section className="py-16 bg-gray-50 px-4" id="pricing">
        <div className="max-w-4xl mx-auto">
          <h3 className="text-2xl font-bold text-gray-900 text-center mb-12">
            Simple pricing
          </h3>
          <div className="grid md:grid-cols-3 gap-6">
            <PricingCard
              name="Free Trial"
              price="N$0"
              period="30 days"
              features={[
                "20 products",
                "20 orders/month",
                "Product catalog",
                "Order management",
                "EFT proof upload",
              ]}
              cta="Start Free Trial"
              href="/signup"
              highlighted={false}
            />
            <PricingCard
              name="Pro"
              price="N$99"
              period="/month"
              features={[
                "150 products",
                "300 orders/month",
                "Full analytics",
                "Priority support",
                "Everything in Free",
              ]}
              cta="Get Started"
              href="/signup"
              highlighted={true}
            />
            <PricingCard
              name="Business"
              price="N$249"
              period="/month"
              features={[
                "Unlimited products",
                "Unlimited orders",
                "3 staff accounts",
                "Custom branding",
                "Phone support",
                "Everything in Pro",
              ]}
              cta="Contact Us"
              href="/signup"
              highlighted={false}
            />
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 px-4">
        <div className="max-w-2xl mx-auto text-center">
          <h3 className="text-2xl font-bold text-gray-900">
            Ready to grow your WhatsApp business?
          </h3>
          <p className="text-gray-500 mt-2">
            Join Namibian sellers who are saving hours every day with OshiCart.
          </p>
          <Link
            href="/signup"
            className="inline-flex items-center gap-2 mt-6 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium"
          >
            Create Your Free Store <ArrowRight size={18} />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8 px-4">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-gray-400">
          <p>OshiCart — Made in Namibia</p>
          <div className="flex gap-4">
            <Link href="/stores" className="hover:text-gray-600">
              Browse Stores
            </Link>
            <Link href="/terms" className="hover:text-gray-600">
              Terms
            </Link>
            <Link href="/privacy" className="hover:text-gray-600">
              Privacy
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

function Step({
  number,
  title,
  description,
}: {
  number: string;
  title: string;
  description: string;
}) {
  return (
    <div className="text-center">
      <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-green-100 text-green-700 font-bold mb-3">
        {number}
      </div>
      <h4 className="font-medium text-gray-900">{title}</h4>
      <p className="text-sm text-gray-500 mt-1">{description}</p>
    </div>
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
      <div className="flex-shrink-0 text-green-600">{icon}</div>
      <div>
        <h4 className="font-medium text-gray-900">{title}</h4>
        <p className="text-sm text-gray-500 mt-1">{description}</p>
      </div>
    </div>
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
}: {
  name: string;
  price: string;
  period: string;
  features: string[];
  cta: string;
  href: string;
  highlighted: boolean;
}) {
  return (
    <div
      className={`rounded-lg border p-6 ${
        highlighted
          ? "border-green-600 ring-2 ring-green-600 bg-white"
          : "bg-white"
      }`}
    >
      <h4 className="font-medium text-gray-900">{name}</h4>
      <div className="mt-2">
        <span className="text-3xl font-bold text-gray-900">{price}</span>
        <span className="text-gray-500 text-sm">{period}</span>
      </div>
      <ul className="mt-4 space-y-2">
        {features.map((f) => (
          <li key={f} className="flex items-center gap-2 text-sm text-gray-600">
            <Check size={16} className="text-green-600 flex-shrink-0" />
            {f}
          </li>
        ))}
      </ul>
      <Link
        href={href}
        className={`block text-center mt-6 py-2 rounded-md text-sm font-medium ${
          highlighted
            ? "bg-green-600 text-white hover:bg-green-700"
            : "border border-gray-300 text-gray-700 hover:bg-gray-50"
        }`}
      >
        {cta}
      </Link>
    </div>
  );
}
