import { Banknote, CreditCard, ShieldCheck, Smartphone } from "lucide-react";

const METHODS = [
  { label: "PayToday", Icon: Smartphone },
  { label: "EFT", Icon: CreditCard },
  { label: "eWallet", Icon: Smartphone },
  { label: "Cash on Delivery", Icon: Banknote },
];

export function StorePaymentStrip() {
  return (
    <div className="bg-white border-y border-slate-200/70">
      <div className="mx-auto max-w-4xl px-4 py-3 flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1.5 text-[10px] tracking-[0.12em] font-bold text-slate-500 mr-2">
          <ShieldCheck size={13} className="text-acacia" />
          PAY WITH
        </span>
        {METHODS.map(({ label, Icon }) => (
          <span
            key={label}
            className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full bg-slate-50 border border-slate-200 text-slate-700"
          >
            <Icon size={13} />
            {label}
          </span>
        ))}
      </div>
    </div>
  );
}
