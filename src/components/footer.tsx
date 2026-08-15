import Image from "next/image";
import Link from "next/link";
import {
  SUPPORT_EMAIL,
  SUPPORT_PHONE,
  SUPPORT_PHONE_E164,
  SUPPORT_WHATSAPP,
  supportWhatsAppLink,
} from "@/lib/constants";

export function Footer() {
  return (
    <footer
      id="contact"
      className="bg-walnut px-4 py-12 text-slate-300 sm:px-6"
    >
      <div className="max-w-6xl mx-auto">
        <div className="grid gap-8 md:grid-cols-4 md:items-start">
          {/* Brand */}
          <div>
            <Image
              src="/oshicart-logo-v3-dark.webp"
              alt="OshiCart"
              width={170}
              height={24}
              style={{ width: 170, height: "auto" }}
            />
            <p className="mt-3 text-sm text-slate-400">
              Online stores for Namibia&apos;s shops, vendors, services, and
              WhatsApp sellers.
            </p>
          </div>

          {/* About Us */}
          <div id="about" className="md:col-span-2">
            {/* Column labels, not document structure. As <h4> they followed
                whatever level the page above happened to end on (usually h2),
                so every page failed Lighthouse's heading-order audit. The
                footer is boilerplate on every page and nothing links to these
                sections, so they don't belong in any page's outline. */}
            <p className="mb-3 font-bold text-white">About OshiCart</p>
            <div className="space-y-3 text-sm leading-relaxed text-slate-300">
              <p>
                OshiCart is a proudly Namibian commerce platform for sellers who
                already run their business through WhatsApp, Facebook,
                Instagram, markets, and local communities.
              </p>
              <p>
                We help merchants publish a clean store link, receive structured
                orders, accept local payments, and manage products without
                needing a custom website.
              </p>
              <p>
                From local vendors and restaurants to boutiques, salons,
                electronics shops, and service providers, OshiCart is built for
                the way Namibia sells.
              </p>
            </div>
          </div>

          {/* Contact & Links */}
          <div>
            <p className="mb-3 font-bold text-white">Contact & Support</p>
            <ul className="space-y-2 text-sm">
              <li>
                {/* This used to print the "sales" contactPoint from the
                    homepage JSON-LD, so support calls from the footer landed
                    on a line nobody watches — and disagreed with /help, /guide
                    and both PDFs. All of them now read from SUPPORT_PHONE. */}
                <a
                  href={`tel:${SUPPORT_PHONE_E164}`}
                  className="hover:text-white transition-colors"
                >
                  Call: {SUPPORT_PHONE}
                </a>
              </li>
              <li>
                <a
                  href={supportWhatsAppLink("Hi OshiCart, I need help with...")}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-white transition-colors"
                >
                  WhatsApp: {SUPPORT_WHATSAPP}
                </a>
              </li>
              <li>
                <a
                  href={`mailto:${SUPPORT_EMAIL}`}
                  className="hover:text-white transition-colors"
                >
                  {SUPPORT_EMAIL}
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
                  href="/help"
                  className="hover:text-white transition-colors"
                >
                  Help
                </Link>
              </li>
              <li>
                <Link href="/guide" className="hover:text-white transition-colors">
                  Setup guide
                </Link>
              </li>
              <li>
                <Link href="/agents" className="hover:text-white transition-colors">
                  Become an Agent
                </Link>
              </li>
              <li>
                <Link href="/app" className="hover:text-white transition-colors">
                  Install as app
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
              <li>
                <Link
                  href="/prohibited-products"
                  className="hover:text-white transition-colors"
                >
                  Prohibited Products
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-10 flex flex-col items-center justify-between gap-3 border-t border-white/10 pt-6 text-sm md:flex-row">
          <p>&copy; {new Date().getFullYear()} OshiCart. Made in Namibia.</p>
          <p className="text-slate-500">
            OshiCart is a product of Octovia Nexus Investments CC
          </p>
        </div>
      </div>
    </footer>
  );
}
