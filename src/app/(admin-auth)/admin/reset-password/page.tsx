"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { AlertCircle, CheckCircle2, LockKeyhole } from "lucide-react";

export default function AdminResetPasswordPage() {
  return (
    <Suspense>
      <AdminResetPasswordForm />
    </Suspense>
  );
}

function AdminResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!token) {
      setError("This reset link is invalid. Request a new admin reset link.");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/admin/auth/complete-reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Unable to update password. Request a new reset link.");
      } else {
        setSuccess(true);
      }
    } catch {
      setError("Network error. Please check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_12%,rgba(43,94,167,0.42),transparent_30%),radial-gradient(circle_at_86%_8%,rgba(20,153,71,0.28),transparent_28%),linear-gradient(135deg,rgba(15,23,42,1),rgba(2,6,23,1))]" />
      <div className="relative mx-auto flex min-h-screen max-w-md flex-col justify-center px-5 py-10">
        <Link href="/admin/login" className="mb-8 inline-flex">
          <Image
            src="/logo-light.svg"
            alt="OshiCart"
            width={170}
            height={44}
            priority
            style={{ width: 170, height: "auto" }}
          />
        </Link>

        <section className="rounded-3xl border border-white/10 bg-white p-5 text-slate-950 shadow-2xl shadow-black/30 sm:p-7">
          <div className="mb-6 flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.2em] text-acacia">
                Admin recovery
              </p>
              <h1 className="mt-2 text-2xl font-black tracking-tight">
                Set admin password
              </h1>
            </div>
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-950 text-white">
              <LockKeyhole size={22} />
            </span>
          </div>

          {success ? (
            <div className="space-y-4">
              <div className="flex items-start gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                <p>Your admin password has been updated.</p>
              </div>
              <Link
                href="/admin/login"
                className="inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-slate-950 px-4 text-sm font-black text-white transition hover:bg-slate-800"
              >
                Back to Admin Sign In
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {!token && (
                <div className="flex items-start gap-2 rounded-2xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <p>This reset link is invalid. Request a new admin reset link.</p>
                </div>
              )}

              <div>
                <label htmlFor="admin-new-password" className="mb-1.5 block text-sm font-bold text-slate-700">
                  New password
                </label>
                <input
                  id="admin-new-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password"
                  required
                  placeholder="Min. 8 characters"
                  className="min-h-12 w-full rounded-xl border border-slate-300 px-3 text-sm font-medium outline-none transition focus:border-acacia focus:ring-4 focus:ring-emerald-100"
                />
              </div>

              <div>
                <label htmlFor="admin-confirm-password" className="mb-1.5 block text-sm font-bold text-slate-700">
                  Confirm password
                </label>
                <input
                  id="admin-confirm-password"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  autoComplete="new-password"
                  required
                  placeholder="Re-enter password"
                  className="min-h-12 w-full rounded-xl border border-slate-300 px-3 text-sm font-medium outline-none transition focus:border-acacia focus:ring-4 focus:ring-emerald-100"
                />
              </div>

              {error && (
                <div className="flex items-start gap-2 rounded-2xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <p>{error}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={loading || !token}
                className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 text-sm font-black text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <LockKeyhole size={16} />
                {loading ? "Updating..." : "Update admin password"}
              </button>
            </form>
          )}
        </section>
      </div>
    </main>
  );
}
