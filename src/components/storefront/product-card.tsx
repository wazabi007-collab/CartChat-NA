"use client";

import Link from "next/link";
import Image from "next/image";
import { ShoppingCart, MessageCircle } from "lucide-react";
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
}

export function ProductCard({
  id, name, price, imageUrl, slug,
  trackInventory, stockQuantity, lowStockThreshold, allowBackorder,
  disabled, accentColor, accentHover, ctaText,
  itemType, whatsappNumber, storeName,
}: ProductCardProps) {
  const { addItem } = useCart();

  const isService = itemType === "service";
  const isQuoteOnly = isService && price === 0;
  const isOutOfStock = !isService && trackInventory && (stockQuantity ?? 0) === 0 && !allowBackorder;
  const isLowStock = !isService && trackInventory && !isOutOfStock && (stockQuantity ?? 0) <= (lowStockThreshold ?? 5);

  function handleQuoteClick() {
    if (!whatsappNumber) return;
    const cleanPhone = normalizeNamibianPhone(whatsappNumber).replace(/\D/g, "");
    const msg = `Hi ${storeName || ""}! I'd like to enquire about your service: ${name}`;
    window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`, "_blank");
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden flex flex-col">
      <Link href={`/s/${slug}/${id}`} className="block relative">
        {imageUrl ? (
          <div className="relative aspect-square bg-gray-100">
            <Image
              src={imageUrl}
              alt={name}
              fill
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
              className="object-cover"
            />
          </div>
        ) : (
          <div className="aspect-square bg-gray-100 flex items-center justify-center">
            <ShoppingCart className="w-10 h-10 text-gray-300" />
          </div>
        )}
        {isOutOfStock && (
          <span className="absolute top-2 right-2 bg-red-600 text-white text-xs font-medium px-2 py-0.5 rounded-full">
            Out of Stock
          </span>
        )}
        {isLowStock && (
          <span className="absolute top-2 right-2 bg-orange-500 text-white text-xs font-medium px-2 py-0.5 rounded-full">
            Only {stockQuantity} left!
          </span>
        )}
        {isService && (
          <span className="absolute top-2 left-2 bg-blue-600 text-white text-xs font-medium px-2 py-0.5 rounded-full">
            Service
          </span>
        )}
      </Link>

      <div className="p-3 flex flex-col flex-1">
        <Link href={`/s/${slug}/${id}`} className="block">
          <h3 className="font-medium text-gray-900 text-sm leading-tight line-clamp-2">
            {name}
          </h3>
        </Link>
        <p className={`font-bold text-base mt-1 ${accentColor ? '' : 'text-green-600'}`} style={accentColor ? { color: accentColor } : undefined}>
          {isQuoteOnly ? "Request a Quote" : (isService && price > 0 ? `From ${formatPrice(price)}` : formatPrice(price))}
        </p>
        <div className="mt-auto pt-2">
          {isOutOfStock || disabled ? (
            <button
              disabled
              className="w-full bg-gray-300 text-gray-500 text-sm font-medium py-2 px-3 rounded-md cursor-not-allowed"
            >
              {isOutOfStock ? "Out of Stock" : "Unavailable"}
            </button>
          ) : isQuoteOnly ? (
            <button
              onClick={handleQuoteClick}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium py-2 px-3 rounded-md transition-colors flex items-center justify-center gap-1.5"
            >
              <MessageCircle size={14} />
              Request Quote
            </button>
          ) : (
            <button
              onClick={() =>
                addItem({ productId: id, name, price, imageUrl })
              }
              className={`w-full text-white text-sm font-medium py-2 px-3 rounded-md transition-colors ${accentColor ? '' : 'bg-green-600 hover:bg-green-700'}`}
              style={accentColor ? { backgroundColor: accentColor } : undefined}
              onMouseEnter={accentHover ? (e) => { e.currentTarget.style.backgroundColor = accentHover; } : undefined}
              onMouseLeave={accentColor ? (e) => { e.currentTarget.style.backgroundColor = accentColor; } : undefined}
            >
              {ctaText ?? (isService ? "Book Now" : "Add to Cart")}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
