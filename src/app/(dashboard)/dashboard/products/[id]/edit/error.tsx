"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function EditProductError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log to console for now; replace with proper error reporting service
    console.error("[EditProductError]", error);
  }, [error]);

  return (
    <div
      className="md:ml-56 flex items-center justify-center py-20"
      data-testid="edit-product-error"
    >
      <div className="bg-white rounded-lg border p-8 max-w-sm text-center">
        <p className="text-lg font-bold text-gray-900">Something went wrong</p>
        <p className="text-sm text-gray-500 mt-2">
          Failed to load the product editor. Your changes have not been lost.
        </p>
        <div className="flex gap-3 justify-center mt-5">
          <button
            onClick={reset}
            className="bg-green-600 hover:bg-green-700 text-white text-sm font-medium px-4 py-2 rounded-md transition-colors"
          >
            Try again
          </button>
          <Link
            href="/dashboard/products"
            className="text-sm text-gray-500 hover:text-gray-700 px-4 py-2"
          >
            Back to products
          </Link>
        </div>
      </div>
    </div>
  );
}
