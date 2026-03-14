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
        className={`flex items-center gap-1.5 py-3 text-sm font-medium border-b-2 transition-colors ${
          activeTab === "products"
            ? "border-gray-900 text-gray-900"
            : "border-transparent text-gray-500 hover:text-gray-700"
        }`}
      >
        <ShoppingCart size={15} />
        Products
      </Link>
      <Link
        href={`/s/${slug}?tab=orders`}
        className={`flex items-center gap-1.5 py-3 text-sm font-medium border-b-2 transition-colors ${
          activeTab === "orders"
            ? "border-gray-900 text-gray-900"
            : "border-transparent text-gray-500 hover:text-gray-700"
        }`}
      >
        <ClipboardList size={15} />
        Track Order
      </Link>
    </div>
  );
}
