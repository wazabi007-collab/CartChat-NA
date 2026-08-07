import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { AlertTriangle, Globe, PackagePlus, QrCode, Megaphone } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { SITE_URL } from "@/lib/constants";
import { ShareStoreCard } from "@/components/dashboard/share-store-card";

export const metadata: Metadata = {
  title: "Share your store",
};

export default async function SharePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: merchant } = await supabase
    .from("merchants")
    .select("id, store_name, store_slug, store_link_shared")
    .eq("user_id", user.id)
    .single();

  if (!merchant) redirect("/dashboard/setup");

  const { count: productCount } = await supabase
    .from("products")
    .select("id", { count: "exact", head: true })
    .eq("merchant_id", merchant.id)
    .is("deleted_at", null);

  const hasProducts = (productCount || 0) > 0;
  const storeUrl = `${SITE_URL}/s/${merchant.store_slug}`;

  return (
    <div className="md:ml-56 space-y-6">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-acacia">
          Get customers
        </p>
        <h1 className="mt-2 text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">
          Share your store
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
          Your store link is your shop&apos;s address on the internet. Anyone who
          opens it can browse your products and place an order.
        </p>
      </div>

      {/* The one thing that has to happen first. */}
      {!hasProducts && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
          <div className="flex items-start gap-3">
            <AlertTriangle size={20} className="mt-0.5 shrink-0 text-amber-600" />
            <div>
              <p className="font-black text-amber-900">
                Add a product before you share this
              </p>
              <p className="mt-1 text-sm leading-6 text-amber-800">
                Your link already works, but your shop is empty. Until you add at
                least one product your store <strong>will not appear in Browse
                Stores</strong> on OshiCart, and anyone you send the link to
                arrives at a shop with nothing to buy — most won&apos;t come back.
              </p>
              <Link
                href="/dashboard/products/new"
                className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-lg bg-amber-600 px-4 text-sm font-black text-white transition-colors hover:bg-amber-700"
              >
                <PackagePlus size={16} />
                Add your first product
              </Link>
            </div>
          </div>
        </div>
      )}

      <ShareStoreCard
        storeUrl={storeUrl}
        storeName={merchant.store_name}
        merchantId={merchant.id}
        storeLinkShared={Boolean(merchant.store_link_shared)}
        hasProducts={hasProducts}
      />

      <div className="grid gap-4 md:grid-cols-2">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-900/5">
          <div className="flex items-center gap-2">
            <Globe size={18} className="text-terracotta" />
            <h2 className="font-black text-slate-950">What your store link is</h2>
          </div>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            It works exactly like a website address. You don&apos;t need to buy a
            domain or build a site — this <em>is</em> your online shop.
          </p>
          <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-600">
            <li>Put it in your WhatsApp status and your bio.</li>
            <li>Paste it into Facebook, Instagram, and TikTok posts.</li>
            <li>Send it to a customer who asks &ldquo;what do you have?&rdquo;</li>
            <li>Print it on your flyers, business cards, and packaging.</li>
          </ul>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-900/5">
          <div className="flex items-center gap-2">
            <QrCode size={18} className="text-terracotta" />
            <h2 className="font-black text-slate-950">What your QR code is</h2>
          </div>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            A picture of your link. Anyone who points their phone camera at it
            opens your shop — no typing, no spelling mistakes.
          </p>
          <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-600">
            <li>Download it and post it on your WhatsApp status.</li>
            <li>Stick it on your shop door, table, or market stall.</li>
            <li>Add it to your flyers, packaging, and price lists.</li>
            <li>Show it on your phone screen for someone to scan.</li>
          </ul>
        </section>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-900/5">
        <div className="flex items-center gap-2">
          <Megaphone size={18} className="text-acacia" />
          <h2 className="font-black text-slate-950">A message you can copy</h2>
        </div>
        <p className="mt-2 text-sm leading-6 text-slate-500">
          Not sure what to write when you share it? Start with this.
        </p>
        <blockquote className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-700">
          {merchant.store_name} is now online. Browse everything I have and order
          straight from your phone — no calls, no back and forth. {storeUrl}
        </blockquote>
      </section>
    </div>
  );
}
