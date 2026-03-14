import Link from "next/link";
import { PublicNavbar } from "@/components/public-navbar";

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
            <strong>Last updated:</strong> March 2026
          </p>
          <h2 className="text-lg font-semibold text-gray-900 mt-8">
            What We Collect
          </h2>
          <p>
            <strong>Merchants:</strong> Email address (for authentication),
            WhatsApp number (for customer communication), store name,
            description, payment details (bank account, mobile money, or
            eWallet information displayed to customers at checkout), and
            product information.
          </p>
          <p>
            <strong>Customers:</strong> Name and WhatsApp number (provided at
            checkout), order details, proof-of-payment images.
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
            for merchant reference.
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
