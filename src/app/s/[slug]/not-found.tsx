import Link from "next/link";
import { SITE_NAME } from "@/lib/constants";

export default function StoreNotFound() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div
        className="bg-white rounded-lg border p-8 max-w-sm text-center"
        data-testid="store-not-found"
      >
        <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
          <span className="text-3xl">🏪</span>
        </div>
        <h1 className="text-xl font-bold text-gray-900">Store Not Found</h1>
        <p className="text-sm text-gray-500 mt-2">
          This store link may be invalid or the store may have been removed.
        </p>
        <Link
          href="/"
          className="inline-block mt-5 bg-green-600 hover:bg-green-700 text-white text-sm font-medium px-5 py-2.5 rounded-md transition-colors"
        >
          Back to {SITE_NAME}
        </Link>
      </div>
    </div>
  );
}
