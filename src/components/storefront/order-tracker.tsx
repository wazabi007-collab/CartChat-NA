"use client";

import { useState } from "react";
import { Search, Package, Clock, CheckCircle2, XCircle, Loader2 } from "lucide-react";

interface OrderItem {
  product_name: string;
  quantity: number;
  line_total: number;
}

interface Order {
  id: string;
  order_number: number;
  status: string;
  subtotal_nad: number;
  delivery_fee_nad: number;
  discount_nad: number;
  delivery_method: string;
  payment_reference: string | null;
  created_at: string;
  order_items: OrderItem[];
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: typeof Clock }> = {
  pending: { label: "Pending", color: "bg-yellow-100 text-yellow-800", icon: Clock },
  confirmed: { label: "Confirmed", color: "bg-blue-100 text-blue-800", icon: Package },
  completed: { label: "Completed", color: "bg-green-100 text-green-800", icon: CheckCircle2 },
  cancelled: { label: "Cancelled", color: "bg-red-100 text-red-800", icon: XCircle },
};

export function OrderTracker({ merchantId }: { merchantId: string }) {
  const [whatsapp, setWhatsapp] = useState("");
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleLookup(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = whatsapp.trim();
    if (!trimmed) return;

    setLoading(true);
    setError("");
    setOrders(null);

    try {
      const res = await fetch(
        `/api/orders/lookup?merchant_id=${encodeURIComponent(merchantId)}&whatsapp=${encodeURIComponent(trimmed)}`
      );
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Something went wrong");
        return;
      }

      setOrders(data.orders);
    } catch {
      setError("Failed to look up orders. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  function formatPrice(cents: number) {
    return `N$${(cents / 100).toFixed(2)}`;
  }

  return (
    <div>
      <form onSubmit={handleLookup} className="flex gap-2">
        <input
          type="tel"
          value={whatsapp}
          onChange={(e) => setWhatsapp(e.target.value)}
          placeholder="Enter your WhatsApp number (e.g. +264811234567)"
          className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
        />
        <button
          type="submit"
          disabled={loading || !whatsapp.trim()}
          className="px-4 py-2.5 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
        >
          {loading ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
          Track
        </button>
      </form>

      {error && <p className="text-red-600 text-sm mt-3">{error}</p>}

      {orders !== null && orders.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <Package size={32} className="mx-auto mb-2 text-gray-300" />
          <p className="text-sm">No orders found for this number.</p>
          <p className="text-xs text-gray-400 mt-1">Make sure you entered the same WhatsApp number you used when ordering.</p>
        </div>
      )}

      {orders && orders.length > 0 && (
        <div className="mt-4 space-y-3">
          {orders.map((order) => {
            const config = STATUS_CONFIG[order.status] || STATUS_CONFIG.pending;
            const StatusIcon = config.icon;
            const total = order.subtotal_nad + order.delivery_fee_nad - order.discount_nad;

            return (
              <div key={order.id} className="bg-white border rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-gray-900 text-sm">
                      Order #{order.order_number}
                    </span>
                    {order.payment_reference && (
                      <span className="text-xs font-mono text-gray-400">
                        {order.payment_reference}
                      </span>
                    )}
                  </div>
                  <span className={`inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full ${config.color}`}>
                    <StatusIcon size={12} />
                    {config.label}
                  </span>
                </div>

                {/* Order items */}
                <div className="space-y-1 mb-3">
                  {order.order_items.map((item, i) => (
                    <div key={i} className="flex justify-between text-sm text-gray-600">
                      <span>
                        {item.quantity}x {item.product_name}
                      </span>
                      <span>{formatPrice(item.line_total)}</span>
                    </div>
                  ))}
                </div>

                {/* Totals and info */}
                <div className="flex items-center justify-between pt-2 border-t text-sm">
                  <div className="flex items-center gap-3 text-gray-400 text-xs">
                    <span>{new Date(order.created_at).toLocaleDateString()}</span>
                    <span className="capitalize">{order.delivery_method}</span>
                  </div>
                  <span className="font-semibold text-gray-900">
                    {formatPrice(total)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
