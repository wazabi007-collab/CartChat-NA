import type { Metadata } from "next";
import { PublicNavbar } from "@/components/public-navbar";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "OshiCart Privacy Policy — how we collect, use, and protect merchant and customer data on the Namibian e-commerce platform.",
  alternates: { canonical: "/privacy" },
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-white">
      <PublicNavbar />
      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-12">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">
          Privacy Policy
        </h1>
        <div className="prose prose-gray max-w-none space-y-4 text-gray-600 text-sm leading-relaxed">
          <p>
            <strong>Last updated:</strong> August 2026
          </p>
          <h2 className="text-lg font-semibold text-gray-900 mt-8">
            What We Collect
          </h2>
          <p>
            <strong>Merchants:</strong> Email address (for authentication),
            WhatsApp number (for customer communication), store name,
            description, industry, and product/service information.
          </p>
          <p>
            <strong>Customers:</strong> Name and WhatsApp number (provided at
            checkout), order details, proof-of-payment images. Customers
            can look up their order status using their WhatsApp number on
            the store page.
          </p>
          <p>
            <strong>If you start checkout but don&apos;t finish:</strong> on
            stores that have this feature switched on, we may temporarily
            store the name and WhatsApp number you entered so the store can
            send you a single WhatsApp reminder about your order, about an
            hour later. This information is deleted automatically after 30
            days, whether or not you complete the order.
          </p>
          <h2 className="text-lg font-semibold text-gray-900 mt-8">
            How We Use It
          </h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>
              Merchant data: to operate storefronts and process orders
            </li>
            <li>
              Customer data: to fulfill orders and enable merchant-customer
              communication
            </li>
            <li>
              Merchant customer list: we automatically build each merchant a
              list of their own past customers — name, WhatsApp number, and
              order history — so they can run their business. This list is
              visible only to that merchant, never to other merchants.
            </li>
            <li>
              Reviews: if you leave a review for a store you ordered from,
              your first name, star rating, and review text are shown
              publicly on that store&apos;s page. We do not publicly show
              your WhatsApp number or other order details.
            </li>
            <li>
              Broadcast messages: on plans with WhatsApp Broadcast, a
              merchant&apos;s promotional message is sent from their own
              WhatsApp account, not by OshiCart. We keep a record of which
              customers were contacted and when, to help merchants avoid
              messaging the same person too often — we do not see or store
              the content of these messages.
            </li>
            <li>
              Analytics: aggregated store performance metrics including page
              views, order counts, and revenue trends to help merchants
              understand their business
            </li>
          </ul>
          <h2 className="text-lg font-semibold text-gray-900 mt-8">
            Data Storage
          </h2>
          <p>
            Data is stored on secure, encrypted servers. Merchant data is
            isolated — merchants cannot access other merchants&apos; data.
            Proof-of-payment images are only visible to the relevant merchant.
          </p>
          <h2 className="text-lg font-semibold text-gray-900 mt-8">
            Data Sharing
          </h2>
          <p>
            We do not sell, rent, or share personal data with third parties.
            Customer information (name, phone, order) is shared only with the
            merchant they ordered from.
          </p>
          <h2 className="text-lg font-semibold text-gray-900 mt-8">
            Data Retention
          </h2>
          <p>
            Merchant data is retained while the account is active and for 30
            days after deletion. Customer order data is retained for 12 months
            for merchant reference. Abandoned-checkout information (see
            above) is deleted after 30 days regardless of whether the order
            was completed.
          </p>
          <h2 className="text-lg font-semibold text-gray-900 mt-8">
            Your Rights
          </h2>
          <p>
            You may request access to, correction of, or deletion of your
            personal data by contacting us via WhatsApp or email.
          </p>
          <h2 className="text-lg font-semibold text-gray-900 mt-8">
            Contact
          </h2>
          <p>
            For privacy inquiries, contact us via WhatsApp at{" "}
            <a href="https://wa.me/264816274823" target="_blank" rel="noopener noreferrer" className="text-[#2B5EA7] hover:underline">
              +264 81 627 4823
            </a>{" "}
            or email us at{" "}
            <a href="mailto:info@octovianexus.com" className="text-[#2B5EA7] hover:underline">
              info@octovianexus.com
            </a>.
          </p>
        </div>
      </main>
    </div>
  );
}
