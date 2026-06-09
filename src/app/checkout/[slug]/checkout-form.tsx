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
  Truck,
  Navigation,
  Route,
  X,
  type LucideIcon,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { formatPrice, whatsappLink } from "@/lib/utils";
import { calculateVatBreakdown, VAT_RATE_LABEL } from "@/lib/vat";
import { track } from "@/lib/track";
import { MAX_IMAGE_SIZE, PAYMENT_METHODS, EWALLET_PROVIDERS } from "@/lib/constants";
import { getCartItemKey, type CartItem } from "@/components/storefront/cart-provider";
import type { DeliveryMethod, DeliveryProvider, PaymentMethod } from "@/types/database";
import { PhoneInput } from "@/components/phone-input";
import {
  inputBase,
  textareaBase,
  selectBase,
  focusGreen,
  label,
  helperText,
  card,
  sectionHeading,
  btnPrimaryGreen,
  btnSmallGreen,
  alertError,
  alertWarning,
  alertInfo,
  alertIcon,
  radioCardBase,
  radioCardSelected,
  radioCardUnselected,
} from "@/lib/ui";

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
  vatNumber: string | null;
  vatInclusive: boolean;
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

const DELIVERY_PROVIDERS: Array<{
  value: DeliveryProvider;
  label: string;
  body: string;
  tag: string;
  Icon: LucideIcon;
  iconClass: string;
  tagClass: string;
}> = [
  {
    value: "store",
    label: "Store delivery",
    body: "Merchant handles delivery and adds the store delivery fee.",
    tag: "Store fee",
    Icon: Truck,
    iconClass: "border-emerald-200 bg-emerald-50 text-emerald-700",
    tagClass: "bg-emerald-100 text-emerald-800",
  },
  {
    value: "yango",
    label: "Yango",
    body: "Buyer arranges and pays the Yango courier directly.",
    tag: "Buyer pays",
    Icon: Navigation,
    iconClass: "border-amber-200 bg-amber-50 text-amber-700",
    tagClass: "bg-amber-100 text-amber-800",
  },
  {
    value: "indrive",
    label: "inDrive",
    body: "Buyer negotiates and pays the inDrive courier directly.",
    tag: "Buyer pays",
    Icon: Route,
    iconClass: "border-lime-200 bg-lime-50 text-lime-700",
    tagClass: "bg-lime-100 text-lime-800",
  },
];

function getDeliveryProviderLabel(provider: DeliveryProvider) {
  return DELIVERY_PROVIDERS.find((option) => option.value === provider)?.label ?? "Store delivery";
}

function generatePaymentRef(storeName: string): string {
  const prefix = storeName.replace(/[^A-Za-z]/g, "").toUpperCase().slice(0, 4).padEnd(3, "X");
  const random = Math.random().toString(36).substring(2, 10).toUpperCase();
  return `${prefix}-${random}`;
}

function formatVariantAttributes(attributes?: Record<string, string>) {
  if (!attributes || Object.keys(attributes).length === 0) return "";
  return Object.entries(attributes)
    .map(([key, value]) => `${key}: ${value}`)
    .join(" | ");
}

