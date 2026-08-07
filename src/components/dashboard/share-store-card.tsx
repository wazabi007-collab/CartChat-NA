"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Link2, Check, ExternalLink } from "lucide-react";
import Link from "next/link";
import { StoreQRCode } from "./store-qr-code";
import { WhatsAppIcon } from "@/components/whatsapp-icon";

interface ShareStoreCardProps {
  storeUrl: string;
  storeName: string;
  merchantId: string;
  storeLinkShared: boolean;
  compact?: boolean;
  /** Omit to assume listed; false shows the "add a product first" warning. */
  hasProducts?: boolean;
}

export function ShareStoreCard({
  storeUrl,
  storeName,
  merchantId,
  storeLinkShared,
  compact,
  hasProducts,
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
            <WhatsAppIcon size={16} />
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

  // "Live" is only true once there is something to buy. Telling a merchant with
  // an empty catalogue that their store is live is how stores end up shared to
  // customers who arrive at nothing — and it hides why they aren't in Browse
  // Stores, which needs at least one product.
  const isListed = hasProducts !== false;

  return (
    <div className="bg-gradient-to-br from-emerald-50 via-white to-white rounded-2xl border border-emerald-200 p-5 mb-6 shadow-sm shadow-emerald-900/5">
      <h3 className="font-bold text-emerald-950 mb-1">
        {isListed ? "Your store is live" : "Your store link is ready"}
      </h3>
      <p className="text-sm text-emerald-700 mb-3 break-all">{storeUrl}</p>
      {!isListed && (
        <p className="mb-3 text-sm font-semibold text-amber-800">
          Add your first product before you share this — until then your store
          won&apos;t appear in Browse Stores, and anyone opening the link finds
          an empty shop.
        </p>
      )}
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
          <WhatsAppIcon size={14} />
          Share on WhatsApp
        </button>
        <StoreQRCode storeUrl={storeUrl} storeName={storeName} />
      </div>
    </div>
  );
}
