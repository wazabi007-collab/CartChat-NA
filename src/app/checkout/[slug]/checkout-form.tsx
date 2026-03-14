"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Upload,
  CheckCircle,
  MessageCircle,
  Loader2,
  AlertCircle,
  Tag,
  X,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { formatPrice, whatsappLink } from "@/lib/utils";
import { MAX_IMAGE_SIZE, PAYMENT_METHODS, EWALLET_PROVIDERS } from "@/lib/constants";
import type { CartItem } from "@/components/storefront/cart-provider";
import type { DeliveryMethod, PaymentMethod } from "@/types/database";

interface DeliverySlots {
  enabled: boolean;
  days: number[];
  times: string[];
}

interface Props {
  merchantId: string;
  storeName: string;
  storeSlug: string;
  merchantTier: string;
  whatsappNumber: string;
  bankName: string | null;
  bankAccountNumber: string | null;
  bankAccountHolder: string | null;
  bankBranchCode: string | null;
  deliverySlots: DeliverySlots | null;
  deliveryFeeNad: number;
  acceptedPaymentMethods: string[];
  momoNumber: string | null;
  ewalletNumber: string | null;
  ewalletProvider: string | null;
  pay2cellNumber: string | null;
}

interface CouponApplied {
  code: string;
  discount_type: "percentage" | "fixed";
  discount_value: number;
}

function getAvailableDates(days: number[]): { label: string; value: string }[] {
  const result: { label: string; value: string }[] = [];
  const today = new Date();
  for (let i = 1; i <= 14; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    if (days.includes(d.getDay())) {
      result.push({
        label: d.toLocaleDateString("en-NA", { weekday: "long", day: "numeric", month: "short" }),
        value: d.toISOString().split("T")[0],
      });
    }
  }
  return result;
}

function calculateDiscount(coupon: CouponApplied, subtotal: number): number {
  if (coupon.discount_type === "percentage") {
    return Math.min(subtotal, Math.floor((subtotal * coupon.discount_value) / 100));
  }
  return Math.min(subtotal, coupon.discount_value);
}

function getPaymentLabel(method: string): string {
  return PAYMENT_METHODS.find((m) => m.value === method)?.label ?? method;
}

function getEwalletLabel(provider: string | null): string {
  return EWALLET_PROVIDERS.find((p) => p.value === provider)?.label ?? "eWallet";
}

function generatePaymentRef(storeName: string): string {
  const prefix = storeName.replace(/[^A-Za-z]/g, "").toUpperCase().slice(0, 4).padEnd(3, "X");
  const random = Math.random().toString(36).substring(2, 10).toUpperCase();
  return `${prefix}-${random}`;
}

type CheckoutStep = "form" | "success";

