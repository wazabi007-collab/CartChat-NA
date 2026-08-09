"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { BanknoteArrowDown, Check, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { formatPrice } from "@/lib/utils";
import { namibianDateString } from "@/lib/date";
import { PAYMENT_METHODS } from "@/lib/constants";

interface Props {
  orderId: string;
  merchantId: string;
  orderNumber: number;
  /** Received against this order so far, in cents. */
  received: number;
  /** Already refunded, in cents. */
  refunded: number;
  defaultMethod: string | null;
}

/**
 * Records money returned to the customer — the mirror of RecordPayment.
 *
 * Only offered once something has been received: you cannot hand back money
 * you never got. Each saved refund is also a credit note, printable at
 * /credit-note/[id], which is what a VAT-registered merchant's books need
 * once a tax invoice has been issued.
 */
export function RecordRefund({
  orderId,
  merchantId,
  orderNumber,
  received,
  refunded,
  defaultMethod,
}: Props) {
  const router = useRouter();
  const supabase = createClient();

  const refundable = Math.max(0, received - refunded);

  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [amount, setAmount] = useState((refundable / 100).toFixed(2));
  const [refundedAt, setRefundedAt] = useState(namibianDateString());
  const [method, setMethod] = useState(defaultMethod ?? "eft");
  const [reference, setReference] = useState("");

  if (refundable <= 0 && !open) return null;

  async function save() {
    setError("");

    const cents = Math.round(Number(amount) * 100);
    if (!Number.isFinite(cents) || cents <= 0) {
      setError("Enter an amount greater than zero.");
      return;
    }
    if (cents > refundable) {
      setError(
        `You have ${formatPrice(refundable)} left to refund on this order.`
      );
      return;
    }
    if (!refundedAt) {
      setError("Enter the date the money went back.");
      return;
    }

    setSaving(true);
    const { error: insertError } = await supabase.from("order_refunds").insert({
      order_id: orderId,
      merchant_id: merchantId,
      amount_nad: cents,
      refunded_at: refundedAt,
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
          setAmount((refundable / 100).toFixed(2));
          setOpen(true);
        }}
        className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-bold text-slate-600 transition-colors hover:bg-slate-50 hover:text-red-700"
      >
        <BanknoteArrowDown size={16} />
        {refunded > 0 ? "Record another refund" : "Record refund"}
      </button>
    );
  }

  return (
    <div className="rounded-xl border border-red-100 bg-red-50/50 p-4">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-black text-slate-950">
          Refund for order #{orderNumber}
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
        Received {formatPrice(received)}
        {refunded > 0 && <> · already refunded {formatPrice(refunded)}</>}
        {" "}· refundable {formatPrice(refundable)}
      </p>

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-slate-500">
            Amount refunded (N$)
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
            Date it went back
          </span>
          <input
            type="date"
            value={refundedAt}
            max={namibianDateString()}
            onChange={(e) => setRefundedAt(e.target.value)}
            className="min-h-11 w-full rounded-lg border border-slate-200 px-3 text-sm"
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-slate-500">
            How it was returned
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

      <p className="mt-2 text-[11px] leading-4 text-slate-400">
        Saving creates a credit note against this order&apos;s invoice — you can
        print it from the order afterwards.
      </p>

      {error && <p className="mt-3 text-sm font-semibold text-red-600">{error}</p>}

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          onClick={save}
          disabled={saving}
          className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-red-600 px-4 text-sm font-bold text-white transition-colors hover:bg-red-700 disabled:opacity-50"
        >
          <Check size={16} />
          {saving ? "Saving…" : "Save refund"}
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
