"use client";

import Link from "next/link";
import Image from "next/image";
import { ShoppingCart } from "lucide-react";
import { formatPrice } from "@/lib/utils";
import { useCart } from "./cart-provider";

interface ProductCardProps {
  id: string;
  name: string;
  price: number;
  imageUrl: string | null;
  slug: string;
}

export function ProductCard({ id, name, price, imageUrl, slug }: ProductCardProps) {
  const { addItem } = useCart();

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden flex flex-col">
      <Link href={`/s/${slug}/${id}`} className="block">
        {imageUrl ? (
          <div className="relative aspect-square bg-gray-100">
            <Image
              src={imageUrl}
              alt={name}
              fill
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
              className="object-cover"
            />
          </div>
        ) : (
          <div className="aspect-square bg-gray-100 flex items-center justify-center">
            <ShoppingCart className="w-10 h-10 text-gray-300" />
          </div>
        )}
      </Link>

      <div className="p-3 flex flex-col flex-1">
        <Link href={`/s/${slug}/${id}`} className="block">
          <h3 className="font-medium text-gray-900 text-sm leading-tight line-clamp-2">
            {name}
          </h3>
        </Link>
        <p className="text-green-600 font-bold text-base mt-1">
          {formatPrice(price)}
        </p>
        <div className="mt-auto pt-2">
          <button
            onClick={() =>
              addItem({ productId: id, name, price, imageUrl })
            }
            className="w-full bg-green-600 hover:bg-green-700 text-white text-sm font-medium py-2 px-3 rounded-md transition-colors"
          >
            Add to Cart
          </button>
        </div>
      </div>
    </div>
  );
}
