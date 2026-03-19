"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  LayoutDashboard,
  Users,
  CreditCard,
  BarChart3,
  Flag,
  Shield,
  FileText,
  LogOut,
  Menu,
  X,
  ArrowLeft,
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { type AdminRole, getVisibleNavItems } from "@/lib/admin-permissions";

const ICON_MAP: Record<string, React.ElementType> = {
  "/admin": LayoutDashboard,
  "/admin/merchants": Users,
  "/admin/billing": CreditCard,
  "/admin/analytics": BarChart3,
  "/admin/reports": Flag,
  "/admin/team": Shield,
  "/admin/audit": FileText,
};

export function AdminNav({ userEmail, adminRole }: { userEmail: string; adminRole: AdminRole }) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);

  const navItems = getVisibleNavItems(adminRole).map((item) => ({
    ...item,
    icon: ICON_MAP[item.href] || LayoutDashboard,
  }));

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex md:w-56 md:flex-col md:fixed md:inset-y-0 bg-gray-900 text-white">
        <div className="flex flex-col flex-1 overflow-y-auto">
          <div className="p-4 border-b border-gray-700">
            <Image src="/oshicart-logo.png" alt="OshiCart" width={120} height={32} className="brightness-0 invert" />
            <p className="text-xs text-red-400 font-medium mt-1">Admin Panel</p>
          </div>
          <nav className="flex-1 p-2 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = pathname === item.href || (item.href !== "/admin" && pathname.startsWith(item.href));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 rounded-md text-sm",
                    active
                      ? "bg-gray-700 text-white font-medium"
                      : "text-gray-300 hover:bg-gray-800"
                  )}
                >
                  <Icon size={18} />
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <div className="p-4 border-t border-gray-700 space-y-3">
            <Link
              href="/dashboard"
              className="flex items-center gap-2 text-sm text-gray-400 hover:text-white"
            >
              <ArrowLeft size={16} />
              Back to Dashboard
            </Link>
            <p className="text-xs text-gray-500 truncate">{userEmail}</p>
            <button
              onClick={handleSignOut}
              className="flex items-center gap-2 text-sm text-gray-400 hover:text-red-400"
            >
              <LogOut size={16} />
              Sign out
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile header */}
      <div className="md:hidden bg-gray-900 px-4 py-3 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-2">
          <Image src="/oshicart-logo.png" alt="OshiCart" width={100} height={26} className="brightness-0 invert" />
          <span className="text-xs text-red-400 font-medium">Admin</span>
        </div>
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="text-gray-300"
        >
          {mobileOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile menu overlay */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-30 bg-black/30" onClick={() => setMobileOpen(false)}>
          <div
            className="absolute top-[52px] left-0 right-0 bg-gray-900 border-b border-gray-700 shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <nav className="p-2 space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const active = pathname === item.href || (item.href !== "/admin" && pathname.startsWith(item.href));
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2 rounded-md text-sm",
                      active
                        ? "bg-gray-700 text-white font-medium"
                        : "text-gray-300 hover:bg-gray-800"
                    )}
                  >
                    <Icon size={18} />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
            <div className="p-4 border-t border-gray-700 space-y-2">
              <Link
                href="/dashboard"
                onClick={() => setMobileOpen(false)}
                className="flex items-center gap-2 text-sm text-gray-400 hover:text-white"
              >
                <ArrowLeft size={16} />
                Back to Dashboard
              </Link>
              <button
                onClick={handleSignOut}
                className="flex items-center gap-2 text-sm text-gray-400 hover:text-red-400"
              >
                <LogOut size={16} />
                Sign out
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Spacer for desktop sidebar */}
      <div className="hidden md:block md:w-56" />
    </>
  );
}
