"use client";

import { useState, useEffect, useCallback } from "react";
import { formatPrice } from "@/lib/utils";

interface StatusEntry {
  status: string;
  at: string;
}

interface OrderItem {
  id: string;
  product_name: string;
  product_price: number;
  quantity: number;
  line_total: number;
}

interface Merchant {
  store_name: string;
  store_slug: string;
  whatsapp_number: string;
}

interface Order {
  id: string;
  order_number: number;
  status: string;
  status_history: StatusEntry[];
  created_at: string;
  customer_name: string;
  customer_whatsapp: string;
  delivery_method: string;
  delivery_address: string | null;
  delivery_date: string | null;
  delivery_time: string | null;
  notes: string | null;
  subtotal_nad: number;
  delivery_fee_nad: number;
  discount_nad: number;
  payment_method: string;
  payment_reference: string | null;
  proof_of_payment_url: string | null;
  tracking_token: string;
  merchants: Merchant;
  order_items: OrderItem[];
}

const STEPS = ["pending", "confirmed", "ready", "completed"] as const;
const STEP_LABELS: Record<string, string> = {
  pending: "Order Placed",
  confirmed: "Confirmed",
  ready: "Ready",
  completed: "Completed",
};

function getStepIndex(status: string): number {
  const idx = STEPS.indexOf(status as typeof STEPS[number]);
  return idx >= 0 ? idx : 0;
}

function formatTime(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleTimeString("en-NA", { hour: "2-digit", minute: "2-digit" });
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-NA", { month: "short", day: "numeric", year: "numeric" });
}

