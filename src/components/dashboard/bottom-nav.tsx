"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  BarChart3,
  MoreHorizontal,
  Ticket,
  User,
  Settings,
  LogOut,
  X,
  ExternalLink,
  HelpCircle,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { getServiceLabels } from "@/lib/service-labels";

interface BottomNavProps {
  pendingOrders: number;
  industry?: string | null;
  storeSlug?: string | null;
}

export function BottomNav({ pendingOrders, industry, storeSlug }: BottomNavProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [moreOpen, setMoreOpen] = useState(false);

  const labels = getServiceLabels(industry);

  const navItems = [
    {
      href: "/dashboard",
      icon: LayoutDashboard,
      label: "Home",
      exact: true,
    },
    {
      href: "/dashboard/products",
      icon: Package,
      label: labels.itemPlural,
      exact: false,
    },
    {
      href: "/dashboard/orders",
      icon: ShoppingCart,
      label: "Orders",
      exact: false,
    },
    {
      href: "/dashboard/analytics",
      icon: BarChart3,
      label: "Analytics",
      exact: false,
    },
  ];

  function isActive(href: string, exact: boolean) {
    if (exact) return pathname === href;
    return pathname === href || pathname.startsWith(href + "/");
  }

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <>
      <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-slate-200 bg-white/95 px-2 pt-2 pb-[max(10px,env(safe-area-inset-bottom))] shadow-2xl shadow-slate-950/10 backdrop-blur md:hidden">
        <div className="flex items-center">
          {navItems.map((item) => {
            const active = isActive(item.href, item.exact);
            const Icon = item.icon;
            const isOrders = item.href === "/dashboard/orders";

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex min-h-12 flex-1 flex-col items-center justify-center gap-0.5 rounded-xl py-1 transition ${
                  active ? "bg-emerald-50 text-acacia" : "text-slate-400"
                }`}
              >
                <span className="relative">
                  <Icon size={20} />
                  {isOrders && pendingOrders > 0 && (
                    <span className="absolute -top-1 -right-1 min-w-[16px] h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center px-1">
                      {pendingOrders > 99 ? "99+" : pendingOrders}
                    </span>
                  )}
                </span>
                <span className="text-[10px] font-medium">{item.label}</span>
              </Link>
            );
          })}

          <button
            onClick={() => setMoreOpen(true)}
            className="flex min-h-12 flex-1 flex-col items-center justify-center gap-0.5 rounded-xl py-1 text-slate-400 transition active:bg-slate-100"
          >
            <MoreHorizontal size={20} />
            <span className="text-[10px] font-medium">More</span>
          </button>
        </div>
      </nav>

      {moreOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/30 z-50"
            onClick={() => setMoreOpen(false)}
          />
          <div className="fixed bottom-0 left-0 right-0 z-50 rounded-t-3xl border-t border-slate-200 bg-white pb-[env(safe-area-inset-bottom)] shadow-2xl shadow-slate-950/20">
            <div className="flex items-center justify-between px-4 py-4 border-b border-gray-100">
              <span className="text-base font-semibold text-gray-900">More</span>
              <button
                onClick={() => setMoreOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={20} />
              </button>
            </div>

            <div className="py-2">
              <Link
                href="/dashboard/coupons"
                onClick={() => setMoreOpen(false)}
                className="flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-gray-50"
              >
                <Ticket size={20} className="text-gray-500" />
                <span className="text-sm font-medium">Coupons</span>
              </Link>

              <Link
                href="/dashboard/account"
                onClick={() => setMoreOpen(false)}
                className="flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-gray-50"
              >
                <User size={20} className="text-gray-500" />
                <span className="text-sm font-medium">Account</span>
              </Link>

              <Link
                href="/dashboard/settings"
                onClick={() => setMoreOpen(false)}
                className="flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-gray-50"
              >
                <Settings size={20} className="text-gray-500" />
                <span className="text-sm font-medium">Settings</span>
              </Link>

              {storeSlug && (
                <a
                  href={`/s/${storeSlug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setMoreOpen(false)}
                  className="flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-gray-50"
                >
                  <ExternalLink size={20} className="text-gray-500" />
                  <span className="text-sm font-medium">View store</span>
                </a>
              )}
              <Link
                href="/help"
                onClick={() => setMoreOpen(false)}
                className="flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-gray-50"
              >
                <HelpCircle size={20} className="text-gray-500" />
                <span className="text-sm font-medium">Help</span>
              </Link>

              <button
                onClick={handleSignOut}
                className="w-full flex items-center gap-3 px-4 py-3 text-red-500 hover:bg-red-50"
              >
                <LogOut size={20} className="text-red-500" />
                <span className="text-sm font-medium">Sign Out</span>
              </button>
            </div>
          </div>
        </>
      )}
    </>
  );
}
