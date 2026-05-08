"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { Menu, Store, X } from "lucide-react";
import { track } from "@/lib/track";

export function PublicNavbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

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
            src="/logo.svg"
            alt="OshiCart"
            width={150}
            height={40}
            priority
            style={{ width: 150, height: "auto" }}
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
          <Link
            href="/login"
            className="text-sm font-semibold text-walnut-2 hover:text-walnut transition-colors"
          >
            Sign in
          </Link>
        </nav>

        <div className="flex items-center gap-3">
          <Link
            href="/signup"
            onClick={() => track("landing_cta_clicked", { cta_location: "navbar" })}
            className="inline-flex items-center gap-2 text-sm px-4 py-2.5 bg-terracotta text-white rounded-lg hover:bg-[#234B86] transition-colors font-bold shadow-sm shadow-terracotta/20"
          >
            <Store size={16} />
            Create Free Store
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
          <Link
            href="/login"
            onClick={() => setMobileOpen(false)}
            className="block px-3 py-2 text-sm font-semibold text-walnut-2 hover:text-walnut hover:bg-sand rounded-md transition-colors"
          >
            Sign in
          </Link>
        </nav>
      )}
    </header>
  );
}
