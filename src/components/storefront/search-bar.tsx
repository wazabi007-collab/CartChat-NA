"use client";

import { useEffect, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search, X } from "lucide-react";

export function StorefrontSearch({
  accentColor,
  initialQuery = "",
}: {
  accentColor?: string;
  initialQuery?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(initialQuery);
  const [, startTransition] = useTransition();

  useEffect(() => {
    setQuery(initialQuery);
  }, [initialQuery]);

  function updateUrl(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("page");
    if (value.trim()) {
      params.set("search", value.trim());
    } else {
      params.delete("search");
    }
    const next = params.toString();
    startTransition(() => {
      router.replace(next ? `${pathname}?${next}` : pathname, { scroll: false });
    });
  }

  function handleChange(value: string) {
    setQuery(value);
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (query.trim() !== initialQuery.trim()) {
        updateUrl(query);
      }
    }, 450);

    return () => window.clearTimeout(timer);
  }, [query, initialQuery]);

  return (
    <div className="relative">
      <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
      <input
        type="text"
        placeholder="Search name or SKU..."
        value={query}
        onChange={(e) => handleChange(e.target.value)}
        className="w-full pl-9 pr-9 py-2.5 border border-slate-200 rounded-xl text-sm bg-white shadow-sm shadow-slate-900/5 focus:outline-none focus:ring-2 focus:border-transparent transition-all"
        style={accentColor ? { "--tw-ring-color": accentColor } as React.CSSProperties : undefined}
      />
      {query && (
        <button
          onClick={() => handleChange("")}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
        >
          <X size={14} />
        </button>
      )}
    </div>
  );
}
