"use client";

import { normalizeNamibianPhone } from "@/lib/utils";
import { useCart } from "./cart-provider";
import { type CartItem } from "@/lib/cart-item";
import { WhatsAppIcon } from "@/components/whatsapp-icon";

/**
 * The interactive island inside an otherwise server-rendered product card.
 *
 * The card used to be a client component in full, so every image, badge,
 * heading and price on the grid shipped as JavaScript and hydrated. Only the
 * button actually needs the browser — it reads the cart, or opens WhatsApp for
 * a quote — so only the button is a client component now.
 */
export function AddToCartButton({
  cartPayload,
  label,
  accentColor,
  accentHover,
  quoteOnly,
  productName,
  whatsappNumber,
  storeName,
}: {
  cartPayload: Omit<CartItem, "quantity">;
  label: string;
  accentColor?: string;
  accentHover?: string;
  quoteOnly?: boolean;
  productName: string;
  whatsappNumber?: string;
  storeName?: string;
}) {
  const { addItem } = useCart();

  if (quoteOnly) {
    return (
      <button
        onClick={() => {
          if (!whatsappNumber) return;
          const phone = normalizeNamibianPhone(whatsappNumber).replace(/\D/g, "");
          const msg = `Hi ${storeName || ""}! I'd like to request a quote for: ${productName}`;
          window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, "_blank");
        }}
        className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-700"
      >
        <WhatsAppIcon size={14} />
        Request Quote
      </button>
    );
  }

  return (
    <button
      onClick={() => addItem(cartPayload)}
      className={`w-full rounded-lg px-3 py-2.5 text-sm font-medium text-white transition-colors ${
        accentColor ? "" : "bg-terracotta hover:opacity-90"
      }`}
      style={accentColor ? { backgroundColor: accentColor } : undefined}
      onMouseEnter={
        accentHover
          ? (e) => {
              e.currentTarget.style.backgroundColor = accentHover;
            }
          : undefined
      }
      onMouseLeave={
        accentColor
          ? (e) => {
              e.currentTarget.style.backgroundColor = accentColor;
            }
          : undefined
      }
    >
      {label}
    </button>
  );
}
