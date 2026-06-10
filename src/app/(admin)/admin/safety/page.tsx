import Link from "next/link";
import { CheckCircle2, ShieldAlert } from "lucide-react";
import { createServiceClient } from "@/lib/supabase/service";
import { requireAdminPermission } from "@/lib/admin-auth";
import { SafetyReviewCard, SafetyReviewQueue, type SafetyReview } from "./safety-review-queue";

export default async function AdminSafetyPage() {
  await requireAdminPermission("view_safety");
  const supabase = createServiceClient();

  const { data: reviews } = await supabase
    .from("safety_reviews")
    .select("*, merchants(store_name, store_slug, store_status), products(name, moderation_status, is_available)")
    .order("created_at", { ascending: false });

  const reviewList = (reviews || []) as SafetyReview[];
  const openReviews = reviewList.filter((review) => review.status === "open");
  const resolvedReviews = reviewList.filter((review) => review.status !== "open").slice(0, 25);
  const blockedCount = openReviews.filter((review) => review.severity === "block").length;

  return (
    <div className="md:ml-56">
      <div className="mb-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm shadow-slate-900/5">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.22em] text-red-600">
              Trust and safety
            </p>
            <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950">
              Safety Review Queue
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
              Review stores and listings flagged by OshiCart rules before they can be sold publicly.
            </p>
          </div>
          <Link
            href="/prohibited-products"
            target="_blank"
            className="inline-flex min-h-11 items-center justify-center rounded-2xl border border-slate-200 px-4 text-sm font-black text-slate-700 transition hover:bg-slate-50"
          >
            View public policy
          </Link>
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <Metric label="Open reviews" value={openReviews.length} tone="slate" />
          <Metric label="Blocked risk" value={blockedCount} tone="red" />
          <Metric label="Resolved" value={reviewList.length - openReviews.length} tone="green" />
        </div>
      </div>

      <section>
        <h2 className="mb-3 flex items-center gap-2 text-lg font-black text-slate-950">
          <ShieldAlert size={20} className="text-red-600" />
          Open reviews
        </h2>
        {openReviews.length === 0 ? (
          <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center text-slate-500">
            <CheckCircle2 className="mx-auto mb-3 text-emerald-600" size={32} />
            No safety reviews are open.
          </div>
        ) : (
          <SafetyReviewQueue reviews={openReviews} />
        )}
      </section>

      {resolvedReviews.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-3 text-lg font-black text-slate-950">Recent resolved reviews</h2>
          <div className="grid gap-4 xl:grid-cols-2">
            {resolvedReviews.map((review) => (
              <SafetyReviewCard key={review.id} review={review} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function Metric({ label, value, tone }: { label: string; value: number; tone: "slate" | "red" | "green" }) {
  const tones = {
    slate: "border-slate-200 bg-slate-50 text-slate-950",
    red: "border-red-200 bg-red-50 text-red-700",
    green: "border-emerald-200 bg-emerald-50 text-emerald-700",
  };

  return (
    <div className={`rounded-2xl border p-4 ${tones[tone]}`}>
      <p className="text-xs font-black uppercase tracking-wide opacity-70">{label}</p>
      <p className="mt-2 text-2xl font-black">{value}</p>
    </div>
  );
}
