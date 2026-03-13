"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle, XCircle, Ban, Loader2 } from "lucide-react";

interface Props {
  reportId: string;
  merchantId: string;
}

export function ReportActions({ reportId, merchantId }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleAction(action: "reviewed" | "dismissed", suspendStore?: boolean) {
    const notes = prompt("Admin notes (optional):");
    if (notes === null) return; // cancelled

    setLoading(true);
    try {
      const res = await fetch("/api/admin/reports", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reportId,
          status: action,
          adminNotes: notes || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        alert(data.error || "Failed to update report");
        return;
      }

      // Optionally suspend the store
      if (suspendStore) {
        await fetch("/api/admin/stores", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ merchantId, status: "suspended" }),
        });
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
      <button
        onClick={() => handleAction("reviewed")}
        className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-green-50 text-green-700 rounded-md hover:bg-green-100"
        title="Mark as reviewed"
      >
        <CheckCircle size={14} />
        Reviewed
      </button>
      <button
        onClick={() => handleAction("dismissed")}
        className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-gray-100 text-gray-600 rounded-md hover:bg-gray-200"
        title="Dismiss report"
      >
        <XCircle size={14} />
        Dismiss
      </button>
      <button
        onClick={() => handleAction("reviewed", true)}
        className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-red-50 text-red-700 rounded-md hover:bg-red-100"
        title="Review and suspend the store"
      >
        <Ban size={14} />
        Suspend Store
      </button>
    </div>
  );
}
