import { Banknote, CreditCard, Landmark, ShieldCheck, Smartphone, Wallet, Zap } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { PAYMENT_METHODS } from "@/lib/constants";

const ICON_BY_METHOD: Record<string, LucideIcon> = {
  eft: Landmark,
  cod: Banknote,
  momo: Smartphone,
  ewallet: Wallet,
  pay2cell: Wallet,
  paytoday: Zap,
};

/**
 * "PAY WITH" strip on the storefront. Reflects only the payment methods the
 * merchant has enabled (merchant.accepted_payment_methods), rendered in the
 * canonical PAYMENT_METHODS order.
 */
export function StorePaymentStrip({ methods }: { methods: string[] }) {
  const enabled = PAYMENT_METHODS.filter((m) => methods.includes(m.value));
  if (enabled.length === 0) return null;

  return (
    <div className="bg-white border-y border-slate-200/70">
      <div className="mx-auto max-w-4xl px-4 py-3 flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1.5 text-[10px] tracking-[0.12em] font-bold text-slate-500 mr-2">
          <ShieldCheck size={13} className="text-acacia" />
          PAY WITH
        </span>
        {enabled.map((m) => {
          const Icon = ICON_BY_METHOD[m.value] ?? CreditCard;
          return (
            <span
              key={m.value}
              className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full bg-slate-50 border border-slate-200 text-slate-700"
            >
              <Icon size={13} />
              {m.label}
            </span>
          );
        })}
      </div>
    </div>
  );
}
