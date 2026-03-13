"use client";

import Link from "next/link";
import Image from "next/image";
import { Sparkles } from "lucide-react";
import { formatPrice } from "@/lib/utils";
import { useCart } from "../cart-provider";
import type { LayoutProps } from "./types";

export function HorizontalCard({ products, theme, slug, disabled }: LayoutProps) {
  const { addItem } = useCart();

  return (
    <div className="flex flex-col gap-3">
      {products.map((product) => {
        const imageUrl = product.images?.[0] ?? null;
        const isOutOfStock =
          product.track_inventory &&
          (product.stock_quantity ?? 0) === 0 &&
          !product.allow_backorder;

        return (
          <div
            key={product.id}
            className="bg-white rounded-xl overflow-hidden flex"
            style={{ border: `1px solid ${theme.borderColor}` }}
          >
            <Link href={`/s/${slug}/${product.id}`} className="shrink-0">
              {imageUrl ? (
                <div className="relative w-24 h-24 sm:w-28 sm:h-28 bg-gray-100">
                  <Image
                    src={imageUrl}
                    alt={product.name}
                    fill
                    sizes="112px"
                    className="object-cover"
                  />
                </div>
              ) : (
                <div
                  className="w-24 h-24 sm:w-28 sm:h-28 flex items-center justify-center"
                  style={{ backgroundColor: theme.bgTint }}
                >
                  <Sparkles className="w-8 h-8" style={{ color: theme.borderColor }} />
                </div>
              )}
            </Link>
            <div className="p-3 flex-1 flex flex-col min-w-0">
              <Link href={`/s/${slug}/${product.id}`}>
                <h3 className="font-semibold text-sm text-gray-900 truncate">
                  {product.name}
                </h3>
              </Link>
              {product.description && (
                <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">
                  {product.description}
                </p>
              )}
              <div className="mt-auto flex items-center justify-between pt-2">
                <span className="font-bold text-sm" style={{ color: theme.accent }}>
                  {formatPrice(product.price_nad)}
                </span>
                {isOutOfStock || disabled ? (
                  <span className="text-xs text-gray-400">Unavailable</span>
                ) : (
                  <button
                    onClick={() =>
                      addItem({
                        productId: product.id,
                        name: product.name,
                        price: product.price_nad,
                        imageUrl,
                      })
                    }
                    className="text-white text-xs font-medium px-4 py-1.5 rounded-full transition-colors"
                    style={{ backgroundColor: theme.accent }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = theme.accentHover;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = theme.accent;
                    }}
                  >
                    {theme.ctaText}
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
