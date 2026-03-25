"use client";

import { useState } from "react";
import { QrCode, Download, X } from "lucide-react";

interface StoreQRCodeProps {
  storeUrl: string;
  storeName: string;
}

export function StoreQRCode({ storeUrl, storeName }: StoreQRCodeProps) {
  const [showModal, setShowModal] = useState(false);

  // Use Google Charts QR API (free, no package needed)
  const qrSize = 300;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=${qrSize}x${qrSize}&data=${encodeURIComponent(storeUrl)}&margin=10`;

  async function handleDownload() {
    try {
      const res = await fetch(qrUrl);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${storeName.replace(/\s+/g, "-").toLowerCase()}-qr-code.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      // Fallback: open in new tab
      window.open(qrUrl, "_blank");
    }
  }

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
        title="QR Code"
      >
        <QrCode size={16} className="text-gray-500" />
      </button>

      {showModal && (
        <div
          className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center px-4"
          onClick={() => setShowModal(false)}
        >
          <div
            className="bg-white rounded-2xl p-6 max-w-xs w-full text-center shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">Store QR Code</h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={18} />
              </button>
            </div>

            <div className="bg-white border rounded-xl p-4 mb-4">
              <img
                src={qrUrl}
                alt={`QR code for ${storeName}`}
                width={qrSize}
                height={qrSize}
                className="w-full h-auto"
              />
            </div>

            <p className="text-xs text-gray-500 mb-4">
              Scan to visit <span className="font-medium">{storeName}</span>
            </p>

            <button
              onClick={handleDownload}
              className="w-full flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white font-medium py-2.5 rounded-lg transition-colors"
            >
              <Download size={16} />
              Download QR Code
            </button>

            <p className="text-[10px] text-gray-400 mt-3">
              Print on flyers, business cards, or your shop window
            </p>
          </div>
        </div>
      )}
    </>
  );
}
