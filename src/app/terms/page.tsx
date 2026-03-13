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
            6. Platform Role &amp; Liability
          </h2>
          <p>
            OshiCart is a <strong>platform</strong>, not a seller. We provide tools
            for merchants to list products and receive orders. OshiCart does not
            sell, ship, or guarantee any products listed on the platform. All
            transactions are between the customer and the merchant. OshiCart is
            not liable for product quality, delivery, or disputes between
            customers and merchants.
          </p>
          <h2 className="text-lg font-semibold text-gray-900 mt-8">
            7. Prohibited Items &amp; Conduct
          </h2>
          <p>
            Merchants may not list the following on OshiCart:
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Counterfeit, stolen, or illegally obtained goods</li>
            <li>Weapons, ammunition, or explosives</li>
            <li>Controlled substances or illegal drugs</li>
            <li>Adult content or services</li>
            <li>Items that violate Namibian law</li>
            <li>Products with misleading descriptions or fake images</li>
          </ul>
          <p className="mt-2">
            Merchants must not engage in:
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Accepting payment without intent to deliver</li>
            <li>Using fake proof of payment to defraud other merchants</li>
            <li>Creating multiple accounts to circumvent limits</li>
            <li>Impersonating other businesses or individuals</li>
          </ul>
          <h2 className="text-lg font-semibold text-gray-900 mt-8">
            8. Consequences of Violation
          </h2>
          <p>
            OshiCart reserves the right to suspend or permanently ban any
            merchant account found violating these terms. Actions may include:
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Immediate store suspension pending investigation</li>
            <li>Permanent ban for confirmed fraud or prohibited items</li>
            <li>Reporting to relevant Namibian authorities where applicable</li>
          </ul>
          <p className="mt-2">
            Customers can report stores via the &quot;Report Store&quot; button
            on any storefront. All reports are reviewed by the OshiCart team.
          </p>
          <h2 className="text-lg font-semibold text-gray-900 mt-8">
            9. Store Review &amp; New Store Limits
          </h2>
          <p>
            New stores undergo a review period. During the first 30 days,
            stores are limited to 10 orders per month and N$5,000 in total
            order value. These limits are automatically lifted after the review
            period or can be increased by contacting support.
          </p>
          <h2 className="text-lg font-semibold text-gray-900 mt-8">
            10. Termination
          </h2>
          <p>
            Either party may terminate at any time. Upon termination, merchant
            data will be retained for 30 days before deletion.
          </p>
          <h2 className="text-lg font-semibold text-gray-900 mt-8">
            11. Limitation of Liability
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
