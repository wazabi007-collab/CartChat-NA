"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Check, Circle, Package, Link2, ShoppingCart, PartyPopper, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { getServiceLabels } from "@/lib/service-labels";

interface GettingStartedProps {
  merchantId: string;
  productCount: number;
  orderCount: number;
  storeLinkShared: boolean;
  storeUrl: string;
  storeName: string;
  dismissed: boolean;
  isWelcome: boolean;
  industry?: string | null;
}

export function GettingStarted({
  merchantId,
  productCount,
  orderCount,
  storeLinkShared,
  storeUrl,
  storeName,
  dismissed,
  isWelcome,
  industry,
}: GettingStartedProps) {
  const router = useRouter();
  const supabase = createClient();
  const labels = getServiceLabels(industry);

  const [copied, setCopied] = useState(false);
  const [localShared, setLocalShared] = useState(storeLinkShared);
  const [allSetVisible, setAllSetVisible] = useState(true);

  const items = [
    { label: "Create your store", done: true, icon: Package },
    { label: labels.firstItem, done: productCount > 0, icon: Package },
    { label: "Share your store link", done: localShared, icon: Link2 },
    { label: "Get your first order", done: orderCount > 0, icon: ShoppingCart },
  ];

  const completedCount = items.filter((i) => i.done).length;
  const allComplete = completedCount === 4;

  useEffect(() => {
    if (allComplete) {
      const timer = setTimeout(() => setAllSetVisible(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [allComplete]);

  async function handleDismiss() {
    await supabase
      .from("merchants")
      .update({ getting_started_dismissed: true })
      .eq("id", merchantId);
    router.refresh();
  }

  async function markShared() {
    if (localShared) return;
    setLocalShared(true);
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

  if (dismissed) return null;

  if (allComplete && !allSetVisible) return null;

  if (allComplete) {
    return (
      <div className="bg-emerald-50 rounded-2xl border border-emerald-200 p-5 mb-6 relative flex items-center gap-3 shadow-sm shadow-emerald-900/5">
        <PartyPopper size={22} className="text-green-600 shrink-0" />
        <p className="text-sm font-medium text-green-800">
          You&apos;re all set! Your store is ready for business.
        </p>
        <button
          onClick={() => setAllSetVisible(false)}
          className="absolute top-3 right-3 p-1 text-slate-400 hover:text-slate-600 rounded transition-colors"
          aria-label="Dismiss"
        >
          <X size={16} />
        </button>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-emerald-50 via-white to-white rounded-2xl border border-emerald-200 p-5 mb-6 relative shadow-sm shadow-emerald-900/5">
      {/* Dismiss button */}
      <button
        onClick={handleDismiss}
        className="absolute top-3 right-3 p-1 text-slate-400 hover:text-slate-600 rounded transition-colors"
        aria-label="Dismiss getting started checklist"
      >
        <X size={16} />
      </button>

      {/* Header */}
      <h3 className="font-bold text-emerald-950 mb-1 pr-6">Get started with {storeName}</h3>

      {/* Progress bar */}
      <div className="flex items-center gap-2 mb-4">
        <div className="flex-1 h-2 rounded-full bg-emerald-100">
          <div
            className="h-2 rounded-full bg-gradient-to-r from-acacia to-emerald-400 transition-all duration-500"
            style={{ width: `${(completedCount / 4) * 100}%` }}
          />
        </div>
        <span className="text-xs font-medium text-slate-500 shrink-0">{completedCount} of 4 complete</span>
      </div>

      {/* Checklist items */}
      <div className="grid gap-2 md:grid-cols-4">
        {items.map((item, index) => {
          const isAddProduct = index === 1;
          const isShareLink = index === 2;
          const isFirstOrder = index === 3;

          return (
            <div
              key={item.label}
              className="flex min-h-32 flex-col rounded-xl border border-emerald-100 bg-white/75 p-3"
            >
              {/* Status icon */}
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${
                  item.done ? "bg-emerald-100" : "bg-slate-100"
                }`}
              >
                {item.done ? (
                  <Check size={18} className="text-green-600" />
                ) : (
                  <Circle size={18} className="text-slate-300" />
                )}
              </div>

              {/* Label */}
              <span
                className={`mt-2 block min-h-10 text-sm ${
                  item.done ? "text-slate-500 line-through" : "font-semibold text-slate-950"
                }`}
              >
                {item.label}
              </span>

              {/* Action */}
              {!item.done && (
                <>
                  {isAddProduct && (
                    <Link
                      href="/dashboard/products/new"
                      className={`mt-3 inline-flex text-xs px-3 py-1.5 bg-acacia text-white rounded-lg hover:bg-emerald-700 transition-colors ${
                        isWelcome ? "animate-pulse" : ""
                      }`}
                    >
                      {labels.addItem}
                    </Link>
                  )}

                  {isShareLink && (
                    <div className="mt-3 flex flex-wrap items-center gap-1.5">
                      <button
                        onClick={handleCopy}
                        className="text-xs px-3 py-1.5 bg-acacia text-white rounded-lg hover:bg-emerald-700 transition-colors flex items-center gap-1"
                      >
                        {copied ? <Check size={12} /> : <Link2 size={12} />}
                        {copied ? "Copied!" : "Copy Link"}
                      </button>
                      <button
                        onClick={handleWhatsAppShare}
                        className="text-xs px-3 py-1.5 bg-acacia text-white rounded-lg hover:bg-emerald-700 transition-colors"
                      >
                        WhatsApp
                      </button>
                    </div>
                  )}

                  {isFirstOrder && (
                    <span className="mt-3 block text-xs text-slate-400">Waiting for your first order...</span>
                  )}
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
