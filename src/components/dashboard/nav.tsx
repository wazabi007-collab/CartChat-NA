"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { ExternalLink, HelpCircle, LogOut, Store } from "lucide-react";
import { cn } from "@/lib/utils";
import { hasTierFeature, type SubscriptionTier } from "@/lib/tier-limits";
import { getServiceLabels } from "@/lib/service-labels";
import { sidebarItems } from "@/lib/dashboard-nav";

interface NavProps {
  merchant: {
    id: string;
    store_name: string;
    store_slug: string;
  } | null;
  userPhone: string;
  subscriptionTier?: string | null;
  industry?: string | null;
}


export function DashboardNav({ merchant, userPhone, subscriptionTier, industry }: NavProps) {
  const tier = (subscriptionTier || "oshi_start") as SubscriptionTier;
  const navItems = sidebarItems().filter(
    (item) => !item.requireFeature || hasTierFeature(tier, item.requireFeature)
  );
  const pathname = usePathname();
  const router = useRouter();
  const labels = getServiceLabels(industry);

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 bg-white border-r border-slate-200 shadow-sm shadow-slate-900/5">
        <div className="flex flex-col flex-1 overflow-y-auto">
          <div className="p-5 border-b border-slate-100">
            <Link href="/dashboard" className="inline-flex">
              <Image
                src="/oshicart-logo-v3.webp"
                alt="OshiCart"
                width={150}
                height={21}
                priority
                style={{ width: 150, height: "auto" }}
              />
            </Link>
            {merchant && (
              <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-3">
                <div className="flex items-center gap-2">
                  <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-terracotta-soft text-terracotta">
                    <Store size={16} />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-slate-950">
                      {merchant.store_name}
                    </p>
                    <p className="truncate text-xs text-slate-500">
                      /s/{merchant.store_slug}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
          <nav className="flex-1 p-3 space-y-1.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = pathname === item.href;
              const displayLabel =
                item.usesItemWording
                  ? labels.itemPlural
                  : item.usesScheduleWording
                  ? labels.schedule
                  : item.label;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 px-3.5 py-3 rounded-xl text-sm transition-colors",
                    active
                      ? "bg-acacia-soft text-acacia font-bold shadow-sm shadow-emerald-900/5"
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-950"
                  )}
                >
                  <Icon size={18} strokeWidth={active ? 2.4 : 2} />
                  <span className="truncate">{displayLabel}</span>
                </Link>
              );
            })}
            {merchant && (
              <a
                href={`/s/${merchant.store_slug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 px-3.5 py-3 rounded-xl text-sm text-slate-600 hover:bg-slate-50 hover:text-slate-950 transition-colors"
              >
                <ExternalLink size={18} strokeWidth={2} />
                <span className="truncate">View store</span>
              </a>
            )}
            <Link
              href="/help"
              className="flex items-center gap-3 px-3.5 py-3 rounded-xl text-sm text-slate-600 hover:bg-slate-50 hover:text-slate-950 transition-colors"
            >
              <HelpCircle size={18} strokeWidth={2} />
              <span className="truncate">Help</span>
            </Link>
          </nav>
          <div className="p-4 border-t border-slate-100">
            {userPhone && (
              <p className="text-xs text-slate-400 truncate mb-2">{userPhone}</p>
            )}
            <button
              onClick={handleSignOut}
              className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-slate-500 hover:bg-red-50 hover:text-red-600 transition-colors"
            >
              <LogOut size={16} />
              Sign out
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile header — logo only, BottomNav handles navigation */}
      <div className="md:hidden bg-white/95 border-b border-slate-200 px-4 py-3 flex items-center justify-center sticky top-0 z-30 backdrop-blur">
        <Link href="/dashboard">
          <Image
            src="/oshicart-logo-v3.webp"
            alt="OshiCart"
            width={128}
            height={18}
            priority
            style={{ width: 128, height: "auto" }}
          />
        </Link>
      </div>

      {/* Spacer for desktop sidebar */}
      <div className="hidden md:block md:w-64" />
    </>
  );
}
