const FAQS = [
  {
    q: "Is OshiCart only for shops?",
    a: "No. It works for shops, vendors, food sellers, salons, services, farms, home businesses, and anyone selling through WhatsApp or social media.",
  },
  {
    q: "Do you charge commission on sales?",
    a: "No. OshiCart does not take a percentage of your orders. Customers pay you directly through the payment methods you enable.",
  },
  {
    q: "Which payment methods can I offer?",
    a: "EFT, PayToday, FNB Pay2Cell, eWallet, MTC Maris, and Cash on Delivery can be presented to customers depending on your store settings.",
  },
  {
    q: "Do customers need to install an app?",
    a: "No. Customers open your store link in the browser, place an order, and can continue the conversation on WhatsApp.",
  },
  {
    q: "Can I market my store on Facebook, Instagram, and TikTok?",
    a: "Yes. Your OshiCart link can be shared in bios, posts, stories, reels, WhatsApp Status, printed flyers, and QR codes.",
  },
];

export function FAQ() {
  return (
    <section className="bg-white py-16 lg:py-20">
      <div className="mx-auto max-w-3xl px-4 sm:px-6">
        <div className="mb-10 text-center">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-terracotta">
            FAQ
          </p>
          <h2 className="mt-3 text-3xl font-black tracking-tight text-walnut sm:text-4xl">
            Clear answers for serious sellers.
          </h2>
        </div>
        <div className="divide-y divide-border-warm rounded-xl border border-border-warm bg-white">
          {FAQS.map((faq) => (
            <details key={faq.q} className="group p-5">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-base font-black text-walnut">
                <span>{faq.q}</span>
                <span className="text-2xl leading-none text-terracotta transition-transform group-open:rotate-45">
                  +
                </span>
              </summary>
              <p className="mt-3 text-sm leading-6 text-walnut-2">{faq.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
