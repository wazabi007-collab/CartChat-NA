"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, ShoppingCart } from "lucide-react";
import { useCart, cartItemFromProduct } from "@/components/storefront/cart-provider";
import { formatPrice } from "@/lib/utils";
import {
  displayVariantAttributeName,
  getVariantAttributePriority,
  sortVariantOptionValues,
} from "@/lib/industry-variant-presets";
import { useVariantImages } from "./product-gallery";
import type { ServiceMode } from "@/lib/service-mode";

type Variant = {
  id: string;
  sku: string | null;
  price_nad: number;
  images: string[];
  attributes: Record<string, string>;
  is_available: boolean;
  stock_quantity: number;
  track_inventory: boolean;
  allow_backorder: boolean;
};

type Product = {
  id: string;
  name: string;
  price_nad: number;
  imageUrl: string | null;
  service_mode?: ServiceMode | null;
  item_type?: string | null;
  rental_unit?: string | null;
  deposit_nad?: number | null;
  required_documents?: string | null;
  rental_min_days?: number | null;
  rental_max_days?: number | null;
  requires_id_number?: boolean | null;
};

function variantIsBuyable(variant: Variant) {
  if (!variant.is_available) return false;
  if (variant.track_inventory && variant.stock_quantity <= 0 && !variant.allow_backorder) return false;
  return true;
}

function attributesMatch(variant: Variant, selected: Record<string, string>) {
  return Object.entries(selected).every(([name, value]) => !value || variant.attributes?.[name] === value);
}

function stockLabel(variant: Variant) {
  if (!variant.track_inventory) return null;
  if (variant.stock_quantity <= 0 && !variant.allow_backorder) return "Out of stock";
  if (variant.stock_quantity <= 0 && variant.allow_backorder) return "Available on backorder";
  return `${variant.stock_quantity.toLocaleString("en-NA")} in stock`;
}

