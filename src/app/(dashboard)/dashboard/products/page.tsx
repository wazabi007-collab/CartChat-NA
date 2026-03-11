import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Plus, Pencil, Package } from "lucide-react";
import { formatPrice, cn } from "@/lib/utils";
import { DeleteButton } from "./delete-button";

export default async function ProductsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: merchant } = await supabase
    .from("merchants")
    .select("*")
    .eq("user_id", user.id)
    .single();

  if (!merchant) redirect("/dashboard/setup");

  const { data: products } = await supabase
    .from("products")
    .select("*, categories(name)")
    .eq("merchant_id", merchant.id)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });

  const productList = products || [];

  return (
    <div className="md:ml-56">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Products</h1>
          <p className="text-sm text-gray-500 mt-1">
            {productList.length} product{productList.length !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/products/categories"
            className="text-sm text-gray-600 hover:text-gray-900 px-3 py-2 border rounded-lg hover:bg-gray-50 transition-colors"
          >
            Categories
          </Link>
          <Link
            href="/dashboard/products/new"
            className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
          >
            <Plus size={18} />
            Add Product
          </Link>
        </div>
      </div>

      {productList.length === 0 ? (
        <div className="bg-white rounded-lg border p-12 text-center">
          <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
            <Package size={32} className="text-gray-400" />
          </div>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">
            No products yet
          </h2>
          <p className="text-gray-500 mb-6 max-w-sm mx-auto">
            Start building your catalog by adding your first product. Your
            customers will see these in your WhatsApp store.
          </p>
          <Link
            href="/dashboard/products/new"
            className="inline-flex items-center gap-2 bg-green-600 text-white px-6 py-2.5 rounded-lg hover:bg-green-700 transition-colors font-medium"
          >
            <Plus size={18} />
            Add your first product
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {productList.map((product) => {
            const category = product.categories as { name: string } | null;
            return (
              <div
                key={product.id}
                className="bg-white rounded-lg border overflow-hidden hover:shadow-sm transition-shadow"
              >
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
                <div className="p-3">
                  <h3 className="font-medium text-gray-900 truncate">
                    {product.name}
                  </h3>
                  {category && (
                    <p className="text-xs text-gray-400 mt-0.5">
                      {category.name}
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
                    <DeleteButton productId={product.id} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