export function TrackerClient({
  initialOrder,
  token,
}: {
  initialOrder: Order;
  token: string;
}) {
  const [order, setOrder] = useState<Order>(initialOrder);
  const [showAllItems, setShowAllItems] = useState(false);
  const [uploading, setUploading] = useState(false);

  const merchant = order.merchants;
  const isCancelled = order.status === "cancelled";
  const currentStep = getStepIndex(order.status);
  const total = order.subtotal_nad - (order.discount_nad || 0) + (order.delivery_fee_nad || 0);

  const statusTimestamp = useCallback(
    (status: string): string | null => {
      const entry = order.status_history?.find((e: StatusEntry) => e.status === status);
      return entry ? entry.at : null;
    },
    [order.status_history]
  );

  // Auto-poll every 60 seconds
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;

    function poll() {
      if (document.hidden) return;
      fetch(`/api/orders/track/${token}`)
        .then((r) => r.json())
        .then((data) => {
          if (data.order) setOrder(data.order);
        })
        .catch(() => {});
    }

    interval = setInterval(poll, 60000);

    function onVisibility() {
      if (!document.hidden) poll();
    }
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [token]);

  // POP upload handler
  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("order_id", order.id);
      formData.append("customer_whatsapp", order.customer_whatsapp);

      const res = await fetch("/api/orders/upload-pop", {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        // Re-fetch order to show updated POP status
        const data = await fetch(`/api/orders/track/${token}`).then((r) => r.json());
        if (data.order) setOrder(data.order);
      }
    } catch {
      // Silent fail
    } finally {
      setUploading(false);
    }
  }

  const needsPayment =
    !isCancelled &&
    order.payment_method !== "cod" &&
    !order.proof_of_payment_url &&
    order.status !== "completed";

  const items = order.order_items || [];
  const displayItems = showAllItems ? items : items.slice(0, 3);
  const hasMore = items.length > 3;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-lg mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">{merchant.store_name}</p>
              <h1 className="text-lg font-bold text-gray-900">
                Order #{order.order_number}
              </h1>
            </div>
            <span
              className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                isCancelled
                  ? "bg-red-100 text-red-800"
                  : order.status === "completed"
                  ? "bg-green-100 text-green-800"
                  : order.status === "ready"
                  ? "bg-indigo-100 text-indigo-800"
                  : order.status === "confirmed"
                  ? "bg-blue-100 text-blue-800"
                  : "bg-yellow-100 text-yellow-800"
              }`}
            >
              {isCancelled ? "Cancelled" : STEP_LABELS[order.status] || order.status}
            </span>
          </div>
          <p className="text-xs text-gray-400 mt-0.5">{formatDate(order.created_at)}</p>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6 pb-28 space-y-5">
        {/* Cancelled banner */}
        {isCancelled && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4">
            <p className="text-red-800 font-medium text-sm">This order has been cancelled.</p>
            {statusTimestamp("cancelled") && (
              <p className="text-red-600 text-xs mt-1">
                Cancelled at {formatTime(statusTimestamp("cancelled")!)}
              </p>
            )}
          </div>
        )}

        {/* Visual Stepper */}
        {!isCancelled && (
          <div className="bg-white rounded-xl p-5 shadow-sm">
            <div className="space-y-0">
              {STEPS.map((step, idx) => {
                const isCompleted = idx < currentStep;
                const isCurrent = idx === currentStep;
                const isUpcoming = idx > currentStep;
                const ts = statusTimestamp(step);
                const isLast = idx === STEPS.length - 1;

                return (
                  <div key={step} className="flex gap-3">
                    {/* Circle + Line */}
                    <div className="flex flex-col items-center">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                          isCompleted
                            ? "bg-[#4A9B3E] text-white"
                            : isCurrent
                            ? "bg-[#2B5EA7] text-white animate-pulse"
                            : "border-2 border-gray-300 text-gray-300"
                        }`}
                      >
                        {isCompleted ? (
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        ) : (
                          <span className="text-xs font-bold">{idx + 1}</span>
                        )}
                      </div>
                      {!isLast && (
                        <div
                          className={`w-0.5 h-8 ${
                            isCompleted ? "bg-[#4A9B3E]" : "bg-gray-200"
                          }`}
                        />
                      )}
                    </div>

                    {/* Label + Time */}
                    <div className={`pt-1 pb-4 ${isUpcoming ? "opacity-40" : ""}`}>
                      <p
                        className={`text-sm font-medium ${
                          isCurrent ? "text-[#2B5EA7]" : isCompleted ? "text-gray-900" : "text-gray-400"
                        }`}
                      >
                        {STEP_LABELS[step]}
                      </p>
                      {ts && (
                        <p className="text-xs text-gray-400 mt-0.5">{formatTime(ts)}</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Payment Section */}
        {needsPayment && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
            <p className="text-amber-800 font-medium text-sm mb-2">Payment pending</p>
            <p className="text-amber-700 text-xs mb-3">
              Upload your proof of payment to confirm your order.
            </p>
            {order.payment_reference && (
              <p className="text-xs text-amber-600 mb-3">
                Reference: <span className="font-mono font-bold">{order.payment_reference}</span>
              </p>
            )}
            <label
              className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium cursor-pointer ${
                uploading
                  ? "bg-gray-200 text-gray-500"
                  : "bg-amber-600 text-white hover:bg-amber-700"
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              {uploading ? "Uploading..." : "Upload Proof of Payment"}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleUpload}
                disabled={uploading}
              />
            </label>
          </div>
        )}

        {order.proof_of_payment_url && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-4">
            <p className="text-green-800 text-sm font-medium flex items-center gap-1.5">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Payment proof received
            </p>
          </div>
        )}

        {order.payment_method === "cod" && !isCancelled && order.status !== "completed" && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <p className="text-blue-800 text-sm font-medium">
              Cash on Delivery — {formatPrice(total)} due
            </p>
          </div>
        )}

        {/* Items */}
        <div className="bg-white rounded-xl p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">Items</h3>
          <div className="divide-y">
            {displayItems.map((item) => (
              <div key={item.id} className="flex justify-between py-2 text-sm">
                <div>
                  <span className="text-gray-900">{item.product_name}</span>
                  <span className="text-gray-400 ml-1">x{item.quantity}</span>
                </div>
                <span className="text-gray-700 font-medium">{formatPrice(item.line_total)}</span>
              </div>
            ))}
          </div>
          {hasMore && !showAllItems && (
            <button
              onClick={() => setShowAllItems(true)}
              className="text-xs text-[#2B5EA7] hover:underline mt-2"
            >
              Show all {items.length} items
            </button>
          )}
        </div>

        {/* Totals */}
        <div className="bg-white rounded-xl p-5 shadow-sm">
          <div className="space-y-1.5 text-sm">
            <div className="flex justify-between text-gray-600">
              <span>Subtotal</span>
              <span>{formatPrice(order.subtotal_nad)}</span>
            </div>
            {order.delivery_fee_nad > 0 && (
              <div className="flex justify-between text-gray-600">
                <span>Delivery fee</span>
                <span>{formatPrice(order.delivery_fee_nad)}</span>
              </div>
            )}
            {order.discount_nad > 0 && (
              <div className="flex justify-between text-green-600">
                <span>Discount</span>
                <span>-{formatPrice(order.discount_nad)}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-gray-900 pt-1.5 border-t">
              <span>Total</span>
              <span>{formatPrice(total)}</span>
            </div>
          </div>
        </div>

        {/* Delivery/Pickup Info */}
        <div className="bg-white rounded-xl p-5 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-900 mb-2">
            {order.delivery_method === "delivery" ? "Delivery Details" : "Pickup Details"}
          </h3>
          <div className="text-sm text-gray-600 space-y-1">
            <p className="capitalize">{order.delivery_method}</p>
            {order.delivery_address && <p>{order.delivery_address}</p>}
            {order.delivery_date && (
              <p>
                {formatDate(order.delivery_date)}
                {order.delivery_time && ` • ${order.delivery_time}`}
              </p>
            )}
            {order.notes && (
              <p className="text-gray-400 italic">&quot;{order.notes}&quot;</p>
            )}
          </div>
        </div>
      </div>

      {/* Sticky Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg z-20">
        <div className="max-w-lg mx-auto px-4 py-3 flex gap-3">
          <a
            href={`https://wa.me/${merchant.whatsapp_number.replace(/\D/g, "")}?text=${encodeURIComponent(
              `Hi, I'm checking on my order #${order.order_number} from ${merchant.store_name}`
            )}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-white font-medium text-sm"
            style={{ backgroundColor: "#25D366" }}
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
              <path d="M12 0C5.373 0 0 5.373 0 12c0 2.625.846 5.059 2.284 7.034L.789 23.492a.5.5 0 00.61.609l4.458-1.495A11.952 11.952 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-2.331 0-4.512-.637-6.39-1.747l-.446-.27-2.633.883.883-2.633-.27-.446A9.96 9.96 0 012 12C2 6.486 6.486 2 12 2s10 4.486 10 10-4.486 10-10 10z" />
            </svg>
            Chat with Seller
          </a>
          {order.status === "completed" && (
            <a
              href={`/s/${merchant.store_slug}`}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-[#2B5EA7] text-white font-medium text-sm hover:bg-[#244e8a]"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Re-order
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
