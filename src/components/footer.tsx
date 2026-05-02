import Image from "next/image";
import Link from "next/link";

export function Footer() {
  return (
    <footer
      id="contact"
      className="bg-walnut text-[color:#d4c2a0] py-12 px-4 sm:px-6"
    >
      <div className="max-w-6xl mx-auto">
        <div className="grid md:grid-cols-4 gap-8 items-start">
          {/* Brand */}
          <div>
            <Image
              src="/logo.svg"
              alt="OshiCart"
              width={130}
              height={35}
              className="brightness-0 invert"
            />
            <p className="mt-3 text-sm text-[color:#a89270]">
              Empowering Local Commerce in Namibia
            </p>
          </div>

          {/* About Us */}
          <div id="about" className="md:col-span-2">
            <h4 className="text-white font-semibold mb-3">About Us</h4>
            <div className="text-sm text-[color:#d4c2a0] leading-relaxed space-y-3">
              <p>
                OshiCart is a proudly Namibian platform born from a single mission: to empower the local entrepreneur.
                We know that in Namibia, business happens in the DMs and on WhatsApp Status. We built OshiCart to bridge
                that gap&mdash;turning your casual chats into a professional, automated storefront.
              </p>
              <p>
                From the side-zula artisan and the local boutique to busy restaurants and professional service providers,
                we provide the tools to simplify your life. With our &ldquo;Order with Me&rdquo; personalized links, your
                customers can browse your menu or catalog and pay instantly via PayToday or EFT without the back-and-forth.
              </p>
              <p>
                Whether you&apos;re serving the best Kapana in Windhoek, booking professional consultations, or shipping
                handmade crafts from the Coast, OshiCart takes the &ldquo;Oshi&rdquo; out of the hustle. We handle the
                tech; you secure the bag.
              </p>
            </div>
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

        <div className="mt-10 pt-6 border-t border-[color:#3a2b14] flex flex-col md:flex-row items-center justify-between gap-3 text-sm">
          <p>&copy; {new Date().getFullYear()} OshiCart. Made in Namibia.</p>
          <p className="text-[color:#a89270]">
            OshiCart is a product of Octovia Nexus Investments CC
          </p>
        </div>
      </div>
    </footer>
  );
}
