/**
 * Checks for the merchant statement arithmetic.
 *
 * These figures go to accountants and get compared against bank statements, so
 * the VAT-inclusive vs exclusive split and the treatment of cancelled orders
 * are pinned down here. Run after touching src/lib/statements.ts:
 *
 *   npx tsx scripts/check-statements.ts
 */
import { getOrderPayableTotal } from "../src/lib/vat";
import {
  orderTotal,
  buildStatement,
  statementToCsv,
  receivedByOrder,
  paymentState,
  summarisePayments,
  summariseOutstanding,
  type StatementOrder,
  type OrderPayment,
} from "../src/lib/statements";

let failures = 0;

function check(name: string, actual: unknown, expected: unknown) {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a === e) {
    console.log(`ok   ${name}`);
    return;
  }
  failures++;
  console.log(`FAIL ${name}\n  got      ${a}\n  expected ${e}`);
}

function order(over: Partial<StatementOrder> = {}): StatementOrder {
  return {
    id: `order-${over.order_number ?? 1}`,
    order_number: 1,
    created_at: "2026-08-07T09:00:00+00:00",
    customer_name: "Test Customer",
    payment_method: "eft",
    status: "completed",
    subtotal_nad: 10000,
    discount_nad: 0,
    delivery_fee_nad: 0,
    vat_nad: 0,
    vat_inclusive: false,
    ...over,
  };
}

// --- orderTotal must match the invoice exactly ---------------------------

check("plain order", orderTotal(order()), 10000);
check(
  "discount and delivery",
  orderTotal(order({ subtotal_nad: 10000, discount_nad: 1500, delivery_fee_nad: 3000 })),
  11500
);

// VAT-exclusive: VAT is added on top.
check(
  "vat exclusive adds vat",
  orderTotal(order({ subtotal_nad: 29332, vat_nad: 4400, vat_inclusive: false })),
  33732
);

// VAT-inclusive: the VAT already sits inside the line items. Adding it again
// would overstate every inclusive merchant's turnover by 15%.
check(
  "vat inclusive does not double count",
  orderTotal(order({ subtotal_nad: 62850, vat_nad: 8198, vat_inclusive: true })),
  62850
);

check(
  "null money fields are treated as zero",
  orderTotal(order({ discount_nad: null, delivery_fee_nad: null, vat_nad: null })),
  10000
);

// A coupon worth more than the order floors at zero rather than going negative.
// The dashboard and invoice both floor it, so a statement that did not would
// drag the month's total below what the merchant actually invoiced.
check(
  "discount larger than the order floors at zero",
  orderTotal(order({ subtotal_nad: 5000, delivery_fee_nad: 0, discount_nad: 9000 })),
  0
);

// Must agree with the shared helper the dashboard and admin analytics use.
check(
  "matches getOrderPayableTotal",
  orderTotal(order({ subtotal_nad: 29332, vat_nad: 4400, vat_inclusive: false })),
  getOrderPayableTotal({
    subtotal_nad: 29332,
    delivery_fee_nad: 0,
    discount_nad: 0,
    vat_nad: 4400,
    vat_inclusive: false,
  })
);

// --- Statement totals ----------------------------------------------------

const period: StatementOrder[] = [
  order({ order_number: 1, status: "completed", payment_method: "eft", subtotal_nad: 20000, vat_nad: 3000 }),
  order({ order_number: 2, status: "completed", payment_method: "cod", subtotal_nad: 10000, delivery_fee_nad: 3000, vat_nad: 1950 }),
  order({ order_number: 3, status: "pending", payment_method: "eft", subtotal_nad: 5000, vat_nad: 750 }),
  order({ order_number: 4, status: "cancelled", payment_method: "eft", subtotal_nad: 99999, vat_nad: 15000 }),
];

const statement = buildStatement(period);

// Cancelled is excluded from every total — the same rule the order quota uses.
check("cancelled excluded from count", statement.totals.orderCount, 3);
check("cancelled reported separately", statement.cancelled, { orderCount: 1, total: 114999 });

check("gross sales", statement.totals.grossSales, 35000);
check("delivery", statement.totals.delivery, 3000);
check("vat", statement.totals.vat, 5700);
check("total", statement.totals.total, 43700);
// The figure a bookkeeper posts as income.
check("excluding vat", statement.totals.excludingVat, 38000);

// The breakdowns must reconcile to the same total, or the statement
// contradicts itself in front of an accountant.
check(
  "status breakdown sums to total",
  statement.byStatus.reduce((sum, g) => sum + g.total, 0),
  statement.totals.total
);
check(
  "payment breakdown sums to total",
  statement.byPaymentMethod.reduce((sum, g) => sum + g.total, 0),
  statement.totals.total
);

check("grouped by status", statement.byStatus.map((g) => [g.key, g.orderCount]), [
  ["completed", 2],
  ["pending", 1],
]);

