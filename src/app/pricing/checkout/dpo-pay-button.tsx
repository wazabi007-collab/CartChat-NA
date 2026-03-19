"use client";

import { useState } from "react";
import { CreditCard, Loader2 } from "lucide-react";
import { track } from "@/lib/track";

const BILLING_OPTIONS = [
  { months: 1, label: "1 Month", discount: 0 },
  { months: 3, label: "3 Months", discount: 0 },
  { months: 6, label: "6 Months", discount: 10 },
  { months: 12, label: "12 Months", discount: 15 },
] as const;

interface Props {
  tier: string;
  merchantId: string;
  storeName: string;
  reference: string;
  /** Monthly price in cents */
  priceNadCents: number;
}

function formatNad(cents: number): string {
  return `N$${(cents / 100).toLocaleString()}`;
}

export function DpoPayButton({ tier, merchantId, storeName, reference, priceNadCents }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedMonths, setSelectedMonths] = useState(1);

  const option = BILLING_OPTIONS.find((o) => o.months === selectedMonths) || BILLING_OPTIONS[0];
  const subtotal = priceNadCents * option.months;
  const discountAmount = Math.round(subtotal * option.discount / 100);
  const totalCents = subtotal - discountAmount;

  async function handlePay() {
    setLoading(true);
    setError("");
    track("dpo_payment_initiated", { tier, merchant_id: merchantId, months: selectedMonths, total_cents: totalCents });

    try {
      const res = await fetch("/api/payments/dpo/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tier,
          merchant_id: merchantId,
          store_name: storeName,
          reference,
          months: selectedMonths,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.paymentUrl) {
        setError(data.error || "Failed to initiate payment. Please try EFT instead.");
        setLoading(false);
        return;
      }

      window.location.href = data.paymentUrl;
    } catch {
      setError("Connection error. Please try EFT instead.");
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* Billing period selector */}
      <div>
        <p className="text-sm font-medium text-gray-700 mb-2">Billing period</p>
        <div className="grid grid-cols-4 gap-2">
          {BILLING_OPTIONS.map((opt) => (
            <button
              key={opt.months}
              type="button"
              onClick={() => setSelectedMonths(opt.months)}
              className={`relative py-2.5 px-2 rounded-lg text-center text-sm font-medium transition-colors border ${
                selectedMonths === opt.months
                  ? "border-blue-600 bg-blue-50 text-blue-700"
                  : "border-gray-200 text-gray-600 hover:border-gray-300"
              }`}
            >
              {opt.label}
              {opt.discount > 0 && (
                <span className="block text-xs text-green-600 font-semibold mt-0.5">
                  Save {opt.discount}%
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Price breakdown */}
      <div className="bg-gray-50 rounded-lg p-3 space-y-1.5 text-sm">
        <div className="flex justify-between text-gray-600">
          <span>{formatNad(priceNadCents)}/mo × {selectedMonths} month{selectedMonths > 1 ? "s" : ""}</span>
          <span>{formatNad(subtotal)}</span>
        </div>
        {discountAmount > 0 && (
          <div className="flex justify-between text-green-600">
            <span>{option.discount}% discount</span>
            <span>-{formatNad(discountAmount)}</span>
          </div>
        )}
        <div className="flex justify-between font-bold text-gray-900 pt-1.5 border-t border-gray-200">
          <span>Total</span>
          <span>{formatNad(totalCents)}</span>
        </div>
      </div>

      {/* Pay button */}
      <button
        onClick={handlePay}
        disabled={loading}
        className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-semibold text-sm transition-colors shadow-lg shadow-blue-600/20 flex items-center justify-center gap-2"
      >
        {loading ? (
          <>
            <Loader2 size={18} className="animate-spin" />
            Connecting to payment...
          </>
        ) : (
          <>
            <CreditCard size={18} />
            Pay {formatNad(totalCents)} Now
          </>
        )}
      </button>
      {error && (
        <p className="text-sm text-red-600 text-center mt-2">{error}</p>
      )}
    </div>
  );
}
