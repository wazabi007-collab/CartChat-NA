"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

interface OrderActionsProps {
  orderId: string;
  currentStatus: string;
}

export function OrderActions({ orderId, currentStatus }: OrderActionsProps) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  async function updateStatus(newStatus: string) {
    setLoading(true);
    await supabase
      .from("orders")
      .update({ status: newStatus })
      .eq("id", orderId);
    router.refresh();
    setLoading(false);
  }

  if (loading) {
    return <span className="text-sm text-gray-400">Updating...</span>;
  }

  return (
    <>
      {currentStatus === "pending" && (
        <>
          <button
            onClick={() => updateStatus("confirmed")}
            className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Confirm
          </button>
          <button
            onClick={() => updateStatus("cancelled")}
            className="px-3 py-1.5 text-sm bg-red-50 text-red-600 rounded-md hover:bg-red-100"
          >
            Cancel
          </button>
        </>
      )}
      {currentStatus === "confirmed" && (
        <button
          onClick={() => updateStatus("completed")}
          className="px-3 py-1.5 text-sm bg-green-600 text-white rounded-md hover:bg-green-700"
        >
          Mark Completed
        </button>
      )}
      {currentStatus === "cancelled" && (
        <span className="text-xs text-gray-400">Order cancelled</span>
      )}
      {currentStatus === "completed" && (
        <span className="text-xs text-green-600">Order complete</span>
      )}
    </>
  );
}