export function ProductPurchasePanel({
  product,
  variants,
  industry,
}: {
  product: Product;
  variants: Variant[];
  industry?: string | null;
}) {
  const { addItem } = useCart();
  const [selected, setSelected] = useState<Record<string, string>>({});
  const [added, setAdded] = useState(false);
  const hasVariants = variants.length > 0;

  const attributeNames = useMemo(() => {
    const names = new Set<string>();
    variants.forEach((variant) => {
      Object.keys(variant.attributes || {}).forEach((name) => names.add(name));
    });
    return [...names].sort((a, b) => {
      const aOptions = variants.map((variant) => variant.attributes?.[a]).filter(Boolean) as string[];
      const bOptions = variants.map((variant) => variant.attributes?.[b]).filter(Boolean) as string[];
      const priorityDelta = getVariantAttributePriority(industry, a, aOptions) - getVariantAttributePriority(industry, b, bOptions);
      return priorityDelta || a.localeCompare(b, undefined, { sensitivity: "base" });
    });
  }, [industry, variants]);

  const selectedVariant = useMemo(() => {
    if (!hasVariants || attributeNames.some((name) => !selected[name])) return null;
    return variants.find((variant) =>
      attributeNames.every((name) => variant.attributes?.[name] === selected[name])
    ) || null;
  }, [attributeNames, hasVariants, selected, variants]);

  const activePrice = selectedVariant?.price_nad ?? product.price_nad;
  const activeImage = selectedVariant?.images?.[0] || product.imageUrl;

  // Let the gallery switch to the selected variant's images (if any)
  const variantImagesCtx = useVariantImages();
  const setVariantImages = variantImagesCtx?.setVariantImages;
  const selectedVariantImages = selectedVariant?.images;
  useEffect(() => {
    if (!setVariantImages) return;
    setVariantImages(selectedVariantImages ?? []);
  }, [setVariantImages, selectedVariantImages]);
  const canAdd = !hasVariants || (selectedVariant && variantIsBuyable(selectedVariant));
  const selectedSummary = attributeNames
    .filter((name) => selected[name])
    .map((name) => `${displayVariantAttributeName(name, [selected[name]])}: ${selected[name]}`);

  function optionIsAvailable(attributeName: string, option: string) {
    const nextSelected = { ...selected, [attributeName]: option };
    return variants.some((variant) => attributesMatch(variant, nextSelected) && variantIsBuyable(variant));
  }

  function handleSelect(attributeName: string, option: string) {
    setSelected((current) => {
      const next = { ...current, [attributeName]: option };
      for (const name of attributeNames) {
        if (name !== attributeName && next[name]) {
          const hasCombination = variants.some((variant) => attributesMatch(variant, next));
          if (!hasCombination) delete next[name];
        }
      }
      return next;
    });
  }

  function handleAdd() {
    if (!canAdd) return;
    // Same builder as every storefront card: the variant and the active
    // price/image are the only things this page knows better.
    addItem(
      cartItemFromProduct(product, {
        variantId: selectedVariant?.id ?? null,
        variantSku: selectedVariant?.sku ?? null,
        variantAttributes: selectedVariant?.attributes ?? undefined,
        price: activePrice,
        imageUrl: activeImage,
      })
    );
    setAdded(true);
    setTimeout(() => setAdded(false), 1500);
  }

  return (
    <div className="space-y-4">
      {hasVariants && (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-black text-slate-950">Choose product options</p>
              <p className="mt-1 text-xs leading-5 text-slate-500">
                Choose the fit, colour, size, or product option before adding to cart.
              </p>
            </div>
            {selectedVariant?.sku && (
              <span className="rounded-full bg-white px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-slate-500 ring-1 ring-slate-200">
                {selectedVariant.sku}
              </span>
            )}
          </div>

          <div className="mt-4 space-y-4">
            {attributeNames.map((name, index) => {
              const options = sortVariantOptionValues(
                name,
                [...new Set(variants.map((variant) => variant.attributes?.[name]).filter(Boolean))] as string[]
              );
              const displayName = displayVariantAttributeName(name, options);
              return (
                <div key={name}>
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">{displayName}</p>
                    {attributeNames.length > 1 && (
                      <span className="text-[10px] font-black uppercase tracking-wide text-slate-400">
                        Step {index + 1} of {attributeNames.length}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {options.map((option) => {
                      const selectedOption = selected[name] === option;
                      const available = optionIsAvailable(name, option);
                      return (
                        <button
                          key={option}
                          type="button"
                          disabled={!available}
                          onClick={() => handleSelect(name, option)}
                          className={`rounded-xl border px-3 py-2 text-sm font-bold transition ${
                            selectedOption
                              ? "border-acacia bg-acacia text-white shadow-sm shadow-emerald-900/10"
                              : available
                                ? "border-slate-200 bg-white text-slate-700 hover:border-acacia hover:text-acacia"
                                : "cursor-not-allowed border-slate-200 bg-slate-100 text-slate-300 line-through"
                          }`}
                        >
                          {option}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          {selectedSummary.length > 0 && (
            <div className="mt-4 rounded-xl border border-emerald-100 bg-white px-3 py-2">
              <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">Selected</p>
              <p className="mt-1 text-sm font-bold text-slate-800">{selectedSummary.join(" | ")}</p>
              {selectedVariant && stockLabel(selectedVariant) && (
                <p className="mt-1 text-xs font-bold text-emerald-700">{stockLabel(selectedVariant)}</p>
              )}
            </div>
          )}

          {selectedVariant && !variantIsBuyable(selectedVariant) && (
            <p className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-sm font-bold text-red-700">
              This option is currently out of stock.
            </p>
          )}
        </div>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <button
          onClick={handleAdd}
          disabled={!canAdd}
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-acacia px-8 py-3 font-semibold text-white shadow-sm shadow-emerald-900/10 transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500 sm:w-auto"
        >
          {added ? (
            <>
              <Check className="h-5 w-5" />
              Added!
            </>
          ) : (
            <>
              <ShoppingCart className="h-5 w-5" />
              {hasVariants && !selectedVariant ? "Select Options" : "Add to Cart"}
            </>
          )}
        </button>
        <div className="text-sm text-slate-500">
          <span className="font-black text-acacia">
            {formatPrice(activePrice)}
            {product.item_type === "rental" && (
              <span className="text-sm font-bold text-slate-500">
                {product.rental_unit === "night" ? " / night" : " / day"}
              </span>
            )}
          </span>
          {hasVariants && !selectedVariant && <span> after selecting options</span>}
        </div>
        {product.item_type === "rental" && product.required_documents && (
          <p className="w-full text-xs font-semibold text-slate-500">
            You&apos;ll need: {product.required_documents}
          </p>
        )}
      </div>
    </div>
  );
}
