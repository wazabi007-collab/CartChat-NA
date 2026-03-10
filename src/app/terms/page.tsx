import Link from "next/link";

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-white">
      <header className="border-b">
        <div className="max-w-3xl mx-auto px-4 py-4">
          <Link href="/" className="text-xl font-bold text-gray-900">
            OshiCart
          </Link>
        </div>
      </header>
      <main className="max-w-3xl mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">
          Terms of Service
        </h1>
        <div className="prose prose-gray max-w-none space-y-4 text-gray-600 text-sm leading-relaxed">
          <p>
            <strong>Last updated:</strong> March 2026
          </p>
          <h2 className="text-lg font-semibold text-gray-900 mt-8">
            1. Service Description
          </h2>
          <p>
            OshiCart (&quot;the Service&quot;) provides an online platform for
            merchants to create product catalogs, receive orders, and manage
            payments via WhatsApp-linked storefronts. The Service is operated
            from Namibia.
          </p>
          <h2 className="text-lg font-semibold text-gray-900 mt-8">
            2. Merchant Responsibilities
          </h2>
          <p>
            Merchants are responsible for the accuracy of their product
            listings, pricing, and fulfillment of orders. OshiCart does not
            handle payment processing directly — merchants receive payments via
            their own bank accounts (EFT).
          </p>
          <h2 className="text-lg font-semibold text-gray-900 mt-8">
            3. Payment Disclaimer
          </h2>
          <p>
            OshiCart facilitates the display of merchant bank details and
            proof-of-payment uploads. We do not process, hold, or transfer
            funds. All financial transactions occur directly between the
            customer and merchant. OshiCart is not liable for payment
            disputes.
          </p>
          <h2 className="text-lg font-semibold text-gray-900 mt-8">
            4. Data Usage
          </h2>
          <p>
            We collect merchant account information (phone number, store
            details, bank details) and customer order information (name, phone
            number, order details). Data is stored securely and not shared with
            third parties. See our Privacy Policy for details.
          </p>
          <h2 className="text-lg font-semibold text-gray-900 mt-8">
            5. Service Tiers
          </h2>
          <p>
            Free trial includes up to 20 products and 20 orders for 30 days.
            Pro plan includes 150 products and 300 orders per month.
            Business plan includes unlimited products and unlimited orders.
            OshiCart reserves the right to modify pricing with 30 days notice.
          </p>
          <h2 className="text-lg font-semibold text-gray-900 mt-8">
            6. Termination
          </h2>
          <p>
            Either party may terminate at any time. Upon termination, merchant
            data will be retained for 30 days before deletion.
          </p>
          <h2 className="text-lg font-semibold text-gray-900 mt-8">
            7. Limitation of Liability
          </h2>
          <p>
            OshiCart is provided &quot;as is&quot;. We are not liable for
            lost orders, payment issues, or service interruptions beyond
            reasonable effort to maintain uptime.
          </p>
        </div>
      </main>
    </div>
  );
}
