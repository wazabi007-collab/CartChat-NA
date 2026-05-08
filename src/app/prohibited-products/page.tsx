import Link from "next/link";
import { AlertTriangle, Ban, ShieldCheck } from "lucide-react";

const prohibited = [
  "Adult content, pornography, sexual services, or explicit sexual products",
  "Illegal drugs, controlled substances, drug delivery, or drug-related sales",
  "Counterfeit goods, fake documents, stolen goods, or fraudulent offers",
  "Weapons, ammunition, and dangerous restricted items unless specifically approved",
  "Products or services that break local law, payment rules, or customer safety standards",
];

const enforcement = [
  "Listings can be hidden automatically while OshiCart reviews them.",
  "Stores that attempt to sell prohibited products can be suspended or banned.",
  "Customers and administrators can report suspicious stores for manual review.",
  "Merchants must accept this policy before continuing to sell on OshiCart.",
];

export default function ProhibitedProductsPage() {
  return (
    <main className="min-h-screen bg-slate-50">
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
          <Link href="/" className="text-sm font-bold text-slate-500 hover:text-slate-950">
            OshiCart
          </Link>
          <div className="mt-10 max-w-3xl pb-12">
            <div className="inline-flex items-center gap-2 rounded-full border border-red-200 bg-red-50 px-3 py-1 text-xs font-black uppercase tracking-[0.18em] text-red-700">
              <Ban size={14} />
              Selling rules
            </div>
            <h1 className="mt-5 text-4xl font-black tracking-tight text-slate-950 sm:text-5xl">
              Prohibited products and services
            </h1>
            <p className="mt-4 text-base leading-7 text-slate-600">
              OshiCart is built for legitimate shops, local vendors, service providers, and growing businesses.
              These rules protect customers, merchants, payment partners, and the OshiCart marketplace.
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-5xl gap-6 px-4 py-10 sm:px-6 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm shadow-slate-900/5">
          <div className="flex items-center gap-3">
            <AlertTriangle className="text-red-600" size={24} />
            <h2 className="text-xl font-black text-slate-950">Not allowed on OshiCart</h2>
          </div>
          <div className="mt-5 space-y-3">
            {prohibited.map((item) => (
              <div key={item} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm font-medium leading-6 text-slate-700">
                {item}
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-6">
          <div className="flex items-center gap-3">
            <ShieldCheck className="text-emerald-700" size={24} />
            <h2 className="text-xl font-black text-slate-950">How we enforce this</h2>
          </div>
          <div className="mt-5 space-y-3">
            {enforcement.map((item) => (
              <p key={item} className="text-sm font-medium leading-6 text-emerald-950">
                {item}
              </p>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
