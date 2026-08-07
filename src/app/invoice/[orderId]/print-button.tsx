"use client";

import { Printer } from "lucide-react";

export function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-acacia px-4 text-sm font-bold text-white transition-colors hover:bg-green-700"
    >
      <Printer size={16} />
      Print or save as PDF
    </button>
  );
}
