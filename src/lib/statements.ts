import { getOrderPayableTotal } from "@/lib/vat";

/**
 * Merchant statements — the arithmetic.
 *
 * Kept free of Supabase and React so the money can actually be tested; see
 * scripts/check-statements.ts.
 *
 * The governing rule: a statement total must equal the sum of the invoices
 * behind it. orderTotal() therefore reproduces the invoice's calculation
 * exactly rather than deriving its own, because a statement that disagrees with
 * the invoices a merchant already sent to customers is worse than no statement.
 */

export interface StatementOrder {
  id: string;
  order_number: number;
  created_at: string;
  customer_name: string;
  payment_method: string | null;
  status: string;
  subtotal_nad: number;
  discount_nad: number | null;
  delivery_fee_nad: number | null;
  callout_fee_nad?: number | null;
  vat_nad: number | null;
  vat_inclusive: boolean | null;
}

export interface StatementTotals {
  orderCount: number;
  /** Sum of line items before discount and delivery. */
  grossSales: number;
  discounts: number;
  delivery: number;
  vat: number;
  /** What the customer owes — the invoice total. */
  total: number;
  /** total minus VAT, which is the figure a bookkeeper posts as income. */
  excludingVat: number;
}

export interface StatementGroup {
  key: string;
  orderCount: number;
  total: number;
}

export interface Statement {
  /** Everything except cancelled orders. */
  totals: StatementTotals;
  /** Shown separately so the merchant can see what fell away, not hidden. */
  cancelled: { orderCount: number; total: number };
  byStatus: StatementGroup[];
  byPaymentMethod: StatementGroup[];
}

/** Orders that never became a sale. Excluded from every total. */
const EXCLUDED_STATUSES = new Set(["cancelled"]);

/**
 * The invoice total for one order, in cents.
 *
 * Delegates to the shared helper rather than repeating the arithmetic. An
 * earlier version of this function reimplemented it and quietly disagreed:
 * getOrderBaseTotal floors the pre-VAT total at zero, so a coupon worth more
 * than the order shows as N$0 on the dashboard and the invoice, while the
 * local copy went negative and dragged the whole statement down with it.
 */
export function orderTotal(order: StatementOrder): number {
  return getOrderPayableTotal(order);
}

function emptyTotals(): StatementTotals {
  return {
    orderCount: 0,
    grossSales: 0,
    discounts: 0,
    delivery: 0,
    vat: 0,
    total: 0,
    excludingVat: 0,
  };
}

function sortGroups(groups: Map<string, StatementGroup>): StatementGroup[] {
  return [...groups.values()].sort((a, b) => b.total - a.total);
}

/** Build a statement from the orders in a period. */
export function buildStatement(orders: StatementOrder[]): Statement {
  const totals = emptyTotals();
  const cancelled = { orderCount: 0, total: 0 };
  const byStatus = new Map<string, StatementGroup>();
  const byPaymentMethod = new Map<string, StatementGroup>();

  for (const order of orders) {
    const total = orderTotal(order);

    if (EXCLUDED_STATUSES.has(order.status)) {
      cancelled.orderCount += 1;
      cancelled.total += total;
      continue;
    }

    const vat = order.vat_nad ?? 0;

    totals.orderCount += 1;
    totals.grossSales += order.subtotal_nad;
    totals.discounts += order.discount_nad ?? 0;
    totals.delivery += order.delivery_fee_nad ?? 0;
    totals.vat += vat;
    totals.total += total;
    totals.excludingVat += total - vat;

    const status = byStatus.get(order.status) ?? {
      key: order.status,
      orderCount: 0,
      total: 0,
    };
    status.orderCount += 1;
    status.total += total;
    byStatus.set(order.status, status);

    // Orders placed before a method was recorded still have to appear, or the
    // payment breakdown would not add up to the statement total.
    const methodKey = order.payment_method || "unknown";
    const method = byPaymentMethod.get(methodKey) ?? {
      key: methodKey,
      orderCount: 0,
      total: 0,
    };
    method.orderCount += 1;
    method.total += total;
    byPaymentMethod.set(methodKey, method);
  }

  return {
    totals,
    cancelled,
    byStatus: sortGroups(byStatus),
    byPaymentMethod: sortGroups(byPaymentMethod),
  };
}

