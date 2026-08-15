"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";
import { AlertCircle, CheckCircle2, ShieldCheck, User as UserIcon } from "lucide-react";
import {
  label,
  inputBase,
  focusGreen,
  btnPrimaryGreen,
  alertError,
  alertSuccess,
  alertIcon,
} from "@/lib/ui";

export default function AccountPage() {
  const supabase = createClient();

  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasPasswordIdentity, setHasPasswordIdentity] = useState(false);

  // Password form state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    async function loadUser() {
      const { data } = await supabase.auth.getUser();
      if (data.user) {
        setUser(data.user);
        const hasPw =
          data.user.identities?.some((i) => i.provider === "email") ?? false;
        setHasPasswordIdentity(hasPw);
      }
      setLoading(false);
    }
    loadUser();
  }, [supabase]);

  async function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (newPassword.length < 8) {
      setError("New password must be at least 8 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setSaving(true);

    try {
      if (hasPasswordIdentity) {
        // Verify current password first
        const { error: verifyError } = await supabase.auth.signInWithPassword({
          email: user!.email!,
          password: currentPassword,
        });
        if (verifyError) {
          setError("Current password is incorrect.");
          return;
        }
      }

      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateError) {
        setError(updateError.message);
        return;
      }

      setSuccess(
        hasPasswordIdentity
          ? "Password changed successfully."
          : "Password set successfully."
      );
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      // After setting a password the user now has a password identity
      if (!hasPasswordIdentity) setHasPasswordIdentity(true);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="p-6 max-w-xl">
        <div className="h-6 w-40 bg-gray-100 rounded animate-pulse mb-6" />
        <div className="h-32 bg-gray-100 rounded-xl animate-pulse mb-4" />
        <div className="h-48 bg-gray-100 rounded-xl animate-pulse" />
      </div>
    );
  }

  return (
    <div className="md:ml-56">
      <div className="mb-6 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-900/5 sm:p-6">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-acacia">
          Profile and security
        </p>
        <h1 className="mt-2 text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">
          Account Settings
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
          Manage the login details connected to this merchant workspace.
        </p>
      </div>

      {/* min-w-0 on the cards: a grid child defaults to min-width:auto, so an
          unbroken email address set a min-content floor wider than a 375px
          phone and pushed the whole document sideways. */}
      <div className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">

      {/* Card 1 — Account Info */}
      <div className="min-w-0 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-900/5">
        <div className="flex items-center gap-2 mb-4">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-terracotta">
            <UserIcon size={16} />
          </span>
          <h2 className="text-sm font-black text-slate-950">Account Info</h2>
        </div>
        <div className="space-y-3">
          <div>
            <p className={label}>Email</p>
            <p className="text-sm text-gray-700 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5 break-all">
              {user?.email ?? "—"}
            </p>
          </div>
          <div>
            <p className={label}>WhatsApp Number</p>
            <p className="text-sm text-gray-700 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5 break-all">
              {user?.user_metadata?.whatsapp_number ?? "—"}
            </p>
          </div>
        </div>
      </div>

      {/* Card 2 — Password */}
      <div className="min-w-0 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-900/5">
        <div className="mb-4 flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-acacia">
            <ShieldCheck size={16} />
          </span>
          <h2 className="text-sm font-black text-slate-950">
            {hasPasswordIdentity ? "Change Password" : "Set Password"}
          </h2>
        </div>

        {error && (
          <div className={`${alertError} mb-4`}>
            <AlertCircle className={alertIcon} />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className={`${alertSuccess} mb-4`}>
            <CheckCircle2 className={alertIcon} />
            <span>{success}</span>
          </div>
        )}

        <form onSubmit={handlePasswordSubmit} className="space-y-4">
          {hasPasswordIdentity && (
            <div>
              <label htmlFor="current-password" className={label}>
                Current Password
              </label>
              <input
                id="current-password"
                type="password"
                autoComplete="current-password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Enter current password"
                required
                className={`${inputBase} ${focusGreen}`}
              />
            </div>
          )}

          <div>
            <label htmlFor="new-password" className={label}>
              New Password
            </label>
            <input
              id="new-password"
              type="password"
              autoComplete="new-password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="At least 8 characters"
              required
              className={`${inputBase} ${focusGreen}`}
            />
          </div>

          <div>
            <label htmlFor="confirm-password" className={label}>
              Confirm New Password
            </label>
            <input
              id="confirm-password"
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-enter new password"
              required
              className={`${inputBase} ${focusGreen}`}
            />
          </div>

          <button type="submit" disabled={saving} className={btnPrimaryGreen}>
            {saving
              ? "Saving…"
              : hasPasswordIdentity
                ? "Change Password"
                : "Set Password"}
          </button>
        </form>
      </div>
      </div>
    </div>
  );
}
