"use client";

import Link from "next/link";
import Image from "next/image";
import { Gift } from "lucide-react";
import { formatPrice } from "@/lib/utils";
import { useCart } from "../cart-provider";
import { getCtaText, type LayoutProps } from "./types";

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
                {formatPrice(product.price_nad)}
              </p>
              <div className="mt-auto pt-2">
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
                    className="w-full text-white text-sm font-medium py-2 px-3 rounded-full transition-colors"
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
