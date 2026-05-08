"use client";

import { useEffect, useMemo, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { PublicNavbar } from "@/components/public-navbar";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import {
  inputBase,
  focusBrand,
  label,
  card,
  btnPrimaryBrand,
  alertError,
  alertIcon,
} from "@/lib/ui";

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetPasswordForm />
    </Suspense>
  );
}

function ResetPasswordForm() {
  const supabase = useMemo(() => createClient(), []);
  const searchParams = useSearchParams();
  const code = searchParams.get("code");
  const nextParam = searchParams.get("next");
  const nextPath =
    nextParam && nextParam.startsWith("/") && !nextParam.startsWith("//")
      ? nextParam
      : "/login";

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [sessionReady, setSessionReady] = useState(false);
  const [sessionLoading, setSessionLoading] = useState(true);
  const [sessionError, setSessionError] = useState("");

  // Check if there's an error in the URL (e.g., expired link)
  const urlError = searchParams.get("error_description");

  useEffect(() => {
    let mounted = true;

    async function prepareRecoverySession() {
      if (urlError) {
        setSessionLoading(false);
        return;
      }

      if (code) {
        const { error: exchangeError } =
          await supabase.auth.exchangeCodeForSession(code);

        if (!mounted) return;

        if (exchangeError) {
          setSessionError("This reset link is invalid or has expired. Please request a new password reset link.");
          setSessionReady(false);
        } else {
          setSessionReady(true);
          const cleanUrl = new URL(window.location.href);
          cleanUrl.searchParams.delete("code");
          window.history.replaceState({}, "", cleanUrl.pathname + cleanUrl.search);
        }
        setSessionLoading(false);
        return;
      }

      if (!mounted) return;
      setSessionError("Open the reset link from your email before setting a new password.");
      setSessionLoading(false);
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setSessionReady(true);
        setSessionLoading(false);
        setSessionError("");
      }
    });

    prepareRecoverySession();

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [code, supabase, urlError]);

  async function handleResetPassword(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setPasswordError("");

    if (password.length < 8) {
      setPasswordError("Password must be at least 8 characters");
      return;
    }

    if (password !== confirmPassword) {
      setPasswordError("Passwords do not match");
      return;
    }

    setLoading(true);

    if (!sessionReady) {
      setError("Open the reset link from your email before setting a new password.");
      return;
    }

    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      setError(error.message);
    } else {
      setSuccess(true);
    }
    setLoading(false);
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <PublicNavbar />
      <div className="flex items-center justify-center px-4 py-16 sm:py-24">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-gray-900">Set new password</h1>
            <p className="text-gray-500 mt-1.5">Choose a strong password for your account</p>
          </div>

          <div className={card}>
            {(urlError || sessionError) && (
              <div className={`${alertError} mb-4`}>
                <AlertCircle className={alertIcon} />
                <div>
                  <p className="font-medium">Reset link problem</p>
                  <p className="mt-1">
                    {urlError
                      ? "Please request a new password reset from the login page."
                      : sessionError}
                  </p>
                </div>
              </div>
            )}

            {success ? (
              <div className="space-y-4">
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-sm text-green-700 flex items-start gap-2.5">
                  <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium">Password updated!</p>
                    <p className="mt-1">Your password has been set. You can now sign in.</p>
                  </div>
                </div>
                <Link
                  href={nextPath}
                  className={btnPrimaryBrand + " block text-center"}
                >
                  Go to Sign In
                </Link>
              </div>
            ) : sessionLoading ? (
              <div className="py-6 text-center text-sm text-gray-500">
                Checking reset link...
              </div>
            ) : sessionReady ? (
              <form onSubmit={handleResetPassword} className="space-y-4">
                <div>
                  <label htmlFor="new-password" className={label}>
                    New Password<span className="text-red-500 ml-0.5">*</span>
                  </label>
                  <input
                    id="new-password"
                    type="password"
                    placeholder="Min. 8 characters"
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); setPasswordError(""); }}
                    required
                    autoFocus
                    autoComplete="new-password"
                    className={`${inputBase} ${focusBrand} ${passwordError ? "border-red-300" : ""}`}
                  />
                </div>

                <div>
                  <label htmlFor="confirm-password" className={label}>
                    Confirm Password<span className="text-red-500 ml-0.5">*</span>
                  </label>
                  <input
                    id="confirm-password"
                    type="password"
                    placeholder="Re-enter your password"
                    value={confirmPassword}
                    onChange={(e) => { setConfirmPassword(e.target.value); setPasswordError(""); }}
                    required
                    autoComplete="new-password"
                    className={`${inputBase} ${focusBrand} ${passwordError ? "border-red-300" : ""}`}
                  />
                  {passwordError && (
                    <p className="text-xs text-red-600 mt-1">{passwordError}</p>
                  )}
                </div>

                {error && (
                  <div className={alertError}>
                    <AlertCircle className={alertIcon} />
                    <p>{error}</p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className={btnPrimaryBrand}
                >
                  {loading ? "Updating..." : "Set New Password"}
                </button>
              </form>
            ) : (
              <Link
                href={nextPath}
                className={btnPrimaryBrand + " block text-center"}
              >
                Back to Sign In
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
