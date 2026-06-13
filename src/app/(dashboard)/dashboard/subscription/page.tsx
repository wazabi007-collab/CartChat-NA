import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { redirect } from "next/navigation";
import Link from "next/link";
import { CreditCard } from "lucide-react";
import { getPaymentMethodLabel } from "@/lib/constants";
import {
  TIER_LIMITS,
  TIER_LABELS,
  STATUS_LABELS,
  formatTierPrice,
  type SubscriptionTier,
  type SubscriptionStatus,
} from "@/lib/tier-limits";
import { PUBLIC_PLANS } from "@/lib/plans";
import { QuotaRow } from "@/components/dashboard/quota-row";
import { SubscriptionActions } from "./subscription-actions";

const TIER_RANK: Record<SubscriptionTier, number> = {
  oshi_start: 0,
  oshi_basic: 1,
  oshi_grow: 2,
  oshi_pro: 3,
};

const SUPPORT_WHATSAPP = "264816274823";

function formatDate(value: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-NA", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default async function SubscriptionPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const service = createServiceClient();

  const { data: merchant } = await service
    .from("merchants")
    .select("id, store_name")
    .eq("user_id", user.id)
    .single();
  if (!merchant) redirect("/dashboard/setup");

  const { data: sub } = await service
    .from("subscriptions")
    .select(
      "tier, status, trial_ends_at, current_period_end, grace_ends_at, cancel_at_period_end"
    )
    .eq("merchant_id", merchant.id)
    .single();

  const tier = (sub?.tier ?? "oshi_start") as SubscriptionTier;
  const status = (sub?.status ?? "trial") as SubscriptionStatus;
  const cancelling = Boolean(sub?.cancel_at_period_end);
  const limits = TIER_LIMITS[tier];
  const statusInfo = STATUS_LABELS[status];

  const { count: productCount } = await service
    .from("products")
    .select("id", { count: "exact", head: true })
    .eq("merchant_id", merchant.id);

  let monthlyOrderCount = 0;
  if (limits.orders_per_month !== -1) {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    const { count } = await service
      .from("orders")
      .select("id", { count: "exact", head: true })
      .eq("merchant_id", merchant.id)
      .gte("created_at", startOfMonth.toISOString());
    monthlyOrderCount = count || 0;
  }

  const { data: payments } = await service
    .from("payments")
    .select("id, amount_nad, payment_method, period_start, period_end, created_at")
    .eq("merchant_id", merchant.id)
    .is("voided_at", null)
    .order("created_at", { ascending: false });

  const periodEndLabel = formatDate(sub?.current_period_end ?? null);

  let dateLine: string;
  if (status === "trial") {
    dateLine = `Free trial ends ${formatDate(sub?.trial_ends_at ?? null)}`;
  } else if (status === "active") {
    dateLine = cancelling ? `Ends ${periodEndLabel}` : `Renews ${periodEndLabel}`;
  } else if (status === "grace") {
    dateLine = `Payment overdue — store pauses ${formatDate(sub?.grace_ends_at ?? null)}`;
  } else {
    dateLine = "Suspended — reactivate to reopen your store";
  }

  const upgradeTargets = PUBLIC_PLANS.filter(
    (p) => TIER_RANK[p.tier] > TIER_RANK[tier]
  );
  const isSuspended = status === "soft_suspended" || status === "hard_suspended";
  const canCancel = status === "active" || status === "grace";

  return (
    <div className="md:ml-56 space-y-6">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-acacia">
          Billing
        </p>
        <h1 className="mt-2 text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">
          Subscription
        </h1>
      </div>

      {cancelling && status === "active" && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          Your subscription is set to end on <strong>{periodEndLabel}</strong>.
          Your store will go offline after this date unless you resubscribe.
        </div>
      )}

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-900/5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-acacia-soft text-acacia">
                <CreditCard size={18} />
              </span>
              <h2 className="text-xl font-black text-slate-950">
                {TIER_LABELS[tier]}
              </h2>
              <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusInfo.color}`}>
                {statusInfo.label}
              </span>
            </div>
            <p className="mt-2 text-sm font-semibold text-slate-500">{dateLine}</p>
          </div>
          <p className="text-lg font-black text-slate-950">{formatTierPrice(tier)}</p>
        </div>

        <div className="mt-5 space-y-3 border-t border-slate-100 pt-5">
          <QuotaRow label="Products" used={productCount || 0} limit={limits.products} />
          <QuotaRow
            label="Orders this month"
            used={monthlyOrderCount}
            limit={limits.orders_per_month}
          />
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-900/5 sm:p-6">
        <h2 className="text-sm font-black uppercase tracking-wide text-slate-500">
          Manage plan
        </h2>
        <div className="mt-4 flex flex-wrap gap-3">
          {upgradeTargets.map((p) => (
            <Link
              key={p.tier}
              href={`/pricing/checkout?tier=${p.tier}`}
              className="inline-flex items-center justify-center rounded-lg bg-terracotta px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-[#234B86]"
            >
              {isSuspended ? "Reactivate as" : "Upgrade to"} {p.name} · {p.priceDisplay}
            </Link>
          ))}
          <a
            href={`https://wa.me/${SUPPORT_WHATSAPP}?text=${encodeURIComponent(
              `Hi OshiCart, I'd like to change my plan for my store "${merchant.store_name}".`
            )}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50"
          >
            Change or downgrade plan
          </a>
        </div>
        {canCancel && (
          <div className="mt-4 border-t border-slate-100 pt-4">
            <SubscriptionActions cancelling={cancelling} periodEndLabel={periodEndLabel} />
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-900/5 sm:p-6">
        <h2 className="text-sm font-black uppercase tracking-wide text-slate-500">
          Payment history
        </h2>
        {payments && payments.length > 0 ? (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-slate-400">
                  <th className="pb-2 font-bold">Date</th>
                  <th className="pb-2 font-bold">Amount</th>
                  <th className="pb-2 font-bold">Method</th>
                  <th className="pb-2 font-bold">Period</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {payments.map((p) => (
                  <tr key={p.id}>
                    <td className="py-2 text-slate-700">{formatDate(p.created_at)}</td>
                    <td className="py-2 font-semibold text-slate-900">
                      N${(p.amount_nad / 100).toLocaleString()}
                    </td>
                    <td className="py-2 text-slate-600">
                      {getPaymentMethodLabel(p.payment_method)}
                    </td>
                    <td className="py-2 text-slate-500">
                      {p.period_start && p.period_end
                        ? `${formatDate(p.period_start)} – ${formatDate(p.period_end)}`
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="mt-3 text-sm text-slate-500">No payments yet.</p>
        )}
      </div>
    </div>
  );
}
