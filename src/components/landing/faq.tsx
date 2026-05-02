const FAQS = [
  {
    q: "Do you charge commission on sales?",
    a: "No. You keep 100% of every order. We charge a flat monthly subscription on Pro/Business; Free has no fees.",
  },
  {
    q: "Can I cancel anytime?",
    a: "Yes — cancel from your dashboard. No lock-in, no cancellation fees.",
  },
  {
    q: "Which payment methods do my customers see?",
    a: "PayToday, EFT, eWallet, and Cash on Delivery. All Namibian — no international gateways or forex charges needed.",
  },
  {
    q: "How fast do I get paid?",
    a: "Customers pay you directly via PayToday/EFT/eWallet — Oshicart never holds your money. You see funds in your bank as fast as the payment method allows.",
  },
  {
    q: "Can I use my own domain?",
    a: "Yes — connect a domain you already own (Pro and above), or stick with your free oshicart.com/s/your-store link.",
  },
  {
    q: "Do you handle VAT?",
    a: "Yes. Inclusive or exclusive VAT, Namibia's 15% rate, automatic invoice generation per order.",
  },
];

export function FAQ() {
  return (
    <section className="py-20 bg-white">
      <div className="mx-auto max-w-3xl px-6">
        <div className="text-center mb-10">
          <p className="text-[11px] tracking-[0.12em] font-bold text-terracotta mb-2">
            FAQ
          </p>
          <h2 className="text-3xl lg:text-4xl font-extrabold tracking-tight text-walnut">
            Questions, answered.
          </h2>
        </div>
        <div className="divide-y divide-border-warm border-y border-border-warm">
          {FAQS.map((f) => (
            <details key={f.q} className="group py-4">
              <summary className="cursor-pointer list-none flex items-center justify-between gap-4 text-walnut font-semibold">
                <span>{f.q}</span>
                <span className="text-terracotta text-xl group-open:rotate-45 transition-transform">
                  +
                </span>
              </summary>
              <p className="mt-3 text-sm text-walnut-2 leading-relaxed">{f.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
