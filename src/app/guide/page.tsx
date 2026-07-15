import type { Metadata } from "next";
import Link from "next/link";
import { PublicNavbar } from "@/components/public-navbar";
import { Footer } from "@/components/footer";

export const metadata: Metadata = {
  title: "Merchant Setup Guide",
  description: "How to set up and sell on OshiCart.",
  alternates: { canonical: "/guide" },
};

export default function GuidePage() {
  return (
    <div className="min-h-screen bg-white">
      <PublicNavbar />

      <main className="mx-auto max-w-3xl px-4 sm:px-6 py-10">
        {/* Header */}
        <header className="border-b border-border-warm pb-8">
          <h1 className="font-black text-3xl sm:text-4xl tracking-tight text-walnut">
            OshiCart Merchant Setup Guide
          </h1>
          <p className="mt-3 text-lg text-walnut-2">
            Set up your store, get paid, and start selling — in minutes.
          </p>
          <a
            href="/oshicart-merchant-guide.pdf"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-5 inline-flex items-center gap-2 rounded-lg bg-terracotta px-4 py-2.5 text-sm font-bold text-white shadow-sm shadow-terracotta/20 transition-colors hover:bg-[#234B86]"
          >
            Download PDF
          </a>
        </header>

        <div className="mt-10 space-y-12">
          {/* 1. Welcome */}
          <section>
            <h2 className="text-xl font-black tracking-tight text-terracotta">
              1. Welcome
            </h2>
            <p className="mt-3 leading-relaxed text-walnut-2">
              OshiCart is a proudly Namibian platform to sell online through a
              clean store link and simple WhatsApp orders. There is zero OshiCart
              commission on your sales — customers pay you directly, so every
              dollar you earn stays with you.
            </p>
          </section>

          {/* 2. Create your store */}
          <section>
            <h2 className="text-xl font-black tracking-tight text-terracotta">
              2. Create your store (under 2 minutes)
            </h2>
            <p className="mt-3 leading-relaxed text-walnut-2">
              Open the setup wizard and enter three things to go live: your{" "}
              <strong className="text-walnut">Store name</strong> (what customers
              see), your{" "}
              <strong className="text-walnut">WhatsApp number</strong> (where
              customers contact you about orders), and your{" "}
              <strong className="text-walnut">industry</strong> (so your store
              uses the right wording). Your store goes live at a shareable link:
              oshicart.com/s/your-store.
            </p>
          </section>

          {/* 3. Add products & great photos */}
          <section>
            <h2 className="text-xl font-black tracking-tight text-terracotta">
              3. Add products &amp; great photos
            </h2>
            <p className="mt-3 leading-relaxed text-walnut-2">
              Add up to 3 photos per product. Good, bright, square photos sell
              best — shoot in daylight against a clean background. The app
              automatically compresses your photos, so upload straight from your
              phone. Set a clear price; add{" "}
              <strong className="text-walnut">variations</strong> (e.g. size or
              colour) for products with options; you can also list{" "}
              <strong className="text-walnut">Services</strong>, not just physical
              products.
            </p>
          </section>

          {/* 4. Payment methods */}
          <section>
            <h2 className="text-xl font-black tracking-tight text-terracotta">
              4. Payment methods you can accept
            </h2>
            <p className="mt-3 leading-relaxed text-walnut-2">
              Enable any of: Bank Transfer (EFT), MTC Maris, FNB Pay2Cell, eWallet
              (FNB eWallet, BlueWallet, EasyWallet, Nedbank Money, PayPulse),
              PayToday, and Cash on Delivery. For each, you enter the number
              customers send to.
            </p>
            <div className="mt-4 rounded-r-lg border-l-4 border-acacia bg-sand p-4">
              <p className="leading-relaxed text-walnut-2">
                <strong className="text-walnut">Important:</strong> always confirm
                the money is actually in your bank account or wallet{" "}
                <em>before</em> handing over goods — proof-of-payment screenshots
                can be faked.
              </p>
            </div>
          </section>

          {/* 5. Delivery options */}
          <section>
            <h2 className="text-xl font-black tracking-tight text-terracotta">
              5. Delivery options
            </h2>
            <p className="mt-3 leading-relaxed text-walnut-2">
              Choose what buyers see at checkout:{" "}
              <strong className="text-walnut">Store delivery</strong> (you deliver
              and set your own fee) or{" "}
              <strong className="text-walnut">Yango / inDrive</strong> (the{" "}
              <em>buyer</em> books and pays the courier directly — you just prepare
              the parcel). If you offer Yango or inDrive, set your{" "}
              <strong className="text-walnut">pickup address</strong> so couriers
              know where to collect.
            </p>
          </section>

          {/* 6. Share your store */}
          <section>
            <h2 className="text-xl font-black tracking-tight text-terracotta">
              6. Share your store
            </h2>
            <p className="mt-3 leading-relaxed text-walnut-2">
              Your link works everywhere and customers never install an app. Post
              it on WhatsApp Status, share your built-in QR code, and post it on
              Facebook, Instagram, and TikTok.
            </p>
          </section>

          {/* 7. Selling rules */}
          <section>
            <h2 className="text-xl font-black tracking-tight text-terracotta">
              7. Selling rules
            </h2>
            <p className="mt-3 leading-relaxed text-walnut-2">
              Some items are prohibited: adult content, illegal drugs, counterfeit
              goods, fraud, and dangerous or restricted items. Stores breaking the
              rules can be hidden or suspended. Read the full list at{" "}
              <Link
                href="/prohibited-products"
                className="font-semibold text-terracotta hover:underline"
              >
                /prohibited-products
              </Link>
              .
            </p>
          </section>

          {/* 8. Need help? */}
          <section>
            <h2 className="text-xl font-black tracking-tight text-terracotta">
              8. Need help?
            </h2>
            <p className="mt-3 leading-relaxed text-walnut-2">
              Call us:{" "}
              <a
                href="tel:+264812384424"
                className="font-semibold text-terracotta hover:underline"
              >
                +264 81 238 4424
              </a>{" "}
              ·{" "}
              WhatsApp:{" "}
              <a
                href="https://wa.me/264816274823"
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-terracotta hover:underline"
              >
                +264 81 627 4823
              </a>{" "}
              ·{" "}
              Email:{" "}
              <a
                href="mailto:info@octovianexus.com"
                className="font-semibold text-terracotta hover:underline"
              >
                info@octovianexus.com
              </a>
            </p>
            <p className="mt-6 text-sm text-walnut-2">
              © OshiCart — a product of Octovia Nexus Investments CC. Made in
              Namibia.
            </p>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
}
