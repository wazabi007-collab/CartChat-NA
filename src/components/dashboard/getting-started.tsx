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
  const [reviewed, setReviewed] = useState<string[]>([]);
  const [actionError, setActionError] = useState("");
  const reviewKey = `oshicart:setup-reviewed:${merchantId}`;
  useEffect(() => {
    try {
      const saved = JSON.parse(sessionStorage.getItem(reviewKey) || "[]");
      // Restore this browser session's explicitly confirmed review steps.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (Array.isArray(saved)) setReviewed(saved.filter((value) => value === "settings" || value === "preview"));
    } catch { /* Review steps remain available when storage is blocked. */ }
  }, [reviewKey]);
  function markReviewed(step: string) {
    const next = [...new Set([...reviewed, step])];
    setReviewed(next);
    try { sessionStorage.setItem(reviewKey, JSON.stringify(next)); } catch { /* optional */ }
  }

  const items = [
    { label: "Create your store", done: true, icon: Package },
    { label: labels.firstItem, done: productCount > 0, icon: Package },
    { label: "Review fulfilment and payment", done: reviewed.includes("settings"), icon: Package },
    { label: "Preview your customer experience", done: reviewed.includes("preview"), icon: ShoppingCart },
    { label: "Share your store link", done: localShared, icon: Link2 },
    { label: "Get your first order", done: orderCount > 0, icon: ShoppingCart },
  ];

  const completedCount = items.filter((i) => i.done).length;
  const allComplete = completedCount === items.length;

  useEffect(() => {
    if (allComplete) {
      const timer = setTimeout(() => setAllSetVisible(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [allComplete]);

  async function handleDismiss() {
    const { error } = await supabase
      .from("merchants")
      .update({ getting_started_dismissed: true })
      .eq("id", merchantId);
    if (error) { setActionError("Could not save that change. Please try again."); return; }
    router.refresh();
  }

  async function markShared() {
    if (localShared) return;
    const { error } = await supabase
      .from("merchants")
      .update({ store_link_shared: true })
      .eq("id", merchantId);
    if (error) throw new Error("Could not save sharing progress.");
    setLocalShared(true);
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(storeUrl);
      setCopied(true);
      setActionError("");
      setTimeout(() => setCopied(false), 2000);
      await markShared();
    } catch { setActionError("Could not copy the link. Use the Share page to copy or share it."); }
  }

  function handleWhatsAppShare() {
    const msg = `Check out my store on OshiCart! ${storeUrl}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, "_blank");
    markShared().catch(() => setActionError("The sharing window opened, but progress could not be saved. Please try again later."));
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
      <p className="mb-3 text-sm text-slate-600">Add an item, check how customers will receive and pay for it, preview, then share. Preview mode does not place real orders. Review checks are remembered in this browser session.</p>
      {actionError && <p role="alert" className="mb-3 text-sm text-red-700">{actionError}</p>}

      {/* Progress bar */}
      <div className="flex items-center gap-2 mb-4">
        <div className="flex-1 h-2 rounded-full bg-emerald-100">
          <div
            className="h-2 rounded-full bg-gradient-to-r from-acacia to-emerald-400 transition-all duration-500"
            style={{ width: `${(completedCount / items.length) * 100}%` }}
          />
        </div>
        <span className="text-xs font-medium text-slate-600 shrink-0">{completedCount} of {items.length} complete</span>
      </div>

      {/* Checklist items */}
      <div role="list" className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item, index) => {
          const isAddProduct = index === 1;
          const isSettings = index === 2;
          const isPreview = index === 3;
          const isShareLink = index === 4;
          const isFirstOrder = index === 5;

          return (
            <div
              key={item.label}
              role="listitem"
              aria-label={`${item.label}: ${item.done ? "Complete" : "Not complete"}`}
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
                  {(isSettings || isPreview) && (
                    <div className="mt-2 flex flex-col gap-1">
                      <a href={isSettings ? "/dashboard/settings" : `/api/preview/enter?slug=${encodeURIComponent(new URL(storeUrl).pathname.split("/").pop() || "")}`} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center rounded-lg bg-acacia px-3 text-xs font-semibold text-white">
                        {isSettings ? "Check settings" : "Open safe preview"} (new tab)
                      </a>
                      <button type="button" onClick={() => markReviewed(isSettings ? "settings" : "preview")} className="min-h-11 rounded-lg border border-emerald-700 px-3 text-xs font-semibold text-emerald-900">I have reviewed this</button>
                    </div>
                  )}
                  {isAddProduct && (
                    <Link
                      href="/dashboard/products/new"
                      className={`mt-3 inline-flex min-h-11 items-center text-xs px-3 py-1.5 bg-acacia text-white rounded-lg hover:bg-emerald-700 transition-colors ${
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
                        className="min-h-11 text-xs px-3 py-1.5 bg-acacia text-white rounded-lg hover:bg-emerald-700 transition-colors flex items-center gap-1"
                      >
                        {copied ? <Check size={12} /> : <Link2 size={12} />}
                        {copied ? "Copied!" : "Copy Link"}
                      </button>
                      <button
                        onClick={handleWhatsAppShare}
                        className="min-h-11 text-xs px-3 py-1.5 bg-acacia text-white rounded-lg hover:bg-emerald-700 transition-colors"
                      >
                        WhatsApp
                      </button>
                    </div>
                  )}

                  {isFirstOrder && (
                    <span className="mt-3 block text-xs text-slate-600">Your first customer order completes this step. Do not submit a real order just to test setup.</span>
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
