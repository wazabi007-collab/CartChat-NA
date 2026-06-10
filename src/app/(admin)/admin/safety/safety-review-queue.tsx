"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, CheckSquare, Loader2, Square } from "lucide-react";
import { SafetyActions } from "./safety-actions";

export interface SafetyReview {
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

export function SafetyReviewQueue({ reviews }: { reviews: SafetyReview[] }) {
  const router = useRouter();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState<"selected" | "all" | null>(null);

  const eligibleReviewIds = useMemo(
    () => reviews
      .filter((review) => review.product_id && review.severity === "review")
      .map((review) => review.id),
    [reviews]
  );
  const selectedEligibleIds = eligibleReviewIds.filter((id) => selectedIds.has(id));
  const allEligibleSelected = eligibleReviewIds.length > 0 && selectedEligibleIds.length === eligibleReviewIds.length;

  function toggleSelected(reviewId: string) {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(reviewId)) next.delete(reviewId);
      else next.add(reviewId);
      return next;
    });
  }

  function toggleAllEligible() {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (allEligibleSelected) {
        eligibleReviewIds.forEach((id) => next.delete(id));
      } else {
        eligibleReviewIds.forEach((id) => next.add(id));
      }
      return next;
    });
  }

  async function approveBatch(scope: "selected" | "all") {
    const reviewIds = scope === "selected" ? selectedEligibleIds : eligibleReviewIds;
    if (reviewIds.length === 0) return;

    const confirmed = window.confirm(
      scope === "all"
        ? `Approve all ${reviewIds.length} open listing reviews? Approved listings will become visible and available to buyers.`
        : `Approve ${reviewIds.length} selected listing review${reviewIds.length === 1 ? "" : "s"}? Approved listings will become visible and available to buyers.`
    );
    if (!confirmed) return;

    setLoading(scope);
    const response = await fetch("/api/admin/safety", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status: "reviewed",
        productStatus: "approved",
        adminNotes: scope === "all" ? "Batch approved all open listing reviews" : "Batch approved selected listing reviews",
        ...(scope === "all" ? { approveAllOpenListingReviews: true } : { reviewIds }),
      }),
    });

    setLoading(null);
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      alert(body.error || "Failed to approve listing reviews");
      return;
    }

    setSelectedIds(new Set());
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm shadow-slate-900/5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-black text-slate-950">Batch approval</p>
            <p className="mt-1 text-sm text-slate-500">
              {eligibleReviewIds.length} open listing review{eligibleReviewIds.length === 1 ? "" : "s"} can be approved in bulk.
              Hard-blocked items stay manual-only.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={toggleAllEligible}
              className="inline-flex min-h-11 items-center gap-2 rounded-2xl border border-slate-200 px-4 text-sm font-black text-slate-700 transition hover:bg-slate-50"
            >
              {allEligibleSelected ? <CheckSquare size={16} /> : <Square size={16} />}
              {allEligibleSelected ? "Clear selection" : "Select all"}
            </button>
            <button
              type="button"
              onClick={() => approveBatch("selected")}
              disabled={selectedEligibleIds.length === 0 || loading !== null}
              className="inline-flex min-h-11 items-center gap-2 rounded-2xl bg-emerald-600 px-4 text-sm font-black text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading === "selected" && <Loader2 size={16} className="animate-spin" />}
              Approve selected ({selectedEligibleIds.length})
            </button>
            <button
              type="button"
              onClick={() => approveBatch("all")}
              disabled={eligibleReviewIds.length === 0 || loading !== null}
              className="inline-flex min-h-11 items-center gap-2 rounded-2xl bg-slate-950 px-4 text-sm font-black text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading === "all" && <Loader2 size={16} className="animate-spin" />}
              Approve all open
            </button>
          </div>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        {reviews.map((review) => {
          const selectable = Boolean(review.product_id && review.severity === "review");
          return (
            <SafetyReviewCard
              key={review.id}
              review={review}
              active
              selectable={selectable}
              selected={selectedIds.has(review.id)}
              onToggleSelected={selectable ? () => toggleSelected(review.id) : undefined}
            />
          );
        })}
      </div>
    </div>
  );
}

export function SafetyReviewCard({
  review,
  active = false,
  selectable = false,
  selected = false,
  onToggleSelected,
}: {
  review: SafetyReview;
  active?: boolean;
  selectable?: boolean;
  selected?: boolean;
  onToggleSelected?: () => void;
}) {
  const date = new Date(review.created_at).toLocaleDateString("en-NA", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className={`rounded-3xl border bg-white p-5 shadow-sm shadow-slate-900/5 ${selected ? "border-emerald-300 ring-4 ring-emerald-100" : "border-slate-200"}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            {selectable && (
              <button
                type="button"
                onClick={onToggleSelected}
                className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-black transition ${selected ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
              >
                {selected ? <CheckSquare size={14} /> : <Square size={14} />}
                {selected ? "Selected" : "Select"}
              </button>
            )}
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
