import Link from "next/link";
import { Store } from "lucide-react";
import { SITE_NAME } from "@/lib/constants";

export default function StoreNotFound() {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <div
        className="bg-white rounded-2xl border border-slate-200 p-8 max-w-sm text-center shadow-sm shadow-slate-900/5"
        data-testid="store-not-found"
      >
        <div className="w-16 h-16 rounded-2xl bg-terracotta-soft text-terracotta flex items-center justify-center mx-auto mb-4">
          <Store size={30} />
        </div>
        <h1 className="text-xl font-bold text-slate-950">Store Not Found</h1>
        <p className="text-sm text-slate-500 mt-2">
          This store link may be invalid or the store may have been removed.
        </p>
        <Link
          href="/"
          className="inline-flex items-center justify-center mt-5 bg-acacia hover:bg-emerald-700 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-colors"
        >
          Back to {SITE_NAME}
        </Link>
      </div>
    </div>
  );
}