export function CheckoutForm({
  merchantId,
  storeName,
  storeSlug,
  merchantTier: _merchantTier,
  whatsappNumber,
  bankName,
  bankAccountNumber,
  bankAccountHolder,
  bankBranchCode,
  deliverySlots,
  deliveryFeeNad,
  acceptedPaymentMethods,
  momoNumber,
  ewalletNumber,
  ewalletProvider,
  pay2cellNumber,
}: Props) {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [customerName, setCustomerName] = useState("");
  const [customerWhatsapp, setCustomerWhatsapp] = useState("");
  const [deliveryMethod, setDeliveryMethod] = useState<DeliveryMethod>("pickup");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [deliveryDate, setDeliveryDate] = useState("");
  const [deliveryTime, setDeliveryTime] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<CheckoutStep>("form");
  const [orderId, setOrderId] = useState<string | null>(null);
  const [orderNumber, setOrderNumber] = useState<number | null>(null);
  const [paymentRef, setPaymentRef] = useState<string | null>(null);

  // Payment method
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(
    (acceptedPaymentMethods[0] as PaymentMethod) || "eft"
  );

  // Pre-generated payment reference for EFT
  const [preRef] = useState(() => generatePaymentRef(storeName));

  // Coupon
  const [couponCode, setCouponCode] = useState("");
  const [couponApplied, setCouponApplied] = useState<CouponApplied | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [applyingCoupon, setApplyingCoupon] = useState(false);

  const supabase = useMemo(() => createClient(), []);

  // Load cart from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(`oshicart-cart-${storeSlug}`);
      if (stored) {
        const items = JSON.parse(stored) as CartItem[];
        setCartItems(items);
      }
    } catch {
      // ignore
    }
  }, [storeSlug]);

  const subtotal = cartItems.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );

  const discount = couponApplied ? calculateDiscount(couponApplied, subtotal) : 0;
  const deliveryFee = deliveryMethod === "delivery" ? deliveryFeeNad : 0;
  const total = subtotal - discount + deliveryFee;

  const hasBankDetails = bankName && bankAccountNumber;
  const needsProof = paymentMethod !== "cod";

  const handleProofChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_IMAGE_SIZE) {
      setError("Proof image must be under 5MB");
      return;
    }
    setError(null);
    setProofFile(file);
  };

  const handleApplyCoupon = async () => {
    const code = couponCode.trim().toUpperCase();
    if (!code) return;

    setApplyingCoupon(true);
    setCouponError(null);

    const { data, error: fetchError } = await supabase
      .from("coupons")
      .select("code, discount_type, discount_value, min_order_nad, max_uses, current_uses, starts_at, expires_at")
      .eq("merchant_id", merchantId)
      .eq("code", code)
      .eq("is_active", true)
      .single();

    if (fetchError || !data) {
      setCouponError("Invalid coupon code");
      setApplyingCoupon(false);
      return;
    }

    // Client-side validations (server re-validates in RPC)
    const now = new Date();
    if (data.expires_at && new Date(data.expires_at) < now) {
      setCouponError("This coupon has expired");
      setApplyingCoupon(false);
      return;
    }
    if (data.starts_at && new Date(data.starts_at) > now) {
      setCouponError("This coupon is not yet active");
      setApplyingCoupon(false);
      return;
    }
    if (data.max_uses !== null && data.current_uses >= data.max_uses) {
      setCouponError("This coupon has reached its usage limit");
      setApplyingCoupon(false);
      return;
    }
    if (data.min_order_nad && subtotal < data.min_order_nad) {
      setCouponError(`Minimum order of ${formatPrice(data.min_order_nad)} required`);
      setApplyingCoupon(false);
      return;
    }

    setCouponApplied({
      code: data.code,
      discount_type: data.discount_type as "percentage" | "fixed",
      discount_value: data.discount_value,
    });
    setApplyingCoupon(false);
  };

  const handleRemoveCoupon = () => {
    setCouponApplied(null);
    setCouponCode("");
    setCouponError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (cartItems.length === 0) {
      setError("Your cart is empty");
      return;
    }
    if (!customerName.trim()) {
      setError("Please enter your name");
      return;
    }
    if (!customerWhatsapp.trim() || customerWhatsapp.length < 8) {
      setError("Please enter a valid WhatsApp number");
      return;
    }
    if (deliveryMethod === "delivery" && !deliveryAddress.trim()) {
      setError("Please enter a delivery address");
      return;
    }
    if (
      deliveryMethod === "delivery" &&
      deliverySlots?.enabled &&
      (!deliveryDate || !deliveryTime)
    ) {
      setError("Please select a delivery date and time slot");
      return;
    }

    setSubmitting(true);

    try {
      // Upload proof of payment if provided
      let proofUrl: string | null = null;
      if (proofFile) {
        const ext = proofFile.name.split(".").pop();
        const fileName = `${merchantId}/${Date.now()}.${ext}`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from("order-proofs")
          .upload(fileName, proofFile, {
            cacheControl: "3600",
            upsert: false,
          });

        if (uploadError) {
          throw new Error("Failed to upload proof of payment");
        }

        const { data: urlData } = supabase.storage
          .from("order-proofs")
          .getPublicUrl(uploadData.path);

        proofUrl = urlData.publicUrl;
      }

      // Create order via RPC
      const { data: orderData, error: orderError } = await supabase.rpc(
        "place_order",
        {
          p_merchant_id: merchantId,
          p_customer_name: customerName.trim(),
          p_customer_whatsapp: customerWhatsapp.trim(),
          p_delivery_method: deliveryMethod,
          p_subtotal_nad: subtotal,
          p_delivery_address:
            deliveryMethod === "delivery" ? deliveryAddress.trim() : null,
          p_delivery_date: deliveryDate || null,
          p_delivery_time: deliveryTime || null,
          p_notes: notes.trim() || null,
          p_proof_url: proofUrl,
          p_items: cartItems.map((item) => ({
            productId: item.productId,
            name: item.name,
            price: item.price,
            quantity: item.quantity,
          })),
          p_delivery_fee: deliveryFee,
          p_payment_method: paymentMethod,
          p_coupon_code: couponApplied?.code || null,
          p_discount_nad: 0, // server calculates
          p_payment_ref: paymentMethod === "eft" ? preRef : null,
        }
      );

      if (orderError) {
        const msg = orderError.message || "";
        if (msg.includes("Insufficient stock")) {
          throw new Error(msg.replace(/^.*Insufficient stock/, "Insufficient stock"));
        }
        if (msg.includes("coupon") || msg.includes("Coupon")) {
          throw new Error("Invalid or expired coupon code");
        }
        throw new Error(msg || "Failed to create order. Please try again.");
      }
      if (!orderData?.[0]) {
        throw new Error("Failed to create order");
      }

      const order = orderData[0] as { order_id: string; order_number: number; payment_reference: string };

      // Sync analytics for new order
      fetch("/api/analytics/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ merchant_id: merchantId }),
      }).catch(() => {});

      // Clear cart
      localStorage.removeItem(`oshicart-cart-${storeSlug}`);

      setOrderId(order.order_id);
      setOrderNumber(order.order_number);
      setPaymentRef(order.payment_reference);
      setStep("success");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  };

  // Success state
  if (step === "success") {
    const itemLines = cartItems
      .map((item) => `• ${item.name} x${item.quantity} — ${formatPrice(item.price * item.quantity)}`)
      .join("\n");
    const invoiceUrl = orderId
      ? `${window.location.origin}/invoice/${orderId}`
      : null;
    const waMessage = [
      `Hi ${storeName}! 🛒 New order #${orderNumber}`,
      ``,
      `*Customer:* ${customerName}`,
      `*WhatsApp:* ${customerWhatsapp}`,
      ``,
      `*Items:*`,
      itemLines,
      ``,
      `*Subtotal:* ${formatPrice(subtotal)}`,
      ...(discount > 0 ? [`*Discount:* -${formatPrice(discount)}${couponApplied ? ` (${couponApplied.code})` : ""}`] : []),
      ...(deliveryFee > 0 ? [`*Delivery Fee:* ${formatPrice(deliveryFee)}`] : []),
      `*Total:* ${formatPrice(total)}`,
      ...(paymentRef ? [`*Payment Ref:* ${paymentRef}`] : []),
      `*Payment:* ${getPaymentLabel(paymentMethod)}`,
      `*Delivery:* ${
        deliveryMethod === "delivery"
          ? `Delivery to: ${deliveryAddress}`
          : "Pickup"
      }`,
      ...(deliveryDate ? [`*Scheduled:* ${deliveryDate}${deliveryTime ? ` — ${deliveryTime}` : ""}`] : []),
      ...(notes ? [`*Notes:* ${notes}`] : []),
      ...(invoiceUrl ? [``, `*Invoice:* ${invoiceUrl}`] : []),
    ].join("\n");
    const waUrl = whatsappLink(whatsappNumber, waMessage);

    return (
      <div className="bg-white rounded-lg border p-6 text-center">
        <CheckCircle className="w-16 h-16 text-green-600 mx-auto" />
        <h2 className="text-xl font-bold text-gray-900 mt-4">
          Order Confirmed!
        </h2>
        <p className="text-gray-600 mt-2">
          Your order number is{" "}
          <span className="font-bold text-gray-900">#{orderNumber}</span>
        </p>
        {paymentRef && paymentMethod !== "cod" && (
          <div className="mt-3 bg-blue-50 rounded-md p-3">
            <p className="text-xs text-blue-600 font-medium">Payment Reference</p>
            <p className="text-lg font-bold text-blue-900">{paymentRef}</p>
            <p className="text-xs text-blue-500 mt-1">
              Use this reference when making your payment so the merchant can match it to your order.
            </p>
          </div>
        )}
        <p className="text-sm text-gray-500 mt-2">
          {paymentMethod === "cod"
            ? "Please have cash ready for payment on delivery/pickup."
            : "Please contact the merchant on WhatsApp to confirm your order."}
        </p>

        <div className="mt-6 space-y-3">
          <a
            href={waUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-4 rounded-md inline-flex items-center justify-center gap-2 transition-colors"
          >
            <MessageCircle className="w-5 h-5" />
            Message {storeName} on WhatsApp
          </a>
          <Link
            href={`/s/${storeSlug}`}
            className="block text-sm text-green-600 hover:text-green-700 font-medium"
          >
            Back to Store
          </Link>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Back to store */}
      <Link
        href={`/s/${storeSlug}`}
        className="inline-flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to store
      </Link>

      {/* Order Summary */}
      <div className="bg-white rounded-lg border p-4">
        <h2 className="font-bold text-gray-900 mb-3">Order Summary</h2>
        {cartItems.length === 0 ? (
          <p className="text-gray-500 text-sm">Your cart is empty</p>
        ) : (
          <>
            <ul className="divide-y">
              {cartItems.map((item) => (
                <li
                  key={item.productId}
                  className="py-2 flex justify-between text-sm"
                >
                  <span className="text-gray-700">
                    {item.name} x {item.quantity}
                  </span>
                  <span className="font-medium text-gray-900">
                    {formatPrice(item.price * item.quantity)}
                  </span>
                </li>
              ))}
            </ul>
            <div className="border-t pt-2 mt-2 space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Subtotal</span>
                <span className="text-gray-900">{formatPrice(subtotal)}</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-green-600">
                    Discount {couponApplied ? `(${couponApplied.code})` : ""}
                  </span>
                  <span className="text-green-600">-{formatPrice(discount)}</span>
                </div>
              )}
              {deliveryFee > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Delivery Fee</span>
                  <span className="text-gray-900">{formatPrice(deliveryFee)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold pt-1 border-t">
                <span>Total</span>
                <span className="text-green-600">{formatPrice(total)}</span>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Coupon Code */}
      <div className="bg-white rounded-lg border p-4 space-y-3">
        <h2 className="font-bold text-gray-900 flex items-center gap-2">
          <Tag className="w-4 h-4" />
          Discount Code
        </h2>
        {couponApplied ? (
          <div className="flex items-center justify-between bg-green-50 rounded-md px-3 py-2">
            <span className="text-sm text-green-700 font-medium">
              {couponApplied.code} applied —{" "}
              {couponApplied.discount_type === "percentage"
                ? `${couponApplied.discount_value}% off`
                : `${formatPrice(couponApplied.discount_value)} off`}
            </span>
            <button
              type="button"
              onClick={handleRemoveCoupon}
              className="text-green-600 hover:text-red-500"
            >
              <X size={16} />
            </button>
          </div>
        ) : (
          <div className="flex gap-2">
            <input
              type="text"
              value={couponCode}
              onChange={(e) => {
                setCouponCode(e.target.value.toUpperCase());
                setCouponError(null);
              }}
              placeholder="Enter code"
              maxLength={20}
              className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent uppercase"
            />
            <button
              type="button"
              onClick={handleApplyCoupon}
              disabled={applyingCoupon || !couponCode.trim()}
              className="px-4 py-2 bg-green-600 text-white text-sm rounded-md hover:bg-green-700 disabled:opacity-50"
            >
              {applyingCoupon ? "..." : "Apply"}
            </button>
          </div>
        )}
        {couponError && (
          <p className="text-sm text-red-600">{couponError}</p>
        )}
      </div>

      {/* Customer Details */}
      <div className="bg-white rounded-lg border p-4 space-y-4">
        <h2 className="font-bold text-gray-900">Your Details</h2>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Full Name *
          </label>
          <input
            type="text"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            required
            maxLength={100}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
            placeholder="Your full name"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            WhatsApp Number *
          </label>
          <input
            type="tel"
            value={customerWhatsapp}
            onChange={(e) => setCustomerWhatsapp(e.target.value)}
            required
            maxLength={15}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
            placeholder="+264 81 123 4567"
          />
        </div>
      </div>

      {/* Delivery Method */}
      <div className="bg-white rounded-lg border p-4 space-y-4">
        <h2 className="font-bold text-gray-900">Delivery Method</h2>

        <div className="flex gap-3">
          <label
            className={`flex-1 border rounded-md p-3 cursor-pointer text-center transition-colors ${
              deliveryMethod === "pickup"
                ? "border-green-600 bg-green-50 text-green-700"
                : "border-gray-300 text-gray-600 hover:border-gray-400"
            }`}
          >
            <input
              type="radio"
              name="deliveryMethod"
              value="pickup"
              checked={deliveryMethod === "pickup"}
              onChange={() => setDeliveryMethod("pickup")}
              className="sr-only"
            />
            <span className="font-medium text-sm">Pickup</span>
          </label>
          <label
            className={`flex-1 border rounded-md p-3 cursor-pointer text-center transition-colors ${
              deliveryMethod === "delivery"
                ? "border-green-600 bg-green-50 text-green-700"
                : "border-gray-300 text-gray-600 hover:border-gray-400"
            }`}
          >
            <input
              type="radio"
              name="deliveryMethod"
              value="delivery"
              checked={deliveryMethod === "delivery"}
              onChange={() => setDeliveryMethod("delivery")}
              className="sr-only"
            />
            <span className="font-medium text-sm">Delivery</span>
          </label>
        </div>

        {deliveryMethod === "delivery" && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Delivery Address *
            </label>
            <textarea
              value={deliveryAddress}
              onChange={(e) => setDeliveryAddress(e.target.value)}
              required
              maxLength={500}
              rows={3}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none"
              placeholder="Enter your full delivery address"
            />
          </div>
        )}

        {/* Delivery scheduling */}
        {deliveryMethod === "delivery" && deliverySlots?.enabled && (
          <>
            {(() => {
              const availableDates = getAvailableDates(deliverySlots.days);
              return availableDates.length > 0 ? (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Delivery Date *
                    </label>
                    <select
                      value={deliveryDate}
                      onChange={(e) => setDeliveryDate(e.target.value)}
                      required
                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                    >
                      <option value="">Select a date...</option>
                      {availableDates.map((d) => (
                        <option key={d.value} value={d.value}>
                          {d.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  {deliverySlots.times.length > 0 && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Time Slot *
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        {deliverySlots.times.map((slot) => (
                          <label
                            key={slot}
                            className={`flex items-center justify-center border rounded-md p-2 cursor-pointer text-sm text-center transition-colors ${
                              deliveryTime === slot
                                ? "border-green-600 bg-green-50 text-green-700 font-medium"
                                : "border-gray-300 text-gray-600 hover:border-gray-400"
                            }`}
                          >
                            <input
                              type="radio"
                              name="deliveryTime"
                              value={slot}
                              checked={deliveryTime === slot}
                              onChange={() => setDeliveryTime(slot)}
                              className="sr-only"
                            />
                            {slot}
                          </label>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <p className="text-sm text-amber-600 bg-amber-50 rounded-md p-3">
                  No delivery slots available in the next 14 days. Please contact the merchant directly.
                </p>
              );
            })()}
          </>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Notes (optional)
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            maxLength={500}
            rows={2}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none"
            placeholder="Any special instructions..."
          />
        </div>
      </div>

      {/* Payment Method */}
      <div className="bg-white rounded-lg border p-4 space-y-4">
        <h2 className="font-bold text-gray-900">Payment Method</h2>

        <div className="grid grid-cols-2 gap-2">
          {acceptedPaymentMethods.map((method) => {
            const info = PAYMENT_METHODS.find((m) => m.value === method);
            if (!info) return null;
            return (
              <label
                key={method}
                className={`border rounded-md p-3 cursor-pointer text-center transition-colors ${
                  paymentMethod === method
                    ? "border-green-600 bg-green-50 text-green-700"
                    : "border-gray-300 text-gray-600 hover:border-gray-400"
                }`}
              >
                <input
                  type="radio"
                  name="paymentMethod"
                  value={method}
                  checked={paymentMethod === method}
                  onChange={() => setPaymentMethod(method as PaymentMethod)}
                  className="sr-only"
                />
                <div className="text-lg">{info.icon}</div>
                <span className="font-medium text-xs block mt-1">{info.label}</span>
              </label>
            );
          })}
        </div>

        {/* Payment Instructions */}
        {paymentMethod === "eft" && hasBankDetails && (
          <div className="bg-gray-50 rounded-md p-3 text-sm space-y-1">
            <p className="font-medium text-gray-900 mb-2">Bank Transfer Details</p>
            <p>
              <span className="text-gray-500">Bank:</span>{" "}
              <span className="font-medium text-gray-900">{bankName}</span>
            </p>
            <p>
              <span className="text-gray-500">Account Holder:</span>{" "}
              <span className="font-medium text-gray-900">{bankAccountHolder}</span>
            </p>
            <p>
              <span className="text-gray-500">Account Number:</span>{" "}
              <span className="font-medium text-gray-900">{bankAccountNumber}</span>
            </p>
            {bankBranchCode && (
              <p>
                <span className="text-gray-500">Branch Code:</span>{" "}
                <span className="font-medium text-gray-900">{bankBranchCode}</span>
              </p>
            )}
            <p className="mt-2 text-gray-500">
              Amount: <span className="font-bold text-green-600">{formatPrice(total)}</span>
            </p>
            <div className="mt-3 bg-blue-50 rounded-md p-3 border border-blue-200">
              <p className="text-xs text-blue-600 font-medium">Your Payment Reference</p>
              <p className="text-xl font-bold text-blue-900 tracking-wide">{preRef}</p>
              <p className="text-xs text-blue-500 mt-1">
                Use this as the reference/description when making your EFT payment so the merchant can match it to your order.
              </p>
            </div>
          </div>
        )}

        {paymentMethod === "cod" && (
          <div className="bg-amber-50 rounded-md p-3 text-sm text-amber-800">
            <p className="font-medium">Cash on Delivery</p>
            <p className="mt-1">
              Pay <span className="font-bold">{formatPrice(total)}</span> in cash when your order is{" "}
              {deliveryMethod === "delivery" ? "delivered" : "picked up"}.
            </p>
          </div>
        )}

        {paymentMethod === "momo" && (
          <div className="bg-blue-50 rounded-md p-3 text-sm text-blue-800 space-y-1">
            <p className="font-medium">MTC MoMo / Maris Payment</p>
            {momoNumber ? (
              <>
                <p>
                  Send <span className="font-bold">{formatPrice(total)}</span> to:
                </p>
                <p className="font-bold text-lg">{momoNumber}</p>
                <p className="text-xs mt-1">
                  Use MTC Money (*133#) or MTC Maris app. Upload proof below.
                </p>
              </>
            ) : (
              <p>Contact the merchant for their MoMo number.</p>
            )}
          </div>
        )}

        {paymentMethod === "ewallet" && (
          <div className="bg-purple-50 rounded-md p-3 text-sm text-purple-800 space-y-1">
            <p className="font-medium">{getEwalletLabel(ewalletProvider)} Payment</p>
            {ewalletNumber ? (
              <>
                <p>
                  Send <span className="font-bold">{formatPrice(total)}</span> to:
                </p>
                <p className="font-bold text-lg">{ewalletNumber}</p>
                <p className="text-xs mt-1">
                  Upload proof of payment below after sending.
                </p>
              </>
            ) : (
              <p>Contact the merchant for their eWallet number.</p>
            )}
          </div>
        )}

        {paymentMethod === "pay2cell" && (
          <div className="bg-teal-50 rounded-md p-3 text-sm text-teal-800 space-y-1">
            <p className="font-medium">FNB Pay2Cell Payment</p>
            {pay2cellNumber ? (
              <>
                <p>
                  Send <span className="font-bold">{formatPrice(total)}</span> via Pay2Cell to:
                </p>
                <p className="font-bold text-lg">{pay2cellNumber}</p>
                <p className="text-xs mt-1">
                  Open your FNB App → Payments → Pay2Cell.
                  Upload proof of payment below after sending.
                </p>
              </>
            ) : (
              <p>Contact the merchant for their FNB Pay2Cell number.</p>
            )}
          </div>
        )}

        {/* Proof of Payment upload (not for COD) */}
        {needsProof && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Proof of Payment (optional)
            </label>
            <p className="text-xs text-gray-500 mb-2">
              Upload a screenshot of your payment confirmation. Max 5MB.
            </p>
            <label className="flex items-center justify-center gap-2 border-2 border-dashed border-gray-300 rounded-md p-4 cursor-pointer hover:border-green-500 transition-colors">
              <Upload className="w-5 h-5 text-gray-400" />
              <span className="text-sm text-gray-600">
                {proofFile ? proofFile.name : "Choose image..."}
              </span>
              <input
                type="file"
                accept="image/*"
                onChange={handleProofChange}
                className="sr-only"
              />
            </label>
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-3 flex items-start gap-2">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Submit */}
      <button
        type="submit"
        disabled={submitting || cartItems.length === 0}
        className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-semibold py-3 rounded-md transition-colors flex items-center justify-center gap-2"
      >
        {submitting ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            Placing Order...
          </>
        ) : (
          "Place Order"
        )}
      </button>
    </form>
  );
}
