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
    router.push("/admin/login");
    router.refresh();
  }

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 bg-slate-950 text-white">
        <div className="flex flex-col flex-1 overflow-y-auto">
          <div className="border-b border-white/10 p-5">
            <Image
              src="/logo.svg"
              alt="OshiCart"
              width={132}
              height={34}
              className="brightness-0 invert"
              style={{ width: 132, height: "auto" }}
            />
            <div className="mt-5 rounded-2xl border border-white/10 bg-white/5 p-3">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-300">
                Control Center
              </p>
              <p className="mt-2 truncate text-sm font-bold text-white">{userEmail}</p>
              <p className="mt-1 text-xs capitalize text-slate-400">
                {adminRole.replace("_", " ")}
              </p>
            </div>
          </div>
          <nav className="flex-1 space-y-1.5 p-3">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = pathname === item.href || (item.href !== "/admin" && pathname.startsWith(item.href));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-xl px-3.5 py-3 text-sm transition",
                    active
                      ? "bg-white text-slate-950 font-black shadow-sm"
                      : "text-slate-300 hover:bg-white/10 hover:text-white"
                  )}
                >
                  <Icon size={18} strokeWidth={active ? 2.5 : 2} />
                  <span className="truncate">{item.label}</span>
                </Link>
              );
            })}
          </nav>
          <div className="space-y-3 border-t border-white/10 p-4">
            <Link
              href="/dashboard"
              className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-slate-400 transition hover:bg-white/10 hover:text-white"
            >
              <ArrowLeft size={16} />
              Merchant app
            </Link>
            <button
              onClick={handleSignOut}
              className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-slate-400 transition hover:bg-red-500/10 hover:text-red-300"
            >
              <LogOut size={16} />
              Sign out
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile header */}
      <div className="md:hidden sticky top-0 z-40 flex items-center justify-between border-b border-white/10 bg-slate-950 px-4 py-3">
        <div className="flex items-center gap-2">
          <Image
            src="/logo.svg"
            alt="OshiCart"
            width={110}
            height={28}
            className="brightness-0 invert"
            style={{ width: 110, height: "auto" }}
          />
          <span className="rounded-full bg-emerald-400/10 px-2 py-1 text-xs font-black text-emerald-300">
            Admin
          </span>
        </div>
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="text-slate-300"
        >
          {mobileOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile menu overlay */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-30 bg-black/40" onClick={() => setMobileOpen(false)}>
          <div
            className="absolute left-0 right-0 top-[52px] border-b border-white/10 bg-slate-950 shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <nav className="space-y-1 p-2">
              {navItems.map((item) => {
                const Icon = item.icon;
                const active = pathname === item.href || (item.href !== "/admin" && pathname.startsWith(item.href));
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    className={cn(
                      "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm",
                      active
                        ? "bg-white text-slate-950 font-black"
                        : "text-slate-300 hover:bg-white/10"
                    )}
                  >
                    <Icon size={18} />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
            <div className="space-y-2 border-t border-white/10 p-4">
              <Link
                href="/dashboard"
                onClick={() => setMobileOpen(false)}
                className="flex items-center gap-2 text-sm text-slate-400 hover:text-white"
              >
                <ArrowLeft size={16} />
                Merchant app
              </Link>
              <button
                onClick={handleSignOut}
                className="flex items-center gap-2 text-sm text-slate-400 hover:text-red-300"
              >
                <LogOut size={16} />
                Sign out
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Spacer for desktop sidebar */}
      <div className="hidden md:block md:w-64" />
    </>
  );
}
