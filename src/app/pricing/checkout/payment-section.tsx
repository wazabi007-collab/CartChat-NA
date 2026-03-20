"use client";

import { useState } from "react";
import { CreditCard, Building2, MessageCircle } from "lucide-react";
import { CopyButton } from "./copy-button";
import { DpoPayButton } from "./dpo-pay-button";

interface Props {
  tier: string;
  tierLabel: string;
  priceDisplay: string;
  priceNadCents: number;
  reference: string;
  merchantId: string;
  merchantName: string;
  dpoEnabled: boolean;
  waLink: string;
  bank: {
    bank: string;
    accountHolder: string;
    accountNumber: string;
    branchCode: string;
    accountType: string;
  };
}

export function PaymentSection({
  tier,
  tierLabel,
  priceDisplay,
  priceNadCents,
  reference,
  merchantId,
  merchantName,
  dpoEnabled,
  waLink,
  bank,
}: Props) {
  const [method, setMethod] = useState<"card" | "eft">(dpoEnabled && merchantId ? "card" : "eft");

  return (
    <div className="space-y-5">
      {/* Payment method toggle */}
      {dpoEnabled && merchantId && (
        <div className="flex gap-2">
          <button
            onClick={() => setMethod("card")}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border-2 font-medium text-sm transition-all ${
              method === "card"
                ? "border-blue-600 bg-blue-50 text-blue-700"
                : "border-gray-200 bg-white text-gray-500 hover:border-gray-300"
            }`}
          >
            <CreditCard size={18} />
            Pay Online
            <span className="text-xs px-1.5 py-0.5 rounded-full bg-green-100 text-green-700 font-semibold">Instant</span>
          </button>
          <button
            onClick={() => setMethod("eft")}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border-2 font-medium text-sm transition-all ${
              method === "eft"
                ? "border-gray-900 bg-gray-50 text-gray-900"
                : "border-gray-200 bg-white text-gray-500 hover:border-gray-300"
            }`}
          >
            <Building2 size={18} />
            Bank Transfer (EFT)
          </button>
        </div>
      )}

      {/* Card payment */}
      {method === "card" && dpoEnabled && merchantId && (
        <div className="bg-white rounded-xl border overflow-hidden">
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-5">
            <div className="flex items-center gap-2">
              <CreditCard size={20} className="text-white" />
              <h3 className="text-white font-bold text-lg">Pay Online with Card</h3>
            </div>
            <p className="text-blue-200 text-sm mt-0.5">
              Instant activation — pay securely with Visa, Mastercard, or mobile money
            </p>
          </div>

          <div className="px-6 py-5 space-y-4">
            <DpoPayButton
              tier={tier}
              merchantId={merchantId}
              storeName={merchantName}
              reference={reference}
              priceNadCents={priceNadCents}
            />

            <p className="text-xs text-center text-gray-400">
              Secured by DPO Group — Visa, Mastercard, and mobile payments accepted
            </p>
          </div>
        </div>
      )}

      {/* EFT payment */}
      {method === "eft" && (
        <>
          <div className="bg-white rounded-xl border overflow-hidden">
            <div className="bg-gradient-to-r from-gray-900 to-gray-800 px-6 py-5">
              <h3 className="text-white font-bold text-lg">Pay via Bank Transfer (EFT)</h3>
              <p className="text-gray-400 text-sm mt-0.5">
                Pay via EFT and we&apos;ll activate your plan within 24 hours
              </p>
            </div>

            <div className="px-6 py-5 space-y-4">
              <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-3">
                <p className="text-xs uppercase tracking-widest text-green-600 font-semibold mb-1">
                  Your Payment Reference
                </p>
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-lg text-gray-900">{reference}</span>
                  <CopyButton text={reference} />
                </div>
                <p className="text-xs text-green-700 mt-1">
                  Use this as your EFT payment reference
                </p>
              </div>

              <div className="space-y-2.5">
                <PaymentRow label="Bank" value={bank.bank} />
                <PaymentRow label="Account Holder" value={bank.accountHolder} />
                <PaymentRow label="Account Number" value={bank.accountNumber} />
                <PaymentRow label="Branch Code" value={bank.branchCode} />
                <PaymentRow label="Account Type" value={bank.accountType} />
                <div className="border-t border-gray-100 pt-2">
                  <PaymentRow label="Amount" value={`${priceDisplay} / month`} bold />
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border px-6 py-5">
            <h4 className="font-semibold text-gray-900 mb-3">How it works</h4>
            <ol className="space-y-3">
              <Step num={1}>Make an EFT payment of <strong>{priceDisplay}</strong> using the reference above</Step>
              <Step num={2}>Send us proof of payment on WhatsApp (screenshot or reference number)</Step>
              <Step num={3}>We&apos;ll activate your <strong>{tierLabel}</strong> plan within 24 hours</Step>
            </ol>
          </div>

          <a
            href={waLink}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full py-3.5 bg-green-600 hover:bg-green-700 text-white rounded-xl font-semibold text-sm transition-colors shadow-lg shadow-green-600/20"
          >
            <MessageCircle size={18} />
            Send Proof of Payment via WhatsApp
          </a>
        </>
      )}
    </div>
  );
}

function PaymentRow({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-gray-500">{label}</span>
      <span className={bold ? "font-bold text-gray-900 text-base" : "text-gray-900 font-medium"}>{value}</span>
    </div>
  );
}

function Step({ num, children }: { num: number; children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-3">
      <span className="shrink-0 w-6 h-6 rounded-full bg-green-100 text-green-700 text-xs font-bold flex items-center justify-center">
        {num}
      </span>
      <span className="text-sm text-gray-700 pt-0.5">{children}</span>
    </li>
  );
}
