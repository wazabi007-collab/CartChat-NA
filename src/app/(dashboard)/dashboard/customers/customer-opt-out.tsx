"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { BellOff, BellRing } from "lucide-react";

/**
 * Marketing opt-out switch. A customer who asks not to be messaged is excluded
 * from every broadcast audience — the check lives in the broadcast page, so
 * flipping this here is enough.
 */
export function CustomerOptOut({
  customerId,
  initialOptOut,
}: {
  customerId: string;
  initialOptOut: boolean;
}) {
  const [optOut, setOptOut] = useState(initialOptOut);
  const [busy, setBusy] = useState(false);

  async function toggle() {
    const next = !optOut;
    setBusy(true);
    setOptOut(next); // optimistic
    const supabase = createClient();
    const { error } = await supabase
      .from("customers")
      .update({ marketing_opt_out: next, updated_at: new Date().toISOString() })
      .eq("id", customerId);
    setBusy(false);
    if (error) setOptOut(!next); // revert
  }

  return (
    <button
      onClick={toggle}
      disabled={busy}
      title={
        optOut
          ? "This customer is excluded from broadcasts. Click to allow again."
          : "Click to exclude this customer from broadcasts."
      }
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold transition disabled:opacity-50 ${
        optOut
          ? "bg-slate-200 text-slate-600 hover:bg-slate-300"
          : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
      }`}
    >
      {optOut ? <BellOff size={11} /> : <BellRing size={11} />}
      {optOut ? "No marketing" : "Marketing OK"}
    </button>
  );
}
