"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  BarChart3,
  Settings,
  LogOut,
  Ticket,
  User,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { hasTierFeature, type SubscriptionTier } from "@/lib/tier-limits";
import { getServiceLabels } from "@/lib/service-labels";

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

const baseNavItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, requireFeature: null },
  { href: "/dashboard/products", label: "Products", icon: Package, requireFeature: null },
  { href: "/dashboard/orders", label: "Orders", icon: ShoppingCart, requireFeature: null },
  { href: "/dashboard/coupons", label: "Coupons", icon: Ticket, requireFeature: "coupons" as const },
  { href: "/dashboard/analytics", label: "Analytics", icon: BarChart3, requireFeature: null },
  { href: "/dashboard/account", label: "Account", icon: User, requireFeature: null },
  { href: "/dashboard/settings", label: "Settings", icon: Settings, requireFeature: null },
];

export function DashboardNav({ merchant, userPhone, subscriptionTier, industry }: NavProps) {
  const tier = (subscriptionTier || "oshi_start") as SubscriptionTier;
  const navItems = baseNavItems.filter(
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
      <aside className="hidden md:flex md:w-56 md:flex-col md:fixed md:inset-y-0 bg-white border-r">
        <div className="flex flex-col flex-1 overflow-y-auto">
          <div className="p-4 border-b">
            <Link href="/dashboard">
              <Image src="/logo.svg" alt="OshiCart" width={120} height={32} />
            </Link>
            {merchant && (
              <p className="text-xs text-gray-500 truncate">
                {merchant.store_name}
              </p>
            )}
          </div>
          <nav className="flex-1 p-2 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = pathname === item.href;
              const displayLabel =
                item.href === "/dashboard/products" ? labels.itemPlural : item.label;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 rounded-md text-sm",
                    active
                      ? "bg-green-50 text-green-700 font-medium"
                      : "text-gray-600 hover:bg-gray-50"
                  )}
                >
                  <Icon size={18} />
                  {displayLabel}
                </Link>
              );
            })}
          </nav>
          <div className="p-4 border-t">
            <p className="text-xs text-gray-400 truncate mb-2">{userPhone}</p>
            <button
              onClick={handleSignOut}
              className="flex items-center gap-2 text-sm text-gray-500 hover:text-red-600"
            >
              <LogOut size={16} />
              Sign out
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile header — logo only, BottomNav handles navigation */}
      <div className="md:hidden bg-white border-b px-4 py-3 flex items-center justify-center sticky top-0 z-30">
        <Link href="/dashboard">
          <Image src="/logo.svg" alt="OshiCart" width={100} height={26} />
        </Link>
      </div>

      {/* Spacer for desktop sidebar */}
      <div className="hidden md:block md:w-56" />
    </>
  );
}
