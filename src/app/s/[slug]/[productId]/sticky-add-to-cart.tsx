"use client";

import { useState, useEffect } from "react";
import { ShoppingCart, Check } from "lucide-react";
import { useCart } from "@/components/storefront/cart-provider";
import { formatPrice } from "@/lib/utils";

interface Props {
  productId: string;
  name: string;
  price: number;
  imageUrl: string | null;
  isOutOfStock: boolean;
}

export function StickyAddToCart({ productId, name, price, imageUrl, isOutOfStock }: Props) {
  const { addItem } = useCart();
  const [added, setAdded] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Show sticky bar when the main Add to Cart button scrolls out of view
    const observer = new IntersectionObserver(
      ([entry]) => {
        setVisible(!entry.isIntersecting);
      },
      { threshold: 0 }
    );

    // Observe the main add-to-cart section (find it by data attribute)
    const target = document.querySelector("[data-add-to-cart-section]");
    if (target) observer.observe(target);

    return () => observer.disconnect();
  }, []);

  if (isOutOfStock) return null;

  const handleAdd = () => {
    addItem({ productId, name, price, imageUrl });
    setAdded(true);
    setTimeout(() => setAdded(false), 1500);
  };

  return (
    <div
      className={`fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 px-4 py-3 transition-transform duration-300 md:hidden ${
        visible ? "translate-y-0" : "translate-y-full"
      }`}
      style={{ paddingBottom: "max(12px, env(safe-area-inset-bottom))" }}
    >
      <div className="flex items-center justify-between gap-3 max-w-4xl mx-auto">
        <div className="min-w-0">
          <p className="text-sm font-medium text-gray-900 truncate">{name}</p>
          <p className="text-lg font-bold text-green-600">{formatPrice(price)}</p>
        </div>
        <button
          onClick={handleAdd}
          className="shrink-0 bg-green-600 hover:bg-green-700 active:scale-95 text-white font-semibold py-3 px-6 rounded-lg transition-all flex items-center gap-2"
        >
          {added ? (
            <>
              <Check size={18} />
              Added!
            </>
          ) : (
            <>
              <ShoppingCart size={18} />
              Add to Cart
            </>
          )}
        </button>
      </div>
    </div>
  );
}
