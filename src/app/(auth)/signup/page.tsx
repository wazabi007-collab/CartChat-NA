"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { normalizeNamibianPhone } from "@/lib/utils";
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
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState<"form" | "otp">("form");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [countdown, setCountdown] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const supabase = createClient();

  useEffect(() => {
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
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

  function startCountdown() {
    setCountdown(300);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) { clearInterval(timerRef.current!); return 0; }
        return prev - 1;
      });
    }, 1000);
  }

  async function handleSendOTP(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    track("signup_started", { method: "email" });

    // Check if account already exists
    const checkRes = await fetch("/api/check-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const { exists } = await checkRes.json();
    if (exists) {
      setError("An account with this email already exists. Please sign in instead.");
      setLoading(false);
      return;
    }

    const formattedPhone = normalizeNamibianPhone(whatsapp);

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        data: { whatsapp_number: formattedPhone },
        shouldCreateUser: true,
      },
    });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      track("signup_otp_sent", { method: "email" });
      setStep("otp");
      setLoading(false);
      startCountdown();
    }
  }

  async function handleVerifyOTP(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const { error } = await supabase.auth.verifyOtp({
      email,
      token: otp,
      type: "email",
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    // Redirect to setup for new users, dashboard for existing ones
    const { data: { user: verifiedUser } } = await supabase.auth.getUser();
    const { data: merchant } = await supabase
      .from("merchants")
      .select("id")
      .eq("user_id", verifiedUser!.id)
      .single();

    track("signup_completed", { method: "email", had_merchant: !!merchant });

    if (merchant) {
      window.location.href = tierParam ? `/pricing/checkout?tier=${tierParam}` : "/dashboard";
    } else {
      window.location.href = tierParam ? `/dashboard/setup?tier=${tierParam}` : "/dashboard/setup";
    }
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

          {step === "form" ? (
            <form onSubmit={handleSendOTP} className="space-y-4">
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
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className={`${inputBase} ${focusBrand}`}
                />
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
                {loading ? "Sending code..." : "Get Started — It's Free"}
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOTP} className="space-y-4">
              <p className="text-sm text-gray-600">
                Enter the 6-digit code sent to{" "}
                <span className="font-medium">{email}</span>
              </p>
              <div>
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="123456"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  required
                  maxLength={6}
                  className={`${inputBase} ${focusBrand} text-center text-2xl tracking-widest`}
                />
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
                {loading ? "Verifying..." : "Create My Store"}
              </button>
              <div className="text-center text-sm text-gray-500">
                {countdown > 0 ? (
                  <span>
                    Code expires in{" "}
                    <span className="font-medium text-gray-700">
                      {Math.floor(countdown / 60)}:{String(countdown % 60).padStart(2, "0")}
                    </span>
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={async () => {
                      setLoading(true);
                      setError("");
                      const { error } = await supabase.auth.signInWithOtp({
                        email,
                        options: { data: { whatsapp_number: normalizeNamibianPhone(whatsapp) }, shouldCreateUser: true },
                      });
                      setLoading(false);
                      if (error) setError(error.message);
                      else startCountdown();
                    }}
                    className="text-[#2B5EA7] hover:underline font-medium"
                  >
                    Resend code
                  </button>
                )}
              </div>
              <button
                type="button"
                onClick={() => { setStep("form"); setOtp(""); setError(""); if (timerRef.current) clearInterval(timerRef.current); }}
                className={btnGhost}
              >
                Use a different email
              </button>
            </form>
          )}
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
