"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { inputBase, focusGreen } from "@/lib/ui";

/** Debounced name/number filter, kept in the URL so the view is shareable. */
export function CustomerSearch({ initialValue }: { initialValue: string }) {
  const router = useRouter();
  const [value, setValue] = useState(initialValue);

  useEffect(() => {
    const timer = setTimeout(() => {
      const trimmed = value.trim();
      router.replace(trimmed ? `/dashboard/customers?q=${encodeURIComponent(trimmed)}` : "/dashboard/customers");
    }, 350);
    return () => clearTimeout(timer);
    // router is stable; re-running on it would loop
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return (
    <div className="relative">
      <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
      <input
        type="search"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Search by name or WhatsApp number"
        aria-label="Search customers"
        className={`${inputBase} ${focusGreen} pl-9`}
      />
    </div>
  );
}
