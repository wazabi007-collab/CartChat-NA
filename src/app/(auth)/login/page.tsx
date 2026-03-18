"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { PublicNavbar } from "@/components/public-navbar";
import { GoogleSignInButton } from "@/components/google-sign-in-button";

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState<"email" | "otp">("email");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [countdown, setCountdown] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const supabase = createClient();
  const searchParams = useSearchParams();
  const authError = searchParams.get("error");

  useEffect(() => {
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

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

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: false },
    });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
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
    } else {
      // Check if merchant exists to route correctly
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: merchant } = await supabase
          .from("merchants")
          .select("id")
          .eq("user_id", user.id)
          .single();
        window.location.href = merchant ? "/dashboard" : "/dashboard/setup";
      } else {
        window.location.href = "/dashboard";
      }
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <PublicNavbar />
      <div className="flex items-center justify-center px-4 py-16 sm:py-24">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Sign in to your store</h1>
          <p className="text-gray-500 mt-1">Welcome back to OshiCart</p>
        </div>

        <div className="bg-white rounded-lg shadow-sm border p-6">
          {authError === "auth" && (
            <p className="text-red-600 text-sm mb-4 text-center">
              Sign-in failed or was cancelled. Please try again.
            </p>
          )}

          <GoogleSignInButton />

          <div className="relative my-5">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="bg-white px-3 text-gray-400">or</span>
            </div>
          </div>

          {step === "email" ? (
            <form onSubmit={handleSendOTP} className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-[#2B5EA7] focus:border-transparent"
                />
              </div>
              {error && <p className="text-red-600 text-sm">{error}</p>}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-2 bg-[#2B5EA7] text-white rounded-md hover:bg-[#234B86] disabled:opacity-50 font-medium"
              >
                {loading ? "Sending code..." : "Send Sign-in Code"}
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
                  className="w-full px-3 py-2 border rounded-md text-center text-2xl tracking-widest focus:outline-none focus:ring-2 focus:ring-[#2B5EA7] focus:border-transparent"
                />
              </div>
              {error && <p className="text-red-600 text-sm">{error}</p>}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-2 bg-[#2B5EA7] text-white rounded-md hover:bg-[#234B86] disabled:opacity-50 font-medium"
              >
                {loading ? "Verifying..." : "Sign In"}
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
                        options: { shouldCreateUser: false },
                      });
                      setLoading(false);
                      if (error) setError(error.message);
                      else startCountdown();
                    }}
                    className="text-[#2B5EA7] hover:underline"
                  >
                    Resend code
                  </button>
                )}
              </div>
              <button
                type="button"
                onClick={() => { setStep("email"); setOtp(""); setError(""); if (timerRef.current) clearInterval(timerRef.current); }}
                className="w-full text-sm text-gray-500 hover:text-gray-700"
              >
                Use a different email
              </button>
            </form>
          )}
        </div>

        <p className="text-center text-sm text-gray-500 mt-4">
          Don&apos;t have a store?{" "}
          <Link href="/signup" className="text-[#2B5EA7] hover:underline">
            Create one free
          </Link>
        </p>
      </div>
      </div>
    </div>
  );
}
