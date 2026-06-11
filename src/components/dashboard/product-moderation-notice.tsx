"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Loader2, ShieldAlert } from "lucide-react";

export function ProductModerationNotice({
  productId,
  moderationStatus,
  reasons,
  hasOpenAppeal,
}: {
  productId: string;
  moderationStatus: "review_required" | "blocked";
  reasons: string[];
  hasOpenAppeal: boolean;
}) {
  const [showForm, setShowForm] = useState(false);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [appealed, setAppealed] = useState(false);
  const router = useRouter();

  const blocked = moderationStatus === "blocked";
  const tone = blocked
    ? "border-red-200 bg-red-50 text-red-800"
    : "border-amber-200 bg-amber-50 text-amber-800";

  async function submit() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/products/${productId}/appeal`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Could not submit your appeal");
      }
      setAppealed(true);
      setShowForm(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  const appealDone = hasOpenAppeal || appealed;

  return (
    <div className={`mt-2 rounded-xl border px-3 py-2.5 text-xs ${tone}`}>
      <p className="flex items-center gap-1.5 font-bold">
        <ShieldAlert size={13} />
        {blocked ? "Blocked — hidden from customers" : "In review — hidden while we check this listing"}
      </p>

      {reasons.length > 0 ? (
        <ul className="mt-1.5 list-disc space-y-0.5 pl-4 font-medium">
          {reasons.map((r) => (
            <li key={r}>{r}</li>
          ))}
        </ul>
      ) : (
        <p className="mt-1.5 font-medium">This listing may violate our content policy.</p>
      )}

      <p className="mt-1.5 leading-4 opacity-80">
        Edit the listing to remove flagged content and save — it&apos;s re-checked
        automatically. If you believe this is a mistake, request a review.
      </p>

      {appealDone ? (
        <p className="mt-2 font-bold">Appeal submitted — under review.</p>
      ) : showForm ? (
        <div className="mt-2 space-y-2">
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            maxLength={500}
            rows={3}
            placeholder="Tell us why you think this is a mistake (optional)"
            className="w-full rounded-lg border border-current/20 bg-white px-2 py-1.5 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-current"
          />
          <div className="flex items-center gap-2">
            <button
              onClick={submit}
              disabled={loading}
              className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-bold text-white hover:bg-slate-800 disabled:opacity-60"
            >
              {loading && <Loader2 size={13} className="animate-spin" />}
              Submit appeal
            </button>
            <button
              onClick={() => setShowForm(false)}
              className="text-xs font-medium text-slate-500 hover:text-slate-700"
            >
              Cancel
            </button>
          </div>
          {error && (
            <p className="flex items-center gap-1 font-medium text-red-600">
              <AlertTriangle size={12} /> {error}
            </p>
          )}
        </div>
      ) : (
        <button
          onClick={() => setShowForm(true)}
          className="mt-2 rounded-lg border border-current/30 bg-white px-3 py-1.5 text-xs font-bold hover:bg-current/5"
        >
          Request review
        </button>
      )}
    </div>
  );
}
