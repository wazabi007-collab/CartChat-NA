const METHODS = ["PayToday", "EFT", "eWallet", "Cash on Delivery"];

export function StorePaymentStrip() {
  return (
    <div className="bg-sand border-y border-border-warm">
      <div className="mx-auto max-w-4xl px-4 py-3 flex flex-wrap items-center gap-2">
        <span className="text-[10px] tracking-[0.12em] font-bold text-walnut-2 mr-2">
          PAY WITH
        </span>
        {METHODS.map((m) => (
          <span
            key={m}
            className="text-xs px-2.5 py-1 rounded bg-white border border-border-warm text-walnut"
          >
            {m}
          </span>
        ))}
      </div>
    </div>
  );
}
