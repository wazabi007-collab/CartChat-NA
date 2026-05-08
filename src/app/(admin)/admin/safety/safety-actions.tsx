"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function SafetyActions({
  reviewId,
  hasProduct,
}: {
  reviewId: string;
  hasProduct: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [notes, setNotes] = useState("");

  async function submit(action: "approve" | "block" | "dismiss") {
    setLoading(action);

    const payload =
      action === "approve"
        ? { reviewId, status: "reviewed", adminNotes: notes, productStatus: hasProduct ? "approved" : undefined, storeStatus: hasProduct ? undefined : "active" }
        : action === "block"
        ? { reviewId, status: "reviewed", adminNotes: notes, productStatus: hasProduct ? "blocked" : undefined, storeStatus: "suspended" }
        : { reviewId, status: "dismissed", adminNotes: notes };

    const res = await fetch("/api/admin/safety", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    setLoading(null);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      alert(body.error || "Failed to update safety review");
      return;
    }
    router.refresh();
  }

  return (
    <div className="mt-4 space-y-3 border-t border-slate-100 pt-4">
      <textarea
        value={notes}
        onChange={(event) => setNotes(event.target.value)}
        placeholder="Admin notes..."
        rows={2}
        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-4 focus:ring-emerald-100"
      />
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => submit("approve")}
          disabled={loading !== null}
          className="rounded-xl bg-emerald-600 px-3 py-2 text-xs font-black text-white transition hover:bg-emerald-700 disabled:opacity-50"
        >
          {loading === "approve" ? "Saving..." : hasProduct ? "Approve listing" : "Reactivate store"}
        </button>
        <button
          type="button"
          onClick={() => submit("block")}
          disabled={loading !== null}
          className="rounded-xl bg-red-600 px-3 py-2 text-xs font-black text-white transition hover:bg-red-700 disabled:opacity-50"
        >
          {loading === "block" ? "Saving..." : hasProduct ? "Keep blocked" : "Suspend store"}
        </button>
        <button
          type="button"
          onClick={() => submit("dismiss")}
          disabled={loading !== null}
          className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-black text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}
