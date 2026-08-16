"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
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

export interface CartVatSettings {
  vatNumber: string | null;
  vatInclusive: boolean;
}

interface CartContextValue {
  items: CartItem[];
  vatSettings: CartVatSettings;
  addItem: (item: Omit<CartItem, "quantity">) => void;
  removeItem: (cartKey: string) => void;
  updateQuantity: (cartKey: string, quantity: number) => void;
  clearCart: () => void;
  getTotal: () => number;
  itemCount: number;
  isDrawerOpen: boolean;
  openDrawer: () => void;
  closeDrawer: () => void;
}

const CartContext = createContext<CartContextValue | null>(null);

function getStorageKey(slug: string) {
  return `oshicart-cart-${slug}`;
}

export function getCartItemKey(item: Pick<CartItem, "productId" | "variantId">) {
  return item.variantId ? `${item.productId}:${item.variantId}` : item.productId;
}

export function CartProvider({
  slug,
  vatSettings,
  children,
}: {
  slug: string;
  vatSettings?: CartVatSettings;
  children: ReactNode;
}) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [cartLoaded, setCartLoaded] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(getStorageKey(slug));
      setItems(stored ? JSON.parse(stored) : []);
    } catch {
      setItems([]);
    } finally {
      setCartLoaded(true);
    }
  }, [slug]);

  // Persist cart to localStorage on change
  useEffect(() => {
    if (!cartLoaded) return;
    localStorage.setItem(getStorageKey(slug), JSON.stringify(items));
  }, [cartLoaded, items, slug]);

  const addItem = useCallback(
    (item: Omit<CartItem, "quantity">) => {
      setItems((prev) => {
        const itemKey = getCartItemKey(item);
        const existing = prev.find((i) => getCartItemKey(i) === itemKey);
        if (existing) {
          return prev.map((i) =>
            getCartItemKey(i) === itemKey
              ? { ...i, quantity: i.quantity + 1 }
              : i
          );
        }
        return [...prev, { ...item, quantity: 1 }];
      });
      // Auto-open the cart drawer so buyers see the item land in their cart
      setIsDrawerOpen(true);
    },
    []
  );

  const openDrawer = useCallback(() => setIsDrawerOpen(true), []);
  const closeDrawer = useCallback(() => setIsDrawerOpen(false), []);

  const removeItem = useCallback((cartKey: string) => {
    setItems((prev) => prev.filter((i) => getCartItemKey(i) !== cartKey));
  }, []);

  const updateQuantity = useCallback(
    (cartKey: string, quantity: number) => {
      if (quantity < 1) {
        setItems((prev) => prev.filter((i) => getCartItemKey(i) !== cartKey));
        return;
      }
      setItems((prev) =>
        prev.map((i) =>
          getCartItemKey(i) === cartKey ? { ...i, quantity } : i
        )
      );
    },
    []
  );

  const clearCart = useCallback(() => {
    setItems([]);
  }, []);

  const getTotal = useCallback(() => {
    return items.reduce((sum, i) => sum + i.price * i.quantity, 0);
  }, [items]);

  const itemCount = items.reduce((sum, i) => sum + i.quantity, 0);

  return (
    <CartContext.Provider
      value={{
        items,
        vatSettings: vatSettings || { vatNumber: null, vatInclusive: false },
        addItem,
        removeItem,
        updateQuantity,
        clearCart,
        getTotal,
        itemCount,
        isDrawerOpen,
        openDrawer,
        closeDrawer,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return ctx;
}
