"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Upload,
  CheckCircle,
  MessageCircle,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { formatPrice, whatsappLink } from "@/lib/utils";
import { MAX_IMAGE_SIZE } from "@/lib/constants";
import type { CartItem } from "@/components/storefront/cart-provider";
import type { DeliveryMethod } from "@/types/database";

interface Props {
  merchantId: string;
  storeName: string;
  storeSlug: string;
  whatsappNumber: string;
  bankName: string | null;
  bankAccountNumber: string | null;
  bankAccountHolder: string | null;
  bankBranchCode: string | null;
}

type CheckoutStep = "form" | "success";

export function CheckoutForm({
  merchantId,
  storeName,
  storeSlug,
  whatsappNumber,
  bankName,
  bankAccountNumber,
  bankAccountHolder,
  bankBranchCode,
}: Props) {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [customerName, setCustomerName] = useState("");
  const [customerWhatsapp, setCustomerWhatsapp] = useState("");
  const [deliveryMethod, setDeliveryMethod] = useState<DeliveryMethod>("pickup");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<CheckoutStep>("form");
  const [orderNumber, setOrderNumber] = useState<number | null>(null);

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

  const hasBankDetails = bankName && bankAccountNumber;

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

    setSubmitting(true);

    try {
      const supabase = createClient();

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

      // Create order
      const { data: order, error: orderError } = await supabase
        .from("orders")
        .insert({
          merchant_id: merchantId,
          customer_name: customerName.trim(),
          customer_whatsapp: customerWhatsapp.trim(),
          delivery_method: deliveryMethod,
          delivery_address:
            deliveryMethod === "delivery" ? deliveryAddress.trim() : null,
          subtotal_nad: subtotal,
          proof_of_payment_url: proofUrl,
          notes: notes.trim() || null,
        })
        .select("id, order_number")
        .single();

      if (orderError || !order) {
        throw new Error("Failed to create order");
      }

      // Create order items
      const orderItems = cartItems.map((item) => ({
        order_id: order.id,
        product_id: item.productId,
        product_name: item.name,
        product_price: item.price,
        quantity: item.quantity,
        line_total: item.price * item.quantity,
      }));

      const { error: itemsError } = await supabase
        .from("order_items")
        .insert(orderItems);

      if (itemsError) {
        throw new Error("Failed to save order items");
      }

      // Clear cart
      localStorage.removeItem(`oshicart-cart-${storeSlug}`);

      setOrderNumber(order.order_number);
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
      `*Delivery:* ${deliveryMethod === "delivery" ? `Delivery to: ${deliveryAddress}` : "Pickup"}`,
      ...(notes ? [`*Notes:* ${notes}`] : []),
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
        <p className="text-sm text-gray-500 mt-1">
          Please contact the merchant on WhatsApp to confirm your order.
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
            <div className="border-t pt-2 mt-2 flex justify-between font-bold">
              <span>Subtotal</span>
              <span className="text-green-600">{formatPrice(subtotal)}</span>
            </div>
          </>
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

      {/* Bank Details & Proof of Payment */}
      {hasBankDetails && (
        <div className="bg-white rounded-lg border p-4 space-y-4">
          <h2 className="font-bold text-gray-900">Payment via EFT</h2>
          <div className="bg-gray-50 rounded-md p-3 text-sm space-y-1">
            <p>
              <span className="text-gray-500">Bank:</span>{" "}
              <span className="font-medium text-gray-900">{bankName}</span>
            </p>
            <p>
              <span className="text-gray-500">Account Holder:</span>{" "}
              <span className="font-medium text-gray-900">
                {bankAccountHolder}
              </span>
            </p>
            <p>
              <span className="text-gray-500">Account Number:</span>{" "}
              <span className="font-medium text-gray-900">
                {bankAccountNumber}
              </span>
            </p>
            {bankBranchCode && (
              <p>
                <span className="text-gray-500">Branch Code:</span>{" "}
                <span className="font-medium text-gray-900">
                  {bankBranchCode}
                </span>
              </p>
            )}
            <p className="mt-2 text-gray-500">
              Amount: <span className="font-bold text-green-600">{formatPrice(subtotal)}</span>
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Proof of Payment (optional)
            </label>
            <p className="text-xs text-gray-500 mb-2">
              Upload a screenshot of your EFT payment. Max 5MB.
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
        </div>
      )}

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
