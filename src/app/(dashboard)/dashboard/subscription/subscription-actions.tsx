"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Loader2 } from "lucide-react";

export function SubscriptionActions({
  cancelling,
  periodEndLabel,
}: {
  cancelling: boolean;
  periodEndLabel: string;
}) {
  const [loading, setLoading] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function setCancel(cancel: boolean) {
    setLoading(true);
    setError(null);
    setConfirming(false);
    try {
      const res = await fetch("/api/subscription/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cancel }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Could not update your subscription");
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <span className="inline-flex items-center gap-2 text-sm text-slate-500">
        <Loader2 size={16} className="animate-spin" /> Updating…
      </span>
    );
  }

  if (cancelling) {
    return (
      <div className="space-y-2">
        <button
          onClick={() => setCancel(false)}
          className="inline-flex items-center justify-center rounded-lg bg-acacia px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-acacia/90"
        >
          Keep my plan
        </button>
        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>
    );
  }

  if (confirming) {
    return (
      <div className="flex flex-col gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3">
        <div className="flex items-start gap-2">
          <AlertTriangle size={16} className="mt-0.5 text-amber-500" />
          <p className="text-sm text-slate-700">
            Cancel your subscription? Your store stays active until {periodEndLabel}, then goes offline unless you resubscribe.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setCancel(true)}
            className="rounded-lg bg-red-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-red-700"
          >
            Yes, cancel
          </button>
          <button
            onClick={() => setConfirming(false)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50"
          >
            No, keep it
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <button
        onClick={() => setConfirming(true)}
        className="inline-flex items-center justify-center rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50"
      >
        Cancel subscription
      </button>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
