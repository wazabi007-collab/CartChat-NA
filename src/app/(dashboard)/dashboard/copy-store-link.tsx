"use client";

import { useState } from "react";
import { Copy, Check, Share2, MessageCircle, Link as LinkIcon } from "lucide-react";

export function CopyStoreLink({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);
  const [copiedMessage, setCopiedMessage] = useState(false);

  async function copyText(text: string, setter: (v: boolean) => void) {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const el = document.createElement("textarea");
      el.value = text;
      el.setAttribute("readonly", "");
      el.style.position = "absolute";
      el.style.left = "-9999px";
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
    }
    setter(true);
    setTimeout(() => setter(false), 2000);
  }

  const shareMessage = `Check out my store on OshiCart! Browse products, place your order, and pay easily.\n\n${url}`;

  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(shareMessage)}`;

  return (
    <div className="bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 rounded-xl p-4 mb-6">
      <div className="flex items-center gap-2 mb-3">
        <Share2 size={18} className="text-green-600" />
        <h3 className="font-semibold text-gray-900 text-sm">Share Your Store</h3>
      </div>

      {/* Store link */}
      <div className="bg-white rounded-lg border border-gray-200 px-3 py-2.5 flex items-center gap-2 mb-3">
        <LinkIcon size={14} className="text-gray-400 flex-shrink-0" />
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          data-testid="store-share-link"
          className="text-green-600 hover:underline text-sm font-medium truncate flex-1"
        >
          {url}
        </a>
        <button
          onClick={() => copyText(url, setCopied)}
          data-testid="copy-store-link-btn"
          className="flex-shrink-0 px-3 py-1 rounded-md text-xs font-medium bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors flex items-center gap-1"
        >
          {copied ? <Check size={12} className="text-green-600" /> : <Copy size={12} />}
          {copied ? "Copied!" : "Copy"}
        </button>
      </div>

      {/* Action buttons */}
      <div className="flex gap-2">
        <a
          href={whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg transition-colors"
        >
          <MessageCircle size={14} />
          Share via WhatsApp
        </a>
        <button
          onClick={() => copyText(shareMessage, setCopiedMessage)}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 border border-gray-300 hover:bg-gray-50 text-gray-700 text-sm font-medium rounded-lg transition-colors"
        >
          <Copy size={14} />
          {copiedMessage ? "Message Copied!" : "Copy Share Message"}
        </button>
      </div>
    </div>
  );
}
