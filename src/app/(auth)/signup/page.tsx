"use client";

import { useState, useEffect, useRef, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { track } from "@/lib/track";
import Link from "next/link";
import { PublicNavbar } from "@/components/public-navbar";
import { GoogleSignInButton } from "@/components/google-sign-in-button";
import { PhoneInput } from "@/components/phone-input";
import { AlertCircle } from "lucide-react";
import {
  inputBase,
  focusBrand,
  label,
  card,
  btnPrimaryBrand,
  alertError,
  alertIcon,
} from "@/lib/ui";

export default function SignupPage() {
  return (
    <Suspense>
      <SignupForm />
    </Suspense>
  );
}

function SignupForm() {
  const searchParams = useSearchParams();
  const tierParam = searchParams.get("tier");
  const [whatsapp, setWhatsapp] = useState("");
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [confirmPasswordError, setConfirmPasswordError] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const emailCheckRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const supabase = createClient();

  useEffect(() => {
    return () => {
      if (emailCheckRef.current) clearTimeout(emailCheckRef.current);
    };
  }, []);

  // If already logged in with tier param, redirect to checkout or setup
  useEffect(() => {
    if (!tierParam) return;
    async function checkUser() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: merchant } = await supabase
        .from("merchants")
        .select("id")
        .eq("user_id", user.id)
        .single();
      if (merchant) {
        window.location.href = `/pricing/checkout?tier=${tierParam}`;
      } else {
        window.location.href = `/dashboard/setup?tier=${tierParam}`;
      }
    }
    checkUser();
  }, [tierParam, supabase]);

  // Inline email duplicate check (debounced)
  const checkEmailExists = useCallback((emailValue: string) => {
    if (emailCheckRef.current) clearTimeout(emailCheckRef.current);
    setEmailError("");
    if (!emailValue || !emailValue.includes("@")) return;
    emailCheckRef.current = setTimeout(async () => {
      try {
        const res = await fetch("/api/check-email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: emailValue }),
        });
        const { exists } = await res.json();
        if (exists) {
          setEmailError("Account exists — sign in instead");
        }
      } catch {
        // Silent fail
      }
    }, 600);
  }, []);

  function validatePassword(value: string) {
    if (value.length > 0 && value.length < 8) {
      setPasswordError("Password must be at least 8 characters");
    } else {
      setPasswordError("");
    }
    // Re-validate confirm password match if already typed
    if (confirmPassword.length > 0 && value !== confirmPassword) {
      setConfirmPasswordError("Passwords do not match");
    } else {
      setConfirmPasswordError("");
    }
  }

  function validateConfirmPassword(value: string) {
    if (value.length > 0 && value !== password) {
      setConfirmPasswordError("Passwords do not match");
    } else {
      setConfirmPasswordError("");
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    // Client-side validation
    if (emailError) return;
    if (password.length < 8) {
      setPasswordError("Password must be at least 8 characters");
      return;
    }
    if (password !== confirmPassword) {
      setConfirmPasswordError("Passwords do not match");
      return;
    }

    setLoading(true);
    setError("");
    track("signup_started", { method: "password" });

    // Call server-side signup route
    const res = await fetch("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, whatsapp }),
    });

    const data = await res.json();

    if (!res.ok) {
      setError(data.error ?? "Something went wrong. Please try again.");
      setLoading(false);
      return;
    }

    // Establish client session
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      setError(signInError.message);
      setLoading(false);
      return;
    }

    track("signup_completed", { method: "password" });

    // Redirect: tier param goes to setup with tier, otherwise plain setup
    window.location.href = tierParam
      ? `/dashboard/setup?tier=${tierParam}`
      : "/dashboard/setup";
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <PublicNavbar />
      <div className="flex items-center justify-center px-4 py-16 sm:py-24">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Create your store</h1>
          <p className="text-gray-500 mt-1.5">
            Get your WhatsApp store live in 5 minutes
          </p>
        </div>

        <div className={card}>
          <GoogleSignInButton tier={tierParam} />

          <div className="relative my-5">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="bg-white px-3 text-gray-400">or</span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <PhoneInput
              id="whatsapp"
              value={whatsapp}
              onChange={setWhatsapp}
              required
              variant="brand"
              hint="Customers will WhatsApp you on this number"
            />

            <div>
              <label htmlFor="email" className={label}>
                Email<span className="text-red-500 ml-0.5">*</span>
              </label>
              <input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setEmailError("");
                }}
                onBlur={(e) => checkEmailExists(e.target.value)}
                required
                className={`${inputBase} ${focusBrand} ${emailError ? "border-red-300" : ""}`}
              />
              {emailError && (
                <p className="text-xs text-red-600 mt-1">
                  {emailError}{" "}
                  <Link href="/login" className="text-[#2B5EA7] hover:underline font-medium">
                    Sign in →
                  </Link>
                </p>
              )}
            </div>

            <div>
              <label htmlFor="password" className={label}>
                Password<span className="text-red-500 ml-0.5">*</span>
              </label>
              <input
                id="password"
                type="password"
                placeholder="Min. 8 characters"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  validatePassword(e.target.value);
                }}
                required
                className={`${inputBase} ${focusBrand} ${passwordError ? "border-red-300" : ""}`}
              />
              {passwordError && (
                <p className="text-xs text-red-600 mt-1">{passwordError}</p>
              )}
            </div>

            <div>
              <label htmlFor="confirmPassword" className={label}>
                Confirm Password<span className="text-red-500 ml-0.5">*</span>
              </label>
              <input
                id="confirmPassword"
                type="password"
                placeholder="Re-enter your password"
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  validateConfirmPassword(e.target.value);
                }}
                required
                className={`${inputBase} ${focusBrand} ${confirmPasswordError ? "border-red-300" : ""}`}
              />
              {confirmPasswordError && (
                <p className="text-xs text-red-600 mt-1">{confirmPasswordError}</p>
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
              disabled={loading || !!emailError}
              className={btnPrimaryBrand}
            >
              {loading ? "Creating your store..." : "Get Started — It's Free"}
            </button>
          </form>
        </div>

        <div className="text-center mt-6 space-y-2">
          <p className="text-sm text-gray-500">
            Already have a store?{" "}
            <Link href="/login" className="text-[#2B5EA7] hover:underline font-medium">
              Sign in
            </Link>
          </p>
          <div className="flex items-center gap-2 justify-center text-xs text-gray-400">
            <span>30-day free trial</span>
            <span>·</span>
            <span>No credit card needed</span>
          </div>
        </div>
      </div>
      </div>
    </div>
  );
}
