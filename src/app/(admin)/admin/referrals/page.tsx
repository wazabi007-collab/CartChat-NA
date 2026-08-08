import { requireAdminPermission } from "@/lib/admin-auth";
import { createServiceClient } from "@/lib/supabase/service";
import { getReferralBounty, SITE_URL } from "@/lib/constants";
import { CreateReferrerForm, MarkPaidButton, ToggleReferrerButton } from "./referral-actions";

export default async function AdminReferralsPage() {
  await requireAdminPermission("manage_referrals");
  const supabase = createServiceClient();

  const [{ data: referrers }, { data: merchants }, { data: payouts }] = await Promise.all([
    supabase.from("referrers").select("*").order("created_at", { ascending: false }),
    supabase
      .from("merchants")
      .select("id, store_name, store_slug, referred_by_code, subscriptions(tier, status, current_period_end)")
      .not("referred_by_code", "is", null),
    supabase.from("referral_payouts").select("*"),
  ]);

  const paidByMerchant = new Map((payouts || []).map((p) => [p.merchant_id, p]));

  const rows = (merchants || []).map((m) => {
    const sub = Array.isArray(m.subscriptions) ? m.subscriptions[0] : m.subscriptions;
    const tier = sub?.tier ?? "oshi_start";
    const status = sub?.status ?? "trial";
    const isPaying = status === "active";
    const bounty = isPaying ? getReferralBounty(tier) : 0;
    const payout = paidByMerchant.get(m.id);
    return { ...m, tier, status, isPaying, bounty, payout, currentPeriodEnd: sub?.current_period_end ?? null };
  });

  // Per-referrer totals
  const totals = new Map<string, { paid: number; outstanding: number }>();
  for (const r of rows) {
    const t = totals.get(r.referred_by_code!) ?? { paid: 0, outstanding: 0 };
    if (r.payout) t.paid += r.payout.commission_nad;
    else if (r.isPaying) t.outstanding += r.bounty;
    totals.set(r.referred_by_code!, t);
  }

  const nad = (cents: number) => `N$${(cents / 100).toLocaleString()}`;
  const referrerNameByCode = new Map((referrers || []).map((r) => [r.code, r.name]));

  return (
    <div className="md:ml-56">
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Referrals</h1>
      <p className="text-sm text-slate-500 mb-6">
        Bounty is owed once a referred merchant is <b>paying</b>. Confirm they&apos;ve been paying ~30 days before you pay out, then record the reference.
      </p>

      {/* Referrers */}
      <section className="mb-8 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900 mb-3">Promoters</h2>
        <CreateReferrerForm />
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-slate-500">
              <tr><th className="py-2">Name</th><th>Share link</th><th>Payout</th><th>Paid</th><th>Outstanding</th><th>Status</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(referrers || []).map((r) => {
                const t = totals.get(r.code) ?? { paid: 0, outstanding: 0 };
                return (
                  <tr key={r.id}>
                    <td className="py-2 font-medium text-slate-900">{r.name}</td>
                    <td className="text-slate-600">{SITE_URL.replace(/^https?:\/\//, "")}/r/{r.code}</td>
                    <td className="text-slate-600">{r.payout_number || "—"}</td>
                    <td className="text-slate-600">{nad(t.paid)}</td>
                    <td className="font-semibold text-emerald-700">{nad(t.outstanding)}</td>
                    <td><ToggleReferrerButton referrerId={r.id} isActive={r.is_active} /></td>
                  </tr>
                );
              })}
              {(referrers || []).length === 0 && <tr><td colSpan={6} className="py-4 text-center text-slate-400">No promoters yet — add one above.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>

      {/* Referred merchants */}
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900 mb-3">Referred merchants ({rows.length})</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-slate-500">
              <tr><th className="py-2">Store</th><th>Referrer</th><th>Plan</th><th>Status</th><th>Renews</th><th>Bounty</th><th>Payout</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((r) => (
                <tr key={r.id}>
                  <td className="py-2 font-medium text-slate-900">{r.store_name}</td>
                  <td className="text-slate-600">{r.referred_by_code ? referrerNameByCode.get(r.referred_by_code) ?? r.referred_by_code : "—"}</td>
                  <td className="text-slate-600">{r.tier}</td>
                  <td className="text-slate-600">{r.status}</td>
                  <td className="text-slate-600">{r.isPaying && r.currentPeriodEnd ? new Date(r.currentPeriodEnd).toLocaleDateString() : "—"}</td>
                  <td className="text-slate-600">{r.isPaying ? nad(r.bounty) : "—"}</td>
                  <td>
                    {r.payout
                      ? <span className="text-xs text-emerald-700">Paid {nad(r.payout.commission_nad)}{r.payout.paid_reference ? ` · ${r.payout.paid_reference}` : ""}</span>
                      : r.isPaying && r.bounty > 0
                        ? <MarkPaidButton merchantId={r.id} referrerCode={r.referred_by_code!} commissionNad={r.bounty} />
                        : <span className="text-xs text-slate-400">not eligible</span>}
                  </td>
                </tr>
              ))}
              {rows.length === 0 && <tr><td colSpan={7} className="py-4 text-center text-slate-400">No referred merchants yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
