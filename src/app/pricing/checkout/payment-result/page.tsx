"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { CheckCircle, XCircle, AlertTriangle, ArrowLeft } from "lucide-react";
import { track } from "@/lib/track";

export default function PaymentResultPage() {
  return (
    <Suspense>
      <PaymentResult />
    </Suspense>
  );
}

function PaymentResult() {
  const searchParams = useSearchParams();
  const status = searchParams.get("status");
  const approval = searchParams.get("approval");
  const code = searchParams.get("code");

  if (status === "success") {
    track("dpo_payment_success", { approval: approval || "" });
  } else {
    track("dpo_payment_failed", { status: status || "unknown", code: code || "" });
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-xl border p-8 max-w-md w-full text-center">
        {status === "success" ? (
          <>
            <CheckCircle className="w-16 h-16 text-green-600 mx-auto" />
            <h1 className="text-2xl font-bold text-gray-900 mt-4">
              Payment Successful!
            </h1>
            <p className="text-gray-600 mt-2">
              Your subscription has been activated. You now have full access to your upgraded plan.
            </p>
            {approval && (
              <p className="text-sm text-gray-500 mt-2">
                Approval code: <span className="font-mono font-medium">{approval}</span>
              </p>
            )}
            <div className="mt-6 space-y-3">
              <Link
                href="/dashboard"
                className="block w-full py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors"
              >
                Go to Dashboard
              </Link>
              <Link
                href="/dashboard/settings"
                className="block text-sm text-gray-500 hover:text-gray-700"
              >
                View store settings
              </Link>
            </div>
          </>
        ) : status === "cancelled" ? (
          <>
            <AlertTriangle className="w-16 h-16 text-amber-500 mx-auto" />
            <h1 className="text-2xl font-bold text-gray-900 mt-4">
              Payment Cancelled
            </h1>
            <p className="text-gray-600 mt-2">
              You cancelled the payment. No charges were made. You can try again or pay via EFT.
            </p>
            <div className="mt-6 space-y-3">
              <Link
                href="/#pricing"
                className="block w-full py-2.5 bg-gray-900 hover:bg-gray-800 text-white rounded-lg font-medium transition-colors"
              >
                Back to Pricing
              </Link>
            </div>
          </>
        ) : status === "declined" ? (
          <>
            <XCircle className="w-16 h-16 text-red-500 mx-auto" />
            <h1 className="text-2xl font-bold text-gray-900 mt-4">
              Payment Declined
            </h1>
            <p className="text-gray-600 mt-2">
              Your card payment was declined. Please try a different card or pay via EFT bank transfer.
            </p>
            <div className="mt-6 space-y-3">
              <Link
                href="/#pricing"
                className="block w-full py-2.5 bg-gray-900 hover:bg-gray-800 text-white rounded-lg font-medium transition-colors"
              >
                Try Again
              </Link>
            </div>
          </>
        ) : (
          <>
            <AlertTriangle className="w-16 h-16 text-amber-500 mx-auto" />
            <h1 className="text-2xl font-bold text-gray-900 mt-4">
              Payment Not Completed
            </h1>
            <p className="text-gray-600 mt-2">
              {status === "pending"
                ? "Your payment is being processed. We'll update your subscription once it's confirmed."
                : "Something went wrong with the payment. You can try again or pay via EFT."}
            </p>
            {code && (
              <p className="text-xs text-gray-400 mt-2">Reference: {code}</p>
            )}
            <div className="mt-6 space-y-3">
              <Link
                href="/#pricing"
                className="block w-full py-2.5 bg-gray-900 hover:bg-gray-800 text-white rounded-lg font-medium transition-colors"
              >
                Back to Pricing
              </Link>
            </div>
          </>
        )}

        <div className="mt-6 pt-4 border-t">
          <Link href="/" className="text-sm text-gray-400 hover:text-gray-600 inline-flex items-center gap-1">
            <ArrowLeft size={14} />
            Back to OshiCart
          </Link>
        </div>
      </div>
    </div>
  );
}
