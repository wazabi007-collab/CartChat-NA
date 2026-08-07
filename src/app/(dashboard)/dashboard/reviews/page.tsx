import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { card } from "@/lib/ui";
import { MessageSquare, Star } from "lucide-react";
import { StarRating } from "@/components/storefront/star-rating";
import { ReviewReply } from "./review-reply";

interface ReviewRow {
  id: string;
  customer_name: string | null;
  rating: number;
  comment: string | null;
  merchant_reply: string | null;
  created_at: string;
}

export default async function ReviewsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: merchant } = await supabase
    .from("merchants")
    .select("id, store_name")
    .eq("user_id", user.id)
    .single();
  if (!merchant) redirect("/dashboard/setup");

  const { data } = await supabase
    .from("reviews")
    .select("id, customer_name, rating, comment, merchant_reply, created_at")
    .eq("merchant_id", merchant.id)
    .eq("is_published", true)
    .order("created_at", { ascending: false });

  const reviews = (data ?? []) as ReviewRow[];
  const total = reviews.length;
  const average = total > 0 ? reviews.reduce((s, r) => s + r.rating, 0) / total : 0;
  const awaitingReply = reviews.filter((r) => !r.merchant_reply).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Reviews</h1>
        <p className="mt-1 text-sm text-gray-500">
          Only customers who completed a real order can leave a review, so these are genuine. You
          can reply to any of them — replies show publicly on your store.
        </p>
      </div>

      {total > 0 && (
        <div className="grid gap-3 sm:grid-cols-3">
          <div className={`${card} flex items-center gap-3`}>
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-amber-50 text-amber-600">
              <Star size={18} fill="currentColor" />
            </span>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Average</p>
              <p className="text-xl font-black text-slate-900">{average.toFixed(1)}</p>
            </div>
          </div>
          <div className={`${card} flex items-center gap-3`}>
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-emerald-50 text-emerald-700">
              <MessageSquare size={18} />
            </span>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Reviews</p>
              <p className="text-xl font-black text-slate-900">{total}</p>
            </div>
          </div>
          <div className={`${card} flex items-center gap-3`}>
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-blue-50 text-blue-700">
              <MessageSquare size={18} />
            </span>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Awaiting reply
              </p>
              <p className="text-xl font-black text-slate-900">{awaitingReply}</p>
            </div>
          </div>
        </div>
      )}

      {total === 0 ? (
        <div className={`${card} py-12 text-center`}>
          <MessageSquare size={30} className="mx-auto text-slate-300" />
          <p className="mt-3 font-semibold text-slate-700">No reviews yet</p>
          <p className="mt-1 text-sm text-slate-500">
            After you mark an order complete, that customer is invited to review your store.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {reviews.map((r) => (
            <div key={r.id} className={`${card} space-y-2`}>
              <div className="flex flex-wrap items-center gap-2">
                <StarRating value={r.rating} size={14} />
                <span className="text-sm font-bold text-slate-900">
                  {r.customer_name?.trim().split(/\s+/)[0] || "A customer"}
                </span>
                <span className="ml-auto text-xs text-slate-400">
                  {new Date(r.created_at).toLocaleDateString("en-NA", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </span>
              </div>
              {r.comment && <p className="text-sm leading-6 text-slate-700">{r.comment}</p>}
              <ReviewReply reviewId={r.id} initialReply={r.merchant_reply} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
