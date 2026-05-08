"use client";

import { Check, QrCode, Share2, X } from "lucide-react";
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
        // Use clipboard fallback when native share is dismissed or unavailable.
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
        className="h-12 w-12 inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white text-slate-800 shadow-sm hover:border-slate-400 hover:bg-slate-50 transition"
        aria-label="Share store"
      >
        {copied ? <Check size={18} /> : <Share2 size={18} />}
      </button>
      <button
        onClick={() => setShowQR(true)}
        className="h-12 px-4 inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white text-slate-800 text-sm font-semibold shadow-sm hover:border-slate-400 hover:bg-slate-50 transition"
        aria-label="Show QR code"
      >
        <QrCode size={17} />
        QR
      </button>
      {showQR && (
        <div
          className="fixed inset-0 bg-slate-950/60 flex items-center justify-center z-50 p-6"
          onClick={() => setShowQR(false)}
        >
          <div
            className="bg-white rounded-2xl p-6 max-w-xs w-full text-center shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-bold text-slate-950">Store QR code</p>
              <button
                onClick={() => setShowQR(false)}
                className="text-slate-400 hover:text-slate-700"
                aria-label="Close QR code"
              >
                <X size={18} />
              </button>
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={qrUrl} alt="Store QR code" className="w-full rounded-xl border border-slate-100" />
            <p className="mt-3 text-xs text-slate-500 break-all">{storeUrl}</p>
          </div>
        </div>
      )}
    </>
  );
}
