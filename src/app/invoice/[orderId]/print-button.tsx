"use client";

export function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      className="px-4 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700"
    >
      Print / Save PDF
    </button>
  );
}
