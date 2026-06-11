"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Trash2, Pencil, CheckSquare, Square, Search, ArrowUpDown, ImagePlus } from "lucide-react";
import { formatPrice, cn } from "@/lib/utils";
import { ProductModerationNotice } from "@/components/dashboard/product-moderation-notice";

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
  moderation_status: "approved" | "review_required" | "blocked";
  moderation_reasons: string[];
  hasOpenAppeal: boolean;
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

  function fallbackVisual(product: Product) {
    const category = (product.category_name || "").toLowerCase();
    if (category.includes("electronics")) {
      return {
        image: "/landing/featured-octovia-nexus.webp",
        tone: "from-blue-950/80 via-blue-800/35 to-cyan-500/20",
      };
    }
    if (category.includes("clothing")) {
      return {
        image: "/landing/featured-apatchy-beard-company.webp",
        tone: "from-slate-950/75 via-slate-800/30 to-orange-500/20",
      };
    }
    if (category.includes("groceries")) {
      return {
        image: "/landing/store-thumb-3.png",
        tone: "from-emerald-950/70 via-emerald-800/25 to-lime-400/20",
      };
    }
    return {
      image: "/landing/store-thumb-1.png",
      tone: "from-slate-950/70 via-slate-800/25 to-acacia/20",
    };
  }

  return (
    <>
      {/* Search + Sort */}
      <div className="mb-4 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm shadow-slate-900/5">
        <div className="flex flex-col gap-3 lg:flex-row">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search products by name or SKU..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="min-h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 text-sm font-medium text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-acacia focus:bg-white focus:ring-4 focus:ring-emerald-100"
          />
        </div>
        <div className="relative">
          <ArrowUpDown size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="min-h-11 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-8 text-sm font-bold text-slate-700 outline-none transition focus:border-acacia focus:ring-4 focus:ring-emerald-100 lg:w-48"
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
              "group relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm shadow-slate-900/5 transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-lg hover:shadow-slate-900/10",
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
              <div className="aspect-[4/3] relative overflow-hidden bg-slate-100">
                {product.images && product.images.length > 0 ? (
                  <Image
                    src={product.images[0]}
                    alt={product.name}
                    fill
                    className="object-cover"
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                  />
                ) : (
                  <div
                    className="h-full w-full bg-cover bg-center transition duration-500 group-hover:scale-105"
                    style={{ backgroundImage: `url(${fallbackVisual(product).image})` }}
                  >
                    <div className={cn("flex h-full w-full items-center justify-center bg-gradient-to-br", fallbackVisual(product).tone)}>
                      <div className="rounded-2xl border border-white/30 bg-white/20 p-3 text-white shadow-lg backdrop-blur">
                        <ImagePlus size={28} />
                      </div>
                    </div>
                  </div>
                )}
                <span
                  className={cn(
                    "absolute top-3 right-3 rounded-full px-2.5 py-1 text-xs font-black shadow-sm",
                    product.moderation_status === "blocked"
                      ? "bg-red-100 text-red-800"
                      : product.moderation_status === "review_required"
                      ? "bg-amber-100 text-amber-800"
                      : product.is_available
                      ? "bg-emerald-100 text-emerald-800"
                      : "bg-slate-100 text-slate-500"
                  )}
                >
                  {product.moderation_status === "blocked"
                    ? "Blocked"
                    : product.moderation_status === "review_required"
                    ? "In review"
                    : product.is_available
                    ? "Available"
                    : "Unavailable"}
                </span>
              </div>
            </Link>
            <div className="p-4">
              <Link href={`/dashboard/products/${product.id}/edit`}>
                <h3 className="truncate text-base font-black text-slate-950 transition-colors hover:text-acacia">
                  {product.name}
                </h3>
              </Link>
              {product.category_name && (
                <p className="mt-1 text-xs font-bold uppercase tracking-wide text-slate-400">
                  {product.category_name}
                </p>
              )}
              <p className="mt-2 text-lg font-black text-acacia">
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
              {product.moderation_status !== "approved" && (
                <ProductModerationNotice
                  productId={product.id}
                  moderationStatus={product.moderation_status}
                  reasons={product.moderation_reasons}
                  hasOpenAppeal={product.hasOpenAppeal}
                />
              )}
              <div className="mt-4 flex items-center gap-2 border-t border-slate-100 pt-3">
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
