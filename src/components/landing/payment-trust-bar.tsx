import { Banknote, BadgeCheck, Landmark, Smartphone, Wallet } from "lucide-react";

const METHODS = [
  { name: "PayToday", icon: Smartphone },
  { name: "EFT", icon: Landmark },
  { name: "Pay2Cell", icon: Wallet },
  { name: "eWallet", icon: Wallet },
  { name: "Cash on Delivery", icon: Banknote },
];

export function PaymentTrustBar() {
  return (
    <section className="border-y border-border-warm bg-sand py-8">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr] lg:items-center">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-terracotta">
              Local payment confidence
            </p>
            <h2 className="mt-2 text-2xl font-black tracking-tight text-walnut">
              Accept the ways Namibians already pay.
            </h2>
          </div>
          <div className="flex flex-wrap gap-3">
            {METHODS.map((method) => {
              const Icon = method.icon;
              return (
                <span
                  key={method.name}
                  className="inline-flex items-center gap-2 rounded-lg border border-border-warm bg-white px-4 py-3 text-sm font-extrabold text-walnut shadow-sm"
                >
                  <Icon size={17} className="text-acacia" />
                  {method.name}
                </span>
              );
            })}
            <span className="inline-flex items-center gap-2 rounded-lg bg-acacia-soft px-4 py-3 text-sm font-extrabold text-acacia">
              <BadgeCheck size={17} />
              Zero OshiCart commission
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
