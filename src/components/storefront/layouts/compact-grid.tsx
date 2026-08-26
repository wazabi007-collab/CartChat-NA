"use client";

import Link from "next/link";
import Image from "next/image";
import { ShoppingCart } from "lucide-react";
import { formatPrice } from "@/lib/utils";
import { useCart } from "../cart-provider";
import { cartItemFromProduct } from "@/lib/cart-item";
import { getCtaText, getDisplayPrice, getStockLabel, type LayoutProps } from "./types";
import type { ServiceMode } from "@/lib/service-mode";

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
        const stockLabel = getStockLabel(product);

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
                {getDisplayPrice(product, formatPrice)}
              </p>
              {stockLabel && !isOutOfStock && (
                <p className="mt-0.5 text-[11px] font-semibold text-emerald-700">{stockLabel}</p>
              )}
              <div className="mt-auto pt-1.5">
                {isOutOfStock || disabled ? (
                  <span className="text-xs text-gray-400">Sold out</span>
                ) : product.has_variants ? (
                  <Link
                    href={`/s/${slug}/${product.id}`}
                    className="block w-full rounded-md py-1.5 px-2 text-center text-xs font-medium text-white transition-colors"
                    style={{ backgroundColor: theme.accent }}
                  >
                    Select Options
                  </Link>
                ) : (
                  <button
                    onClick={() =>
                      addItem(cartItemFromProduct(product, { imageUrl }))
                    }
                    className="w-full min-h-[40px] flex items-center justify-center text-white text-xs font-medium py-1.5 px-2 rounded-md transition-colors"
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
