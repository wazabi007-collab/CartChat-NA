"use client";

import { EWALLET_PROVIDERS } from "@/lib/constants";
import { PaymentMethodVisual } from "@/components/payment-method-visual";

/**
 * Logo picker for the merchant's bank eWallet (one per store). Shared by the
 * setup wizard and settings so both look identical.
 */
export function EwalletProviderPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {EWALLET_PROVIDERS.map((provider) => {
        const selected = value === provider.value;
        return (
          <button
            type="button"
            key={provider.value}
            onClick={() => onChange(provider.value)}
            aria-pressed={selected}
            className={`flex items-center gap-2 rounded-lg border p-2.5 text-left text-sm transition-colors ${
              selected
                ? "border-green-600 bg-green-50 font-semibold text-gray-900"
                : "border-gray-200 text-gray-700 hover:border-gray-300"
            }`}
          >
            <PaymentMethodVisual value={provider.value} logo={provider.logo} label={provider.label} size={24} />
            <span className="leading-tight">{provider.label}</span>
          </button>
        );
      })}
    </div>
  );
}
