"use client";

import Link from "next/link";
import Image from "next/image";
import { formatPrice } from "@/lib/utils";
import { useCart } from "../cart-provider";
import { getCtaText, type LayoutProps } from "./types";

export function MenuList({ products, theme, slug, disabled }: LayoutProps) {
  const { addItem } = useCart();

  return (
    <div className="flex flex-col gap-2">
      {products.map((product) => {
        const imageUrl = product.images?.[0] ?? null;
        const isOutOfStock =
          product.track_inventory &&
          (product.stock_quantity ?? 0) === 0 &&
          !product.allow_backorder;

        return (
          <div
            key={product.id}
            className="flex items-center gap-3 bg-white rounded-lg p-3"
            style={{ border: `1px solid ${theme.borderColor}` }}
          >
            {imageUrl && (
              <Link href={`/s/${slug}/${product.id}`} className="shrink-0">
                <div className="relative w-16 h-16 rounded-md overflow-hidden bg-gray-100">
                  <Image
                    src={imageUrl}
                    alt={product.name}
                    fill
                    sizes="64px"
                    className="object-cover"
                  />
                </div>
              </Link>
            )}
            <Link href={`/s/${slug}/${product.id}`} className="flex-1 min-w-0">
              <h3 className="font-semibold text-sm text-gray-900 truncate">
                {product.name}
              </h3>
              {product.description && (
                <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">
                  {product.description}
                </p>
              )}
            </Link>
            <div className="flex items-center gap-2 shrink-0">
              <span className="font-bold text-sm" style={{ color: theme.accent }}>
                {formatPrice(product.price_nad)}
              </span>
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
                  className="text-white text-xs font-medium px-3 py-1.5 rounded-full transition-colors"
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
        );
      })}
    </div>
  );
}
