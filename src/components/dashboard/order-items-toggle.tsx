"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, Package } from "lucide-react";
import { formatPrice } from "@/lib/utils";

interface OrderItem {
  id: string;
  product_name: string;
  product_price: number;
  quantity: number;
  line_total: number;
  variant_sku?: string | null;
  rental_start?: string | null;
  rental_end_exclusive?: string | null;
  rental_days?: number | null;
  assigned_unit?: string | null;
  returned_at?: string | null;
  hirer_id_number?: string | null;
  products?: { rental_unit?: string | null } | null;
  variant_attributes?: Record<string, string> | null;
}

interface OrderItemsToggleProps {
  items: OrderItem[];
}

export function OrderItemsToggle({ items }: OrderItemsToggleProps) {
  const [expanded, setExpanded] = useState(false);

  if (!items || items.length === 0) return null;

  return (
    <div className="mt-2">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-gray-700 transition-colors"
      >
        <Package size={12} />
        {items.length} item{items.length !== 1 ? "s" : ""}
        {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
      </button>

      {expanded && (
        <div className="mt-2 bg-gray-50 rounded-lg p-2.5 space-y-1.5">
          {items.map((item) => (
            <div key={item.id} className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-gray-400 shrink-0">{item.quantity}x</span>
                <span className="min-w-0 text-gray-700">
                  <span className="block truncate">{item.product_name}</span>
                  {item.variant_attributes && Object.keys(item.variant_attributes).length > 0 && (
                    <span className="block truncate text-[10px] text-gray-500">
                      {Object.entries(item.variant_attributes).map(([key, value]) => `${key}: ${value}`).join(" | ")}
                    </span>
                  )}
                  {item.rental_days && item.rental_start && item.rental_end_exclusive && (
                    <span className="mt-0.5 inline-block rounded bg-amber-50 px-1.5 py-0.5 text-[11px] font-bold text-amber-700">
                      {(() => {
                        // Days show the inclusive last day; nights show the
                        // check-out date itself (the stored exclusive bound).
                        const night = item.products?.rental_unit === "night";
                        const last = new Date(`${item.rental_end_exclusive}T12:00:00`);
                        if (!night) last.setDate(last.getDate() - 1);
                        const fmt = (d: Date) =>
                          d.toLocaleDateString("en-NA", { day: "numeric", month: "short" });
                        const word = night ? "night" : "day";
                        return `Hire · ${item.rental_days} ${word}${item.rental_days === 1 ? "" : "s"} · ${fmt(new Date(`${item.rental_start}T12:00:00`))} – ${fmt(last)}`;
                      })()}
                    </span>
                  )}
                  {item.hirer_id_number && (
                    <span className="block text-[10px] text-gray-500">
                      Hirer ID: {item.hirer_id_number}
                    </span>
                  )}
                  {item.assigned_unit && (
                    <span className="block text-[10px] text-gray-500">
                      Unit: {item.assigned_unit}
                    </span>
                  )}
                  {item.returned_at && (
                    <span className="mt-0.5 inline-block rounded bg-green-50 px-1.5 py-0.5 text-[10px] font-bold text-green-700">
                      Returned{" "}
                      {new Date(`${item.returned_at}T12:00:00`).toLocaleDateString("en-NA", {
                        day: "numeric",
                        month: "short",
                      })}
                    </span>
                  )}
                  {item.variant_sku && (
                    <span className="block text-[10px] uppercase tracking-wide text-gray-400">
                      SKU {item.variant_sku}
                    </span>
                  )}
                </span>
              </div>
              <span className="text-gray-600 font-medium shrink-0 ml-2">
                {formatPrice(item.line_total)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
