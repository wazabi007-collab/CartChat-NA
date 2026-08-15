"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, PackageCheck, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { formatPrice } from "@/lib/utils";
import { namibianDateString } from "@/lib/date";
import { rentalLateDays, type RentalUnit } from "@/lib/rentals";

interface Props {
  itemId: string;
  productName: string;
  quantity: number;
  /** Stored end-exclusive bound of the hire ([first, last+1) for days). */
  rentalEndExclusive: string;
  unit: RentalUnit;
  /** Suggested fee per day late, cents. 0 = merchant configured none. */
  lateFeeNad: number;
  /** The whole order's refundable deposit, cents — context for the hint. */
  orderDepositNad: number;
  assignedUnit: string | null;
  returnedAt: string | null;
  returnNotes: string | null;
}

/**
 * The operations end of a hire: which physical unit went out, when it came
 * back, and in what condition. Record-keeping only — money still moves
 * through Record payment / Record refund, so a deposit held back for a late
 * return is simply a smaller refund and the credit note reflects it.
 */
export function RecordReturn({
  itemId,
  productName,
  quantity,
  rentalEndExclusive,
  unit,
  lateFeeNad,
  orderDepositNad,
  assignedUnit,
  returnedAt,
  returnNotes,
}: Props) {
  const router = useRouter();
  const supabase = createClient();

  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [unitLabel, setUnitLabel] = useState(assignedUnit ?? "");
  const [date, setDate] = useState(returnedAt ?? namibianDateString());
  const [notes, setNotes] = useState(returnNotes ?? "");

  const lateDays = date ? rentalLateDays(rentalEndExclusive, date, unit) : 0;
  const suggestedFee = lateDays * lateFeeNad * quantity;

  async function save() {
    setError("");
    if (!date) {
      setError("Enter the date it came back.");
      return;
    }
    setSaving(true);
    const { error: updateError } = await supabase
      .from("order_items")
      .update({
        assigned_unit: unitLabel.trim() || null,
        returned_at: date,
        return_notes: notes.trim() || null,
      })
      .eq("id", itemId);
    setSaving(false);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    setOpen(false);
    router.refresh();
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-bold text-slate-600 transition-colors hover:bg-slate-50 hover:text-amber-700"
      >
        <PackageCheck size={16} />
        {returnedAt ? `Edit return · ${productName}` : `Record return · ${productName}`}
      </button>
    );
  }

  return (
    <div className="w-full rounded-xl border border-amber-100 bg-amber-50/50 p-4">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-black text-slate-950">
          Return of {productName}
          {quantity > 1 ? ` ×${quantity}` : ""}
        </p>
        <button
          onClick={() => setOpen(false)}
          aria-label="Close"
          className="text-slate-400 hover:text-slate-600"
        >
          <X size={16} />
        </button>
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-slate-500">
            Which unit went out? (optional)
          </span>
          <input
            value={unitLabel}
            onChange={(e) => setUnitLabel(e.target.value)}
            placeholder="Registration, asset tag, room name…"
            className="min-h-11 w-full rounded-lg border border-slate-200 px-3 text-sm"
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-slate-500">
            Date it came back
          </span>
          <input
            type="date"
            value={date}
            max={namibianDateString()}
            onChange={(e) => setDate(e.target.value)}
            className="min-h-11 w-full rounded-lg border border-slate-200 px-3 text-sm"
          />
        </label>

        <label className="block sm:col-span-2">
          <span className="mb-1 block text-[11px] font-bold uppercase tracking-wide text-slate-500">
            Condition on return (optional)
          </span>
          <input
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. Clean, full tank · small tear on the flysheet"
            className="min-h-11 w-full rounded-lg border border-slate-200 px-3 text-sm"
          />
        </label>
      </div>

      {lateDays > 0 && (
        <p className="mt-3 rounded-lg bg-amber-100/70 px-3 py-2 text-xs font-semibold text-amber-800">
          {lateDays} day{lateDays === 1 ? "" : "s"} late
          {suggestedFee > 0 && <> — suggested late fee {formatPrice(suggestedFee)}</>}
          {orderDepositNad > 0 && (
            <>
              . Deposit held: {formatPrice(orderDepositNad)} — refund the
              difference with <strong>Record refund</strong> and the credit
              note will show it.
            </>
          )}
        </p>
      )}
      {lateDays === 0 && orderDepositNad > 0 && (
        <p className="mt-3 text-[11px] leading-4 text-slate-400">
          Back on time. Refund the {formatPrice(orderDepositNad)} deposit with{" "}
          <strong>Record refund</strong> once you&apos;re happy with the
          condition.
        </p>
      )}

      {error && <p className="mt-3 text-sm font-semibold text-red-600">{error}</p>}

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          onClick={save}
          disabled={saving}
          className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-amber-600 px-4 text-sm font-bold text-white transition-colors hover:bg-amber-700 disabled:opacity-50"
        >
          <Check size={16} />
          {saving ? "Saving…" : "Save return"}
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
