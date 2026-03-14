import { notFound } from "next/navigation";
import Image from "next/image";
import { createServiceClient } from "@/lib/supabase/service";
import { formatPrice } from "@/lib/utils";
import { SITE_NAME, SITE_URL } from "@/lib/constants";
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
      delivery_method, delivery_address, delivery_date, delivery_time,
      subtotal_nad, delivery_fee_nad, discount_nad, payment_method, status, notes, created_at,
      merchants (
        store_name, whatsapp_number, logo_url, vat_number, vat_inclusive,
        bank_name, bank_account_number, bank_account_holder, bank_branch_code,
        momo_number, ewallet_number, ewallet_provider
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
    bank_name: string | null;
    bank_account_number: string | null;
    bank_account_holder: string | null;
    bank_branch_code: string | null;
    momo_number: string | null;
    ewallet_number: string | null;
    ewallet_provider: string | null;
  } | null;

  const coupon = order.coupons as unknown as { code: string } | null;

  if (!merchant) notFound();

  const { data: items } = await supabase
    .from("order_items")
    .select("product_name, product_price, quantity, line_total")
    .eq("order_id", orderId)
    .order("created_at");

  const d = new Date(order.created_at);
  const orderDate = `${d.getUTCDate()} ${["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][d.getUTCMonth()]} ${d.getUTCFullYear()}`;

  const subtotalAfterDiscount = order.subtotal_nad - (order.discount_nad ?? 0);
  const preVatTotal = subtotalAfterDiscount + (order.delivery_fee_nad ?? 0);

  // VAT calculation (Namibia 15%)
  const hasVat = !!merchant?.vat_number;
  let vatAmount = 0;
  let totalExclVat = preVatTotal;
  let total = preVatTotal;

  if (hasVat && merchant) {
    if (merchant.vat_inclusive) {
      // Prices include VAT — extract it: VAT = total - (total / 1.15)
      vatAmount = Math.round(preVatTotal - (preVatTotal / 1.15));
      totalExclVat = preVatTotal - vatAmount;
      total = preVatTotal; // customer pays listed price
    } else {
      // Prices exclude VAT — add it: VAT = total * 0.15
      vatAmount = Math.round(preVatTotal * 0.15);
      totalExclVat = preVatTotal;
      total = preVatTotal + vatAmount;
    }
  }

  const statusConfig: Record<string, { label: string; bg: string; text: string; dot: string }> = {
    pending: { label: "Awaiting Payment", bg: "bg-amber-50", text: "text-amber-700", dot: "bg-amber-400" },
    confirmed: { label: "Confirmed", bg: "bg-blue-50", text: "text-blue-700", dot: "bg-blue-400" },
    completed: { label: "Paid", bg: "bg-emerald-50", text: "text-emerald-700", dot: "bg-emerald-400" },
    cancelled: { label: "Cancelled", bg: "bg-red-50", text: "text-red-700", dot: "bg-red-400" },
  };
  const status = statusConfig[order.status] ?? statusConfig.pending;

  const paymentMethodLabel: Record<string, string> = {
    eft: "Bank Transfer (EFT)",
    cod: "Cash on Delivery",
    momo: "MTC MoMo",
    ewallet: "eWallet",
  };

  const ewalletLabel: Record<string, string> = {
    fnb_ewallet: "FNB eWallet",
    paypulse: "PayPulse",
    easywallet: "EasyWallet",
    paytoday: "PayToday",
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 print:bg-white">
      <div className="max-w-2xl mx-auto px-4 py-8 print:py-0 print:px-0">
        {/* Actions bar */}
        <div className="flex items-center justify-between mb-4 print:hidden">
          <a href={SITE_URL} className="text-sm text-gray-400 hover:text-gray-600 transition-colors">
            {SITE_NAME}
          </a>
          <PrintButton />
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden print:shadow-none print:border-0 print:rounded-none">
          {/* Gradient header — screen only */}
          <div className="bg-gradient-to-r from-gray-900 to-gray-800 px-6 py-8 sm:px-8 print:hidden">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                {merchant.logo_url ? (
                  <Image
                    src={merchant.logo_url}
                    alt={merchant.store_name}
                    width={48}
                    height={48}
                    className="rounded-full border-2 border-white/20"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center border-2 border-white/20">
                    <span className="text-white font-bold text-lg">
                      {merchant.store_name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
                <div>
                  <h1 className="text-white font-bold text-lg">{merchant.store_name}</h1>
                  <p className="text-gray-400 text-sm">{merchant.whatsapp_number}</p>
                  {merchant.vat_number && (
                    <p className="text-gray-500 text-xs mt-0.5">VAT: {merchant.vat_number}</p>
                  )}
                </div>
              </div>
              <div className="text-right">
                <p className="text-gray-500 text-xs uppercase tracking-widest">Invoice</p>
                <p className="text-white font-bold text-2xl mt-0.5">#{order.order_number}</p>
              </div>
            </div>
          </div>

          {/* Print-only header — flat, no gradients */}
          <div className="hidden print:block px-6 pt-6 pb-4 border-b-2 border-gray-900">
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-xl font-bold text-gray-900">{merchant.store_name}</h1>
                <p className="text-sm text-gray-600">{merchant.whatsapp_number}</p>
                {merchant.vat_number && (
                  <p className="text-xs text-gray-500 mt-0.5">VAT No: {merchant.vat_number}</p>
                )}
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-500 uppercase tracking-widest">Invoice</p>
                <p className="text-2xl font-bold text-gray-900">#{order.order_number}</p>
                <p className="text-sm text-gray-600 mt-0.5">{orderDate}</p>
              </div>
            </div>
          </div>

          {/* Status + date bar — screen only */}
          <div className="flex items-center justify-between px-6 py-3 sm:px-8 bg-gray-50 border-b border-gray-100 print:hidden">
            <div className="flex items-center gap-2">
              <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${status.bg} ${status.text}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
                {status.label}
              </span>
              {order.payment_reference && (
                <span className="text-xs font-mono bg-gray-100 text-gray-600 px-2 py-1 rounded">
                  {order.payment_reference}
                </span>
              )}
            </div>
            <p className="text-xs text-gray-500">{orderDate}</p>
          </div>

          {/* Print-only status line */}
          <div className="hidden print:flex items-center justify-between px-6 py-2">
            <p className="text-sm font-semibold">Status: {status.label}</p>
            {order.payment_reference && (
              <p className="text-sm font-mono">Ref: {order.payment_reference}</p>
            )}
          </div>

          <div className="px-6 py-6 sm:px-8 print:px-6 print:py-4 space-y-6 print:space-y-4">
            {/* Bill To + Delivery info */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-[10px] uppercase tracking-widest text-gray-400 font-semibold mb-1.5">Bill To</p>
                <p className="font-semibold text-gray-900">{order.customer_name}</p>
                <p className="text-sm text-gray-500">{order.customer_whatsapp}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-widest text-gray-400 font-semibold mb-1.5">
                  {order.delivery_method === "delivery" ? "Delivery" : "Collection"}
                </p>
                {order.delivery_method === "delivery" && order.delivery_address && (
                  <p className="text-sm text-gray-700">{order.delivery_address}</p>
                )}
                {order.delivery_date && (
                  <p className="text-sm text-gray-500">
                    {order.delivery_date}
                    {order.delivery_time ? ` at ${order.delivery_time}` : ""}
                  </p>
                )}
                {order.delivery_method !== "delivery" && !order.delivery_date && (
                  <p className="text-sm text-gray-500">Pickup from store</p>
                )}
              </div>
            </div>

            {/* Items table */}
            <div className="border border-gray-100 rounded-xl overflow-hidden print:rounded-none print:border-gray-300">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 print:bg-white print:border-b print:border-gray-300">
                    <th className="text-left py-2.5 px-4 text-[10px] uppercase tracking-widest text-gray-500 font-semibold">Item</th>
                    <th className="text-center py-2.5 px-2 text-[10px] uppercase tracking-widest text-gray-500 font-semibold">Qty</th>
                    <th className="text-right py-2.5 px-4 text-[10px] uppercase tracking-widest text-gray-500 font-semibold">Price</th>
                    <th className="text-right py-2.5 px-4 text-[10px] uppercase tracking-widest text-gray-500 font-semibold">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {(items ?? []).map((item, i) => (
                    <tr key={i} className={`${i % 2 === 0 ? "bg-white" : "bg-gray-50/50"} print:bg-white print:border-b print:border-gray-100`}>
                      <td className="py-3 px-4 text-gray-900 font-medium">{item.product_name}</td>
                      <td className="py-3 px-2 text-center text-gray-500">{item.quantity}</td>
                      <td className="py-3 px-4 text-right text-gray-500">{formatPrice(item.product_price)}</td>
                      <td className="py-3 px-4 text-right text-gray-900 font-medium">{formatPrice(item.line_total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Summary */}
            <div className="flex justify-end">
              <div className="w-full sm:w-72 print:w-72 space-y-1.5">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Subtotal</span>
                  <span className="text-gray-900">{formatPrice(order.subtotal_nad)}</span>
                </div>
                {(order.discount_nad ?? 0) > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-emerald-600">Discount{coupon ? ` (${coupon.code})` : ""}</span>
                    <span className="text-emerald-600">-{formatPrice(order.discount_nad)}</span>
                  </div>
                )}
                {(order.delivery_fee_nad ?? 0) > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Delivery</span>
                    <span className="text-gray-900">{formatPrice(order.delivery_fee_nad)}</span>
                  </div>
                )}
                {hasVat && (
                  <>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">
                        {merchant!.vat_inclusive ? "Excl. VAT" : "Subtotal"}
                      </span>
                      <span className="text-gray-900">{formatPrice(totalExclVat)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">VAT (15%)</span>
                      <span className="text-gray-900">{formatPrice(vatAmount)}</span>
                    </div>
                  </>
                )}
                <div className="border-t border-gray-200 pt-2 mt-2 flex justify-between">
                  <span className="font-bold text-gray-900">
                    Total{hasVat ? (merchant!.vat_inclusive ? " (incl. VAT)" : " (excl. VAT)") : ""}
                  </span>
                  <span className="font-bold text-lg text-gray-900">{formatPrice(total)}</span>
                </div>
              </div>
            </div>

            {/* Notes */}
            {order.notes && (
              <div className="bg-amber-50 border border-amber-100 rounded-lg px-4 py-3 print:bg-white print:border print:border-gray-300 print:rounded-none">
                <p className="text-[10px] uppercase tracking-widest text-amber-600 font-semibold mb-1">Notes</p>
                <p className="text-sm text-amber-900">{order.notes}</p>
              </div>
            )}

            {/* Payment details card */}
            <div className="bg-gradient-to-br from-gray-50 to-white border border-gray-200 rounded-xl p-5 print:bg-white print:border-gray-300 print:rounded-none print:p-4">
              <p className="text-[10px] uppercase tracking-widest text-gray-400 font-semibold mb-3">
                Payment — {paymentMethodLabel[order.payment_method] ?? "Bank Transfer"}
              </p>

              {/* EFT */}
              {(order.payment_method === "eft" || !order.payment_method) && merchant.bank_name && (
                <div className="space-y-2">
                  <PaymentRow label="Bank" value={merchant.bank_name} />
                  {merchant.bank_account_holder && <PaymentRow label="Account Holder" value={merchant.bank_account_holder} />}
                  <PaymentRow label="Account No." value={merchant.bank_account_number ?? "—"} />
                  {merchant.bank_branch_code && <PaymentRow label="Branch Code" value={merchant.bank_branch_code} />}
                  <PaymentRow label="Reference" value={order.payment_reference || `Order #${order.order_number}`} highlight />
                  <PaymentRow label="Amount Due" value={formatPrice(total)} highlight />
                </div>
              )}

              {/* COD */}
              {order.payment_method === "cod" && (
                <div className="space-y-2">
                  <p className="text-sm text-gray-600 mb-2">Please have exact cash ready at delivery.</p>
                  <PaymentRow label="Amount Due" value={formatPrice(total)} highlight />
                </div>
              )}

              {/* MoMo */}
              {order.payment_method === "momo" && (
                <div className="space-y-2">
                  <PaymentRow label="MoMo Number" value={merchant.momo_number ?? "—"} />
                  <PaymentRow label="Reference" value={order.payment_reference || `Order #${order.order_number}`} highlight />
                  <PaymentRow label="Amount" value={formatPrice(total)} highlight />
                </div>
              )}

              {/* eWallet */}
              {order.payment_method === "ewallet" && (
                <div className="space-y-2">
                  <PaymentRow label="Provider" value={ewalletLabel[merchant.ewallet_provider ?? ""] ?? merchant.ewallet_provider ?? "—"} />
                  <PaymentRow label="Send to" value={merchant.ewallet_number ?? "—"} />
                  <PaymentRow label="Reference" value={order.payment_reference || `Order #${order.order_number}`} highlight />
                  <PaymentRow label="Amount" value={formatPrice(total)} highlight />
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 sm:px-8 print:px-6 border-t border-gray-100 bg-gray-50 print:bg-white print:border-gray-300">
            <div className="flex items-center justify-between text-xs text-gray-400">
              <span>Thank you for your order</span>
              <a href={SITE_URL} className="hover:text-gray-600 transition-colors print:text-gray-400">
                Powered by {SITE_NAME}
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function PaymentRow({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-gray-500">{label}</span>
      <span className={highlight ? "font-bold text-gray-900" : "text-gray-900 font-medium"}>
        {value}
      </span>
    </div>
  );
}
