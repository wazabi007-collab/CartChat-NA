"use client";

import { useState, useEffect, useRef, Suspense } from "react";
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
  btnGhost,
  alertError,
  alertIcon,
} from "@/lib/ui";

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}

type Tab = "email" | "whatsapp";
type EmailStep = "credentials" | "done";
type WhatsAppStep = "phone" | "otp";

function LoginForm() {
  const supabase = createClient();
  const searchParams = useSearchParams();
  const authError = searchParams.get("error");

  // Tab state
  const [activeTab, setActiveTab] = useState<Tab>("email");
  const [whatsappEnabled, setWhatsappEnabled] = useState(false);
  const [tabsLoading, setTabsLoading] = useState(true);

  // Email / password state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [emailStep, setEmailStep] = useState<EmailStep>("credentials");
  const [emailLoading, setEmailLoading] = useState(false);
  const [emailError, setEmailError] = useState("");

  // Forgot password state
  const [showForgot, setShowForgot] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotError, setForgotError] = useState("");
  const [forgotSent, setForgotSent] = useState(false);
  const [forgotGoogleOnly, setForgotGoogleOnly] = useState(false);

  // WhatsApp OTP state
  const [phone, setPhone] = useState("");
  const [waOtp, setWaOtp] = useState("");
  const [waStep, setWaStep] = useState<WhatsAppStep>("phone");
  const [waLoading, setWaLoading] = useState(false);
  const [waError, setWaError] = useState("");
  const [waCountdown, setWaCountdown] = useState(0);
  const [waNoAccount, setWaNoAccount] = useState(false);

  const waTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const waOtpRef = useRef<HTMLInputElement>(null);

  // ── Check WhatsApp status on mount ──────────────────────────────────────────
  useEffect(() => {
    async function checkWhatsAppStatus() {
      try {
        const res = await fetch("/api/whatsapp/status");
        if (res.ok) {
          const data = await res.json();
          setWhatsappEnabled(data.otpEnabled === true);
        }
      } catch {
        // WhatsApp unavailable — silently disable tab
      } finally {
        setTabsLoading(false);
      }
    }
    checkWhatsAppStatus();
  }, []);

  // ── Cleanup timers on unmount ────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      if (waTimerRef.current) clearInterval(waTimerRef.current);
    };
  }, []);

  // ── Auto-focus OTP when WhatsApp step changes ────────────────────────────────
  useEffect(() => {
    if (waStep === "otp") {
      setTimeout(() => waOtpRef.current?.focus(), 50);
    }
  }, [waStep]);

  // ── Merchant routing helper ──────────────────────────────────────────────────
  async function routeAfterLogin(method: string) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      const { data: merchant } = await supabase
        .from("merchants")
        .select("id")
        .eq("user_id", user.id)
        .single();
      track("login_completed", { method, had_merchant: !!merchant });
      window.location.href = merchant ? "/dashboard" : "/dashboard/setup";
    } else {
      window.location.href = "/dashboard";
    }
  }

  // ── WhatsApp countdown timer ─────────────────────────────────────────────────
  function startWaCountdown() {
    setWaCountdown(300);
    if (waTimerRef.current) clearInterval(waTimerRef.current);
    waTimerRef.current = setInterval(() => {
      setWaCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(waTimerRef.current!);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }

  // ── Email / password login ───────────────────────────────────────────────────
  async function handleEmailSignIn(e: React.FormEvent) {
    e.preventDefault();
    setEmailLoading(true);
    setEmailError("");
    track("login_started", { method: "password" });

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setEmailError(
        error.message === "Invalid login credentials"
          ? "Incorrect email or password. Please try again."
          : error.message
      );
      setEmailLoading(false);
    } else {
      await routeAfterLogin("password");
    }
  }

  // ── Forgot password — send reset email ───────────────────────────────────────
  async function handleForgotPassword(e: React.FormEvent) {
    e.preventDefault();
    setForgotLoading(true);
    setForgotError("");
    setForgotGoogleOnly(false);
    track("login_started", { method: "forgot_password" });

    // Check whether this email belongs to a Google-only user. If so, a password
    // reset email would silently no-op (Supabase only resets `email` identities),
    // so we redirect them to Google sign-in instead of sending a dead link.
    try {
      const res = await fetch("/api/auth/check-identity", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: forgotEmail }),
      });
      if (res.ok) {
        const { providers } = await res.json();
        if (
          Array.isArray(providers) &&
          providers.length > 0 &&
          !providers.includes("email") &&
          providers.includes("google")
        ) {
          setForgotGoogleOnly(true);
          setForgotLoading(false);
          return;
        }
      }
    } catch {
      // Fall through — send the reset anyway rather than block the user
    }

    const { error } = await supabase.auth.resetPasswordForEmail(forgotEmail, {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    });

    if (error) {
      setForgotError(error.message);
    } else {
      setForgotSent(true);
      track("login_otp_sent", { method: "forgot_password" });
    }
    setForgotLoading(false);
  }

  // ── WhatsApp OTP — send ──────────────────────────────────────────────────────
  async function handleSendWhatsAppOtp(e: React.FormEvent) {
    e.preventDefault();
    setWaLoading(true);
    setWaError("");
    setWaNoAccount(false);
    track("login_started", { method: "whatsapp" });

    try {
      const res = await fetch("/api/auth/whatsapp-otp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      });
      const data = await res.json();

      if (!res.ok) {
        setWaError(data.error ?? "Failed to send WhatsApp code. Please try again.");
      } else {
        track("login_otp_sent", { method: "whatsapp" });
        setWaStep("otp");
        startWaCountdown();
      }
    } catch {
      setWaError("Network error. Please check your connection and try again.");
    } finally {
      setWaLoading(false);
    }
  }

  // ── WhatsApp OTP — verify ────────────────────────────────────────────────────
  async function handleVerifyWhatsAppOtp(e?: React.FormEvent) {
    e?.preventDefault();
    setWaLoading(true);
    setWaError("");

    try {
      const res = await fetch("/api/auth/whatsapp-otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, code: waOtp }),
      });
      const result = await res.json();

      if (!res.ok) {
        setWaError(result.error ?? "Invalid code. Please try again.");
        setWaLoading(false);
        return;
      }

      if (result.action === "no_account") {
        setWaNoAccount(true);
        setWaLoading(false);
        return;
      }

      if (result.action === "verify_redirect") {
        const { error } = await supabase.auth.verifyOtp({
          email: result.email,
          token_hash: result.token_hash,
          type: "email",
        });

        if (error) {
          setWaError(error.message);
          setWaLoading(false);
        } else {
          await routeAfterLogin("whatsapp");
        }
        return;
      }

      setWaError("Unexpected response from server.");
      setWaLoading(false);
    } catch {
      setWaError("Network error. Please check your connection and try again.");
      setWaLoading(false);
    }
  }

  // ── WhatsApp OTP — auto-submit on 6 digits ───────────────────────────────────
  function handleWaOtpChange(value: string) {
    const cleaned = value.replace(/\D/g, "").slice(0, 6);
    setWaOtp(cleaned);
    if (cleaned.length === 6) {
      setTimeout(() => {
        setWaOtp(cleaned);
        handleVerifyWhatsAppOtp();
      }, 150);
    }
  }

  const showTabs = whatsappEnabled && !tabsLoading;

  return (
    <div className="min-h-screen bg-gray-50">
      <PublicNavbar />
      <div className="flex items-center justify-center px-4 py-16 sm:py-24">
        <div className="w-full max-w-sm">

          {/* Heading */}
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-gray-900">Sign in to your store</h1>
            <p className="text-gray-500 mt-1.5">Welcome back to OshiCart</p>
          </div>

          <div className={card}>

            {/* Auth error banner */}
            {authError === "auth" && (
              <div className={`${alertError} mb-4`}>
                <AlertCircle className={alertIcon} />
                <p>Sign-in failed or was cancelled. Please try again.</p>
              </div>
            )}

            {/* Google OAuth — always visible */}
            <GoogleSignInButton />

            {/* Divider */}
            <div className="relative my-5">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="bg-white px-3 text-gray-400">or</span>
              </div>
            </div>

            {/* Tab buttons — only shown when WhatsApp is enabled */}
            {showTabs && (
              <div className="flex border-b border-gray-200 mb-5">
                <button
                  type="button"
                  onClick={() => { setActiveTab("email"); setEmailError(""); }}
                  className={`flex-1 py-2 text-sm font-medium transition-colors ${
                    activeTab === "email"
                      ? "text-[#2B5EA7] border-b-2 border-[#2B5EA7] -mb-px"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  Email
                </button>
                <button
                  type="button"
                  onClick={() => { setActiveTab("whatsapp"); setWaError(""); }}
                  className={`flex-1 py-2 text-sm font-medium transition-colors ${
                    activeTab === "whatsapp"
                      ? "text-[#2B5EA7] border-b-2 border-[#2B5EA7] -mb-px"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  WhatsApp
                </button>
              </div>
            )}

            {/* ── Forgot password form ─────────────────────────────────────── */}
            {showForgot ? (
              <div className="space-y-4">
                {forgotGoogleOnly ? (
                  <>
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
                      <p className="font-medium">You signed up with Google</p>
                      <p className="mt-1">
                        <span className="font-medium">{forgotEmail}</span> doesn&apos;t
                        have a password yet. Sign in with Google below, then you can
                        add a password any time from <span className="font-medium">Account Settings</span>.
                      </p>
                    </div>
                    <GoogleSignInButton />
                    <button
                      type="button"
                      onClick={() => {
                        setShowForgot(false);
                        setForgotGoogleOnly(false);
                        setForgotEmail("");
                      }}
                      className={btnGhost}
                    >
                      Back to sign in
                    </button>
                  </>
                ) : forgotSent ? (
                  <>
                    <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-700">
                      <p className="font-medium">Reset link sent!</p>
                      <p className="mt-1">Check your email at <span className="font-medium">{forgotEmail}</span> and click the reset link to set a new password.</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => { setShowForgot(false); setForgotSent(false); setForgotEmail(""); }}
                      className={btnGhost}
                    >
                      Back to sign in
                    </button>
                  </>
                ) : (
                  <form onSubmit={handleForgotPassword} className="space-y-4">
                    <p className="text-sm text-gray-600">
                      Enter your email and we&apos;ll send you a link to reset your password.
                    </p>
                    <div>
                      <label htmlFor="forgot-email" className={label}>
                        Email<span className="text-red-500 ml-0.5">*</span>
                      </label>
                      <input
                        id="forgot-email"
                        type="email"
                        placeholder="you@example.com"
                        value={forgotEmail}
                        onChange={(e) => setForgotEmail(e.target.value)}
                        required
                        autoFocus
                        className={`${inputBase} ${focusBrand}`}
                      />
                    </div>

                    {forgotError && (
                      <div className={alertError}>
                        <AlertCircle className={alertIcon} />
                        <p>{forgotError}</p>
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={forgotLoading}
                      className={btnPrimaryBrand}
                    >
                      {forgotLoading ? "Sending..." : "Send Reset Link"}
                    </button>

                    <button
                      type="button"
                      onClick={() => { setShowForgot(false); setForgotError(""); }}
                      className={btnGhost}
                    >
                      Back to sign in
                    </button>
                  </form>
                )}
              </div>
            ) : (

            /* ── Email / password tab ─────────────────────────────────────── */
            (!showTabs || activeTab === "email") && emailStep === "credentials" && (
              <form onSubmit={handleEmailSignIn} className="space-y-4">
                <div>
                  <label htmlFor="email" className={label}>
                    Email<span className="text-red-500 ml-0.5">*</span>
                  </label>
                  <input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoFocus
                    className={`${inputBase} ${focusBrand}`}
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label htmlFor="password" className={label} style={{ marginBottom: 0 }}>
                      Password<span className="text-red-500 ml-0.5">*</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => { setShowForgot(true); setForgotEmail(email); }}
                      className="text-xs text-[#2B5EA7] hover:underline"
                    >
                      Forgot password?
                    </button>
                  </div>
                  <input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                    className={`${inputBase} ${focusBrand}`}
                  />
                </div>

                {emailError && (
                  <div className={alertError}>
                    <AlertCircle className={alertIcon} />
                    <p>{emailError}</p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={emailLoading}
                  className={btnPrimaryBrand}
                >
                  {emailLoading ? "Signing in..." : "Sign In"}
                </button>
              </form>
            )
            )}

            {/* ── WhatsApp OTP tab ─────────────────────────────────────────── */}
            {showTabs && activeTab === "whatsapp" && (
              <>
                {/* Step 1: Phone input */}
                {waStep === "phone" && (
                  <form onSubmit={handleSendWhatsAppOtp} className="space-y-4">
                    <PhoneInput
                      id="wa-phone"
                      value={phone}
                      onChange={setPhone}
                      required
                      variant="brand"
                      hint="We'll send a 6-digit code to this number"
                    />

                    {waError && (
                      <div className={alertError}>
                        <AlertCircle className={alertIcon} />
                        <p>{waError}</p>
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={waLoading || !phone}
                      className={btnPrimaryBrand}
                    >
                      {waLoading ? "Sending..." : "Send WhatsApp Code"}
                    </button>
                  </form>
                )}

                {/* Step 2: OTP input */}
                {waStep === "otp" && (
                  <form onSubmit={handleVerifyWhatsAppOtp} className="space-y-4">
                    {waNoAccount ? (
                      <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
                        No account found with this number. Please{" "}
                        <Link href="/signup" className="font-medium underline">
                          sign up first
                        </Link>
                        .
                      </div>
                    ) : (
                      <>
                        <p className="text-sm text-gray-600">
                          Enter the 6-digit code sent to{" "}
                          <span className="font-medium">{phone}</span> via WhatsApp.
                        </p>

                        <div>
                          <input
                            ref={waOtpRef}
                            type="text"
                            inputMode="numeric"
                            autoComplete="one-time-code"
                            placeholder="123456"
                            value={waOtp}
                            onChange={(e) => handleWaOtpChange(e.target.value)}
                            required
                            maxLength={6}
                            className={`${inputBase} ${focusBrand} text-center text-2xl tracking-widest`}
                          />
                        </div>

                        {waError && (
                          <div className={alertError}>
                            <AlertCircle className={alertIcon} />
                            <p>{waError}</p>
                          </div>
                        )}

                        <button
                          type="submit"
                          disabled={waLoading || waOtp.length < 6}
                          className={btnPrimaryBrand}
                        >
                          {waLoading ? "Verifying..." : "Sign In"}
                        </button>

                        <div className="text-center text-sm text-gray-500">
                          {waCountdown > 0 ? (
                            <span>
                              Code expires in{" "}
                              <span className="font-medium text-gray-700">
                                {Math.floor(waCountdown / 60)}:
                                {String(waCountdown % 60).padStart(2, "0")}
                              </span>
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={async () => {
                                setWaLoading(true);
                                setWaError("");
                                try {
                                  const res = await fetch("/api/auth/whatsapp-otp/send", {
                                    method: "POST",
                                    headers: { "Content-Type": "application/json" },
                                    body: JSON.stringify({ phone }),
                                  });
                                  const data = await res.json();
                                  if (!res.ok) {
                                    setWaError(data.error ?? "Failed to resend code.");
                                  } else {
                                    startWaCountdown();
                                    setWaOtp("");
                                  }
                                } catch {
                                  setWaError("Network error. Please try again.");
                                } finally {
                                  setWaLoading(false);
                                }
                              }}
                              className="text-[#2B5EA7] hover:underline font-medium"
                            >
                              Resend code
                            </button>
                          )}
                        </div>
                      </>
                    )}

                    <button
                      type="button"
                      onClick={() => {
                        setWaStep("phone");
                        setWaOtp("");
                        setWaError("");
                        setWaNoAccount(false);
                        if (waTimerRef.current) clearInterval(waTimerRef.current);
                      }}
                      className={btnGhost}
                    >
                      Use a different number
                    </button>
                  </form>
                )}
              </>
            )}
          </div>

          {/* Signup link */}
          <p className="text-center text-sm text-gray-500 mt-4">
            Don&apos;t have a store?{" "}
            <Link href="/signup" className="text-[#2B5EA7] hover:underline font-medium">
              Create one free
            </Link>
          </p>

        </div>
      </div>
    </div>
  );
}
