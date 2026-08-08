"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { BanknoteArrowUp, Check, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { formatPrice } from "@/lib/utils";
import { namibianDateString } from "@/lib/date";
import { PAYMENT_METHODS, getPaymentMethodLabel } from "@/lib/constants";

interface Props {
  orderId: string;
  merchantId: string;
  orderNumber: number;
  /** Invoice total in cents. */
  total: number;
  /** Already received in cents. */
  received: number;
  /** The method the customer chose at checkout, used as the default. */
  defaultMethod: string | null;
}

/**
 * Records money actually received against an order.
 *
 * The date is the merchant's, not `now()` — they enter payments from a bank
 * statement days later, and dating them "today" would put the money in the
 * wrong month and break the reconciliation it exists to serve.
 */
export function RecordPayment({
  orderId,
  merchantId,
  orderNumber,
  total,
  received,
  defaultMethod,
}: Props) {
  const router = useRouter();
  const supabase = createClient();

  const outstanding = Math.max(0, total - received);

  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [amount, setAmount] = useState((outstanding / 100).toFixed(2));
  const [paidAt, setPaidAt] = useState(namibianDateString());
  const [method, setMethod] = useState(defaultMethod ?? "eft");
  const [reference, setReference] = useState("");

  async function save() {
    setError("");

    const cents = Math.round(Number(amount) * 100);
    if (!Number.isFinite(cents) || cents <= 0) {
      setError("Enter an amount greater than zero.");
      return;
    }
    if (!paidAt) {
      setError("Enter the date the money arrived.");
      return;
    }

    setSaving(true);
    const { error: insertError } = await supabase.from("order_payments").insert({
      order_id: orderId,
      merchant_id: merchantId,
      amount_nad: cents,
      paid_at: paidAt,
      method,
      reference: reference.trim() || null,
    });
    setSaving(false);

    if (insertError) {
      setError(insertError.message);
      return;
    }

    setOpen(false);
    setReference("");
    router.refresh();
  }

  if (!open) {
    return (
      <button
        onClick={() => {
          setAmount((outstanding / 100).toFixed(2));
          setOpen(true);
        }}
        className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-bold text-slate-900 transition-colors hover:bg-slate-50"
      >
        <BanknoteArrowUp size={16} />
        {received > 0 ? "Record another payment" : "Record payment"}
      </button>
    );
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-black text-slate-950">
          Payment for order #{orderNumber}
        </p>
        <button
          onClick={() => setOpen(false)}
          aria-label="Close"
          className="text-slate-400 hover:text-slate-600"
        >
          <X size={16} />
        </button>
      </div>

      <p className="mt-1 text-xs font-semibold text-slate-500">
        Invoiced {formatPrice(total)}
        {received > 0 && <> · already received {formatPrice(received)}</>}
        {outstanding > 0 && <> · outstanding {formatPrice(outstanding)}</>}
      </p>

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-slate-500">
            Amount received (N$)
          </span>
          <input
            type="number"
            inputMode="decimal"
            step="0.01"
            min="0"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="min-h-11 w-full rounded-lg border border-slate-200 px-3 text-sm"
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-slate-500">
            Date it arrived
          </span>
          <input
            type="date"
            value={paidAt}
            max={namibianDateString()}
            onChange={(e) => setPaidAt(e.target.value)}
            className="min-h-11 w-full rounded-lg border border-slate-200 px-3 text-sm"
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-slate-500">
            How it was paid
          </span>
          <select
            value={method}
            onChange={(e) => setMethod(e.target.value)}
            className="min-h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm"
          >
            {PAYMENT_METHODS.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-slate-500">
            Bank reference (optional)
          </span>
          <input
            value={reference}
            onChange={(e) => setReference(e.target.value)}
            placeholder="As it appears on your statement"
            className="min-h-11 w-full rounded-lg border border-slate-200 px-3 text-sm"
          />
        </label>
      </div>

      {error && <p className="mt-3 text-sm font-semibold text-red-600">{error}</p>}

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          onClick={save}
          disabled={saving}
          className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-acacia px-4 text-sm font-bold text-white transition-colors hover:bg-green-700 disabled:opacity-50"
        >
          <Check size={16} />
          {saving ? "Saving…" : "Save payment"}
        </button>
        <button
          onClick={() => setOpen(false)}
          className="inline-flex min-h-11 items-center rounded-lg border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
