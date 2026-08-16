"use client";

import Link from "next/link";
import Image from "next/image";
import { ShoppingBag } from "lucide-react";
import { formatPrice, normalizeNamibianPhone } from "@/lib/utils";
import { useCart, type CartItem } from "./cart-provider";
import { WhatsAppIcon } from "@/components/whatsapp-icon";

interface ProductCardProps {
  id: string;
  name: string;
  price: number;
  imageUrl: string | null;
  slug: string;
  trackInventory?: boolean;
  stockQuantity?: number;
  lowStockThreshold?: number;
  allowBackorder?: boolean;
  disabled?: boolean;
  accentColor?: string;
  accentHover?: string;
  ctaText?: string;
  itemType?: "product" | "service" | "rental";
  rentalUnit?: string | null;
  whatsappNumber?: string;
  storeName?: string;
  hasVariants?: boolean;
  /**
   * Built by the parent with cartItemFromProduct, so the card never has to
   * know which fields a hire or a booking needs — the omission that made
   * every storefront add a rental with no dates and no deposit.
   */
  cartPayload?: Omit<CartItem, "quantity">;
}

export function ProductCard({
  id, name, price, imageUrl, slug,
  trackInventory, stockQuantity, lowStockThreshold, allowBackorder,
  disabled, accentColor, accentHover, ctaText,
  itemType, rentalUnit, whatsappNumber, storeName,
  hasVariants, cartPayload,
}: ProductCardProps) {
  const { addItem } = useCart();

  const isService = itemType === "service";
  // Rentals come back, so stock never runs out from selling; skip the goods
  // stock states the same way services do.
  const isRental = itemType === "rental";
  const isQuoteOnly = isService && price === 0;
  const isOutOfStock = !isService && !isRental && trackInventory && (stockQuantity ?? 0) === 0 && !allowBackorder;
  const isLowStock = !isService && !isRental && trackInventory && !isOutOfStock && (stockQuantity ?? 0) > 0 && (stockQuantity ?? 0) <= (lowStockThreshold ?? 5);
  const stockLabel = !isService && !isRental && trackInventory
    ? isOutOfStock
      ? "Out of stock"
      : (stockQuantity ?? 0) <= 0 && allowBackorder
        ? "Available on backorder"
        : `${(stockQuantity ?? 0).toLocaleString("en-NA")} in stock`
    : null;

  function handleQuoteClick() {
    if (!whatsappNumber) return;
    const cleanPhone = normalizeNamibianPhone(whatsappNumber).replace(/\D/g, "");
    const msg = `Hi ${storeName || ""}! I'd like to enquire about your service: ${name}`;
    window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`, "_blank");
  }

  return (
    <div className="bg-white/95 rounded-2xl border border-slate-200/80 overflow-hidden flex flex-col shadow-sm shadow-slate-900/5 hover:shadow-lg hover:shadow-slate-900/10 hover:-translate-y-0.5 transition">
      <Link href={`/s/${slug}/${id}`} className="block relative" aria-label={`View ${name}`}>
        {imageUrl ? (
          <div className="relative aspect-square bg-slate-100">
            <Image
              src={imageUrl}
              alt={name}
              fill
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
              className="object-cover"
            />
          </div>
        ) : (
          <div className="aspect-square bg-gradient-to-br from-blue-50 via-white to-emerald-50 flex items-center justify-center">
            <ShoppingBag className="w-10 h-10 text-slate-300" />
          </div>
        )}
        {isOutOfStock && (
          <span className="absolute top-2 right-2 bg-red-600 text-white text-xs font-medium px-2 py-0.5 rounded-full shadow-sm">
            Out of Stock
          </span>
        )}
        {/*
          * Orange is too light to carry white text — orange-500 on white
          * measured 2.89:1, well under AA. Inverting to dark-on-light rather
          * than darkening the orange keeps the badge reading as a warning
          * (a darker orange starts to look like the red out-of-stock pill)
          * and matches the "For hire" badge directly below.
          */}
        {isLowStock && (
          <span className="absolute top-2 right-2 bg-orange-100 text-orange-900 text-xs font-medium px-2 py-0.5 rounded-full shadow-sm">
            Only {stockQuantity} left!
          </span>
        )}
        {isRental && (
          <span className="absolute left-2 top-2 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-black uppercase tracking-wide text-amber-800">
            For hire
          </span>
        )}
        {isService && (
          <span className="absolute top-2 left-2 bg-blue-600 text-white text-xs font-medium px-2 py-0.5 rounded-full shadow-sm">
            Service
          </span>
        )}
      </Link>

      <div className="p-3.5 flex flex-col flex-1">
        <Link href={`/s/${slug}/${id}`} className="block">
          <h3 className="font-semibold text-slate-950 text-sm leading-tight line-clamp-2">
            {name}
          </h3>
        </Link>
        <p className={`font-bold text-base mt-1.5 ${accentColor ? "" : "text-terracotta"}`} style={accentColor ? { color: accentColor } : undefined}>
          {isQuoteOnly ? "Request a Quote" : isRental ? `${formatPrice(price)} / ${rentalUnit === "night" ? "night" : "day"}` : isService && price > 0 ? `From ${formatPrice(price)}` : price === 0 && !isService ? "Price on request" : formatPrice(price)}
        </p>
        {stockLabel && !isOutOfStock && (
          <p className="mt-1 text-xs font-semibold text-emerald-700">{stockLabel}</p>
        )}
        <div className="mt-auto pt-2">
          {isOutOfStock || disabled ? (
            <button
              disabled
              className="w-full bg-slate-200 text-slate-500 text-sm font-medium py-2.5 px-3 rounded-lg cursor-not-allowed"
            >
              {isOutOfStock ? "Out of Stock" : "Unavailable"}
            </button>
          ) : isQuoteOnly ? (
            <button
              onClick={handleQuoteClick}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium py-2.5 px-3 rounded-lg transition-colors flex items-center justify-center gap-1.5"
            >
              <WhatsAppIcon size={14} />
              Request Quote
            </button>
          ) : hasVariants ? (
            <Link
              href={`/s/${slug}/${id}`}
              className={`block w-full rounded-lg py-2.5 px-3 text-center text-sm font-medium text-white transition-colors ${accentColor ? "" : "bg-terracotta hover:opacity-90"}`}
              style={accentColor ? { backgroundColor: accentColor } : undefined}
            >
              Select Options
            </Link>
          ) : (
            <button
              onClick={() =>
                addItem(
                  cartPayload ?? { productId: id, name, price, imageUrl }
                )
              }
              className={`w-full text-white text-sm font-medium py-2.5 px-3 rounded-lg transition-colors ${accentColor ? "" : "bg-terracotta hover:opacity-90"}`}
              style={accentColor ? { backgroundColor: accentColor } : undefined}
              onMouseEnter={accentHover ? (e) => { e.currentTarget.style.backgroundColor = accentHover; } : undefined}
              onMouseLeave={accentColor ? (e) => { e.currentTarget.style.backgroundColor = accentColor; } : undefined}
            >
              {isService ? (ctaText ?? "Book Now") : "Add to Cart"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
