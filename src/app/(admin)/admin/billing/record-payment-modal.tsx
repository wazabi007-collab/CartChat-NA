"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { TIER_LIMITS, TIER_LABELS, type SubscriptionTier } from "@/lib/tier-limits";

interface Props {
  merchants: { id: string; store_name: string }[];
}

const TIERS = Object.keys(TIER_LIMITS) as SubscriptionTier[];
const PAYMENT_METHODS = ["eft", "momo", "ewallet", "cash"];

export function RecordPaymentModal({ merchants }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [merchantId, setMerchantId] = useState("");
  const [tier, setTier] = useState<SubscriptionTier>("oshi_basic");
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("eft");
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");

  // Auto-fill amount when tier changes
  function handleTierChange(t: SubscriptionTier) {
    setTier(t);
    setAmount((TIER_LIMITS[t].price_nad / 100).toString());
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const now = new Date();
    const periodStart = now.toISOString().split("T")[0];
    const periodEnd = new Date(now.getTime() + 30 * 86400000).toISOString().split("T")[0];

    const res = await fetch("/api/admin/billing", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        merchant_id: merchantId,
        amount_nad: Math.round(parseFloat(amount) * 100),
        payment_method: method,
        reference: reference || null,
        notes: notes || null,
        period_start: periodStart,
        period_end: periodEnd,
        tier,
      }),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Failed to record payment");
      setLoading(false);
      return;
    }

    setOpen(false);
    setMerchantId("");
    setReference("");
    setNotes("");
    router.refresh();
    setLoading(false);
  }

  if (!open) {
    return (
      <button
        onClick={() => { setOpen(true); handleTierChange("oshi_basic"); }}
        className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
      >
        Record Payment
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setOpen(false)}>
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4 p-6" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-semibold mb-4">Record Payment</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Merchant</label>
            <select
              value={merchantId}
              onChange={(e) => setMerchantId(e.target.value)}
              required
              className="w-full border rounded-lg px-3 py-2 text-sm"
            >
              <option value="">Select merchant...</option>
              {merchants.map((m) => (
                <option key={m.id} value={m.id}>{m.store_name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Plan</label>
            <select
              value={tier}
              onChange={(e) => handleTierChange(e.target.value as SubscriptionTier)}
              className="w-full border rounded-lg px-3 py-2 text-sm"
            >
              {TIERS.filter((t) => t !== "oshi_start").map((t) => (
                <option key={t} value={t}>{TIER_LABELS[t]} — N${(TIER_LIMITS[t].price_nad / 100).toLocaleString()}/mo</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Amount (NAD)</label>
            <input
              type="number"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
              className="w-full border rounded-lg px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Payment Method</label>
            <select
              value={method}
              onChange={(e) => setMethod(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm"
            >
              {PAYMENT_METHODS.map((m) => (
                <option key={m} value={m}>{m.toUpperCase()}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Reference</label>
            <input
              type="text"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="Bank ref, MoMo ref..."
              className="w-full border rounded-lg px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="w-full border rounded-lg px-3 py-2 text-sm"
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="flex-1 px-4 py-2 border rounded-lg text-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? "Saving..." : "Record Payment"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
