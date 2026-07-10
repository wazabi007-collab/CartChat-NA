"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertCircle, LockKeyhole, ShieldCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export function AdminLoginForm({ initialError }: { initialError?: string }) {
  const router = useRouter();
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [resetError, setResetError] = useState("");
  const [error, setError] = useState(
    initialError === "not_authorized"
      ? "This account is not authorized for OshiCart Admin."
      : ""
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      setError(
        signInError.message === "Invalid login credentials"
          ? "Incorrect admin email or password."
          : signInError.message
      );
      setLoading(false);
      return;
    }

    router.push("/admin");
    router.refresh();
  }

  async function handleResetPassword() {
    const normalizedEmail = email.trim();

    setResetSent(false);
    setResetError("");

    if (!normalizedEmail) {
      setResetError("Enter your admin email first, then request a reset link.");
      return;
    }

    setResetLoading(true);

    try {
      const res = await fetch("/api/admin/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: normalizedEmail }),
      });

      if (!res.ok) {
        setResetError("Unable to request a reset link right now. Please try again.");
      } else {
        setResetSent(true);
      }
    } catch {
      setResetError("Network error. Please check your connection and try again.");
    } finally {
      setResetLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_12%,rgba(43,94,167,0.42),transparent_30%),radial-gradient(circle_at_86%_8%,rgba(20,153,71,0.28),transparent_28%),linear-gradient(135deg,rgba(15,23,42,1),rgba(2,6,23,1))]" />
      <div className="relative mx-auto grid min-h-screen max-w-6xl items-center gap-10 px-5 py-10 lg:grid-cols-[1fr_440px]">
        <section className="hidden lg:block">
          <Link href="/" className="inline-flex">
            <Image
              src="/oshicart-logo-v3.webp"
              alt="OshiCart"
              width={170}
              height={24}
              priority
              style={{ width: 170, height: "auto" }}
            />
          </Link>
          <p className="mt-8 text-xs font-black uppercase tracking-[0.28em] text-emerald-300">
            OshiCart Control Center
          </p>
          <h1 className="mt-4 max-w-xl text-5xl font-black tracking-tight">
            Secure operations for the whole platform.
          </h1>
          <p className="mt-5 max-w-lg text-base leading-7 text-slate-300">
            Manage merchants, subscriptions, reports, platform health, and admin
            activity from a dedicated back-office panel.
          </p>
          <div className="mt-8 grid max-w-xl grid-cols-3 gap-3">
            {["Merchants", "Billing", "Audit"].map((item) => (
              <div key={item} className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur">
                <p className="text-sm font-black">{item}</p>
                <p className="mt-1 text-xs text-slate-400">Protected</p>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-3xl border border-white/10 bg-white p-5 text-slate-950 shadow-2xl shadow-black/30 sm:p-7">
          <div className="mb-6 flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.2em] text-acacia">
                Admin access
              </p>
              <h2 className="mt-2 text-2xl font-black tracking-tight">
                Sign in to Admin
              </h2>
            </div>
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-950 text-white">
              <ShieldCheck size={23} />
            </span>
          </div>

          {error && (
            <div className="mb-4 flex items-start gap-2 rounded-2xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <p>{error}</p>
            </div>
          )}

          {resetSent && (
            <div className="mb-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
              If this email is an approved admin account, a reset link has been sent.
            </div>
          )}

          {resetError && (
            <div className="mb-4 flex items-start gap-2 rounded-2xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <p>{resetError}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="admin-email" className="mb-1.5 block text-sm font-bold text-slate-700">
                Admin email
              </label>
              <input
                id="admin-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
                placeholder="admin@oshicart.com"
                className="min-h-12 w-full rounded-xl border border-slate-300 px-3 text-sm font-medium outline-none transition focus:border-acacia focus:ring-4 focus:ring-emerald-100"
              />
            </div>

            <div>
              <div className="mb-1.5 flex items-center justify-between gap-3">
                <label htmlFor="admin-password" className="block text-sm font-bold text-slate-700">
                  Password
                </label>
                <button
                  type="button"
                  onClick={handleResetPassword}
                  disabled={resetLoading}
                  className="text-xs font-black text-acacia transition hover:text-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {resetLoading ? "Sending..." : "Reset password"}
                </button>
              </div>
              <input
                id="admin-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
                placeholder="Enter admin password"
                className="min-h-12 w-full rounded-xl border border-slate-300 px-3 text-sm font-medium outline-none transition focus:border-acacia focus:ring-4 focus:ring-emerald-100"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 text-sm font-black text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <LockKeyhole size={16} />
              {loading ? "Checking access..." : "Open Admin Panel"}
            </button>
          </form>

          <div className="mt-5 rounded-2xl bg-slate-50 p-4 text-xs leading-5 text-slate-500">
            Admin access is restricted to approved OshiCart team accounts. Merchant
            store logins stay separate from this panel.
          </div>
        </section>
      </div>
    </main>
  );
}
