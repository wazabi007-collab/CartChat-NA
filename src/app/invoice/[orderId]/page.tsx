import { notFound } from "next/navigation";
import Image from "next/image";
import { createServiceClient } from "@/lib/supabase/service";
import { formatPrice } from "@/lib/utils";
import { calculateVatBreakdown, VAT_RATE_BPS, VAT_RATE_LABEL } from "@/lib/vat";
import { formatNamibianDate } from "@/lib/date";
import { formatStoredRentalRange } from "@/lib/rentals";
import {
  summariseFulfilment,
  cashMethodLabel,
  cashInstruction,
  fulfilmentNoun,
  type ServiceMode,
} from "@/lib/service-mode";
import { SITE_NAME, SITE_URL, getPaymentMethodLabel, getEwalletProviderLabel } from "@/lib/constants";
import { PrintButton } from "./print-button";
import type { Metadata } from "next";

interface Props {
  params: Promise<{ orderId: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { orderId } = await params;
  const supabase = createServiceClient();
  const { data: order } = await supabase
    .from("orders")
    .select("order_number, merchants(store_name)")
    .eq("id", orderId)
    .single();

  if (!order) return { title: "Invoice" };
  const merchant = order.merchants as unknown as { store_name: string } | null;
  return { title: `Invoice #${order.order_number} — ${merchant?.store_name ?? ""}` };
}

export default async function InvoicePage({ params }: Props) {
  const { orderId } = await params;
  const supabase = createServiceClient();

  const { data: order } = await supabase
    .from("orders")
    .select(`
      id, order_number, customer_name, customer_whatsapp, payment_reference,
      delivery_method, delivery_provider, delivery_address, delivery_date, delivery_time,
      subtotal_nad, delivery_fee_nad, callout_fee_nad, deposit_nad, discount_nad, vat_nad, vat_rate_bps, vat_inclusive, vat_number,
      payment_method, status, notes, created_at,
      merchants (
        store_name, whatsapp_number, logo_url, vat_number, vat_inclusive, town, region,
        bank_name, bank_account_number, bank_account_holder, bank_branch_code,
        momo_number, ewallet_number, ewallet_provider, pay2cell_number, paytoday_number, wayame_number
      ),
      coupons (code)
    `)
    .eq("id", orderId)
    .single();

  if (!order) notFound();

  const merchant = order.merchants as unknown as {
    store_name: string;
    whatsapp_number: string;
    logo_url: string | null;
    vat_number: string | null;
    vat_inclusive: boolean;
    town: string | null;
    region: string | null;
    bank_name: string | null;
    bank_account_number: string | null;
    bank_account_holder: string | null;
    bank_branch_code: string | null;
    momo_number: string | null;
    ewallet_number: string | null;
    ewallet_provider: string | null;
    pay2cell_number: string | null;
    paytoday_number: string | null;
    wayame_number: string | null;
  } | null;

  const coupon = order.coupons as unknown as { code: string } | null;

  if (!merchant) notFound();

  const { data: items } = await supabase
    .from("order_items")
    .select(
      "product_name, product_price, quantity, line_total, variant_sku, variant_attributes, rental_start, rental_end_exclusive, rental_days, products(rental_unit, item_type, service_mode)"
    )
    .eq("order_id", orderId)
    .order("created_at");

  // Namibian local date. This previously used getUTCDate/getUTCMonth, so an
  // order placed between midnight and 02:00 local printed the PREVIOUS day —
  // on a document customers and accountants treat as the date of supply.
  const orderDate = formatNamibianDate(order.created_at, {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const subtotalAfterDiscount = order.subtotal_nad - (order.discount_nad ?? 0);
  const preVatTotal =
    subtotalAfterDiscount + (order.delivery_fee_nad ?? 0) + (order.callout_fee_nad ?? 0);

  // VAT — one calculation, not two. This file previously computed vatAmount,
  // totalExclVat and total once from the merchant's live settings and then
  // immediately recomputed all three from the order's snapshot, leaving the
  // first block dead. Two competing sums of the same money on an invoice is
  // where a rounding discrepancy eventually surfaces.
  //
  // An order snapshots its VAT position when placed; orders predating that
  // fall back to the merchant's current settings.
  const hasVatSnapshot =
    Boolean(order.vat_number) || (order.vat_rate_bps || 0) > 0 || (order.vat_nad || 0) > 0;
  const invoiceVatNumber = hasVatSnapshot ? order.vat_number : merchant.vat_number;
  const invoiceVatInclusive = hasVatSnapshot ? order.vat_inclusive : merchant.vat_inclusive;

  const calculatedVat = calculateVatBreakdown({
    amountNad: preVatTotal,
    vatNumber: invoiceVatNumber,
    vatInclusive: invoiceVatInclusive,
    vatRateBps: hasVatSnapshot ? order.vat_rate_bps : VAT_RATE_BPS,
  });

  const hasVat = calculatedVat.hasVat;
  const vatAmount = hasVat
    ? hasVatSnapshot
      ? order.vat_nad || 0
      : calculatedVat.vatAmount
    : 0;
  const totalExclVat = hasVat && invoiceVatInclusive ? preVatTotal - vatAmount : preVatTotal;
  const deposit = order.deposit_nad ?? 0;
  // The deposit is payable but refundable: outside the taxable base, shown as
  // its own line so nobody mistakes it for revenue.
  const total = (hasVat && !invoiceVatInclusive ? preVatTotal + vatAmount : preVatTotal) + deposit;

  const statusConfig: Record<string, { label: string; className: string }> = {
    pending: { label: "Awaiting payment", className: "bg-amber-50 text-amber-800" },
    confirmed: { label: "Confirmed", className: "bg-blue-50 text-blue-800" },
    ready: { label: "Ready", className: "bg-blue-50 text-blue-800" },
    completed: { label: "Paid", className: "bg-emerald-50 text-emerald-800" },
    cancelled: { label: "Cancelled", className: "bg-red-50 text-red-800" },
  };
  const status = statusConfig[order.status] ?? statusConfig.pending;

  const deliveryProviderLabel: Record<string, string> = {
    store: "Store delivery",
    yango: "Yango courier",
    indrive: "inDrive courier",
  };
  const buyerPaidCourier =
    order.delivery_method === "delivery" &&
    ["yango", "indrive"].includes(order.delivery_provider ?? "");
  // The invoice outlives the checkout screen, so it re-derives the same
  // vocabulary from what was actually ordered rather than assuming goods.
  const fulfilment = summariseFulfilment(
    (items ?? []).map((item) => {
      const product = item.products as unknown as {
        rental_unit?: string | null;
        item_type?: string | null;
        service_mode?: string | null;
      } | null;
      return {
        serviceMode: (product?.service_mode ?? null) as ServiceMode | null,
        itemType: product?.item_type ?? null,
        rentalUnit: product?.rental_unit ?? null,
      };
    })
  );
  const paymentDisplayLabel =
    order.payment_method === "cod"
      ? cashMethodLabel(fulfilment, order.delivery_method ?? "pickup")
      : getPaymentMethodLabel(order.payment_method);

  const paymentReference = order.payment_reference || `Order #${order.order_number}`;

  // A VAT-registered supplier issues a tax invoice; everyone else, an invoice.
  const documentKind = hasVat ? "Tax Invoice" : "Invoice";

  return (
    <div className="min-h-screen bg-slate-100 px-4 py-8 print:bg-white print:p-0">
      <div className="mx-auto w-full max-w-[820px]">
        <article className="rounded border border-slate-200 bg-white p-8 shadow-sm sm:p-12 print:rounded-none print:border-0 print:p-0 print:shadow-none">
          {/* Masthead */}
          <header className="flex flex-wrap items-start justify-between gap-6 border-b-2 border-slate-900 pb-6">
            <div className="flex items-start gap-3.5">
              {merchant.logo_url ? (
                <Image
                  src={merchant.logo_url}
                  alt=""
                  width={46}
                  height={46}
                  className="h-[46px] w-[46px] shrink-0 rounded-lg object-cover"
                />
              ) : (
                <div className="grid h-[46px] w-[46px] shrink-0 place-items-center rounded-lg bg-acacia text-xl font-black text-white">
                  {merchant.store_name.charAt(0).toUpperCase()}
                </div>
              )}
              <div>
                <h1 className="text-lg font-bold leading-tight tracking-tight text-slate-950">
                  {merchant.store_name}
                </h1>
                <p className="mt-1 text-sm leading-relaxed text-slate-500">
                  {merchant.town && <span className="block capitalize">{merchant.town.replace(/_/g, " ")}, Namibia</span>}
                  <span className="block">{merchant.whatsapp_number}</span>
                  {invoiceVatNumber && <span className="block">VAT No. {invoiceVatNumber}</span>}
                </p>
              </div>
            </div>

            <div className="ml-auto text-right">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">
                {documentKind}
              </p>
              <p className="mt-0.5 text-3xl font-extrabold tracking-tight tabular-nums text-slate-950">
                #{order.order_number}
              </p>
              <dl className="mt-2.5 grid grid-cols-[auto_auto] justify-end gap-x-3.5 gap-y-0.5 text-sm">
                <dt className="text-slate-400">Issued</dt>
                <dd className="tabular-nums text-slate-900">{orderDate}</dd>
              </dl>
              <span
                className={`mt-3 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold ${status.className}`}
              >
                <span className="h-1.5 w-1.5 rounded-full bg-current" />
                {status.label}
              </span>
            </div>
          </header>

          {/* Parties */}
          <section className="grid gap-7 border-b border-slate-200 py-6 sm:grid-cols-2">
            <div>
              <p className="mb-1.5 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">
                Billed to
              </p>
              <p className="text-sm leading-relaxed text-slate-500">
                <strong className="block font-semibold text-slate-900">{order.customer_name}</strong>
                {order.customer_whatsapp}
              </p>
            </div>

            <div>
              <p className="mb-1.5 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">
                {fulfilmentNoun(fulfilment, order.delivery_method ?? "pickup")}
              </p>
              <p className="text-sm leading-relaxed text-slate-500">
                {order.delivery_method === "delivery" && order.delivery_address && (
                  <>
                    <strong className="block font-semibold text-slate-900">
                      {order.delivery_address}
                    </strong>
                    {deliveryProviderLabel[order.delivery_provider ?? "store"] ?? "Store delivery"}
                    {buyerPaidCourier ? " — paid by buyer directly" : ""}
                    <br />
                  </>
                )}
                {order.delivery_date && (
                  <>
                    {order.delivery_date}
                    {order.delivery_time ? ` at ${order.delivery_time}` : ""}
                  </>
                )}
                {order.delivery_method !== "delivery" &&
                  !order.delivery_date &&
                  // Only goods are collected. A stay or an online service is
                  // already described by the heading above this line.
                  (fulfilment.hasGoods ? "Pickup from store" : null)}
              </p>
            </div>
          </section>

          {/* Items */}
          <div className="overflow-x-auto">
            <table className="mt-6 w-full min-w-[460px] text-sm">
              <caption className="mb-0 text-left text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">
                Items
              </caption>
              <thead>
                <tr>
                  <th scope="col" className="border-b border-slate-300 pb-2.5 pr-4 text-left text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">
                    Description
                  </th>
                  <th scope="col" className="border-b border-slate-300 pb-2.5 pl-3 text-center text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">
                    Qty
                  </th>
                  <th scope="col" className="border-b border-slate-300 pb-2.5 pl-3 text-right text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">
                    Unit price
                  </th>
                  <th scope="col" className="border-b border-slate-300 pb-2.5 pl-3 text-right text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">
                    Amount
                  </th>
                </tr>
              </thead>
              <tbody>
                {(items ?? []).map((item, i) => (
                  <tr key={i}>
                    <td className="border-b border-slate-200 py-3 pr-4 align-top font-semibold text-slate-900">
                      {item.product_name}
                      {item.variant_attributes &&
                        Object.keys(item.variant_attributes as Record<string, string>).length > 0 && (
                          <span className="mt-0.5 block text-[12.5px] font-normal text-slate-400">
                            {Object.entries(item.variant_attributes as Record<string, string>)
                              .map(([key, value]) => `${key}: ${value}`)
                              .join(" · ")}
                          </span>
                        )}
                      {item.variant_sku && (
                        <span className="mt-0.5 block text-[12.5px] font-normal text-slate-400">
                          SKU {item.variant_sku}
                        </span>
                      )}
                      {item.rental_start && item.rental_end_exclusive && (
                        <span className="mt-0.5 block text-[12.5px] font-normal text-slate-500">
                          {formatStoredRentalRange(
                            item.rental_start,
                            item.rental_end_exclusive,
                            (item.products as unknown as { rental_unit?: string } | null)
                              ?.rental_unit === "night"
                              ? "night"
                              : "day"
                          )}
                        </span>
                      )}
                    </td>
                    <td className="border-b border-slate-200 py-3 pl-3 text-center align-top tabular-nums text-slate-500">
                      {item.quantity}
                    </td>
                    <td className="border-b border-slate-200 py-3 pl-3 text-right align-top tabular-nums text-slate-500">
                      {formatPrice(item.product_price)}
                    </td>
                    <td className="border-b border-slate-200 py-3 pl-3 text-right align-top font-semibold tabular-nums text-slate-900">
                      {formatPrice(item.line_total)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals */}
          <div className="mt-6 flex justify-end">
            <dl className="grid w-full max-w-[300px] grid-cols-[1fr_auto] gap-x-6 gap-y-2.5 text-sm">
              <dt className="text-slate-500">Subtotal</dt>
              <dd className="text-right tabular-nums text-slate-900">
                {formatPrice(order.subtotal_nad)}
              </dd>

              {(order.discount_nad ?? 0) > 0 && (
                <>
                  <dt className="text-acacia">Discount{coupon ? ` (${coupon.code})` : ""}</dt>
                  <dd className="text-right tabular-nums text-acacia">
                    −{formatPrice(order.discount_nad ?? 0)}
                  </dd>
                </>
              )}

              {(order.delivery_fee_nad ?? 0) > 0 && (
                <>
                  <dt className="text-slate-500">Delivery</dt>
                  <dd className="text-right tabular-nums text-slate-900">
                    {formatPrice(order.delivery_fee_nad ?? 0)}
                  </dd>
                </>
              )}

              {/* Travel for on-site services, kept off the delivery line so a
                  call-out is not mistaken for product delivery. */}
              {(order.callout_fee_nad ?? 0) > 0 && (
                <>
                  <dt className="text-slate-500">Call-out</dt>
                  <dd className="text-right tabular-nums text-slate-900">
                    {formatPrice(order.callout_fee_nad ?? 0)}
                  </dd>
                </>
              )}

              {hasVat && (
                <>
                  <dt className="text-slate-500">
                    VAT ({VAT_RATE_LABEL}){invoiceVatInclusive ? " included" : ""}
                  </dt>
                  <dd className="text-right tabular-nums text-slate-900">{formatPrice(vatAmount)}</dd>
                </>
              )}

              {deposit > 0 && (
                <>
                  <dt className="text-slate-500">Refundable deposit</dt>
                  <dd className="text-right tabular-nums text-slate-900">{formatPrice(deposit)}</dd>
                </>
              )}

              <div className="col-span-2 mt-1 flex items-baseline justify-between gap-6 border-t-2 border-slate-900 pt-3">
                <dt className="text-[15px] font-bold text-slate-950">Total due</dt>
                <dd className="text-[22px] font-extrabold tracking-tight tabular-nums text-slate-950">
                  {formatPrice(total)}
                </dd>
              </div>

              {/* The deposit note is not a VAT note. Nesting it under hasVat
                  meant non-VAT stores — most of them — printed a deposit with
                  nothing saying the customer gets it back. */}
              {(hasVat || deposit > 0) && (
                <p className="col-span-2 text-right text-xs text-slate-400">
                  {hasVat && <>Amount excluding VAT: {formatPrice(totalExclVat)}</>}
                  {hasVat && deposit > 0 && <> · </>}
                  {deposit > 0 && <>deposit refundable on return</>}
                </p>
              )}
            </dl>
          </div>

          {/* Notes */}
          {order.notes && (
            <section className="mt-7 rounded border border-slate-300 p-5">
              <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">Notes</p>
              <p className="mt-2 text-sm leading-relaxed text-slate-700">{order.notes}</p>
            </section>
          )}

          {/* How to pay */}
          <section className="mt-7 rounded border border-slate-300 p-5">
            <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">
              How to pay — {paymentDisplayLabel}
            </p>

            {(order.payment_method === "eft" || !order.payment_method) && merchant.bank_name && (
              <PayGrid
                rows={[
                  { label: "Bank", value: merchant.bank_name },
                  ...(merchant.bank_account_holder
                    ? [{ label: "Account name", value: merchant.bank_account_holder }]
                    : []),
                  { label: "Account number", value: merchant.bank_account_number ?? "—" },
                  ...(merchant.bank_branch_code
                    ? [{ label: "Branch code", value: merchant.bank_branch_code }]
                    : []),
                ]}
              />
            )}

            {order.payment_method === "momo" && (
              <PayGrid rows={[{ label: "MTC Maris number", value: merchant.momo_number ?? "—" }]} />
            )}

            {order.payment_method === "pay2cell" && (
              <PayGrid rows={[{ label: "Pay2Cell number", value: merchant.pay2cell_number ?? "—" }]} />
            )}

            {order.payment_method === "wayame" && (
              <PayGrid rows={[{ label: "WayaMe number", value: merchant.wayame_number ?? "—" }]} />
            )}
            {order.payment_method === "paytoday" && (
              <PayGrid rows={[{ label: "PayToday number", value: merchant.paytoday_number ?? "—" }]} />
            )}

            {order.payment_method === "ewallet" && (
              <PayGrid
                rows={[
                  { label: "Provider", value: getEwalletProviderLabel(merchant.ewallet_provider) },
                  { label: "Send to", value: merchant.ewallet_number ?? "—" },
                ]}
              />
            )}

            {order.payment_method === "cod" && (
              <p className="mt-3 text-sm leading-relaxed text-slate-600">
                {buyerPaidCourier
                  ? `Please pay the order amount to ${merchant.store_name}. The ${
                      deliveryProviderLabel[order.delivery_provider ?? "store"] ?? "courier"
                    } fee is paid directly by you to the driver.`
                  : // The heading above already speaks the right vocabulary; this
                    // line kept its own goods-only fallback, so an online service
                    // was headed "Online — nothing to collect" and then told to
                    // collect from the store, and a room said the same under
                    // "Cash at check-in".
                    cashInstruction(fulfilment, order.delivery_method ?? "pickup")}
              </p>
            )}

            {order.payment_method !== "cod" && (
              <p className="mt-4 border-t border-slate-200 pt-3.5 text-[13.5px] leading-relaxed text-slate-600">
                Use{" "}
                <code className="rounded bg-acacia-soft px-1.5 py-0.5 font-mono font-semibold text-slate-900">
                  {paymentReference}
                </code>{" "}
                as your payment reference so {merchant.store_name} can match your payment to this
                order. Amount due: <strong className="text-slate-900">{formatPrice(total)}</strong>.
              </p>
            )}
          </section>

          {/* Footer */}
          <footer className="mt-7 flex flex-wrap items-baseline justify-between gap-2 border-t border-slate-200 pt-4 text-[12.5px] text-slate-400">
            <p>Thank you for supporting a local Namibian business.</p>
            <a href={SITE_URL} className="transition-colors hover:text-slate-600">
              Powered by {SITE_NAME}
            </a>
          </footer>
        </article>

        <div className="mt-5 print:hidden">
          <PrintButton />
        </div>
      </div>
    </div>
  );
}

function PayGrid({ rows }: { rows: { label: string; value: string }[] }) {
  return (
    <div className="mt-3.5 grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
      {rows.map((row) => (
        <div key={row.label} className="text-sm">
          <span className="mb-0.5 block text-[11px] uppercase tracking-[0.1em] text-slate-400">
            {row.label}
          </span>
          <b className="font-semibold tabular-nums text-slate-900">{row.value}</b>
        </div>
      ))}
    </div>
  );
}
