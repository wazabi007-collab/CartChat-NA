"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

async function post(body: Record<string, unknown>): Promise<string | null> {
  const res = await fetch("/api/admin/referrals", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  return res.ok ? null : (data.error || "Something went wrong.");
}

export function CreateReferrerForm() {
  const router = useRouter();
  const [form, setForm] = useState({ name: "", code: "", whatsapp: "", payout_number: "" });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    const err = await post({ action: "create_referrer", ...form });
    setSaving(false);
    if (err) { setError(err); return; }
    setForm({ name: "", code: "", whatsapp: "", payout_number: "" });
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="grid gap-2 sm:grid-cols-4">
      <input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} placeholder="Name" required className="rounded-lg border border-slate-200 px-3 py-2 text-sm" />
      <input value={form.code} onChange={(e) => setForm((p) => ({ ...p, code: e.target.value }))} placeholder="code (e.g. maria)" required className="rounded-lg border border-slate-200 px-3 py-2 text-sm" />
      <input value={form.whatsapp} onChange={(e) => setForm((p) => ({ ...p, whatsapp: e.target.value }))} placeholder="WhatsApp" className="rounded-lg border border-slate-200 px-3 py-2 text-sm" />
      <div className="flex gap-2">
        <input value={form.payout_number} onChange={(e) => setForm((p) => ({ ...p, payout_number: e.target.value }))} placeholder="Payout number" className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm" />
        <button type="submit" disabled={saving} className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-bold text-white disabled:opacity-50">Add</button>
      </div>
      {error && <p className="sm:col-span-4 text-xs text-red-600">{error}</p>}
    </form>
  );
}

export function ApproveRejectButtons({ referrerId }: { referrerId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function act(action: "approve_referrer" | "reject_referrer") {
    setBusy(true);
    await post({ action, referrer_id: referrerId });
    setBusy(false);
    router.refresh();
  }

  return (
    <span className="inline-flex gap-1.5">
      <button onClick={() => act("approve_referrer")} disabled={busy}
        className="rounded-lg bg-emerald-600 px-2.5 py-1 text-xs font-bold text-white disabled:opacity-50">
        Approve
      </button>
      <button onClick={() => act("reject_referrer")} disabled={busy}
        className="rounded-lg bg-slate-200 px-2.5 py-1 text-xs font-bold text-slate-700 disabled:opacity-50">
        Reject
      </button>
    </span>
  );
}

export function MarkPaidButton({ merchantId, referrerCode, commissionNad }: { merchantId: string; referrerCode: string; commissionNad: number }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function markPaid() {
    const reference = window.prompt(`Mark N$${(commissionNad / 100).toFixed(2)} as paid.\nEnter the payout reference (eWallet/txn):`);
    if (reference === null) return;
    setBusy(true);
    const err = await post({ action: "mark_paid", merchant_id: merchantId, referrer_code: referrerCode, commission_nad: commissionNad, paid_reference: reference });
    setBusy(false);
    if (err) { window.alert(err); return; }
    router.refresh();
  }

  return (
    <button onClick={markPaid} disabled={busy} className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-bold text-white disabled:opacity-50">
      {busy ? "…" : "Mark paid"}
    </button>
  );
}

export function ToggleReferrerButton({ referrerId, isActive }: { referrerId: string; isActive: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  async function toggle() {
    setBusy(true);
    await post({ action: "toggle_active", referrer_id: referrerId, is_active: !isActive });
    setBusy(false);
    router.refresh();
  }
  return (
    <button onClick={toggle} disabled={busy} className={`rounded-full px-2 py-0.5 text-xs font-bold ${isActive ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-600"}`}>
      {isActive ? "Active" : "Inactive"}
    </button>
  );
}
