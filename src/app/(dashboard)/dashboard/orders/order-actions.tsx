"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { getOrderMessage, type NotifiableStatus } from "@/lib/industry";
import { whatsappLink } from "@/lib/utils";

const VALID_TRANSITIONS: Record<string, string[]> = {
  pending: ["confirmed", "cancelled"],
  confirmed: ["ready", "completed", "cancelled"],
  ready: ["completed", "cancelled"],
  completed: [],
  cancelled: [],
};

interface OrderActionsProps {
  orderId: string;
  currentStatus: string;
  merchantId: string;
  merchantIndustry: string;
  merchantStoreName: string;
  customerName: string;
  customerWhatsapp: string;
  orderNumber: number;
  orderTotal: string;
}

export function OrderActions({
  orderId,
  currentStatus,
  merchantId,
  merchantIndustry,
  merchantStoreName,
  customerName,
  customerWhatsapp,
  orderNumber,
  orderTotal,
}: OrderActionsProps) {
  const [loading, setLoading] = useState(false);
  const [notifyStatus, setNotifyStatus] = useState<NotifiableStatus | null>(null);
  const router = useRouter();
  const supabase = createClient();

  async function updateStatus(newStatus: string) {
    const allowed = VALID_TRANSITIONS[currentStatus] || [];
    if (!allowed.includes(newStatus)) {
      return;
    }

    setLoading(true);
    const { error } = await supabase
      .from("orders")
      .update({ status: newStatus })
      .eq("id", orderId);
    setLoading(false);

    if (error) {
      router.refresh();
      return;
    }

    // Sync analytics after status change
    fetch("/api/analytics/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ merchant_id: merchantId }),
    }).catch(() => {});

    // Auto-send WhatsApp notification via Business API
    if (customerWhatsapp && ["confirmed", "ready", "completed", "cancelled"].includes(newStatus)) {
      const templateMap: Record<string, string> = {
        confirmed: "order_confirmed",
        ready: "order_ready",
        completed: "order_completed",
        cancelled: "order_cancelled",
      };
      const templateName = templateMap[newStatus];
      const baseVars = [customerName || "Customer", String(orderNumber), merchantStoreName];
      // order_completed includes total
      const variables = newStatus === "completed"
        ? [...baseVars, orderTotal || "N$0.00"]
        : baseVars;

      fetch("/api/whatsapp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          merchant_id: merchantId,
          order_id: orderId,
          template_name: templateName,
          recipient_phone: customerWhatsapp,
          variables,
        }),
      }).catch(() => {});
    }

    if (
      (newStatus === "confirmed" || newStatus === "completed" || newStatus === "cancelled") &&
      customerWhatsapp
    ) {
      setNotifyStatus(newStatus as NotifiableStatus);
      return;
    }
    router.refresh();
  }

  function dismiss() {
    setNotifyStatus(null);
    router.refresh();
  }

  if (loading) {
    return <span className="text-sm text-gray-400">Updating...</span>;
  }

  if (notifyStatus) {
    const message = getOrderMessage(merchantIndustry, notifyStatus, {
      customerName,
      orderNumber,
      storeName: merchantStoreName,
      total: orderTotal || undefined,
    });
    const href = whatsappLink(customerWhatsapp, message);

    return (
      <div className="flex items-center gap-2">
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-green-600 text-white rounded-md hover:bg-green-700"
          onClick={() => {
            setTimeout(() => {
              setNotifyStatus(null);
              router.refresh();
            }, 500);
          }}
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
            <path d="M12 0C5.373 0 0 5.373 0 12c0 2.625.846 5.059 2.284 7.034L.789 23.492a.5.5 0 00.61.609l4.458-1.495A11.952 11.952 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-2.331 0-4.512-.637-6.39-1.747l-.446-.27-2.633.883.883-2.633-.27-.446A9.96 9.96 0 012 12C2 6.486 6.486 2 12 2s10 4.486 10 10-4.486 10-10 10z" />
          </svg>
          Notify customer
        </a>
        <button
          onClick={dismiss}
          className="p-1 text-gray-400 hover:text-gray-600 rounded"
          aria-label="Dismiss"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    );
  }

  const validNext = VALID_TRANSITIONS[currentStatus] || [];

  if (validNext.length === 0) {
    return (
      <span className={`text-xs ${currentStatus === "completed" ? "text-green-600" : "text-gray-400"}`}>
        {currentStatus === "completed" ? "Order complete" : "Order cancelled"}
      </span>
    );
  }

  return (
    <>
      {validNext.includes("confirmed") && (
        <button
          onClick={() => updateStatus("confirmed")}
          className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          Confirm
        </button>
      )}
      {validNext.includes("ready") && (
        <button
          onClick={() => updateStatus("ready")}
          className="px-3 py-1.5 text-sm bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
        >
          Mark Ready
        </button>
      )}
      {validNext.includes("completed") && (
        <button
          onClick={() => updateStatus("completed")}
          className="px-3 py-1.5 text-sm bg-green-600 text-white rounded-md hover:bg-green-700"
        >
          Mark Completed
        </button>
      )}
      {validNext.includes("cancelled") && (
        <button
          onClick={() => updateStatus("cancelled")}
          className="px-3 py-1.5 text-sm bg-red-50 text-red-600 rounded-md hover:bg-red-100"
        >
          Cancel
        </button>
      )}
    </>
  );
}
