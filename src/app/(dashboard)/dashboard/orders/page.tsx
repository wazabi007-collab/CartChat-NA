import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { formatPrice, whatsappLink } from "@/lib/utils";
import { getOrderPayableTotal } from "@/lib/vat";
import { getPaymentMethodLabel } from "@/lib/constants";
import Link from "next/link";
import { OrderActions } from "./order-actions";
import { QuickStatus } from "@/components/dashboard/quick-status";
import { OrderItemsToggle } from "@/components/dashboard/order-items-toggle";
import { card, statusPill } from "@/lib/ui";
import { Bot, Clock3, FileText, ImageIcon, PackageCheck, ReceiptText, ShieldCheck } from "lucide-react";
import { resolveProofPath, isPdfProof } from "@/lib/proof";

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const params = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: merchant } = await supabase
    .from("merchants")
    .select("id, industry, store_name, store_slug, pop_required")
    .eq("user_id", user.id)
    .single();

  if (!merchant) redirect("/dashboard/setup");

  const statusFilter = params.status;
  let query = supabase
    .from("orders")
    .select("*, order_items(id, product_name, product_price, quantity, line_total, variant_sku, variant_attributes)")
    .eq("merchant_id", merchant.id)
    .order("created_at", { ascending: false });

  if (
    statusFilter &&
    ["pending", "confirmed", "ready", "completed", "cancelled"].includes(statusFilter)
  ) {
    query = query.eq("status", statusFilter);
  }

  const { data: orders } = await query;
  const orderList = orders || [];
  const proofPaths = orderList
    .map((order) => resolveProofPath(order.proof_of_payment_url))
    .filter((p): p is string => p !== null);
  const proofUrlByPath = new Map<string, string>();
  if (proofPaths.length > 0) {
    const { data: signed } = await supabase.storage
      .from("order-proofs")
      .createSignedUrls([...new Set(proofPaths)], 3600);
    for (const item of signed || []) {
      if (item.signedUrl && item.path) {
        proofUrlByPath.set(item.path, item.signedUrl);
      }
    }
  }
  const pendingCount = orderList.filter((order) => order.status === "pending").length;
  const activeCount = orderList.filter((order) =>
    ["pending", "confirmed", "ready"].includes(order.status)
  ).length;
  const completedCount = orderList.filter((order) => order.status === "completed").length;

  const statuses = ["all", "pending", "confirmed", "ready", "completed", "cancelled"];
  const deliveryProviderLabel: Record<string, string> = {
    store: "Store delivery",
    yango: "Yango — buyer books & pays courier",
    indrive: "inDrive — buyer books & pays courier",
  };

  return (
    <div className="md:ml-56">
      <div className="mb-6 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-900/5 sm:p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-acacia">
              Order command center
            </p>
            <h1 className="mt-2 text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">
              Orders
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
              Confirm payments, move orders through fulfilment, and keep customers
              updated through automated WhatsApp messages.
            </p>
          </div>
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
            <div className="flex items-center gap-2 font-black">
              <Bot size={18} />
              Customer updates are automated
            </div>
            <p className="mt-1 max-w-xs leading-5 text-emerald-800">
              Status changes trigger the prepared WhatsApp order messages in the background.
            </p>
          </div>
        </div>
        <div className="mt-5 grid grid-cols-3 gap-3">
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-amber-700">
              <Clock3 size={14} />
              Pending
            </div>
            <p className="mt-2 text-2xl font-black text-amber-700">{pendingCount}</p>
          </div>
          <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-blue-700">
              <PackageCheck size={14} />
              Active
            </div>
            <p className="mt-2 text-2xl font-black text-blue-700">{activeCount}</p>
          </div>
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-emerald-700">
              <ShieldCheck size={14} />
              Completed
            </div>
            <p className="mt-2 text-2xl font-black text-emerald-700">{completedCount}</p>
          </div>
        </div>
      </div>

      {/* Status filter tabs */}
      <div className="mb-6 flex gap-2 overflow-x-auto rounded-2xl border border-slate-200 bg-white p-2 shadow-sm shadow-slate-900/5">
        {statuses.map((s) => (
          <Link
            key={s}
            href={s === "all" ? "/dashboard/orders" : `/dashboard/orders?status=${s}`}
            className={`px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
              (s === "all" && !statusFilter) || s === statusFilter
                ? "bg-acacia text-white shadow-sm"
                : "bg-slate-50 text-slate-600 hover:bg-slate-100"
            }`}
          >
            {s.charAt(0).toUpperCase() + s.slice(1)}
          </Link>
        ))}
      </div>

      {orderList.length === 0 ? (
        <div className={`${card} text-center py-16`}>
          <p className="text-gray-500">No orders yet</p>
          <p className="text-sm text-gray-400 mt-1.5">
            Share your store link to start receiving orders
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {orderList.map((order) => {
            const orderTotal = getOrderPayableTotal(order);
            const proofPath = resolveProofPath(order.proof_of_payment_url);
            const proofUrl = proofPath ? proofUrlByPath.get(proofPath) ?? null : null;
            const awaitingProof =
              merchant.pop_required &&
              order.payment_method === "eft" &&
              !order.proof_of_payment_url &&
              !["completed", "cancelled"].includes(order.status);
            return (
            <div
              key={order.id}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-900/5"
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-gray-900">
                      #{order.order_number}
                    </span>
                    <QuickStatus
                      orderId={order.id}
                      currentStatus={order.status}
                      merchantId={merchant.id}
                      merchantIndustry={merchant.industry ?? ""}
                      merchantStoreName={merchant.store_name}
                      customerName={order.customer_name}
                      customerWhatsapp={order.customer_whatsapp}
                      orderNumber={order.order_number}
                      trackingToken={order.tracking_token || ""}
                      deliveryMethod={order.delivery_method || "pickup"}
                    />
                    {order.payment_method && order.payment_method !== "eft" && (
                      <span className={`${statusPill} bg-gray-100 text-gray-600`}>
                        {getPaymentMethodLabel(order.payment_method)}
                      </span>
                    )}
                    {order.proof_of_payment_url && (
                      <span className={`${statusPill} bg-emerald-100 text-emerald-700`}>
                        Proof uploaded
                      </span>
                    )}
                    {awaitingProof && (
                      <span className={`${statusPill} bg-amber-100 text-amber-700`}>
                        Awaiting proof
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 mt-1">
                    {order.customer_name}
                  </p>
                  <p className="text-xs text-gray-400">
                    {new Date(order.created_at).toLocaleDateString("en-NA", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-gray-900">
                    {formatPrice(orderTotal)}
                  </p>
                  {(order.discount_nad > 0 || order.delivery_fee_nad > 0) && (
                    <p className="text-xs text-gray-400">
                      {order.discount_nad > 0 ? `-${formatPrice(order.discount_nad)} disc` : ""}
                      {order.discount_nad > 0 && order.delivery_fee_nad > 0 ? " · " : ""}
                      {order.delivery_fee_nad > 0 ? `+${formatPrice(order.delivery_fee_nad)} delivery` : ""}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 text-sm flex-wrap">
                <span className="text-gray-500">
                  {order.delivery_method === "delivery"
                    ? deliveryProviderLabel[order.delivery_provider ?? "store"] ?? "Delivery"
                    : "Pickup"}
                </span>
                {order.delivery_date && (
                  <span className="text-gray-500">
                    · {order.delivery_date}
                    {order.delivery_time ? ` ${order.delivery_time}` : ""}
                  </span>
                )}
              </div>

              {order.delivery_address && (
                <p className="text-xs text-gray-500 mt-1">
                  {order.delivery_address}
                </p>
              )}

              {order.notes && (
                <p className="text-xs text-gray-400 mt-1 italic">
                  &quot;{order.notes}&quot;
                </p>
              )}

              {order.proof_of_payment_url && (
                <div className="mt-3 rounded-xl border border-emerald-100 bg-emerald-50/50 p-3">
                  <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-emerald-700">
                    <ReceiptText size={14} />
                    Proof of payment
                  </p>
                  {proofUrl ? (
                    proofPath && isPdfProof(proofPath) ? (
                      <a
                        href={proofUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-2 inline-flex items-center gap-1.5 text-sm font-medium text-emerald-700 hover:underline"
                      >
                        <FileText size={16} />
                        View proof (PDF)
                      </a>
                    ) : (
                      <a
                        href={proofUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-2 block w-fit"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={proofUrl}
                          alt={`Proof of payment for order #${order.order_number}`}
                          className="max-h-40 rounded-lg border border-emerald-200 object-contain"
                        />
                      </a>
                    )
                  ) : (
                    <p className="mt-2 flex items-center gap-1.5 text-sm text-gray-500">
                      <ImageIcon size={16} />
                      Proof unavailable (file may have been removed)
                    </p>
                  )}
                </div>
              )}

              {/* Expandable order items */}
              <OrderItemsToggle items={order.order_items || []} />

              <div className="mt-3 pt-3 border-t border-gray-100 flex flex-wrap gap-2">
                <OrderActions
                  orderId={order.id}
                  currentStatus={order.status}
                  merchantId={merchant.id}
                  merchantIndustry={merchant.industry ?? ""}
                  merchantStoreName={merchant.store_name}
                  merchantStoreSlug={merchant.store_slug}
                  customerName={order.customer_name}
                  customerWhatsapp={order.customer_whatsapp}
                  orderNumber={order.order_number}
                  orderTotal={formatPrice(orderTotal)}
                  trackingToken={order.tracking_token || ""}
                  deliveryMethod={order.delivery_method || "pickup"}
                  hasProof={!!order.proof_of_payment_url}
                />
                <a
                  href={`/invoice/${order.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 text-sm font-medium bg-gray-50 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  View Invoice
                </a>
                <a
                  href={whatsappLink(
                    order.customer_whatsapp,
                    `Hi ${order.customer_name}, regarding your OshiCart order #${order.order_number}...`
                  )}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 text-sm font-medium bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition-colors"
                >
                  WhatsApp customer
                </a>
              </div>
            </div>
          );
          })}
        </div>
      )}
    </div>
  );
}
