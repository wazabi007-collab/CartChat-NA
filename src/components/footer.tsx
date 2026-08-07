import Image from "next/image";
import Link from "next/link";

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
            <h4 className="mb-3 font-bold text-white">About OshiCart</h4>
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
            <h4 className="mb-3 font-bold text-white">Contact & Support</h4>
            <ul className="space-y-2 text-sm">
              <li>
                {/* Matches the "sales" contactPoint in the Organization JSON-LD
                    on the homepage — was previously a stray personal number
                    that matched neither the structured data nor anything
                    else on the site. */}
                <a href="tel:+264816262961" className="hover:text-white transition-colors">
                  Call: +264 81 626 2961
                </a>
              </li>
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
