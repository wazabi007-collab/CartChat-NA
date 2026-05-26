"use client";

import Link from "next/link";
import Image from "next/image";
import { MessageCircle, ShoppingBag } from "lucide-react";
import { formatPrice, normalizeNamibianPhone } from "@/lib/utils";
import { useCart } from "./cart-provider";

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
  itemType?: "product" | "service";
  whatsappNumber?: string;
  storeName?: string;
  hasVariants?: boolean;
}

export function ProductCard({
  id, name, price, imageUrl, slug,
  trackInventory, stockQuantity, lowStockThreshold, allowBackorder,
  disabled, accentColor, accentHover, ctaText,
  itemType, whatsappNumber, storeName,
  hasVariants,
}: ProductCardProps) {
  const { addItem } = useCart();

  const isService = itemType === "service";
  const isQuoteOnly = isService && price === 0;
  const isOutOfStock = !isService && trackInventory && (stockQuantity ?? 0) === 0 && !allowBackorder;
  const isLowStock = !isService && trackInventory && !isOutOfStock && (stockQuantity ?? 0) > 0 && (stockQuantity ?? 0) <= (lowStockThreshold ?? 5);

  function handleQuoteClick() {
    if (!whatsappNumber) return;
    const cleanPhone = normalizeNamibianPhone(whatsappNumber).replace(/\D/g, "");
    const msg = `Hi ${storeName || ""}! I'd like to enquire about your service: ${name}`;
    window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`, "_blank");
  }

  return (
    <div className="bg-white/95 rounded-2xl border border-slate-200/80 overflow-hidden flex flex-col shadow-sm shadow-slate-900/5 hover:shadow-lg hover:shadow-slate-900/10 hover:-translate-y-0.5 transition">
      <Link href={`/s/${slug}/${id}`} className="block relative">
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
        {isLowStock && (
          <span className="absolute top-2 right-2 bg-orange-500 text-white text-xs font-medium px-2 py-0.5 rounded-full shadow-sm">
            Only {stockQuantity} left!
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
          {isQuoteOnly ? "Request a Quote" : isService && price > 0 ? `From ${formatPrice(price)}` : price === 0 && !isService ? "Price on request" : formatPrice(price)}
        </p>
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
              <MessageCircle size={14} />
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
                addItem({ productId: id, name, price, imageUrl })
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
