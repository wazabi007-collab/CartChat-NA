"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { LayoutDashboard, Menu, Store, X } from "lucide-react";
import { track } from "@/lib/track";
import { createClient } from "@/lib/supabase/client";

export function PublicNavbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => setIsLoggedIn(!!data.user));
  }, []);

  useEffect(() => {
    let last = window.scrollY > 60;

    const handleScroll = () => {
      const next = window.scrollY > 60;
      if (next !== last) {
        last = next;
        setScrolled(next);
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header className={`sticky top-0 z-50 bg-white/90 backdrop-blur-xl border-b transition-colors ${scrolled ? "border-border-warm shadow-sm" : "border-transparent"}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
        <Link href="/" className="flex-shrink-0">
          <Image
            src="/oshicart-logo-original.webp"
            alt="OshiCart"
            width={170}
            height={24}
            priority
            className="w-[130px] sm:w-[170px] h-auto"
          />
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-7">
          <Link
            href="/stores"
            className="text-sm font-semibold text-walnut-2 hover:text-walnut transition-colors"
          >
            Browse Stores
          </Link>
          <Link
            href="/#pricing"
            className="text-sm font-semibold text-walnut-2 hover:text-walnut transition-colors"
          >
            Pricing
          </Link>
          <Link
            href="/prohibited-products"
            className="text-sm font-semibold text-walnut-2 hover:text-walnut transition-colors"
          >
            Safety
          </Link>
          {isLoggedIn ? (
            <Link href="/dashboard" className="text-sm font-semibold text-walnut-2 hover:text-walnut transition-colors">
              Dashboard
            </Link>
          ) : (
            <Link href="/login" className="text-sm font-semibold text-walnut-2 hover:text-walnut transition-colors">
              Sign in
            </Link>
          )}
        </nav>

        <div className="flex items-center gap-3">
          <Link
            href={isLoggedIn ? "/dashboard" : "/signup"}
            onClick={() => !isLoggedIn && track("landing_cta_clicked", { cta_location: "navbar" })}
            className="inline-flex items-center gap-2 text-sm px-3 sm:px-4 py-2.5 bg-terracotta text-white rounded-lg hover:bg-[#234B86] transition-colors font-bold shadow-sm shadow-terracotta/20 whitespace-nowrap"
          >
            {isLoggedIn ? <LayoutDashboard size={16} /> : <Store size={16} />}
            <span className="sm:hidden">{isLoggedIn ? "Dashboard" : "Create Store"}</span>
            <span className="hidden sm:inline">{isLoggedIn ? "Dashboard" : "Create Free Store"}</span>
          </Link>

          {/* Mobile menu button */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="md:hidden p-1.5 text-walnut-2 hover:text-walnut transition-colors"
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {/* Mobile nav dropdown */}
      {mobileOpen && (
        <nav className="md:hidden border-t border-border-warm bg-white px-4 py-3 space-y-1">
          <Link
            href="/stores"
            onClick={() => setMobileOpen(false)}
            className="block px-3 py-2 text-sm font-semibold text-walnut-2 hover:text-walnut hover:bg-sand rounded-md transition-colors"
          >
            Browse Stores
          </Link>
          <Link
            href="/#pricing"
            onClick={() => setMobileOpen(false)}
            className="block px-3 py-2 text-sm font-semibold text-walnut-2 hover:text-walnut hover:bg-sand rounded-md transition-colors"
          >
            Pricing
          </Link>
          <Link
            href="/prohibited-products"
            onClick={() => setMobileOpen(false)}
            className="block px-3 py-2 text-sm font-semibold text-walnut-2 hover:text-walnut hover:bg-sand rounded-md transition-colors"
          >
            Safety
          </Link>
          {isLoggedIn ? (
            <Link href="/dashboard" onClick={() => setMobileOpen(false)} className="block px-3 py-2 text-sm font-semibold text-walnut-2 hover:text-walnut hover:bg-sand rounded-md transition-colors">
              Dashboard
            </Link>
          ) : (
            <Link href="/login" onClick={() => setMobileOpen(false)} className="block px-3 py-2 text-sm font-semibold text-walnut-2 hover:text-walnut hover:bg-sand rounded-md transition-colors">
              Sign in
            </Link>
          )}
        </nav>
      )}
    </header>
  );
}
