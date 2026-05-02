"use client";
import { useState } from "react";

export function ShareActions({ storeUrl, qrUrl }: { storeUrl: string; qrUrl: string }) {
  const [copied, setCopied] = useState(false);
  const [showQR, setShowQR] = useState(false);

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ url: storeUrl, title: "Check out this store" });
        return;
      } catch {
        // fall through to clipboard fallback
      }
    }
    await navigator.clipboard.writeText(storeUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <>
      <button
        onClick={handleShare}
        className="px-3 py-2.5 rounded-lg border border-walnut text-walnut hover:bg-walnut hover:text-sand transition text-sm font-semibold"
        aria-label="Share store"
      >
        {copied ? "✓" : "⤴"}
      </button>
      <button
        onClick={() => setShowQR(true)}
        className="px-3 py-2.5 rounded-lg border border-walnut text-walnut hover:bg-walnut hover:text-sand transition text-sm font-semibold"
        aria-label="Show QR code"
      >
        ⊞ QR
      </button>
      {showQR && (
        <div
          className="fixed inset-0 bg-walnut/60 flex items-center justify-center z-50 p-6"
          onClick={() => setShowQR(false)}
        >
          <div
            className="bg-white rounded-2xl p-6 max-w-xs w-full text-center"
            onClick={(e) => e.stopPropagation()}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={qrUrl} alt="Store QR code" className="w-full" />
            <p className="mt-3 text-xs text-walnut-2 break-all">{storeUrl}</p>
            <button
              onClick={() => setShowQR(false)}
              className="mt-4 w-full py-2 rounded-lg bg-walnut text-sand font-semibold text-sm"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </>
  );
}
