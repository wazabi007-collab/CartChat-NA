"use client";

import { useState } from "react";
import { Search, X } from "lucide-react";

export function StorefrontSearch({
  onSearch,
  accentColor,
}: {
  onSearch: (query: string) => void;
  accentColor?: string;
}) {
  const [query, setQuery] = useState("");

  function handleChange(value: string) {
    setQuery(value);
    onSearch(value);
  }

  return (
    <div className="relative">
      <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
      <input
        type="text"
        placeholder="Search products..."
        value={query}
        onChange={(e) => handleChange(e.target.value)}
        className="w-full pl-9 pr-9 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:border-transparent transition-all"
        style={accentColor ? { "--tw-ring-color": accentColor } as React.CSSProperties : undefined}
      />
      {query && (
        <button
          onClick={() => handleChange("")}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
        >
          <X size={14} />
        </button>
      )}
    </div>
  );
}
