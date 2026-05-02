const METHODS = ["PayToday", "EFT", "eWallet", "Bank Transfer", "Cash on Delivery"];

export function PaymentTrustBar() {
  return (
    <section className="bg-sand py-12 border-y border-border-warm">
      <div className="mx-auto max-w-5xl px-6 text-center">
        <p className="text-[11px] tracking-[0.12em] font-bold text-terracotta mb-4">
          ACCEPT EVERY PAYMENT METHOD NAMIBIANS ACTUALLY USE
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          {METHODS.map((m) => (
            <span
              key={m}
              className="inline-flex items-center px-4 py-2 rounded-md bg-white border border-border-warm text-sm font-semibold text-walnut shadow-sm"
            >
              {m}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
