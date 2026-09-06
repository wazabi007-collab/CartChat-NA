/** Zero-price catalogue entries mean price on request, never a free order.
 * Variant parents may have a zero base price; select a priced variant first.
 * Kept server-safe so every layout, detail page and checkout can share it.
 */
export function isQuoteRequired(product: { price_nad: number; has_variants?: boolean }): boolean {
  return product.price_nad <= 0 && !product.has_variants;
}

/** Shared social-preview price: never advertise a zero-price item as free. */
export function socialPriceLabel(product: { price_nad: number; product_variants?: { price_nad: number; is_available: boolean }[] | null }): string {
  const prices = (product.product_variants ?? []).filter((v) => v.is_available && v.price_nad > 0).map((v) => v.price_nad);
  const amount = prices.length ? Math.min(...prices) : product.price_nad;
  if (amount <= 0) return "Request a quote";
  return `${prices.length ? "From " : ""}N$${(amount / 100).toLocaleString("en-NA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
