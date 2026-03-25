"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { statusColors, statusPill } from "@/lib/ui";
import { track } from "@/lib/track";
import { ChevronRight, Loader2 } from "lucide-react";

// Linear state machine: pending → confirmed → ready → completed
const NEXT_STATUS: Record<string, string> = {
  pending: "confirmed",
  confirmed: "ready",
  ready: "completed",
};

const NEXT_LABEL: Record<string, string> = {
  pending: "Confirmed",
  confirmed: "Ready",
  ready: "Completed",
};

interface QuickStatusProps {
  orderId: string;
  currentStatus: string;
  merchantId: string;
  merchantIndustry: string;
  merchantStoreName: string;
  customerName: string;
  customerWhatsapp: string;
  orderNumber: number;
  trackingToken: string;
  deliveryMethod: string;
}

export function QuickStatus({
  orderId,
  currentStatus,
  merchantId,
  merchantStoreName,
  customerName,
  customerWhatsapp,
  orderNumber,
  trackingToken,
  deliveryMethod,
}: QuickStatusProps) {
  const [confirming, setConfirming] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const nextStatus = NEXT_STATUS[currentStatus];
  const nextLabel = NEXT_LABEL[currentStatus];
  const isTappable = Boolean(nextStatus);

  async function handleAdvance() {
    if (!nextStatus) return;

    setConfirming(false);
    setLoading(true);

    track("order_status_changed", {
      order_id: orderId,
      from_status: currentStatus,
      to_status: nextStatus,
      order_number: orderNumber,
    });

    const { error } = await supabase.rpc("append_order_status", {
      p_order_id: orderId,
      p_status: nextStatus,
    });

    if (error) {
      setLoading(false);
      router.refresh();
      return;
    }

    // Sync analytics
    fetch("/api/analytics/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ merchant_id: merchantId }),
    }).catch(() => {});

    // Send WhatsApp notification via Business API
    if (
      customerWhatsapp &&
      ["confirmed", "ready", "completed"].includes(nextStatus)
    ) {
      const templateMap: Record<string, string> = {
        confirmed: "order_confirmed",
        ready: "order_ready",
        completed: "order_completed",
      };

      let variables: string[];
      let buttonParams: string[] | undefined;

      switch (nextStatus) {
        case "confirmed":
          variables = [
            customerName || "Customer",
            String(orderNumber),
            merchantStoreName,
          ];
          buttonParams = [trackingToken];
          break;
        case "ready": {
          const fulfillmentText =
            deliveryMethod === "delivery"
              ? "out for delivery"
              : "ready for pickup. Please collect at your earliest convenience";
          variables = [
            customerName || "Customer",
            String(orderNumber),
            merchantStoreName,
            fulfillmentText,
          ];
          buttonParams = [trackingToken];
          break;
        }
        case "completed":
          variables = [
            customerName || "Customer",
            String(orderNumber),
            merchantStoreName,
          ];
          buttonParams = [trackingToken];
          break;
        default:
          variables = [];
      }

      fetch("/api/whatsapp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          merchant_id: merchantId,
          order_id: orderId,
          template_name: templateMap[nextStatus],
          recipient_phone: customerWhatsapp,
          variables,
          button_params: buttonParams,
        }),
      }).catch(() => {});
    }

    setLoading(false);
    router.refresh();
  }

  // Loading state
  if (loading) {
    return (
      <span className={`${statusPill} ${statusColors[currentStatus] || ""} inline-flex items-center gap-1`}>
        <Loader2 size={10} className="animate-spin" />
        Updating…
      </span>
    );
  }

  // Confirming state: inline "Move to X?" prompt
  if (confirming && nextStatus) {
    return (
      <span className="inline-flex items-center gap-1.5">
        <span className="text-xs text-gray-600">
          Move to <strong>{nextLabel}</strong>?
        </span>
        <button
          onClick={handleAdvance}
          className="px-2 py-0.5 text-xs font-medium bg-green-600 text-white rounded-full hover:bg-green-700 transition-colors"
        >
          Yes
        </button>
        <button
          onClick={() => setConfirming(false)}
          className="px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-600 rounded-full hover:bg-gray-200 transition-colors"
        >
          No
        </button>
      </span>
    );
  }

  // Default: status pill — tappable if there's a next state
  return (
    <span className="inline-flex items-center gap-1">
      <button
        onClick={isTappable ? () => setConfirming(true) : undefined}
        disabled={!isTappable}
        className={`${statusPill} ${statusColors[currentStatus] || ""} ${
          isTappable ? "cursor-pointer active:opacity-70" : "cursor-default"
        }`}
        aria-label={isTappable ? `Advance to ${nextLabel}` : undefined}
      >
        {currentStatus}
      </button>
      {isTappable && (
        <span className="text-[10px] text-gray-400 flex items-center gap-0.5 select-none">
          <ChevronRight size={10} />
          {nextLabel}
        </span>
      )}
    </span>
  );
}
