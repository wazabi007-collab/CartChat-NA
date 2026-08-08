import Link from "next/link";
import { LayoutDashboard, Share2, Store } from "lucide-react";

/**
 * Shown to a merchant looking at their own storefront.
 *
 * Storefront pages carry no navigation at all — deliberately, since they are
 * customer-facing. The side effect was that a merchant who opened their own
 * store link had no visible way back to the dashboard and had to know to type
 * the address, which is the single most common "how do I get back in?"
 * complaint.
 *
 * Only the owner sees this. Shoppers get the storefront untouched.
 */
export function OwnerBar() {
  return (
    <div className="sticky top-0 z-50 bg-slate-900 text-white print:hidden">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-2 px-4 py-2 text-sm">
        <p className="flex items-center gap-1.5 font-bold">
          <Store size={15} />
          <span>This is your store — customers see this page</span>
        </p>
        <div className="flex items-center gap-2">
          <Link
            href="/dashboard/share"
            className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 font-semibold transition-colors hover:bg-white/15"
          >
            <Share2 size={14} />
            Share
          </Link>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 rounded-md bg-acacia px-2.5 py-1 font-bold transition-colors hover:bg-green-700"
          >
            <LayoutDashboard size={14} />
            My dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
