"use client";

import Link from "next/link";
import Image from "next/image";
import { ShoppingCart } from "lucide-react";
import { formatPrice } from "@/lib/utils";
import { useCart } from "../cart-provider";
import type { LayoutProps } from "./types";

export function CompactGrid({ products, theme, slug, disabled }: LayoutProps) {
  const { addItem } = useCart();

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
      {products.map((product) => {
        const imageUrl = product.images?.[0] ?? null;
        const isOutOfStock =
          product.track_inventory &&
          (product.stock_quantity ?? 0) === 0 &&
          !product.allow_backorder;

        return (
          <div
            key={product.id}
            className="bg-white rounded-lg overflow-hidden flex flex-col"
            style={{ border: `1px solid ${theme.borderColor}` }}
          >
            <Link href={`/s/${slug}/${product.id}`} className="block">
              {imageUrl ? (
                <div className="relative aspect-square bg-gray-100">
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
                  className="aspect-square flex items-center justify-center"
                  style={{ backgroundColor: theme.bgTint }}
                >
                  <ShoppingCart className="w-8 h-8 text-gray-300" />
                </div>
              )}
            </Link>
            <div className="p-2 flex flex-col flex-1 text-center">
              <Link href={`/s/${slug}/${product.id}`}>
                <h3 className="font-medium text-gray-900 text-xs leading-tight line-clamp-2">
                  {product.name}
                </h3>
              </Link>
              <p className="font-bold text-sm mt-1" style={{ color: theme.accent }}>
                {formatPrice(product.price_nad)}
              </p>
              <div className="mt-auto pt-1.5">
                {isOutOfStock || disabled ? (
                  <span className="text-xs text-gray-400">Sold out</span>
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
                    className="w-full text-white text-xs font-medium py-1.5 px-2 rounded-md transition-colors"
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
