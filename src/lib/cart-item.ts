/**
 * The shape of a cart line, and the one function that builds one.
 *
 * Deliberately NOT a "use client" module. Server components build cart
 * payloads too — the product detail page and the storefront grid both render
 * a small client button and hand it a finished line. Next turns every export
 * of a client module into a client reference, so a pure helper living beside
 * the provider could be rendered but never *called* from the server:
 *
 *   Error: Attempted to call cartItemFromProduct() from the server but
 *   cartItemFromProduct is on the client.
 *
 * That broke every product page on click-through. Keeping the data model here
 * and the React context in cart-provider.tsx means both sides can share it.
 * scripts/check-server-safe-cart-item.ts holds the line.
 */
import type { ServiceMode } from "@/lib/service-mode";

export interface CartItem {
  productId: string;
  variantId?: string | null;
  variantSku?: string | null;
  variantAttributes?: Record<string, string>;
  name: string;
  price: number; // in cents
  quantity: number;
  imageUrl: string | null;
  /** Where this service happens. Absent for ordinary goods. */
  serviceMode?: ServiceMode | null;
  /** "rental" lines price as rate x days and pick dates at checkout. */
  itemType?: "product" | "service" | "rental";
  /** Rentals only: how the range counts, and the refundable deposit per unit. */
  rentalUnit?: "day" | "night";
  depositNad?: number;
  /** e.g. "Driver's licence and proof of address" — shown at checkout. */
  requiredDocuments?: string;
  /** Shortest and longest hire the merchant allows, in the item's own unit. */
  rentalMinDays?: number;
  rentalMaxDays?: number;
  /** This hire needs the hirer's ID number captured at checkout. */
  requiresIdNumber?: boolean;
}

/** The product-row fields a cart line is built from. */
export interface CartProductSource {
  id: string;
  name: string;
  price_nad: number;
  images?: string[] | null;
  item_type?: string | null;
  service_mode?: string | null;
  rental_unit?: string | null;
  deposit_nad?: number | null;
  required_documents?: string | null;
  rental_min_days?: number | null;
  rental_max_days?: number | null;
  requires_id_number?: boolean | null;
}

export interface CartVatSettings {
  vatNumber: string | null;
  vatInclusive: boolean;
}

/**
 * Turn a product row into a cart line. Use this everywhere — never hand-write
 * the object at a call site.
 *
 * Seven places built this payload by hand, and every one of them had drifted
 * to a different subset. The storefront grid and all five themed layouts sent
 * only id/name/price/image (plus serviceMode in the layouts), so a hire added
 * from ANY storefront reached checkout with no `itemType`: no date picker, no
 * deposit, a single day's price — and then place_order refused the order for
 * missing hire dates the customer was never asked for. Only the product detail
 * page, which happened to pass the full set, worked.
 *
 * One definition means adding a field to CartItem cannot silently skip six
 * call sites again. scripts/check-cart-payload.ts keeps it that way.
 */
export function cartItemFromProduct(
  product: CartProductSource,
  overrides: Partial<Omit<CartItem, "quantity">> = {}
): Omit<CartItem, "quantity"> {
  const itemType = (product.item_type as CartItem["itemType"]) ?? "product";
  return {
    productId: product.id,
    name: product.name,
    price: product.price_nad,
    imageUrl: product.images?.[0] ?? null,
    serviceMode: (product.service_mode as ServiceMode | null) ?? null,
    itemType,
    // Rental-only fields, but harmless on other types and cheaper to carry
    // than to reason about at six call sites.
    rentalUnit: product.rental_unit === "night" ? "night" : "day",
    depositNad: product.deposit_nad ?? 0,
    requiredDocuments: product.required_documents ?? undefined,
    rentalMinDays: product.rental_min_days ?? 1,
    rentalMaxDays: product.rental_max_days ?? 30,
    requiresIdNumber: product.requires_id_number ?? false,
    ...overrides,
  };
}

export function getCartItemKey(item: Pick<CartItem, "productId" | "variantId">) {
  return item.variantId ? `${item.productId}:${item.variantId}` : item.productId;
}