// An order with no recorded method must still appear, or the payment
// breakdown stops adding up.
const withUnknown = buildStatement([order({ payment_method: null, subtotal_nad: 5000 })]);
check("null payment method kept", withUnknown.byPaymentMethod, [
  { key: "unknown", orderCount: 1, total: 5000 },
]);

check("empty period", buildStatement([]).totals.total, 0);

// --- CSV -----------------------------------------------------------------

const csv = statementToCsv([
  order({ order_number: 7, customer_name: 'Anna "AJ" Shipanga', subtotal_nad: 29332, vat_nad: 4400 }),
]);
const csvLines = csv.split("\n");
check("csv has a header and one row", csvLines.length, 2);
check(
  "csv escapes quotes in names",
  csvLines[1],
  // No payments passed, so Received is 0.00 and the whole total is outstanding.
  '2026-08-07,7,"Anna ""AJ"" Shipanga",eft,completed,293.32,0.00,0.00,44.00,337.32,0.00,337.32'
);

// --- Payments received ---------------------------------------------------

function payment(over: Partial<OrderPayment> = {}): OrderPayment {
  return {
    order_id: "order-1",
    amount_nad: 10000,
    paid_at: "2026-08-10",
    method: "eft",
    voided_at: null,
    ...over,
  };
}

// A deposit then a balance is one order and two bank lines — the case two
// columns on `orders` could not have expressed.
const split = [
  payment({ order_id: "order-1", amount_nad: 4000, paid_at: "2026-08-02" }),
  payment({ order_id: "order-1", amount_nad: 6000, paid_at: "2026-08-09" }),
];
check("two payments sum on one order", receivedByOrder(split).get("order-1"), 10000);

// Voided payments are reversals; they must never count anywhere.
check(
  "voided payment ignored",
  receivedByOrder([payment({ voided_at: "2026-08-11T00:00:00Z" })]).get("order-1"),
  undefined
);
check(
  "voided payment excluded from period total",
  summarisePayments([payment(), payment({ voided_at: "2026-08-11T00:00:00Z" })]).total,
  10000
);

check("unpaid", paymentState(10000, 0), "unpaid");
check("part paid", paymentState(10000, 4000), "part");
check("paid in full", paymentState(10000, 10000), "paid");
check("overpaid", paymentState(10000, 12000), "over");

// Money received in a period is summed by paid_at, independent of when the
// orders were placed — a September payment can settle an August order. This is
// the figure that has to match the bank.
const augustPayments = [
  payment({ order_id: "order-1", amount_nad: 25000, method: "eft" }),
  payment({ order_id: "order-2", amount_nad: 15000, method: "cod" }),
  payment({ order_id: "order-3", amount_nad: 5000, method: "eft" }),
];
const received = summarisePayments(augustPayments);
check("payments counted", received.count, 3);
check("payments total", received.total, 45000);
check("payments grouped by method", received.byMethod.map((g) => [g.key, g.total]), [
  ["eft", 30000],
  ["cod", 15000],
]);
check(
  "method breakdown reconciles to the payment total",
  received.byMethod.reduce((sum, g) => sum + g.total, 0),
  received.total
);

// Outstanding across a period.
const owedOrders = [
  order({ order_number: 1, subtotal_nad: 10000 }),
  order({ order_number: 2, subtotal_nad: 20000 }),
  order({ order_number: 3, subtotal_nad: 5000, status: "cancelled" }),
];
const owed = summariseOutstanding(owedOrders, [
  payment({ order_id: "order-1", amount_nad: 10000 }),
  payment({ order_id: "order-2", amount_nad: 8000 }),
]);
check("outstanding balance", owed.outstanding, 12000);
check("orders still owing", owed.unpaidOrders, 1);
// Cancelled orders never create a debt.
check("cancelled order not counted as owing", owed.overpaid, 0);

check(
  "overpayment surfaced rather than hidden",
  summariseOutstanding([order({ order_number: 1, subtotal_nad: 10000 })], [
    payment({ order_id: "order-1", amount_nad: 11000 }),
  ]),
  { outstanding: 0, overpaid: 1000, unpaidOrders: 0 }
);

// CSV carries the reconciliation columns.
const paidCsv = statementToCsv(
  [order({ order_number: 1, subtotal_nad: 10000 })],
  [payment({ order_id: "order-1", amount_nad: 4000 })]
).split("\n");
check("csv header has received and outstanding", paidCsv[0].endsWith("Total,Received,Outstanding"), true);
check("csv row shows the shortfall", paidCsv[1].endsWith("100.00,40.00,60.00"), true);

console.log(failures === 0 ? "\nALL PASS" : `\n${failures} FAILURE(S)`);
process.exit(failures === 0 ? 0 : 1);
