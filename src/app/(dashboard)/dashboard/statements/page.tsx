import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { Lock, TrendingUp } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { formatPrice } from "@/lib/utils";
import { getPaymentMethodLabel, SITE_NAME } from "@/lib/constants";
import { VAT_RATE_LABEL } from "@/lib/vat";
import {
  namibianMonthKey,
  namibianMonthRange,
  namibianTrailingMonthsRange,
  recentNamibianMonths,
  formatNamibianDate,
} from "@/lib/date";
import {
  buildStatement,
  orderTotal,
  summarisePayments,
  summariseRefunds,
  summariseOutstanding,
  receivedByOrder,
  type StatementOrder,
  type OrderPayment,
  type OrderRefund,
} from "@/lib/statements";
import {
  hasStatements,
  hasAnnualStatement,
  TIER_LABELS,
  type SubscriptionTier,
} from "@/lib/tier-limits";
import { StatementControls } from "./statement-controls";

export const metadata: Metadata = {
  title: "Statements",
};

interface Props {
  searchParams: Promise<{ period?: string }>;
}

const STATUS_LABELS: Record<string, string> = {
  pending: "Awaiting payment",
  confirmed: "Confirmed",
  ready: "Ready",
  completed: "Completed",
};

export default async function StatementsPage({ searchParams }: Props) {
  const { period } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: merchant } = await supabase
    .from("merchants")
    .select("id, store_name, vat_number, town")
    .eq("user_id", user.id)
    .single();

  if (!merchant) redirect("/dashboard/setup");

  const { data: subscription } = await supabase
    .from("subscriptions")
    .select("tier")
    .eq("merchant_id", merchant.id)
    .maybeSingle();

  const tier = (subscription?.tier ?? "oshi_start") as SubscriptionTier;

  if (!hasStatements(tier)) {
    return (
      <div className="md:ml-56">
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <span className="mx-auto mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
            <Lock size={22} />
          </span>
          <h1 className="text-xl font-black text-slate-950">
            Statements are on Oshi-Automate and Oshi-Pro
          </h1>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
            Pull a monthly statement of every order with VAT totals and a
            spreadsheet export — the record your bookkeeper or accountant needs.
            You&apos;re on {TIER_LABELS[tier]}.
          </p>
          <Link
            href="/dashboard/subscription"
            className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-xl bg-acacia px-5 text-sm font-black text-white transition-colors hover:bg-green-700"
          >
            <TrendingUp size={16} />
            See plans
          </Link>
        </div>
      </div>
    );
  }

  const months = recentNamibianMonths(12);
  const canPullYear = hasAnnualStatement(tier);

  // Oshi-Pro can pull twelve months as one document for a year-end. The range
  // covers whole months ending with the current one, so the annual totals
  // equal the twelve monthly statements a merchant may already have filed.
  const wantsYear = period === "last12" && canPullYear;
  const selected = wantsYear
    ? namibianMonthKey()
    : period && months.includes(period)
    ? period
    : namibianMonthKey();

  const { startISO, endISO } = wantsYear
    ? namibianTrailingMonthsRange(12, selected)
    : namibianMonthRange(selected);

  // Service role: statements are financial records and must include every
  // order in the period regardless of row-level visibility.
  const { data: orderRows } = await createServiceClient()
    .from("orders")
    .select(
      "id, order_number, created_at, customer_name, payment_method, status, subtotal_nad, discount_nad, delivery_fee_nad, callout_fee_nad, deposit_nad, vat_nad, vat_inclusive"
    )
    .eq("merchant_id", merchant.id)
    .gte("created_at", startISO)
    .lt("created_at", endISO)
    .order("created_at", { ascending: true });

  const orders = (orderRows ?? []) as StatementOrder[];
  const statement = buildStatement(orders);

  // Two different questions, and merchants need both:
  //  - what was invoiced this month (the orders above)
  //  - what money actually arrived this month (below)
  // A September payment can settle an August order, so payments are selected by
  // paid_at, not by the order's date. This is the figure that matches the bank.
  const service = createServiceClient();
  const { data: paymentRows } = await service
    .from("order_payments")
    .select("order_id, amount_nad, paid_at, method, voided_at")
    .eq("merchant_id", merchant.id)
    .is("voided_at", null)
    .gte("paid_at", startISO.slice(0, 10))
    .lt("paid_at", endISO.slice(0, 10));

  const periodPayments = (paymentRows ?? []) as OrderPayment[];
  const receipts = summarisePayments(periodPayments);

  // Refunds mirror payments: selected by the bank-statement date they left,
  // so "went back to customers" also matches the bank for the period.
  const { data: refundRows } = await service
    .from("order_refunds")
    .select("order_id, amount_nad, refunded_at, method, voided_at")
    .eq("merchant_id", merchant.id)
    .is("voided_at", null)
    .gte("refunded_at", startISO.slice(0, 10))
    .lt("refunded_at", endISO.slice(0, 10));

  const periodRefunds = (refundRows ?? []) as OrderRefund[];
  const refundsOut = summariseRefunds(periodRefunds);

  // Outstanding is measured against this month's orders, so it needs every
  // payment for them, including ones made in a later month.
  const { data: allOrderPayments } = await service
    .from("order_payments")
    .select("order_id, amount_nad, paid_at, method, voided_at")
    .eq("merchant_id", merchant.id)
    .is("voided_at", null)
    .in("order_id", orders.length > 0 ? orders.map((o) => o.id) : ["none"]);

  const orderPayments = (allOrderPayments ?? []) as OrderPayment[];

  const { data: allOrderRefunds } = await service
    .from("order_refunds")
    .select("order_id, amount_nad, refunded_at, method, voided_at")
    .eq("merchant_id", merchant.id)
    .is("voided_at", null)
    .in("order_id", orders.length > 0 ? orders.map((o) => o.id) : ["none"]);

  const orderRefunds = (allOrderRefunds ?? []) as OrderRefund[];
  const owed = summariseOutstanding(orders, orderPayments, orderRefunds);
  const receivedPerOrder = receivedByOrder(orderPayments);

  const monthLabel = new Date(`${selected}-01T00:00:00+02:00`).toLocaleDateString("en-GB", {
    month: "long",
    year: "numeric",
    timeZone: "Africa/Windhoek",
  });
  const periodLabel = wantsYear
    ? `${formatNamibianDate(startISO, { month: "long", year: "numeric" })} — ${monthLabel}`
    : monthLabel;

  return (
    <div className="md:ml-56 space-y-6">
      <div className="print:hidden">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-acacia">
          Bookkeeping
        </p>
        <h1 className="mt-2 text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">
          Statements
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
          A month-by-month record of every order, with VAT totals for your
          return. Print it or download the spreadsheet for your bookkeeper.
        </p>
      </div>

      <StatementControls
        months={months}
        selected={wantsYear ? "last12" : selected}
        canPullYear={canPullYear}
        storeName={merchant.store_name}
        orders={orders}
        payments={orderPayments}
        refunds={orderRefunds}
      />

      {/* The statement document — styled to match the customer invoice. */}
      <article className="rounded border border-slate-200 bg-white p-6 shadow-sm sm:p-10 print:rounded-none print:border-0 print:p-0 print:shadow-none">
        <header className="flex flex-wrap items-start justify-between gap-6 border-b-2 border-slate-900 pb-6">
          <div>
            <h2 className="text-lg font-bold tracking-tight text-slate-950">
              {merchant.store_name}
            </h2>
            <p className="mt-1 text-sm leading-relaxed text-slate-500">
              {merchant.town && (
                <span className="block capitalize">
                  {merchant.town.replace(/_/g, " ")}, Namibia
                </span>
              )}
              {merchant.vat_number && <span className="block">VAT No. {merchant.vat_number}</span>}
            </p>
          </div>
          <div className="ml-auto text-right">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">
              Statement
            </p>
            <p className="mt-0.5 text-2xl font-extrabold tracking-tight text-slate-950">
              {periodLabel}
            </p>
            <p className="mt-1 text-sm text-slate-400">
              Generated {formatNamibianDate(new Date(), { day: "numeric", month: "long", year: "numeric" })}
            </p>
          </div>
        </header>

        {/* Summary */}
        <section className="grid gap-4 border-b border-slate-200 py-6 sm:grid-cols-2 lg:grid-cols-4">
          <Figure label="Orders" value={String(statement.totals.orderCount)} />
          <Figure label="Sales excl. VAT" value={formatPrice(statement.totals.excludingVat)} />
          <Figure label={`VAT (${VAT_RATE_LABEL})`} value={formatPrice(statement.totals.vat)} />
          <Figure label="Total invoiced" value={formatPrice(statement.totals.total)} strong />
        </section>

        {/* Reconciliation — what actually arrived, against what is still owed. */}
        <section className="grid gap-4 border-b border-slate-200 py-6 sm:grid-cols-3">
          <Figure
            label={`Received in ${periodLabel}`}
            value={formatPrice(receipts.total)}
            strong
          />
          {refundsOut.total > 0 && (
            <Figure
              label={`Refunded in ${periodLabel}`}
              value={`− ${formatPrice(refundsOut.total)}`}
            />
          )}
          <Figure
            label="Still outstanding"
            value={formatPrice(owed.outstanding)}
          />
          <Figure
            label="Unpaid orders"
            value={String(owed.unpaidOrders)}
          />
          <p className="text-xs leading-5 text-slate-400 sm:col-span-3">
            Received counts payments dated in {periodLabel}, whichever month the
            order was placed — that is the figure to compare with your bank.
            {refundsOut.total > 0 && (
              <>
                {" "}Net of refunds, {formatPrice(receipts.total - refundsOut.total)} stayed with
                you.
              </>
            )}
            Outstanding is what these {periodLabel} orders still owe, including
            anything paid later.
            {owed.overpaid > 0 && (
              <>
                {" "}
                <strong className="text-amber-700">
                  {formatPrice(owed.overpaid)} received above the invoiced
                  amount — worth checking for a keying error.
                </strong>
              </>
            )}
          </p>
        </section>

        {orders.length === 0 ? (
          <p className="py-10 text-center text-sm text-slate-400">
            No orders in {periodLabel}.
          </p>
        ) : (
          <>
            <div className="grid gap-6 border-b border-slate-200 py-6 md:grid-cols-2">
              <Breakdown
                title="By status"
                rows={statement.byStatus.map((g) => ({
                  label: STATUS_LABELS[g.key] ?? g.key,
                  count: g.orderCount,
                  total: g.total,
                }))}
              />
              <Breakdown
                title="By payment method"
                rows={statement.byPaymentMethod.map((g) => ({
                  label: g.key === "unknown" ? "Not recorded" : getPaymentMethodLabel(g.key),
                  count: g.orderCount,
                  total: g.total,
                }))}
              />
            </div>

            {/* Reconciliation totals */}
            <section className="border-b border-slate-200 py-6">
              <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">
                Totals
              </p>
              <dl className="ml-auto grid max-w-sm grid-cols-[1fr_auto] gap-x-6 gap-y-2 text-sm">
                <dt className="text-slate-500">Gross sales</dt>
                <dd className="text-right tabular-nums text-slate-900">
                  {formatPrice(statement.totals.grossSales)}
                </dd>
                <dt className="text-acacia">Discounts</dt>
                <dd className="text-right tabular-nums text-acacia">
                  −{formatPrice(statement.totals.discounts)}
                </dd>
                <dt className="text-slate-500">Delivery</dt>
                <dd className="text-right tabular-nums text-slate-900">
                  {formatPrice(statement.totals.delivery)}
                </dd>
                <dt className="text-slate-500">VAT ({VAT_RATE_LABEL})</dt>
                <dd className="text-right tabular-nums text-slate-900">
                  {formatPrice(statement.totals.vat)}
                </dd>
                <div className="col-span-2 mt-1 flex items-baseline justify-between gap-6 border-t-2 border-slate-900 pt-3">
                  <dt className="text-[15px] font-bold text-slate-950">Total invoiced</dt>
                  <dd className="text-[20px] font-extrabold tabular-nums text-slate-950">
                    {formatPrice(statement.totals.total)}
                  </dd>
                </div>
                {statement.cancelled.orderCount > 0 && (
                  <p className="col-span-2 mt-2 text-right text-xs text-slate-400">
                    Excludes {statement.cancelled.orderCount} cancelled order
                    {statement.cancelled.orderCount === 1 ? "" : "s"} worth{" "}
                    {formatPrice(statement.cancelled.total)}.
                  </p>
                )}
              </dl>
            </section>

            {/* Every order */}
            <div className="overflow-x-auto">
              <table className="mt-6 w-full min-w-[620px] text-sm">
                <caption className="mb-0 text-left text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">
                  Orders
                </caption>
                <thead>
                  <tr>
                    <Th>Date</Th>
                    <Th>Order</Th>
                    <Th>Customer</Th>
                    <Th>Method</Th>
                    <Th>Status</Th>
                    <Th align="right">VAT</Th>
                    <Th align="right">Total</Th>
                    <Th align="right">Received</Th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((order) => {
                    const isCancelled = order.status === "cancelled";
                    return (
                      <tr key={order.order_number} className={isCancelled ? "text-slate-400" : ""}>
                        <Td>{formatNamibianDate(order.created_at, { day: "2-digit", month: "short" })}</Td>
                        <Td>#{order.order_number}</Td>
                        <Td>{order.customer_name}</Td>
                        <Td>
                          {order.payment_method
                            ? getPaymentMethodLabel(order.payment_method)
                            : "—"}
                        </Td>
                        <Td>{isCancelled ? "Cancelled" : STATUS_LABELS[order.status] ?? order.status}</Td>
                        <Td align="right">{formatPrice(order.vat_nad ?? 0)}</Td>
                        <Td align="right" strong={!isCancelled}>
                          {formatPrice(orderTotal(order))}
                        </Td>
                        <Td align="right">
                          {isCancelled
                            ? "—"
                            : formatPrice(receivedPerOrder.get(order.id) ?? 0)}
                        </Td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}

        <footer className="mt-8 border-t border-slate-200 pt-4 text-[12.5px] text-slate-400">
          <p>
            Generated by {SITE_NAME}. Received figures come from payments you
            recorded against orders, so they are only as complete as your
            record-keeping — check them against your bank before filing.
          </p>
        </footer>
      </article>
    </div>
  );
}

function Figure({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
      <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-slate-400">{label}</p>
      <p
        className={`mt-1.5 tabular-nums text-slate-950 ${
          strong ? "text-xl font-extrabold" : "text-lg font-bold"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function Breakdown({
  title,
  rows,
}: {
  title: string;
  rows: { label: string; count: number; total: number }[];
}) {
  return (
    <div>
      <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">
        {title}
      </p>
      <dl className="space-y-2 text-sm">
        {rows.map((row) => (
          <div key={row.label} className="flex items-baseline justify-between gap-4">
            <dt className="text-slate-600">
              {row.label}{" "}
              <span className="text-slate-400">
                ({row.count})
              </span>
            </dt>
            <dd className="tabular-nums font-semibold text-slate-900">
              {formatPrice(row.total)}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function Th({ children, align }: { children: React.ReactNode; align?: "right" }) {
  return (
    <th
      scope="col"
      className={`border-b border-slate-300 pb-2.5 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400 ${
        align === "right" ? "pl-3 text-right" : "pr-4 text-left"
      }`}
    >
      {children}
    </th>
  );
}

function Td({
  children,
  align,
  strong,
}: {
  children: React.ReactNode;
  align?: "right";
  strong?: boolean;
}) {
  return (
    <td
      className={`border-b border-slate-200 py-2.5 align-top ${
        align === "right" ? "pl-3 text-right tabular-nums" : "pr-4"
      } ${strong ? "font-semibold text-slate-900" : ""}`}
    >
      {children}
    </td>
  );
}
