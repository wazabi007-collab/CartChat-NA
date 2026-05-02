import Image from "next/image";

const FEATURES = [
  {
    title: "Manage orders from anywhere",
    body: "One-tap order confirmation, ready, completed. Run your shop from your phone.",
    img: "/landing/feature-orders.png",
  },
  {
    title: "Track stock automatically",
    body: "Real-time inventory updates, low-stock alerts, and out-of-stock badges.",
    img: "/landing/feature-stock.png",
  },
  {
    title: "Use your own domain",
    body: "Connect a domain you already own or stick with your free oshicart.com link.",
    img: "/landing/feature-domain.png",
  },
  {
    title: "VAT invoices, automatic",
    body: "Inclusive or exclusive VAT, Namibia's 15% rate, generated for every order.",
    img: "/landing/feature-invoice.png",
  },
];

export function FeatureBlocks() {
  return (
    <section className="py-20 bg-white">
      <div className="mx-auto max-w-6xl px-6">
        <div className="text-center mb-12">
          <p className="text-[11px] tracking-[0.12em] font-bold text-terracotta mb-2">
            EVERYTHING YOU NEED TO RUN A SHOP
          </p>
          <h2 className="text-3xl lg:text-4xl font-extrabold tracking-tight text-walnut">
            Built for Namibian businesses.
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="bg-sand rounded-2xl border border-border-warm p-6 grid grid-cols-[1fr_auto] gap-6 items-center"
            >
              <div>
                <h3 className="text-lg font-bold text-walnut mb-2">{f.title}</h3>
                <p className="text-sm text-walnut-2 leading-relaxed">{f.body}</p>
              </div>
              <div className="w-32 h-32 rounded-lg bg-white border border-border-warm overflow-hidden relative shrink-0">
                <Image
                  src={f.img}
                  alt=""
                  fill
                  sizes="128px"
                  className="object-cover"
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
