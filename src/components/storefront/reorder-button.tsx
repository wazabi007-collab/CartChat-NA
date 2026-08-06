"use client";

import { useState } from "react";
import { Loader2, RotateCcw } from "lucide-react";

interface ReorderResponse {
  ok?: boolean;
  storeSlug?: string;
  items?: Array<Record<string, unknown>>;
  unavailable?: string[];
  error?: string;
}

/**
 * Rebuilds the buyer's cart from a past order and sends them to checkout.
 *
 * The server re-prices and re-checks availability against the live catalogue,
 * so the cart written here always reflects today's prices and stock — never a
 * replay of the old order. Anything no longer orderable is reported so the
 * buyer knows what changed rather than quietly receiving a shorter order.
 */
export function ReorderButton({
  orderId,
  trackingToken,
  storeSlug,
  className = "",
}: {
  orderId: string;
  trackingToken: string;
  storeSlug: string;
  className?: string;
}) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function reorder() {
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch("/api/orders/reorder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ order_id: orderId, tracking_token: trackingToken }),
      });
      const data: ReorderResponse = await res.json();

      if (!res.ok || !data.items) {
        setMessage(data.error || "Couldn't rebuild that order. Please browse the store instead.");
        setLoading(false);
        return;
      }

      if (data.items.length === 0) {
        setMessage("None of those items are available right now.");
        setLoading(false);
        return;
      }

      // Same storage key and shape the CartProvider reads.
      const slug = data.storeSlug || storeSlug;
      try {
        localStorage.setItem(`oshicart-cart-${slug}`, JSON.stringify(data.items));
      } catch {
        setMessage("Your browser is blocking storage, so the cart couldn't be saved.");
        setLoading(false);
        return;
      }

      if (data.unavailable && data.unavailable.length > 0) {
        // Surface the change before navigating, so it isn't missed.
        window.alert(
          `Added to your cart. These are no longer available and were left out:\n\n• ${data.unavailable.join(
            "\n• "
          )}`
        );
      }

      window.location.href = `/checkout/${slug}`;
    } catch {
      setMessage("Something went wrong. Please try again.");
      setLoading(false);
    }
  }

  return (
    <div className="flex-1">
      <button
        onClick={reorder}
        disabled={loading}
        className={`flex w-full items-center justify-center gap-2 rounded-xl bg-[#2B5EA7] px-4 py-3 text-sm font-medium text-white hover:bg-[#244e8a] disabled:opacity-60 ${className}`}
      >
        {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <RotateCcw className="h-5 w-5" />}
        {loading ? "Adding to cart…" : "Order this again"}
      </button>
      {message && <p className="mt-2 text-center text-xs text-red-600">{message}</p>}
    </div>
  );
}
