"use client";

import { useRouter } from "next/navigation";
import Image from "next/image";
import { ShoppingCart, X, Plus, Minus, Trash2 } from "lucide-react";
import { formatPrice } from "@/lib/utils";
import { calculateVatBreakdown, VAT_RATE_LABEL } from "@/lib/vat";
import { useCart } from "./cart-provider";
import { getCartItemKey } from "@/lib/cart-item";

export function CartDrawer({ slug }: { slug: string }) {
  const {
    items,
    vatSettings,
    updateQuantity,
    removeItem,
    getTotal,
    itemCount,
    isDrawerOpen: open,
    openDrawer,
    closeDrawer,
  } = useCart();
  const router = useRouter();
  const subtotal = getTotal();
  const vatBreakdown = calculateVatBreakdown({
    amountNad: subtotal,
    vatNumber: vatSettings.vatNumber,
    vatInclusive: vatSettings.vatInclusive,
  });

  return (
    <>
      {/* Floating cart button */}
      <button
        onClick={openDrawer}
        className="fixed bottom-5 right-5 z-40 bg-terracotta hover:opacity-90 text-white rounded-full w-14 h-14 flex items-center justify-center shadow-lg transition-colors"
        aria-label="Open cart"
      >
        <ShoppingCart className="w-6 h-6" />
        {itemCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">
            {itemCount > 99 ? "99+" : itemCount}
          </span>
        )}
      </button>

      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 bg-black/40 z-40"
          onClick={closeDrawer}
        />
      )}

      {/* Drawer */}
      <div
        className={`fixed top-0 right-0 h-full w-full max-w-sm bg-white z-50 shadow-xl transform transition-transform duration-300 ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-bold text-gray-900">
            Cart ({itemCount})
          </h2>
          <button
            onClick={closeDrawer}
            className="p-1 text-gray-500 hover:text-gray-700"
            aria-label="Close cart"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Items */}
        <div className="flex-1 overflow-y-auto p-4" style={{ maxHeight: "calc(100vh - 180px)" }}>
          {items.length === 0 ? (
            <p className="text-gray-500 text-center py-8">
              Your cart is empty
            </p>
          ) : (
            <ul className="space-y-4">
              {items.map((item) => (
                <li key={getCartItemKey(item)} className="flex gap-3">
                  {/* Image */}
                  <div className="w-16 h-16 rounded-md overflow-hidden bg-gray-100 flex-shrink-0">
                    {item.imageUrl ? (
                      <Image
                        src={item.imageUrl}
                        alt={item.name}
                        width={64}
                        height={64}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <ShoppingCart className="w-5 h-5 text-gray-300" />
                      </div>
                    )}
                  </div>

                  {/* Details */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {item.name}
                    </p>
                    {item.variantAttributes && Object.keys(item.variantAttributes).length > 0 && (
                      <p className="mt-0.5 text-[11px] leading-4 text-gray-500">
                        {Object.entries(item.variantAttributes)
                          .map(([key, value]) => `${key}: ${value}`)
                          .join(" | ")}
                      </p>
                    )}
                    {item.variantSku && (
                      <p className="text-[10px] font-medium uppercase tracking-wide text-gray-400">
                        SKU {item.variantSku}
                      </p>
                    )}
                    <p className="text-sm text-terracotta font-bold">
                      {formatPrice(item.price)}
                    </p>

                    {/* Quantity controls */}
                    <div className="flex items-center gap-2 mt-1">
                      <button
                        onClick={() =>
                          updateQuantity(getCartItemKey(item), item.quantity - 1)
                        }
                        className="w-7 h-7 rounded border border-gray-300 flex items-center justify-center hover:bg-gray-50"
                        aria-label="Decrease quantity"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="text-sm font-medium w-6 text-center">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() =>
                          updateQuantity(getCartItemKey(item), item.quantity + 1)
                        }
                        className="w-7 h-7 rounded border border-gray-300 flex items-center justify-center hover:bg-gray-50"
                        aria-label="Increase quantity"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => removeItem(getCartItemKey(item))}
                        className="ml-auto p-1 text-red-400 hover:text-red-600"
                        aria-label="Remove item"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Line total */}
                  <p className="text-sm font-bold text-gray-900 flex-shrink-0">
                    {formatPrice(item.price * item.quantity)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Footer */}
        {items.length > 0 && (
          <div className="border-t p-4 space-y-3">
            {/* Without a VAT registration the breakdown collapses to the
                subtotal, so a separate subtotal line above it would repeat
                the same figure twice. */}
            <div className="space-y-1.5">
              {vatBreakdown.hasVat ? (
                <>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">
                      Subtotal{vatBreakdown.vatInclusive ? " (incl. VAT)" : ""}
                    </span>
                    <span className="font-semibold text-gray-900">{formatPrice(subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">
                      VAT ({VAT_RATE_LABEL}){vatBreakdown.vatInclusive ? " included" : ""}
                    </span>
                    <span className="font-semibold text-gray-900">{formatPrice(vatBreakdown.vatAmount)}</span>
                  </div>
                  <div className="flex justify-between text-base font-bold border-t border-gray-100 pt-2">
                    <span>Total incl. VAT</span>
                    <span className="text-terracotta">{formatPrice(vatBreakdown.payableTotal)}</span>
                  </div>
                </>
              ) : (
                <div className="flex justify-between text-base font-bold">
                  <span>Subtotal</span>
                  <span className="text-terracotta">{formatPrice(subtotal)}</span>
                </div>
              )}
            </div>
            <button
              onClick={() => {
                closeDrawer();
                router.push(`/checkout/${slug}`);
              }}
              className="w-full bg-terracotta hover:opacity-90 text-white font-semibold py-3 rounded-md transition-colors"
            >
              Checkout
            </button>
          </div>
        )}
      </div>
    </>
  );
}
