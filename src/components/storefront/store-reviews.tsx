import { BadgeCheck, MessageSquare } from "lucide-react";
import { StarRating } from "./star-rating";

export interface StoreReview {
  id: string;
  customer_name: string | null;
  rating: number;
  comment: string | null;
  merchant_reply: string | null;
  merchant_replied_at: string | null;
  created_at: string;
}

/** Show a first name only — buyers didn't sign up to be listed publicly. */
function displayName(name: string | null) {
  if (!name) return "A customer";
  const first = name.trim().split(/\s+/)[0];
  return first || "A customer";
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("en-NA", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function StoreReviews({
  reviews,
  average,
  total,
  storeName,
}: {
  reviews: StoreReview[];
  average: number | null;
  total: number;
  storeName: string;
}) {
  if (total === 0) {
    return (
      <section id="reviews" className="scroll-mt-20">
        <h2 className="text-lg font-extrabold text-slate-900">Reviews</h2>
        <div className="mt-3 rounded-2xl border border-slate-200 bg-white p-6 text-center">
          <MessageSquare size={26} className="mx-auto text-slate-300" />
          <p className="mt-2 text-sm font-semibold text-slate-700">No reviews yet</p>
          <p className="mt-0.5 text-xs text-slate-500">
            {storeName} hasn&apos;t been reviewed yet. Reviews can only be left by customers who
            have completed an order.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section id="reviews" className="scroll-mt-20">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-extrabold text-slate-900">Reviews</h2>
        <div className="flex items-center gap-2">
          <StarRating value={average ?? 0} size={16} />
          <span className="text-sm font-bold text-slate-900">{(average ?? 0).toFixed(1)}</span>
          <span className="text-sm text-slate-500">
            ({total} review{total === 1 ? "" : "s"})
          </span>
        </div>
      </div>

      <div className="mt-3 space-y-3">
        {reviews.map((review) => (
          <article key={review.id} className="rounded-2xl border border-slate-200 bg-white p-4">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <StarRating value={review.rating} size={13} />
              <span className="text-sm font-bold text-slate-900">
                {displayName(review.customer_name)}
              </span>
              <span
                className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-1.5 py-0.5 text-[10px] font-black text-emerald-700"
                title="This reviewer completed a real order from this store"
              >
                <BadgeCheck size={11} /> VERIFIED PURCHASE
              </span>
              <span className="ml-auto text-xs text-slate-400">{formatDate(review.created_at)}</span>
            </div>

            {review.comment && (
              <p className="mt-2 text-sm leading-6 text-slate-700">{review.comment}</p>
            )}

            {review.merchant_reply && (
              <div className="mt-3 rounded-xl border-l-2 border-emerald-300 bg-slate-50 px-3 py-2">
                <p className="text-xs font-bold text-slate-700">Reply from {storeName}</p>
                <p className="mt-0.5 text-sm leading-6 text-slate-600">{review.merchant_reply}</p>
              </div>
            )}
          </article>
        ))}
      </div>

      {total > reviews.length && (
        <p className="mt-3 text-center text-xs text-slate-500">
          Showing the {reviews.length} most recent of {total} reviews.
        </p>
      )}
    </section>
  );
}
