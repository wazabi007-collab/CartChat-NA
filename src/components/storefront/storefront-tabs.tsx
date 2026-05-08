"use client";

import Link from "next/link";
import { ShoppingCart, ClipboardList } from "lucide-react";

export function StorefrontTabs({
  slug,
  activeTab,
}: {
  slug: string;
  activeTab: "products" | "orders";
}) {
  return (
    <div className="flex gap-6">
      <Link
        href={`/s/${slug}`}
        className={`flex items-center gap-1.5 py-3 text-sm font-semibold border-b-2 transition-colors ${
          activeTab === "products"
            ? "border-terracotta text-slate-950"
            : "border-transparent text-slate-500 hover:text-slate-800"
        }`}
      >
        <ShoppingCart size={15} />
        Products
      </Link>
      <Link
        href={`/s/${slug}?tab=orders`}
        className={`flex items-center gap-1.5 py-3 text-sm font-semibold border-b-2 transition-colors ${
          activeTab === "orders"
            ? "border-terracotta text-slate-950"
            : "border-transparent text-slate-500 hover:text-slate-800"
        }`}
      >
        <ClipboardList size={15} />
        Track Order
      </Link>
    </div>
  );
}
