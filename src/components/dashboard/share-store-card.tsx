"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Link2, MessageCircle, Check, ExternalLink } from "lucide-react";
import Link from "next/link";

interface ShareStoreCardProps {
  storeUrl: string;
  storeName: string;
  merchantId: string;
  storeLinkShared: boolean;
  compact?: boolean;
}

export function ShareStoreCard({
  storeUrl,
  storeName,
  merchantId,
  storeLinkShared,
  compact,
}: ShareStoreCardProps) {
  const [copied, setCopied] = useState(false);
  const supabase = createClient();

  async function markShared() {
    if (storeLinkShared) return;
    await supabase
      .from("merchants")
      .update({ store_link_shared: true })
      .eq("id", merchantId);
  }

  async function handleCopy() {
    await navigator.clipboard.writeText(storeUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    markShared();
  }

  function handleWhatsAppShare() {
    const msg = `Check out my store on OshiCart! 🛒 ${storeUrl}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, "_blank");
    markShared();
  }

  if (compact) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs text-gray-500">Your store</p>
          <p className="text-sm font-medium text-gray-900 truncate">{storeUrl.replace("https://", "")}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleCopy}
            className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
            title="Copy link"
          >
            {copied ? <Check size={16} className="text-green-600" /> : <Link2 size={16} className="text-gray-500" />}
          </button>
          <button
            onClick={handleWhatsAppShare}
            className="p-2 rounded-lg bg-green-600 hover:bg-green-700 text-white transition-colors"
            title="Share on WhatsApp"
          >
            <MessageCircle size={16} />
          </button>
          <Link
            href={storeUrl.replace("https://oshicart.com", "")}
            target="_blank"
            className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
            title="View store"
          >
            <ExternalLink size={16} className="text-gray-500" />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-green-50 rounded-xl border border-green-200 p-5 mb-6">
      <h3 className="font-semibold text-green-900 mb-1">Your store is live!</h3>
      <p className="text-sm text-green-700 mb-3 break-all">{storeUrl}</p>
      <div className="flex gap-2">
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 px-4 py-2 bg-white border border-green-300 rounded-lg text-sm font-medium text-green-800 hover:bg-green-100 transition-colors"
        >
          {copied ? <Check size={14} /> : <Link2 size={14} />}
          {copied ? "Copied!" : "Copy Link"}
        </button>
        <button
          onClick={handleWhatsAppShare}
          className="flex items-center gap-1.5 px-4 py-2 bg-green-600 rounded-lg text-sm font-medium text-white hover:bg-green-700 transition-colors"
        >
          <MessageCircle size={14} />
          Share on WhatsApp
        </button>
      </div>
    </div>
  );
}
