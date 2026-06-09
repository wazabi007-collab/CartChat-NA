import { CartProvider } from "@/components/storefront/cart-provider";
import { CartDrawer } from "@/components/storefront/cart-drawer";
import { createClient } from "@/lib/supabase/server";

export default async function StorefrontLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createClient();
  const { data: merchant } = await supabase
    .from("merchants")
    .select("vat_number, vat_inclusive")
    .eq("store_slug", slug)
    .eq("is_active", true)
    .eq("store_status", "active")
    .single();

  return (
    <CartProvider
      slug={slug}
      vatSettings={{
        vatNumber: merchant?.vat_number ?? null,
        vatInclusive: merchant?.vat_inclusive ?? false,
      }}
    >
      {children}
      <CartDrawer slug={slug} />
    </CartProvider>
  );
}
