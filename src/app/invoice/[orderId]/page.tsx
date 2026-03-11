import { notFound } from "next/navigation";
import { createServiceClient } from "@/lib/supabase/service";
import { formatPrice } from "@/lib/utils";
import { SITE_NAME } from "@/lib/constants";
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
      id, order_number, customer_name, customer_whatsapp,
      delivery_method, delivery_address, delivery_date, delivery_time,
      subtotal_nad, delivery_fee_nad, discount_nad, payment_method, status, notes, created_at,
      merchants (
        store_name, whatsapp_number, tier,
        bank_name, bank_account_number, bank_account_holder, bank_branch_code
      ),
      coupons (code)
    `)
    .eq("id", orderId)
    .single();

  if (!order) notFound();

  const merchant = order.merchants as unknown as {
    store_name: string;
    whatsapp_number: string;
    tier: string;
    bank_name: string | null;
    bank_account_number: string | null;
    bank_account_holder: string | null;
    bank_branch_code: string | null;
  } | null;

  if (!merchant || (merchant.tier === "free")) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="bg-white rounded-lg border p-8 max-w-sm text-center">
          <p className="text-lg font-bold text-gray-900">Invoices require Pro or Business</p>
          <p className="text-sm text-gray-500 mt-2">
            This store needs to upgrade their plan to share invoices.
          </p>
        </div>
      </div>
    );
  }

  const { data: items } = await supabase
    .from("order_items")
    .select("product_name, product_price, quantity, line_total")
    .eq("order_id", orderId)
    .order("created_at");

  const orderDate = new Date(order.created_at).toLocaleDateString("en-NA", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const statusLabel: Record<string, string> = {
    pending: "Awaiting Confirmation",
    confirmed: "Confirmed",
    completed: "Paid & Completed",
    cancelled: "Cancelled",
  };

  return (
    <div className="min-h-screen bg-gray-50 print:bg-white">
      <div className="max-w-2xl mx-auto px-4 py-8 print:py-0">
        {/* Print button — hidden when printing */}
        <div className="flex justify-end mb-6 print:hidden">
          <button
            onClick={() => window.print()}
            className="px-4 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700"
          >
            Print / Save PDF
          </button>
        </div>

        <div className="bg-white rounded-lg border p-8 print:border-0 print:p-0">
          {/* Header */}
          <div className="flex justify-between items-start mb-8">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{merchant.store_name}</h1>
              <p className="text-sm text-gray-500 mt-1">{merchant.whatsapp_number}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-400 uppercase tracking-wide">Invoice</p>
              <p className="text-2xl font-bold text-gray-900">#{order.order_number}</p>
              <p className="text-sm text-gray-500 mt-1">{orderDate}</p>
              <span
                className={`inline-block mt-1 text-xs px-2 py-0.5 rounded-full font-medium ${
                  order.status === "completed"
                    ? "bg-green-100 text-green-800"
                    : order.status === "confirmed"
                    ? "bg-blue-100 text-blue-800"
                    : order.status === "cancelled"
                    ? "bg-red-100 text-red-800"
                    : "bg-yellow-100 text-yellow-800"
                }`}
              >
                {statusLabel[order.status] ?? order.status}
              </span>
            </div>
          </div>

          {/* Bill To */}
          <div className="mb-8">
            <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Bill To</p>
            <p className="font-medium text-gray-900">{order.customer_name}</p>
            <p className="text-sm text-gray-500">{order.customer_whatsapp}</p>
            {order.delivery_method === "delivery" && order.delivery_address && (
              <p className="text-sm text-gray-500 mt-1">{order.delivery_address}</p>
            )}
            {order.delivery_date && (
              <p className="text-sm text-gray-500">
                Delivery: {order.delivery_date}
                {order.delivery_time ? ` — ${order.delivery_time}` : ""}
              </p>
            )}
          </div>

          {/* Items table */}
          <table className="w-full text-sm mb-8">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-2 text-gray-500 font-medium">Item</th>
                <th className="text-center py-2 text-gray-500 font-medium">Qty</th>
                <th className="text-right py-2 text-gray-500 font-medium">Unit Price</th>
                <th className="text-right py-2 text-gray-500 font-medium">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {(items ?? []).map((item, i) => (
                <tr key={i}>
                  <td className="py-2 text-gray-900">{item.product_name}</td>
                  <td className="py-2 text-center text-gray-600">{item.quantity}</td>
                  <td className="py-2 text-right text-gray-600">{formatPrice(item.product_price)}</td>
                  <td className="py-2 text-right font-medium text-gray-900">{formatPrice(item.line_total)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-gray-200">
                <td colSpan={3} className="py-3 text-right font-bold text-gray-900">Total</td>
                <td className="py-3 text-right font-bold text-green-700 text-lg">
                  {formatPrice(order.subtotal_nad)}
                </td>
              </tr>
            </tfoot>
          </table>

          {/* Notes */}
          {order.notes && (
            <div className="mb-8 p-3 bg-gray-50 rounded text-sm text-gray-600 print:bg-white print:border">
              <p className="font-medium text-gray-700 mb-1">Notes</p>
              <p>{order.notes}</p>
            </div>
          )}

          {/* Bank details */}
          {merchant.bank_name && merchant.bank_account_number && (
            <div className="border-t pt-6">
              <p className="text-xs text-gray-400 uppercase tracking-wide mb-3">Payment Details (EFT)</p>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                <span className="text-gray-500">Bank</span>
                <span className="text-gray-900 font-medium">{merchant.bank_name}</span>
                {merchant.bank_account_holder && (
                  <>
                    <span className="text-gray-500">Account Holder</span>
                    <span className="text-gray-900 font-medium">{merchant.bank_account_holder}</span>
                  </>
                )}
                <span className="text-gray-500">Account Number</span>
                <span className="text-gray-900 font-medium">{merchant.bank_account_number}</span>
                {merchant.bank_branch_code && (
                  <>
                    <span className="text-gray-500">Branch Code</span>
                    <span className="text-gray-900 font-medium">{merchant.bank_branch_code}</span>
                  </>
                )}
                <span className="text-gray-500">Reference</span>
                <span className="text-gray-900 font-medium">Order #{order.order_number}</span>
                <span className="text-gray-500">Amount</span>
                <span className="text-green-700 font-bold">{formatPrice(order.subtotal_nad)}</span>
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="mt-8 pt-6 border-t text-center text-xs text-gray-400">
            Powered by {SITE_NAME}
          </div>
        </div>
      </div>
    </div>
  );
}