// ---------------------------------------------------------------------------
// Payments received
// ---------------------------------------------------------------------------

export interface OrderPayment {
  order_id: string;
  amount_nad: number;
  /** YYYY-MM-DD — the day the money landed, from the merchant's bank. */
  paid_at: string;
  method: string | null;
  voided_at: string | null;
}

/** How an order stands once payments are counted. */
export type PaymentState = "unpaid" | "part" | "paid" | "over";

export interface PaymentsSummary {
  count: number;
  total: number;
  byMethod: StatementGroup[];
}

/** Voided payments are mistakes the merchant reversed; they never count. */
function live(payments: OrderPayment[]): OrderPayment[] {
  return payments.filter((p) => !p.voided_at);
}

/** Total received per order id. */
export function receivedByOrder(payments: OrderPayment[]): Map<string, number> {
  const totals = new Map<string, number>();
  for (const payment of live(payments)) {
    totals.set(payment.order_id, (totals.get(payment.order_id) ?? 0) + payment.amount_nad);
  }
  return totals;
}

export function paymentState(total: number, received: number): PaymentState {
  if (received <= 0) return "unpaid";
  if (received < total) return "part";
  if (received > total) return "over";
  return "paid";
}

/**
 * What actually arrived in the period.
 *
 * Summed by `paid_at`, deliberately independent of when the orders were placed:
 * a September payment can settle an August order. Grouping payments by order
 * date instead is why a statement would never match a bank statement.
 */
export function summarisePayments(payments: OrderPayment[]): PaymentsSummary {
  const byMethod = new Map<string, StatementGroup>();
  let total = 0;
  let count = 0;

  for (const payment of live(payments)) {
    total += payment.amount_nad;
    count += 1;

    const key = payment.method || "unknown";
    const group = byMethod.get(key) ?? { key, orderCount: 0, total: 0 };
    group.orderCount += 1;
    group.total += payment.amount_nad;
    byMethod.set(key, group);
  }

  return { count, total, byMethod: sortGroups(byMethod) };
}

export interface OutstandingSummary {
  /** Still owed across the period's orders. */
  outstanding: number;
  /** Received beyond the invoice total — usually a keying error worth seeing. */
  overpaid: number;
  unpaidOrders: number;
}

/** Outstanding balance across a period's orders, ignoring cancelled ones. */
export function summariseOutstanding(
  orders: StatementOrder[],
  payments: OrderPayment[]
): OutstandingSummary {
  const received = receivedByOrder(payments);
  let outstanding = 0;
  let overpaid = 0;
  let unpaidOrders = 0;

  for (const order of orders) {
    if (EXCLUDED_STATUSES.has(order.status)) continue;

    const total = orderTotal(order);
    const paid = received.get(order.id) ?? 0;

    if (paid < total) {
      outstanding += total - paid;
      unpaidOrders += 1;
    } else if (paid > total) {
      overpaid += paid - total;
    }
  }

  return { outstanding, overpaid, unpaidOrders };
}

/** CSV of every order in the period, for a bookkeeper or a spreadsheet. */
export function statementToCsv(
  orders: StatementOrder[],
  payments: OrderPayment[] = []
): string {
  const received = receivedByOrder(payments);

  const header = [
    "Date",
    "Order",
    "Customer",
    "Payment method",
    "Status",
    "Subtotal",
    "Discount",
    "Delivery",
    "VAT",
    "Total",
    "Received",
    "Outstanding",
  ];

  const escape = (value: string): string =>
    /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;

  const money = (cents: number): string => (cents / 100).toFixed(2);

  const rows = orders.map((order) => {
    const total = orderTotal(order);
    const paid = received.get(order.id) ?? 0;

    return [
      order.created_at.slice(0, 10),
      String(order.order_number),
      escape(order.customer_name ?? ""),
      order.payment_method ?? "",
      order.status,
      money(order.subtotal_nad),
      money(order.discount_nad ?? 0),
      money(order.delivery_fee_nad ?? 0),
      money(order.vat_nad ?? 0),
      money(total),
      money(paid),
      money(Math.max(0, total - paid)),
    ].join(",");
  });

  return [header.join(","), ...rows].join("\n");
}
