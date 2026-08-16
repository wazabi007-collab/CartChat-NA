"use client";

import { useTransition } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { SORT_OPTIONS, type SortValue } from "@/lib/product-sort";

/**
 * The only interactive part of the product grid.
 *
 * Sorting drives a URL parameter so the grid itself can render on the server.
 * useTransition keeps the current results on screen while the new order is
 * fetched, rather than blanking the page — an RSC round-trip, not a reload.
 */
export function SortSelect({
  value,
  accentColor,
}: {
  value: SortValue;
  accentColor?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();

  function change(next: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (next === "default") params.delete("sort");
    else params.set("sort", next);
    // A new sort order starts at the beginning of the results.
    params.delete("page");
    const qs = params.toString();
    startTransition(() => router.push(qs ? `${pathname}?${qs}` : pathname));
  }

  return (
    <select
      aria-label="Sort products"
      value={value}
      disabled={pending}
      onChange={(e) => change(e.target.value)}
      className="cursor-pointer appearance-none rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm shadow-sm shadow-slate-900/5 focus:border-transparent focus:outline-none focus:ring-2 disabled:opacity-60"
      style={accentColor ? ({ "--tw-ring-color": accentColor } as React.CSSProperties) : undefined}
    >
      {SORT_OPTIONS.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}
