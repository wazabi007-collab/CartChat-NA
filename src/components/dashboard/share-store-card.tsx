"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Link2, MessageCircle, Check, ExternalLink } from "lucide-react";
import Link from "next/link";
import { StoreQRCode } from "./store-qr-code";

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
    const msg = `Check out my store on OshiCart! ${storeUrl}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, "_blank");
    markShared();
  }

  if (compact) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-4 mb-6 flex items-center justify-between gap-3 shadow-sm shadow-slate-900/5">
        <div className="min-w-0">
          <p className="text-xs font-medium text-slate-500">Your store link</p>
          <p className="text-sm font-bold text-slate-950 truncate">{storeUrl.replace("https://", "")}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleCopy}
            className="p-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors"
            title="Copy link"
          >
            {copied ? <Check size={16} className="text-acacia" /> : <Link2 size={16} className="text-slate-500" />}
          </button>
          <button
            onClick={handleWhatsAppShare}
            className="p-2.5 rounded-xl bg-acacia hover:bg-emerald-700 text-white transition-colors"
            title="Share on WhatsApp"
          >
            <MessageCircle size={16} />
          </button>
          <StoreQRCode storeUrl={storeUrl} storeName={storeName} />
          <Link
            href={storeUrl.replace("https://oshicart.com", "")}
            target="_blank"
            className="p-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors"
            title="View store"
          >
            <ExternalLink size={16} className="text-slate-500" />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-emerald-50 via-white to-white rounded-2xl border border-emerald-200 p-5 mb-6 shadow-sm shadow-emerald-900/5">
      <h3 className="font-bold text-emerald-950 mb-1">Your store is live</h3>
      <p className="text-sm text-emerald-700 mb-3 break-all">{storeUrl}</p>
      <div className="flex gap-2">
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 px-4 py-2 bg-white border border-emerald-200 rounded-xl text-sm font-semibold text-emerald-800 hover:bg-emerald-50 transition-colors"
        >
          {copied ? <Check size={14} /> : <Link2 size={14} />}
          {copied ? "Copied!" : "Copy Link"}
        </button>
        <button
          onClick={handleWhatsAppShare}
          className="flex items-center gap-1.5 px-4 py-2 bg-acacia rounded-xl text-sm font-semibold text-white hover:bg-emerald-700 transition-colors"
        >
          <MessageCircle size={14} />
          Share on WhatsApp
        </button>
        <StoreQRCode storeUrl={storeUrl} storeName={storeName} />
      </div>
    </div>
  );
}