function formatCartItemName(item: CartItem) {
  const attrs = formatVariantAttributes(item.variantAttributes);
  return attrs ? `${item.name} (${attrs})` : item.name;
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
  vatNumber,
  vatInclusive,
}: Props) {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [customerName, setCustomerName] = useState("");
  const [customerWhatsapp, setCustomerWhatsapp] = useState("");
  const [deliveryMethod, setDeliveryMethod] = useState<DeliveryMethod>("pickup");
  const [deliveryProvider, setDeliveryProvider] = useState<DeliveryProvider>("store");
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
  const buyerPaidCourier =
    deliveryMethod === "delivery" && (deliveryProvider === "yango" || deliveryProvider === "indrive");
  const deliveryFee =
    deliveryMethod === "delivery" && deliveryProvider === "store" ? deliveryFeeNad : 0;
  const preVatTotal = subtotal - discount + deliveryFee;
  const vatBreakdown = calculateVatBreakdown({
    amountNad: preVatTotal,
    vatNumber,
    vatInclusive,
  });
  const total = vatBreakdown.payableTotal;

  const hasBankDetails = bankName && bankAccountNumber;
  const needsProof = paymentMethod !== "cod";
  const effectiveDeliveryProvider: DeliveryProvider =
    deliveryMethod === "delivery" ? deliveryProvider : "store";
  const deliveryProviderLabel = getDeliveryProviderLabel(effectiveDeliveryProvider);
  const courierNote = buyerPaidCourier
    ? `${deliveryProviderLabel} selected: buyer arranges and pays the courier directly. Courier fee is not included in this OshiCart order.`
    : null;
  const orderNotes = [courierNote, notes.trim()].filter(Boolean).join("\n\n") || null;

  const handleProofChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_IMAGE_SIZE) {
      setError("Proof image must be under 5MB");
      return;
    }
    setError(null);
    setProofFile(file);
    track("proof_uploaded", { merchant_id: merchantId, file_size: file.size });
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
    track("coupon_applied", { merchant_id: merchantId, code: data.code, discount_type: data.discount_type });
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
    track("checkout_submitted", { merchant_id: merchantId, item_count: cartItems.length, total_nad: total, payment_method: paymentMethod });

    try {
      // Re-validate prices and selected variants before submitting.
      const productIds = [...new Set(cartItems.map((item) => item.productId))];
      const variantIds = [...new Set(cartItems.map((item) => item.variantId).filter(Boolean))] as string[];
      const { data: currentProducts, error: priceError } = await supabase
        .from("products")
        .select("id, price_nad")
        .in("id", productIds);

      if (priceError || !currentProducts) {
        setError("Unable to verify current prices. Please try again.");
        setSubmitting(false);
        return;
      }

      const priceMap = new Map(
        currentProducts.map((p: { id: string; price_nad: number }) => [p.id, p.price_nad])
      );
      const variantPriceMap = new Map<string, number>();
      if (variantIds.length > 0) {
        const { data: currentVariants, error: variantPriceError } = await supabase
          .from("product_variants")
          .select("id, price_nad, is_available, stock_quantity, track_inventory, allow_backorder")
          .in("id", variantIds);

        if (variantPriceError || !currentVariants) {
          setError("Unable to verify current product options. Please try again.");
          setSubmitting(false);
          return;
        }

        for (const variant of currentVariants) {
          const unavailable =
            !variant.is_available ||
            (variant.track_inventory && variant.stock_quantity <= 0 && !variant.allow_backorder);
          if (unavailable) {
            setError("One of your selected product options is no longer available. Please review your cart.");
            setSubmitting(false);
            return;
          }
          variantPriceMap.set(variant.id, variant.price_nad);
        }
      }

      let pricesChanged = false;
      const updatedItems = cartItems.map((item) => {
        const currentPrice = item.variantId
          ? variantPriceMap.get(item.variantId)
          : priceMap.get(item.productId);
        if (currentPrice !== undefined && currentPrice !== item.price) {
          pricesChanged = true;
          return { ...item, price: currentPrice };
        }
        return item;
      });

      if (pricesChanged) {
        setCartItems(updatedItems);
        localStorage.setItem(
          `oshicart-cart-${storeSlug}`,
          JSON.stringify(updatedItems)
        );
        setError("Some prices have changed since you added items to your cart. Please review your updated cart and try again.");
        setSubmitting(false);
        return;
      }

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

        const { data: urlData } = await supabase.storage
          .from("order-proofs")
          .createSignedUrl(uploadData.path, 604800); // 7-day expiry

        proofUrl = urlData?.signedUrl || null;
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
          p_notes: orderNotes,
          p_proof_url: proofUrl,
          p_items: cartItems.map((item) => ({
            productId: item.productId,
            variantId: item.variantId || null,
            name: item.name,
            price: item.price,
            quantity: item.quantity,
          })),
          p_delivery_fee: deliveryFee,
          p_delivery_provider: effectiveDeliveryProvider,
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

      const order = orderData[0] as { order_id: string; order_number: number; payment_reference: string; tracking_token: string };

      // Sync analytics for new order
      fetch("/api/analytics/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ merchant_id: merchantId }),
      }).catch(() => {});

      // Send email notification to merchant
      fetch("/api/orders/notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          merchant_id: merchantId,
          order_number: order.order_number,
          customer_name: customerName.trim(),
          customer_whatsapp: customerWhatsapp.trim(),
          items: cartItems.map((item) => ({
            name: item.name,
            variant_sku: item.variantSku,
            variant_attributes: item.variantAttributes,
            quantity: item.quantity,
            price: item.price,
          })),
          subtotal,
          delivery_fee: deliveryFee,
          discount,
          vat: vatBreakdown.vatAmount,
          vat_inclusive: vatBreakdown.vatInclusive,
          total,
          payment_method: paymentMethod,
          payment_ref: order.payment_reference,
          delivery_method: deliveryMethod,
          delivery_provider: effectiveDeliveryProvider,
          delivery_address: deliveryMethod === "delivery" ? deliveryAddress.trim() : null,
          delivery_date: deliveryDate || null,
          delivery_time: deliveryTime || null,
          notes: orderNotes,
        }),
      }).catch(() => {});

      // WhatsApp Business API: notify merchant + customer. Recipients and
      // content are derived server-side from the order; this call is gated by
      // the order's tracking_token (returned by place_order) so it cannot be
      // abused to send arbitrary messages.
      fetch("/api/orders/announce", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          order_id: order.order_id,
          tracking_token: order.tracking_token,
        }),
      }).catch(() => {});

      // Clear cart
      localStorage.removeItem(`oshicart-cart-${storeSlug}`);

      setOrderId(order.order_id);
      setOrderNumber(order.order_number);
      setPaymentRef(order.payment_reference);
      track("checkout_completed", { merchant_id: merchantId, order_number: order.order_number, total_nad: total, payment_method: paymentMethod });
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
      .map((item) => `- ${formatCartItemName(item)} x${item.quantity} - ${formatPrice(item.price * item.quantity)}`)
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
      ...(vatBreakdown.hasVat ? [`*VAT (${VAT_RATE_LABEL}):* ${formatPrice(vatBreakdown.vatAmount)}${vatBreakdown.vatInclusive ? " included" : ""}`] : []),
      `*Total:* ${formatPrice(total)}`,
      ...(paymentRef ? [`*Payment Ref:* ${paymentRef}`] : []),
      `*Payment:* ${getPaymentLabel(paymentMethod)}`,
      `*Delivery:* ${
        deliveryMethod === "delivery"
          ? buyerPaidCourier
            ? `${deliveryProviderLabel} courier arranged and paid by buyer to: ${deliveryAddress}`
            : `Store delivery to: ${deliveryAddress}`
          : "Pickup"
      }`,
      ...(deliveryDate ? [`*Scheduled:* ${deliveryDate}${deliveryTime ? ` — ${deliveryTime}` : ""}`] : []),
      ...(orderNotes ? [`*Notes:* ${orderNotes}`] : []),
      ...(invoiceUrl ? [``, `*Invoice:* ${invoiceUrl}`] : []),
    ].join("\n");
    const waUrl = whatsappLink(whatsappNumber, waMessage);

    return (
      <div className={`${card} text-center`}>
        <CheckCircle className="w-16 h-16 text-green-600 mx-auto" />
        <h2 className="text-xl font-bold text-gray-900 mt-4">
          Order Confirmed!
        </h2>
        <p className="text-gray-600 mt-2">
          Your order number is{" "}
          <span className="font-bold text-gray-900">#{orderNumber}</span>
        </p>
        {paymentRef && paymentMethod !== "cod" && (
          <div className="mt-3 bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-xs text-blue-600 font-medium">Payment Reference</p>
            <p className="text-lg font-bold text-blue-900">{paymentRef}</p>
            <p className="text-xs text-blue-500 mt-1">
              Use this reference when making your payment so the merchant can match it to your order.
            </p>
          </div>
        )}
        <p className="text-sm text-gray-500 mt-3">
          {paymentMethod === "cod"
            ? deliveryMethod === "delivery"
              ? "Please have cash ready for the order amount. Any buyer-arranged courier fee is paid separately."
              : "Please pay when collecting your order."
            : "Please contact the merchant on WhatsApp to confirm your order."}
        </p>

        <div className="mt-6 space-y-3">
          <a
            href={waUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full bg-green-600 hover:bg-green-700 text-white font-medium py-2.5 px-4 rounded-lg inline-flex items-center justify-center gap-2 transition-colors"
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
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Back to store */}
      <Link
        href={`/s/${storeSlug}`}
        className="inline-flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to store
      </Link>

      {/* Order Summary */}
      <div className={card}>
        <h2 className={`${sectionHeading} mb-3`}>Order Summary</h2>
        {cartItems.length === 0 ? (
          <p className="text-gray-500 text-sm">Your cart is empty</p>
        ) : (
          <>
            <ul className="divide-y divide-gray-100">
              {cartItems.map((item) => (
                <li
                  key={getCartItemKey(item)}
                  className="py-2.5 flex justify-between gap-3 text-sm"
                >
                  <div className="min-w-0 text-gray-700">
                    <p className="font-medium">{item.name} x {item.quantity}</p>
                    {formatVariantAttributes(item.variantAttributes) && (
                      <p className="mt-0.5 text-xs text-gray-500">
                        {formatVariantAttributes(item.variantAttributes)}
                      </p>
                    )}
                    {item.variantSku && (
                      <p className="text-[10px] font-medium uppercase tracking-wide text-gray-400">
                        SKU {item.variantSku}
                      </p>
                    )}
                  </div>
                  <span className="font-medium text-gray-900">
                    {formatPrice(item.price * item.quantity)}
                  </span>
                </li>
              ))}
            </ul>
            <div className="border-t border-gray-100 pt-3 mt-1 space-y-1.5">
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
              {buyerPaidCourier && (
                <div className="flex justify-between gap-3 text-sm">
                  <span className="text-gray-600">{deliveryProviderLabel} courier</span>
                  <span className="text-right text-gray-900">Paid by buyer</span>
                </div>
              )}
              {vatBreakdown.hasVat && (
                <>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">
                      {vatBreakdown.vatInclusive ? "Subtotal excl. VAT" : "Taxable subtotal"}
                    </span>
                    <span className="text-gray-900">{formatPrice(vatBreakdown.subtotalExclVat)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">
                      VAT ({VAT_RATE_LABEL}){vatBreakdown.vatInclusive ? " included" : ""}
                    </span>
                    <span className="text-gray-900">{formatPrice(vatBreakdown.vatAmount)}</span>
                  </div>
                </>
              )}
              <div className="flex justify-between font-bold pt-2 border-t border-gray-100">
                <span>{vatBreakdown.hasVat ? "Total incl. VAT" : "Total"}</span>
                <span className="text-green-600">{formatPrice(total)}</span>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Coupon Code */}
      <div className={`${card} space-y-3`}>
        <h2 className={`${sectionHeading} flex items-center gap-2`}>
          <Tag className="w-4 h-4" />
          Discount Code
        </h2>
        {couponApplied ? (
          <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-lg px-3 py-2.5">
            <span className="text-sm text-green-700 font-medium">
              {couponApplied.code} applied —{" "}
              {couponApplied.discount_type === "percentage"
                ? `${couponApplied.discount_value}% off`
                : `${formatPrice(couponApplied.discount_value)} off`}
            </span>
            <button
              type="button"
              onClick={handleRemoveCoupon}
              className="text-green-600 hover:text-red-500 transition-colors"
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
              className={`flex-1 ${inputBase} ${focusGreen} uppercase`}
            />
            <button
              type="button"
              onClick={handleApplyCoupon}
              disabled={applyingCoupon || !couponCode.trim()}
              className={btnSmallGreen}
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
      <div className={`${card} space-y-4`}>
        <h2 className={sectionHeading}>Your Details</h2>

        <div>
          <label className={label}>
            Full Name<span className="text-red-500 ml-0.5">*</span>
          </label>
          <input
            type="text"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            required
            maxLength={100}
            className={`${inputBase} ${focusGreen}`}
            placeholder="Your full name"
          />
        </div>

        <PhoneInput
          id="customer-whatsapp"
          value={customerWhatsapp}
          onChange={setCustomerWhatsapp}
          required
          variant="green"
          hint="The merchant will contact you on this number"
        />
      </div>

      {/* Delivery Method */}
      <div className={`${card} space-y-4`}>
        <h2 className={sectionHeading}>Delivery Method</h2>

        <div className="flex gap-3">
          <label
            className={`flex-1 ${radioCardBase} ${
              deliveryMethod === "pickup" ? radioCardSelected : radioCardUnselected
            }`}
          >
            <input
              type="radio"
              name="deliveryMethod"
              value="pickup"
              checked={deliveryMethod === "pickup"}
              onChange={() => {
                setDeliveryMethod("pickup");
                setDeliveryProvider("store");
              }}
              className="sr-only"
            />
            Pickup
          </label>
          <label
            className={`flex-1 ${radioCardBase} ${
              deliveryMethod === "delivery" ? radioCardSelected : radioCardUnselected
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
            Delivery
          </label>
        </div>

        {deliveryMethod === "delivery" && (
          <>
            <div>
              <label className={label}>
                Delivery Handling<span className="text-red-500 ml-0.5">*</span>
              </label>
              <div className="grid gap-2 sm:grid-cols-3">
                {DELIVERY_PROVIDERS.map((option) => (
                  <label
                    key={option.value}
                    className={`${radioCardBase} text-left ${
                      deliveryProvider === option.value ? radioCardSelected : radioCardUnselected
                    }`}
                  >
                    <input
                      type="radio"
                      name="deliveryProvider"
                      value={option.value}
                      checked={deliveryProvider === option.value}
                      onChange={() => setDeliveryProvider(option.value)}
                      className="sr-only"
                    />
                    <span className="flex h-full flex-col gap-2">
                      <span className="flex items-center justify-between gap-2">
                        <span
                          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${option.iconClass}`}
                          aria-hidden="true"
                        >
                          <option.Icon size={18} strokeWidth={2.4} />
                        </span>
                        <span
                          className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase leading-4 ${option.tagClass}`}
                        >
                          {option.tag}
                        </span>
                      </span>
                      <span className="block text-sm font-semibold leading-5">{option.label}</span>
                      <span className="block text-xs leading-4 text-gray-500">{option.body}</span>
                    </span>
                  </label>
                ))}
              </div>
              {buyerPaidCourier && (
                <div className="mt-3 rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800">
                  {deliveryProviderLabel} delivery is not charged by OshiCart. The buyer books and pays the courier directly, and the merchant prepares the parcel for pickup.
                </div>
              )}
            </div>

            <div>
              <label className={label}>
                Delivery Address<span className="text-red-500 ml-0.5">*</span>
              </label>
              <textarea
                value={deliveryAddress}
                onChange={(e) => setDeliveryAddress(e.target.value)}
                required
                maxLength={500}
                rows={3}
                className={`${textareaBase} ${focusGreen}`}
                placeholder="Enter your full delivery address"
              />
            </div>
          </>
        )}

        {/* Delivery scheduling */}
        {deliveryMethod === "delivery" && deliverySlots?.enabled && (
          <>
            {(() => {
              const availableDates = getAvailableDates(deliverySlots.days);
              return availableDates.length > 0 ? (
                <>
                  <div>
                    <label className={label}>
                      Delivery Date<span className="text-red-500 ml-0.5">*</span>
                    </label>
                    <select
                      value={deliveryDate}
                      onChange={(e) => setDeliveryDate(e.target.value)}
                      required
                      className={`${selectBase} ${focusGreen}`}
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
                      <label className={label}>
                        Time Slot<span className="text-red-500 ml-0.5">*</span>
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        {deliverySlots.times.map((slot) => (
                          <label
                            key={slot}
                            className={`flex items-center justify-center ${radioCardBase} ${
                              deliveryTime === slot ? radioCardSelected : radioCardUnselected
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
                <div className={alertWarning}>
                  <AlertCircle className={alertIcon} />
                  <p>No delivery slots available in the next 14 days. Please contact the merchant directly.</p>
                </div>
              );
            })()}
          </>
        )}

        <div>
          <label className={label}>
            Notes (optional)
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            maxLength={500}
            rows={2}
            className={`${textareaBase} ${focusGreen}`}
            placeholder="Any special instructions..."
          />
        </div>
      </div>

      {/* Payment Method */}
      <div className={`${card} space-y-4`}>
        <h2 className={sectionHeading}>Payment Method</h2>

        <div className="grid grid-cols-2 gap-2">
          {acceptedPaymentMethods.map((method) => {
            const info = PAYMENT_METHODS.find((m) => m.value === method);
            if (!info) return null;
            return (
              <label
                key={method}
                className={`${radioCardBase} ${
                  paymentMethod === method ? radioCardSelected : radioCardUnselected
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
                <span className="text-xs block mt-1">{info.label}</span>
              </label>
            );
          })}
        </div>

        {/* Payment Instructions */}
        {paymentMethod === "eft" && hasBankDetails && (
          <div className="bg-gray-50 rounded-lg p-3.5 text-sm space-y-1.5">
            <p className="font-semibold text-gray-900 mb-2">Bank Transfer Details</p>
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
            <div className="mt-3 bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-xs text-blue-600 font-medium">Your Payment Reference</p>
              <p className="text-xl font-bold text-blue-900 tracking-wide">{preRef}</p>
              <p className="text-xs text-blue-500 mt-1">
                Use this as the reference/description when making your EFT payment so the merchant can match it to your order.
              </p>
            </div>
          </div>
        )}

        {paymentMethod === "cod" && (
          <div className={alertWarning}>
            <div>
              <p className="font-medium">Cash on Delivery</p>
              <p className="mt-1">
                Pay <span className="font-bold">{formatPrice(total)}</span> in cash when your order is{" "}
                {deliveryMethod === "delivery" ? "delivered" : "picked up"}.
              </p>
              {buyerPaidCourier && (
                <p className="mt-1 text-xs">
                  This excludes the {deliveryProviderLabel} courier fee, which the buyer pays directly to the courier service.
                </p>
              )}
            </div>
          </div>
        )}

        {paymentMethod === "momo" && (
          <div className={alertInfo}>
            <div className="space-y-1">
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
          </div>
        )}

        {paymentMethod === "ewallet" && (
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 text-sm text-purple-800 space-y-1">
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
          <div className="bg-teal-50 border border-teal-200 rounded-lg p-3 text-sm text-teal-800 space-y-1">
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
            <label className={label}>
              Proof of Payment (optional)
            </label>
            <p className={`${helperText} mb-2`}>
              Upload a screenshot of your payment confirmation. Max 5MB.
            </p>
            <label className="flex items-center justify-center gap-2 border-2 border-dashed border-gray-300 rounded-lg p-4 cursor-pointer hover:border-green-500 transition-colors">
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
        <div className={alertError}>
          <AlertCircle className={alertIcon} />
          <p>{error}</p>
        </div>
      )}

      {/* Submit — sticky on mobile for easy reach */}
      <div className="sticky bottom-0 bg-gray-50 pt-3 pb-safe md:static md:bg-transparent md:pt-0">
        <p className="text-xs text-center text-gray-400 mb-2 md:hidden">
          Secure order — your info stays between you and {storeName}
        </p>
        <button
          type="submit"
          disabled={submitting || cartItems.length === 0}
          className={`${btnPrimaryGreen} flex items-center justify-center gap-2`}
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
      </div>
    </form>
  );
}
