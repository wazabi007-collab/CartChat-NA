import Link from "next/link";
import { AlertTriangle, CheckCircle2, ShieldAlert } from "lucide-react";
import { createServiceClient } from "@/lib/supabase/service";
import { requireAdminPermission } from "@/lib/admin-auth";
import { SafetyActions } from "./safety-actions";

interface SafetyReview {
  id: string;
  merchant_id: string;
  product_id: string | null;
  review_type: string;
  severity: "review" | "block";
  status: string;
  categories: string[];
  reasons: string[];
  content_excerpt: string | null;
  admin_notes: string | null;
  created_at: string;
  merchants: { store_name: string; store_slug: string; store_status: string } | null;
  products: { name: string; moderation_status: string; is_available: boolean } | null;
}

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
          <div className="grid gap-4 xl:grid-cols-2">
            {openReviews.map((review) => (
              <SafetyCard key={review.id} review={review} active />
            ))}
          </div>
        )}
      </section>

      {resolvedReviews.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-3 text-lg font-black text-slate-950">Recent resolved reviews</h2>
          <div className="grid gap-4 xl:grid-cols-2">
            {resolvedReviews.map((review) => (
              <SafetyCard key={review.id} review={review} />
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

function SafetyCard({ review, active = false }: { review: SafetyReview; active?: boolean }) {
  const date = new Date(review.created_at).toLocaleDateString("en-NA", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-900/5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className={`rounded-full px-2.5 py-1 text-xs font-black ${review.severity === "block" ? "bg-red-100 text-red-800" : "bg-amber-100 text-amber-800"}`}>
              {review.severity === "block" ? "Blocked" : "Needs review"}
            </span>
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600">
              {review.review_type.replace("_", " ")}
            </span>
          </div>
          <h3 className="mt-3 text-lg font-black text-slate-950">
            {review.products?.name || review.merchants?.store_name || "Unknown item"}
          </h3>
          <p className="mt-1 text-sm text-slate-500">
            Store: {review.merchants?.store_name || "Unknown"}{" "}
            {review.merchants?.store_slug && (
              <span className="text-slate-400">/s/{review.merchants.store_slug}</span>
            )}
          </p>
        </div>
        <AlertTriangle className={review.severity === "block" ? "text-red-600" : "text-amber-500"} size={22} />
      </div>

      <div className="mt-4 space-y-2">
        {review.reasons.map((reason) => (
          <p key={reason} className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
            {reason}
          </p>
        ))}
        {review.content_excerpt && (
          <p className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-500">
            {review.content_excerpt}
          </p>
        )}
      </div>

      <div className="mt-4 flex flex-wrap gap-2 text-xs text-slate-400">
        <span>{date}</span>
        <span>Store status: {review.merchants?.store_status || "unknown"}</span>
        {review.products && <span>Listing status: {review.products.moderation_status}</span>}
      </div>

      {review.admin_notes && (
        <p className="mt-3 rounded-2xl bg-blue-50 px-3 py-2 text-xs font-medium text-blue-700">
          Admin: {review.admin_notes}
        </p>
      )}

      {active && <SafetyActions reviewId={review.id} hasProduct={Boolean(review.product_id)} />}
    </div>
  );
}
