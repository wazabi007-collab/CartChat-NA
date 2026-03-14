"use client";

import { useState } from "react";
import { MessageCircle, X, Mail } from "lucide-react";

const SUPPORT_WHATSAPP_1 = "+264816274823";
const SUPPORT_WHATSAPP_2 = "+264816262961";
const SUPPORT_EMAIL = "info@octovianexus.com";

export function SupportButton() {
  const [open, setOpen] = useState(false);

  const waLink1 = `https://wa.me/${SUPPORT_WHATSAPP_1.replace(/\D/g, "")}?text=${encodeURIComponent("Hi OshiCart, I need help with...")}`;
  const waLink2 = `https://wa.me/${SUPPORT_WHATSAPP_2.replace(/\D/g, "")}?text=${encodeURIComponent("Hi OshiCart, I need help with...")}`;

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col items-end gap-3">
      {/* Expanded panel */}
      {open && (
        <div className="bg-white rounded-xl shadow-xl border border-gray-200 w-72 overflow-hidden animate-in fade-in slide-in-from-bottom-2">
          {/* Header */}
          <div className="bg-[#25D366] px-4 py-3 flex items-center justify-between">
            <div>
              <p className="text-white font-semibold text-sm">OshiCart Support</p>
              <p className="text-white/80 text-xs">We typically reply within minutes</p>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="text-white/80 hover:text-white transition-colors"
              aria-label="Close support"
            >
              <X size={18} />
            </button>
          </div>

          {/* Options */}
          <div className="p-3 space-y-2">
            <a
              href={waLink1}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors group"
            >
              <div className="w-10 h-10 bg-[#25D366] rounded-full flex items-center justify-center flex-shrink-0">
                <MessageCircle size={20} className="text-white" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-900 group-hover:text-[#25D366] transition-colors">
                  WhatsApp Support
                </p>
                <p className="text-xs text-gray-500">+264 81 627 4823</p>
              </div>
            </a>

            <a
              href={waLink2}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors group"
            >
              <div className="w-10 h-10 bg-[#25D366] rounded-full flex items-center justify-center flex-shrink-0">
                <MessageCircle size={20} className="text-white" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-900 group-hover:text-[#25D366] transition-colors">
                  WhatsApp Sales
                </p>
                <p className="text-xs text-gray-500">+264 81 626 2961</p>
              </div>
            </a>

            <a
              href={`mailto:${SUPPORT_EMAIL}`}
              className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors group"
            >
              <div className="w-10 h-10 bg-[#2B5EA7] rounded-full flex items-center justify-center flex-shrink-0">
                <Mail size={20} className="text-white" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-900 group-hover:text-[#2B5EA7] transition-colors">
                  Email Us
                </p>
                <p className="text-xs text-gray-500">{SUPPORT_EMAIL}</p>
              </div>
            </a>
          </div>
        </div>
      )}

      {/* Floating button */}
      <button
        onClick={() => setOpen(!open)}
        className="w-14 h-14 bg-[#25D366] rounded-full shadow-lg hover:shadow-xl flex items-center justify-center transition-all hover:scale-105 active:scale-95"
        aria-label="Contact support"
      >
        {open ? (
          <X size={24} className="text-white" />
        ) : (
          <MessageCircle size={24} className="text-white" />
        )}
      </button>
    </div>
  );
}
