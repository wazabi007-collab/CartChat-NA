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
  order_number: number;
  created_at: string;
  customer_name: string;
  payment_method: string | null;
  status: string;
  subtotal_nad: number;
  discount_nad: number | null;
  delivery_fee_nad: number | null;
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
 * VAT-inclusive pricing already contains the VAT in the line items, so it is
 * not added again — adding it would overstate every VAT-inclusive merchant's
 * turnover by 15%.
 */
export function orderTotal(order: StatementOrder): number {
  const preVat =
    order.subtotal_nad - (order.discount_nad ?? 0) + (order.delivery_fee_nad ?? 0);

  if (order.vat_inclusive) return preVat;
  return preVat + (order.vat_nad ?? 0);
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

/** CSV of every order in the period, for a bookkeeper or a spreadsheet. */
export function statementToCsv(orders: StatementOrder[]): string {
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
  ];

  const escape = (value: string): string =>
    /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;

  const money = (cents: number): string => (cents / 100).toFixed(2);

  const rows = orders.map((order) =>
    [
      order.created_at.slice(0, 10),
      String(order.order_number),
      escape(order.customer_name ?? ""),
      order.payment_method ?? "",
      order.status,
      money(order.subtotal_nad),
      money(order.discount_nad ?? 0),
      money(order.delivery_fee_nad ?? 0),
      money(order.vat_nad ?? 0),
      money(orderTotal(order)),
    ].join(",")
  );

  return [header.join(","), ...rows].join("\n");
}
