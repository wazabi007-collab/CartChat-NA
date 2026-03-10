"use client";

import { Trash2 } from "lucide-react";

export function DeleteButton({ productId }: { productId: string }) {
  return (
    <form
      action={`/api/products?id=${productId}`}
      method="POST"
      className="ml-auto"
    >
      <button
        type="submit"
        className="flex items-center gap-1 text-xs text-gray-400 hover:text-red-600 transition-colors"
        onClick={(e) => {
          if (!confirm("Delete this product? This cannot be undone.")) {
            e.preventDefault();
          }
        }}
      >
        <Trash2 size={14} />
        Delete
      </button>
    </form>
  );
}
