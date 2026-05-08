"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { SAFETY_POLICY_VERSION } from "@/lib/safety/prohibited-content";

export function PolicyAcceptanceGate({
  merchantId,
  acceptedAt,
  acceptedVersion,
}: {
  merchantId: string;
  acceptedAt: string | null;
  acceptedVersion: string | null;
}) {
  const router = useRouter();
  const [checked, setChecked] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const needsAcceptance = !acceptedAt || acceptedVersion !== SAFETY_POLICY_VERSION;
  if (!needsAcceptance) return null;

  async function acceptPolicy() {
    if (!checked || saving) return;
    setSaving(true);
    setError("");

    const res = await fetch("/api/merchant/policy-acceptance", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ merchantId, version: SAFETY_POLICY_VERSION }),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error || "Could not save acceptance. Please try again.");
      setSaving(false);
      return;
    }

    router.refresh();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 px-4 backdrop-blur-sm">
      <div className="w-full max-w-xl rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl shadow-slate-950/30">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
            <ShieldCheck size={24} />
          </div>
          <div>
            <p className="text-xs font-black uppercase tracking-[0.22em] text-emerald-700">
              Platform safety
            </p>
            <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-950">
              Accept OshiCart selling rules
            </h2>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              OshiCart does not allow adult content, sexual services, illegal drugs,
              counterfeit goods, fraud, or dangerous restricted items. Listings can be
              blocked, stores can be suspended, and serious violations can lead to a ban.
            </p>
          </div>
        </div>

        <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
          This protects customers, merchants, payment partners, and the OshiCart brand.
          Review the full policy before continuing.
          <Link href="/prohibited-products" target="_blank" className="ml-1 font-black underline">
            View prohibited products
          </Link>
        </div>

        <label className="mt-5 flex items-start gap-3 rounded-2xl border border-slate-200 p-4 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={checked}
            onChange={(event) => setChecked(event.target.checked)}
            className="mt-1 h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
          />
          <span>
            I confirm that my store and products comply with OshiCart selling rules,
            and I understand that prohibited content can lead to restriction,
            suspension, or a permanent ban.
          </span>
        </label>

        {error && (
          <p className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
            {error}
          </p>
        )}

        <button
          type="button"
          onClick={acceptPolicy}
          disabled={!checked || saving}
          className="mt-5 min-h-12 w-full rounded-2xl bg-slate-950 px-5 text-sm font-black text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saving ? "Saving acceptance..." : "Accept and continue"}
        </button>
      </div>
    </div>
  );
}
