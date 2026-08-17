import Image from "next/image";
import Link from "next/link";
import { Phone, Mail } from "lucide-react";
import { WhatsAppIcon } from "@/components/whatsapp-icon";
import {
  SUPPORT_EMAIL,
  SUPPORT_PHONE,
  SUPPORT_PHONE_E164,
  SUPPORT_WHATSAPP,
  supportWhatsAppLink,
} from "@/lib/constants";

/* Column labels are <p>, not headings — as <h4> they followed whatever level
   the page above ended on and failed Lighthouse's heading-order audit. */
const columnLabel =
  "mb-3 text-xs font-black uppercase tracking-[0.15em] text-acacia";
const footerLink =
  "inline-block py-0.5 text-slate-300 transition-colors hover:text-white";

const EXPLORE_LINKS = [
  { href: "/stores", label: "Browse Stores" },
  { href: "/#pricing", label: "Pricing" },
  { href: "/help", label: "Help Centre" },
  { href: "/guide", label: "Setup Guide" },
  { href: "/app", label: "Install as App" },
  { href: "/agents", label: "Become an Agent" },
];

const LEGAL_LINKS = [
  { href: "/terms", label: "Terms of Service" },
  { href: "/privacy", label: "Privacy Policy" },
  { href: "/prohibited-products", label: "Prohibited Products" },
];

export function Footer() {
  return (
    <footer id="contact" className="bg-walnut px-4 py-10 text-slate-300 sm:px-6">
      <div className="mx-auto max-w-6xl">
        {/* On phones Explore and Legal sit side by side — two short lists
            stacked full-width doubled the footer's height for nothing. */}
        <div className="grid grid-cols-2 gap-8 lg:grid-cols-[1.4fr_1fr_1fr_1.2fr]">
          {/* Brand */}
          <div id="about" className="col-span-2 lg:col-span-1">
            <Image
              src="/oshicart-logo-v3-dark.webp"
              alt="OshiCart"
              width={150}
              height={21}
              style={{ width: 150, height: "auto" }}
            />
            <p className="mt-3 max-w-xs text-sm leading-6 text-slate-400">
              Proudly Namibian. One store link, structured WhatsApp orders,
              local payments — built for the way Namibia sells.
            </p>
            <p className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-bold text-slate-300">
              <span aria-hidden>🇳🇦</span> Made in Namibia · Zero commission
            </p>
          </div>

          {/* Explore */}
          <div>
            <p className={columnLabel}>Explore</p>
            <ul className="space-y-2 text-sm">
              {EXPLORE_LINKS.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className={footerLink}>
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal */}
          <div>
            <p className={columnLabel}>Legal</p>
            <ul className="space-y-2 text-sm">
              {LEGAL_LINKS.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className={footerLink}>
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div className="col-span-2 lg:col-span-1">
            <p className={columnLabel}>Talk to us</p>
            <ul className="space-y-2.5 text-sm">
              <li>
                <a
                  href={supportWhatsAppLink("Hi OshiCart, I need help with...")}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`${footerLink} inline-flex items-center gap-2.5`}
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/5 text-[#25D366]">
                    <WhatsAppIcon size={15} />
                  </span>
                  {SUPPORT_WHATSAPP}
                </a>
              </li>
              <li>
                <a
                  href={`tel:${SUPPORT_PHONE_E164}`}
                  className={`${footerLink} inline-flex items-center gap-2.5`}
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/5 text-acacia">
                    <Phone size={14} />
                  </span>
                  {SUPPORT_PHONE}
                </a>
              </li>
              <li>
                <a
                  href={`mailto:${SUPPORT_EMAIL}`}
                  className={`${footerLink} inline-flex items-center gap-2.5`}
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/5 text-acacia">
                    <Mail size={14} />
                  </span>
                  {SUPPORT_EMAIL}
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-8 flex flex-col items-center justify-between gap-2 border-t border-white/10 pt-5 text-xs text-slate-400 md:flex-row">
          <p>&copy; {new Date().getFullYear()} OshiCart. Made in Namibia.</p>
          <p>A product of Octovia Nexus Investments CC — registered Namibian business</p>
        </div>
      </div>
    </footer>
  );
}
