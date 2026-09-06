"use client";

import { Plus, Trash2 } from "lucide-react";
import { getDefaultVariantOptionText, getVariantPresets, type VariantPreset } from "@/lib/industry-variant-presets";

export type ProductVariantDraft = {
  id?: string;
  source?: string;
  sourceVariationId?: string | null;
  sku: string;
  optionText: string;
  priceDisplay: string;
  isAvailable: boolean;
  trackInventory: boolean;
  stockQuantity: number;
  allowBackorder: boolean;
  imageUrl: string;
};

export function parseVariantOptions(optionText: string): Record<string, string> {
  const entries = optionText
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
  const attributes: Record<string, string> = {};
  for (const entry of entries) {
    const [rawKey, ...rawValueParts] = entry.split(":");
    const key = rawKey?.trim();
    const value = rawValueParts.join(":").trim();
    if (key && value) attributes[key] = value;
  }
  return attributes;
}

export function formatVariantOptions(attributes: Record<string, string> | null | undefined) {
  if (!attributes) return "";
  return Object.entries(attributes)
    .map(([key, value]) => `${key}: ${value}`)
    .join(", ");
}

export function createEmptyVariantDraft(index: number, industry?: string | null): ProductVariantDraft {
  return {
    sku: "",
    optionText: index === 0 ? getDefaultVariantOptionText(industry) : "",
    priceDisplay: "",
    isAvailable: true,
    trackInventory: false,
    stockQuantity: 0,
    allowBackorder: false,
    imageUrl: "",
  };
}

export function ProductVariantsEditor({
  variants,
  onChange,
  industry,
}: {
  variants: ProductVariantDraft[];
  onChange: (variants: ProductVariantDraft[]) => void;
  industry?: string | null;
}) {
  const presets = getVariantPresets(industry);

  function updateVariant(index: number, patch: Partial<ProductVariantDraft>) {
    onChange(variants.map((variant, i) => (i === index ? { ...variant, ...patch } : variant)));
  }

  function removeVariant(index: number) {
    onChange(variants.filter((_, i) => i !== index));
  }

  function addVariant() {
    onChange([...variants, createEmptyVariantDraft(variants.length, industry)]);
  }

  function applyPreset(preset: VariantPreset) {
    const nextVariants = preset.optionTextExamples.map((optionText, index) => ({
      ...createEmptyVariantDraft(index, industry),
      optionText,
    }));
    onChange(variants.length === 0 ? nextVariants : [...variants, ...nextVariants]);
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-black text-slate-950">Product variations</p>
          <p className="mt-1 text-xs leading-5 text-slate-500">
            Add the combinations that change price, stock, SKU, or availability. For takeaway add-ons, keep the core meal as a variation and use order notes until modifier support is added.
          </p>
        </div>
        <button
          type="button"
          onClick={addVariant}
          className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-slate-950 px-3 py-2 text-xs font-black text-white hover:bg-slate-800"
        >
          <Plus size={14} />
          Add variation
        </button>
      </div>

      {presets.length > 0 && (
        <details className="mt-4 rounded-xl border border-slate-200 bg-white p-3">
          <summary className="min-h-11 cursor-pointer rounded-lg p-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700">
            <span className="text-sm font-semibold text-slate-700">Industry presets (optional)</span>
          </summary>
          <p className="mt-1 text-xs leading-5 text-slate-600">Start from common option sets, then edit the rows below.</p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {presets.map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => applyPreset(preset)}
                className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-left transition hover:border-green-300 hover:bg-green-50"
              >
                <span className="block text-xs font-black text-slate-900">{preset.label}</span>
                <span className="mt-1 block text-xs leading-5 text-slate-500">{preset.description}</span>
                <span className="mt-2 block text-[10px] font-bold uppercase tracking-wide text-slate-400">
                  {preset.recommendedAttributes.join(" / ")}
                </span>
              </button>
            ))}
          </div>
        </details>
      )}

      {variants.length === 0 ? (
        <div className="mt-4 rounded-xl border border-dashed border-slate-300 bg-white p-4 text-sm text-slate-500">
          No variations added. Leave this empty for a simple product.
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          {variants.map((variant, index) => (
            <div key={variant.id || index} className="rounded-xl border border-slate-200 bg-white p-3">
              <div className="mb-3 flex items-center justify-between gap-3">
                <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">
                  Variation {index + 1}
                </p>
                <button
                  type="button"
                  onClick={() => removeVariant(index)}
                  className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-bold text-red-600 hover:bg-red-50"
                >
                  <Trash2 size={13} />
                  Remove
                </button>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-1 block text-xs font-bold text-slate-600">Options</span>
                  <input
                    value={variant.optionText}
                    onChange={(e) => updateVariant(index, { optionText: e.target.value })}
                    placeholder={getDefaultVariantOptionText(industry)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100"
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs font-bold text-slate-600">Variation SKU</span>
                  <input
                    value={variant.sku}
                    onChange={(e) => updateVariant(index, { sku: e.target.value })}
                    placeholder="SKU-RED-L"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100"
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs font-bold text-slate-600">Price (NAD)</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={variant.priceDisplay}
                    onChange={(e) => updateVariant(index, { priceDisplay: e.target.value })}
                    placeholder="Leave blank to use product price"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100"
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs font-bold text-slate-600">Image URL</span>
                  <input
                    value={variant.imageUrl}
                    onChange={(e) => updateVariant(index, { imageUrl: e.target.value })}
                    placeholder="Optional"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100"
                  />
                </label>
              </div>

              <div className="mt-3 grid gap-2 sm:grid-cols-4">
                <label className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700">
                  <input
                    type="checkbox"
                    checked={variant.isAvailable}
                    onChange={(e) => updateVariant(index, { isAvailable: e.target.checked })}
                  />
                  Available
                </label>
                <label className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700">
                  <input
                    type="checkbox"
                    checked={variant.trackInventory}
                    onChange={(e) => updateVariant(index, { trackInventory: e.target.checked })}
                  />
                  Track stock
                </label>
                <label className="block">
                  <span className="sr-only">Stock quantity</span>
                  <input
                    type="number"
                    min="0"
                    value={variant.stockQuantity}
                    onChange={(e) => updateVariant(index, { stockQuantity: parseInt(e.target.value) || 0 })}
                    disabled={!variant.trackInventory}
                    placeholder="Stock"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100 disabled:bg-slate-100"
                  />
                </label>
                <label className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700">
                  <input
                    type="checkbox"
                    checked={variant.allowBackorder}
                    onChange={(e) => updateVariant(index, { allowBackorder: e.target.checked })}
                  />
                  Backorder
                </label>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
