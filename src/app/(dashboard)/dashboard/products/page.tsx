import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Plus, Package } from "lucide-react";
import { ProductGrid } from "./product-actions";

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
    .is("deleted_at", null)
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
        <ProductGrid
          products={productList.map((p) => ({
            id: p.id,
            name: p.name,
            price_nad: p.price_nad,
            images: p.images,
            is_available: p.is_available,
            track_inventory: p.track_inventory ?? false,
            stock_quantity: p.stock_quantity ?? 0,
            low_stock_threshold: p.low_stock_threshold ?? 5,
            allow_backorder: p.allow_backorder ?? false,
            sku: p.sku ?? null,
            category_name: (p.categories as { name: string } | null)?.name ?? null,
          }))}
        />
      )}
    </div>
  );
}

