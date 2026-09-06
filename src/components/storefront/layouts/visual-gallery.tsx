"use client";

import Link from "next/link";
import { isQuoteRequired } from "@/lib/quote";
import Image from "next/image";
import { Gift } from "lucide-react";
import { formatPrice } from "@/lib/utils";
import { useCart } from "../cart-provider";
import { cartItemFromProduct } from "@/lib/cart-item";
import { getCtaText, getDisplayPrice, getStockLabel, type LayoutProps } from "./types";

export function VisualGallery({ products, theme, slug, disabled }: LayoutProps) {
  const { addItem } = useCart();

  return (
    <div className="grid grid-cols-2 gap-3">
      {products.map((product) => {
        const imageUrl = product.images?.[0] ?? null;
        const isOutOfStock =
          product.track_inventory &&
          (product.stock_quantity ?? 0) === 0 &&
          !product.allow_backorder;
        const stockLabel = getStockLabel(product);

        return (
          <div
            key={product.id}
            className="bg-white rounded-xl overflow-hidden flex flex-col"
            style={{ border: `1px solid ${theme.borderColor}` }}
          >
            <Link href={`/s/${slug}/${product.id}`} className="block">
              {imageUrl ? (
                <div className="relative aspect-[4/5] bg-gray-100">
                  <Image
                    src={imageUrl}
                    alt={product.name}
                    fill
                    sizes="(max-width: 640px) 50vw, 33vw"
                    className="object-cover"
                  />
                </div>
              ) : (
                <div
                  className="aspect-[4/5] flex items-center justify-center"
                  style={{ backgroundColor: theme.bgTint }}
                >
                  <Gift className="w-12 h-12" style={{ color: theme.borderColor }} />
                </div>
              )}
            </Link>
            <div className="p-3 flex flex-col flex-1 text-center">
              <Link href={`/s/${slug}/${product.id}`}>
                <h3 className="font-semibold text-sm text-gray-900 line-clamp-1">
                  {product.name}
                </h3>
              </Link>
              {product.description && (
                <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">
                  {product.description}
                </p>
              )}
              <p className="font-bold text-base mt-1.5" style={{ color: theme.accent }}>
                {getDisplayPrice(product, formatPrice)}
              </p>
              {stockLabel && !isOutOfStock && (
                <p className="mt-0.5 text-[11px] font-semibold text-emerald-700">{stockLabel}</p>
              )}
              <div className="mt-auto pt-2">
                {isOutOfStock || disabled ? (
                  <span className="text-xs text-gray-400">Unavailable</span>
              ) : isQuoteRequired(product) ? (
                <Link href={`/s/${slug}/${product.id}`} className="inline-flex min-h-11 items-center justify-center rounded-lg bg-green-700 px-3 py-2 text-xs font-semibold text-white">Request a Quote</Link>
              ) : product.has_variants ? (
                  <Link
                    href={`/s/${slug}/${product.id}`}
                    className="block w-full rounded-full py-2 px-3 text-center text-sm font-medium text-white transition-colors"
                    style={{ backgroundColor: theme.accent }}
                  >
                    Select Options
                  </Link>
                ) : (
                  <button
                    onClick={() =>
                      addItem(cartItemFromProduct(product, { imageUrl }))
                    }
                    className="w-full min-h-[44px] flex items-center justify-center text-white text-sm font-medium py-2 px-3 rounded-full transition-colors"
                    style={{ backgroundColor: theme.accent }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = theme.accentHover;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = theme.accent;
                    }}
                  >
                    {getCtaText(product, theme)}
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
