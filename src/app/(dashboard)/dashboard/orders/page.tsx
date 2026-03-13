import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { formatPrice, whatsappLink } from "@/lib/utils";
import Link from "next/link";
import { OrderActions } from "./order-actions";

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
    .select("id, industry, store_name")
    .eq("user_id", user.id)
    .single();

  if (!merchant) redirect("/dashboard/setup");

  const statusFilter = params.status;
  let query = supabase
    .from("orders")
    .select("*")
    .eq("merchant_id", merchant.id)
    .order("created_at", { ascending: false });

  if (
    statusFilter &&
    ["pending", "confirmed", "completed", "cancelled"].includes(statusFilter)
  ) {
    query = query.eq("status", statusFilter);
  }

  const { data: orders } = await query;

  const statusColors: Record<string, string> = {
    pending: "bg-yellow-100 text-yellow-800",
    confirmed: "bg-blue-100 text-blue-800",
    completed: "bg-green-100 text-green-800",
    cancelled: "bg-red-100 text-red-800",
  };

  const statuses = ["all", "pending", "confirmed", "completed", "cancelled"];

  return (
    <div className="md:ml-56">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Orders</h1>

      {/* Status filter tabs */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        {statuses.map((s) => (
          <Link
            key={s}
            href={s === "all" ? "/dashboard/orders" : `/dashboard/orders?status=${s}`}
            className={`px-3 py-1.5 rounded-full text-sm whitespace-nowrap ${
              (s === "all" && !statusFilter) || s === statusFilter
                ? "bg-green-600 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {s.charAt(0).toUpperCase() + s.slice(1)}
          </Link>
        ))}
      </div>

      {!orders || orders.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-lg border">
          <p className="text-gray-500">No orders yet</p>
          <p className="text-sm text-gray-400 mt-1">
            Share your store link to start receiving orders
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <div
              key={order.id}
              className="bg-white rounded-lg border p-4"
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-gray-900">
                      #{order.order_number}
                    </span>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full ${
                        statusColors[order.status]
                      }`}
                    >
                      {order.status}
                    </span>
                    {order.payment_method && order.payment_method !== "eft" && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                        {order.payment_method === "cod" ? "COD" : order.payment_method === "momo" ? "MoMo" : order.payment_method === "ewallet" ? "eWallet" : "EFT"}
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
                    {formatPrice(order.subtotal_nad - (order.discount_nad || 0) + (order.delivery_fee_nad || 0))}
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
                    ? "Delivery"
                    : "Pickup"}
                </span>
                {order.delivery_date && (
                  <span className="text-gray-500">
                    · {order.delivery_date}
                    {order.delivery_time ? ` ${order.delivery_time}` : ""}
                  </span>
                )}
                {order.proof_of_payment_url && (
                  <a
                    href={order.proof_of_payment_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-green-600 hover:underline"
                  >
                    View proof
                  </a>
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

              <div className="mt-3 pt-3 border-t flex flex-wrap gap-2">
                <OrderActions
                  orderId={order.id}
                  currentStatus={order.status}
                  merchantIndustry={merchant.industry ?? ""}
                  merchantStoreName={merchant.store_name}
                  customerName={order.customer_name}
                  customerWhatsapp={order.customer_whatsapp}
                  orderNumber={order.order_number}
                  orderTotal={formatPrice(order.subtotal_nad - (order.discount_nad || 0) + (order.delivery_fee_nad || 0))}
                />
                <a
                  href={`/invoice/${order.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 text-sm bg-gray-50 text-gray-700 rounded-md hover:bg-gray-100"
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
                  className="px-3 py-1.5 text-sm bg-green-50 text-green-700 rounded-md hover:bg-green-100"
                >
                  WhatsApp customer
                </a>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
