"use client";

import { useEffect, useState } from "react";
import { Loader2, Star, CheckCircle2 } from "lucide-react";

/**
 * Review prompt shown on the order-tracking page once an order is complete.
 * Authenticity comes from the tracking token, so no sign-in is required.
 */
export function ReviewForm({
  orderId,
  trackingToken,
  storeName,
}: {
  orderId: string;
  trackingToken: string;
  storeName: string;
}) {
  const [checked, setChecked] = useState(false);
  const [alreadyReviewed, setAlreadyReviewed] = useState(false);
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Don't prompt again if this order already has a review.
  useEffect(() => {
    fetch(`/api/reviews?order_id=${encodeURIComponent(orderId)}&tracking_token=${encodeURIComponent(trackingToken)}`)
      .then((r) => r.json())
      .then((d) => setAlreadyReviewed(!!d?.reviewed))
      .catch(() => {})
      .finally(() => setChecked(true));
  }, [orderId, trackingToken]);

  async function submit() {
    if (rating < 1) return;
    setSubmitting(true);
    setError(null);
    const res = await fetch("/api/reviews", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        order_id: orderId,
        tracking_token: trackingToken,
        rating,
        comment: comment.trim() || undefined,
      }),
    });
    const data = await res.json().catch(() => ({}));
    setSubmitting(false);
    if (!res.ok) {
      setError(data?.error || "Could not save your review. Please try again.");
      return;
    }
    setDone(true);
  }

  if (!checked || alreadyReviewed) return null;

  if (done) {
    return (
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-center">
        <CheckCircle2 className="mx-auto text-emerald-600" size={22} />
        <p className="mt-1.5 text-sm font-bold text-emerald-800">Thank you for your review!</p>
        <p className="text-xs text-emerald-700">It helps other shoppers buy with confidence.</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <p className="text-sm font-bold text-slate-900">How was your order from {storeName}?</p>
      <p className="mt-0.5 text-xs text-slate-500">
        Your review will show on their store to help other shoppers.
      </p>

      <div className="mt-3 flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => setRating(n)}
            onMouseEnter={() => setHover(n)}
            onMouseLeave={() => setHover(0)}
            aria-label={`${n} star${n === 1 ? "" : "s"}`}
            className="p-1 transition hover:scale-110"
          >
            <Star
              size={28}
              className={(hover || rating) >= n ? "text-amber-400" : "text-slate-300"}
              fill={(hover || rating) >= n ? "currentColor" : "none"}
              strokeWidth={1.75}
            />
          </button>
        ))}
      </div>

      {rating > 0 && (
        <>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={3}
            maxLength={1000}
            placeholder="Tell others what it was like (optional)"
            className="mt-3 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
          />
          <button
            onClick={submit}
            disabled={submitting}
            className="mt-2 inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-60"
          >
            {submitting && <Loader2 size={14} className="animate-spin" />}
            {submitting ? "Sending…" : "Post review"}
          </button>
        </>
      )}

      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
    </div>
  );
}
