"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle, XCircle, Ban, Loader2 } from "lucide-react";

interface Props {
  merchantId: string;
  currentStatus: string;
}

export function StoreActions({ merchantId, currentStatus }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function updateStatus(newStatus: string) {
    if (!confirm(`Are you sure you want to set this store to "${newStatus}"?`)) return;

    setLoading(true);
    try {
      const res = await fetch("/api/admin/stores", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ merchantId, status: newStatus }),
      });

      if (!res.ok) {
        const data = await res.json();
        alert(data.error || "Failed to update store status");
        return;
      }

      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return <Loader2 size={18} className="animate-spin text-gray-400" />;
  }

  return (
    <div className="flex items-center gap-2 flex-shrink-0">
      {currentStatus !== "active" && (
        <button
          onClick={() => updateStatus("active")}
          className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-green-50 text-green-700 rounded-md hover:bg-green-100 transition-colors"
        >
          <CheckCircle size={14} />
          Approve
        </button>
      )}
      {currentStatus !== "suspended" && currentStatus !== "banned" && (
        <button
          onClick={() => updateStatus("suspended")}
          className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-red-50 text-red-700 rounded-md hover:bg-red-100 transition-colors"
        >
          <XCircle size={14} />
          Suspend
        </button>
      )}
      {currentStatus !== "banned" && (
        <button
          onClick={() => updateStatus("banned")}
          className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
        >
          <Ban size={14} />
          Ban
        </button>
      )}
    </div>
  );
}
