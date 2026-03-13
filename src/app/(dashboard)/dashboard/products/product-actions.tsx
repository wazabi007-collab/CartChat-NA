"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Trash2, Pencil, Package, CheckSquare, Square, Search, ArrowUpDown } from "lucide-react";
import { formatPrice, cn } from "@/lib/utils";

interface Product {
  id: string;
  name: string;
  price_nad: number;
  images: string[] | null;
  is_available: boolean;
  track_inventory: boolean;
  stock_quantity: number;
  low_stock_threshold: number | null;
  allow_backorder: boolean;
  category_name: string | null;
  sku: string | null;
}

export function ProductGrid({ products }: { products: Product[] }) {
  const router = useRouter();
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState(false);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<string>("newest");

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectAll() {
    setSelected(new Set(products.map((p) => p.id)));
  }

  function exitSelectMode() {
    setSelectMode(false);
    setSelected(new Set());
  }

  async function handleDelete(ids: string[]) {
    if (ids.length === 0) return;
    const count = ids.length;
    if (!confirm(`Delete ${count} product${count > 1 ? "s" : ""}? Deleted products still count toward your plan limit.`)) return;

    setDeleting(true);
    try {
      const res = await fetch(`/api/products?ids=${ids.join(",")}`, { method: "DELETE" });
      if (!res.ok) {
        const err = await res.json();
        alert(err.error || "Failed to delete");
      } else {
        setSelected(new Set());
        setSelectMode(false);
        router.refresh();
      }
    } finally {
      setDeleting(false);
    }
  }

  async function handleSingleDelete(id: string) {
    if (!confirm("Delete this product? Deleted products still count toward your plan limit.")) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/products?ids=${id}`, { method: "DELETE" });
      if (res.ok) router.refresh();
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
      {/* Search + Sort */}
      <div className="flex gap-2 mb-4">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search products by name or SKU..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
          />
        </div>
        <div className="relative">
          <ArrowUpDown size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="pl-8 pr-3 py-2 border rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-500 appearance-none cursor-pointer"
          >
            <option value="newest">Newest</option>
            <option value="name_asc">Name A-Z</option>
            <option value="name_desc">Name Z-A</option>
            <option value="price_asc">Price: Low to High</option>
            <option value="price_desc">Price: High to Low</option>
            <option value="stock_asc">Stock: Low to High</option>
            <option value="stock_desc">Stock: High to Low</option>
          </select>
        </div>
      </div>

      {/* Bulk action bar */}
      <div className="flex items-center gap-2 mb-4">
        {!selectMode ? (
          <button
            onClick={() => setSelectMode(true)}
            className="text-xs text-gray-500 hover:text-gray-700 px-3 py-1.5 border rounded-lg hover:bg-gray-50 transition-colors"
          >
            Select
          </button>
        ) : (
          <>
            <button onClick={selectAll} className="text-xs text-gray-600 hover:text-gray-800 px-2 py-1 rounded hover:bg-gray-100">
              Select All
            </button>
            <button onClick={exitSelectMode} className="text-xs text-gray-500 hover:text-gray-700 px-2 py-1 rounded hover:bg-gray-100">
              Cancel
            </button>
            {selected.size > 0 && (
              <button
                onClick={() => handleDelete(Array.from(selected))}
                disabled={deleting}
                className="flex items-center gap-1 text-xs text-red-600 hover:text-red-800 px-3 py-1.5 bg-red-50 border border-red-200 rounded-lg disabled:opacity-50"
              >
                <Trash2 size={14} />
                {deleting ? "Deleting..." : `Delete ${selected.size}`}
              </button>
            )}
          </>
        )}
      </div>

      {/* Product grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {products.filter((p) => {
          if (!search) return true;
          const q = search.toLowerCase();
          return p.name.toLowerCase().includes(q) || (p.category_name || "").toLowerCase().includes(q) || (p.sku || "").toLowerCase().includes(q);
        }).sort((a, b) => {
          switch (sortBy) {
            case "name_asc": return a.name.localeCompare(b.name);
            case "name_desc": return b.name.localeCompare(a.name);
            case "price_asc": return a.price_nad - b.price_nad;
            case "price_desc": return b.price_nad - a.price_nad;
            case "stock_asc": return a.stock_quantity - b.stock_quantity;
            case "stock_desc": return b.stock_quantity - a.stock_quantity;
            default: return 0; // newest = original order
          }
        }).map((product) => (
          <div
            key={product.id}
            className={cn(
              "bg-white rounded-lg border overflow-hidden hover:shadow-sm transition-shadow relative",
              selectMode && selected.has(product.id) && "ring-2 ring-green-500"
            )}
          >
            {selectMode && (
              <button
                onClick={() => toggle(product.id)}
                className="absolute top-2 left-2 z-10"
              >
                {selected.has(product.id) ? (
                  <CheckSquare size={22} className="text-green-600 bg-white rounded" />
                ) : (
                  <Square size={22} className="text-gray-400 bg-white/80 rounded" />
                )}
              </button>
            )}

            <Link href={`/dashboard/products/${product.id}/edit`} className="block">
              <div className="aspect-square relative bg-gray-100">
                {product.images && product.images.length > 0 ? (
                  <Image
                    src={product.images[0]}
                    alt={product.name}
                    fill
                    className="object-cover"
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Package size={48} className="text-gray-300" />
                  </div>
                )}
                <span
                  className={cn(
                    "absolute top-2 right-2 px-2 py-0.5 rounded-full text-xs font-medium",
                    product.is_available
                      ? "bg-green-100 text-green-700"
                      : "bg-gray-100 text-gray-500"
                  )}
                >
                  {product.is_available ? "Available" : "Unavailable"}
                </span>
              </div>
            </Link>
            <div className="p-3">
              <Link href={`/dashboard/products/${product.id}/edit`}>
                <h3 className="font-medium text-gray-900 truncate hover:text-green-600 transition-colors">
                  {product.name}
                </h3>
              </Link>
              {product.category_name && (
                <p className="text-xs text-gray-400 mt-0.5">
                  {product.category_name}
                </p>
              )}
              <p className="text-green-600 font-semibold mt-1">
                {formatPrice(product.price_nad)}
              </p>
              {product.track_inventory && (
                <p className={cn(
                  "text-xs mt-1 font-medium",
                  product.stock_quantity === 0 && !product.allow_backorder
                    ? "text-red-600"
                    : product.stock_quantity <= (product.low_stock_threshold ?? 5)
                    ? "text-orange-600"
                    : "text-gray-500"
                )}>
                  {product.stock_quantity === 0 && !product.allow_backorder
                    ? "Out of stock"
                    : product.stock_quantity <= (product.low_stock_threshold ?? 5)
                    ? `Low stock: ${product.stock_quantity} left`
                    : `Stock: ${product.stock_quantity}`}
                </p>
              )}
              <div className="flex items-center gap-2 mt-3 pt-3 border-t">
                <Link
                  href={`/dashboard/products/${product.id}/edit`}
                  className="flex items-center gap-1 text-xs text-gray-500 hover:text-green-600 transition-colors"
                >
                  <Pencil size={14} />
                  Edit
                </Link>
                <button
                  onClick={() => handleSingleDelete(product.id)}
                  disabled={deleting}
                  className="flex items-center gap-1 text-xs text-gray-400 hover:text-red-600 transition-colors ml-auto disabled:opacity-50"
                >
                  <Trash2 size={14} />
                  Delete
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
