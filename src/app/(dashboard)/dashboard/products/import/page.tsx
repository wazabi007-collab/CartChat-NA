import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { TIER_LIMITS, TIER_LABELS, type SubscriptionTier } from "@/lib/tier-limits";
import { ImportClient } from "./import-client";

export default async function ImportProductsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: merchant, error: merchantError } = await supabase
    .from("merchants")
    .select("id")
    .eq("user_id", user.id)
    .single();
  // A failed query is not "this user has no store". Reading every error as an
  // unconfigured merchant is what sent fully set-up merchants to the setup
  // wizard when a column grant was missing (QA-024); fail loudly instead.
  if (merchantError && merchantError.code !== "PGRST116") {
    throw new Error(`Could not load your store: ${merchantError.message}`);
  }
  if (!merchant) redirect("/dashboard/setup");

  const [{ data: subscription }, { count }] = await Promise.all([
    supabase.from("subscriptions").select("tier").eq("merchant_id", merchant.id).maybeSingle(),
    supabase
      .from("products")
      .select("id", { count: "exact", head: true })
      .eq("merchant_id", merchant.id),
  ]);

  const tier = (subscription?.tier ?? "oshi_start") as SubscriptionTier;
  const limit = TIER_LIMITS[tier].products;
  const used = count ?? 0;
  const remaining = limit === -1 ? -1 : Math.max(0, limit - used);

  return (
    <div className="md:ml-56 space-y-6">
      <div>
        <Link
          href="/dashboard/products"
          className="inline-flex items-center gap-1 text-sm font-semibold text-slate-500 hover:text-slate-800"
        >
          <ArrowLeft size={15} /> Back to products
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-gray-900">Import products from a file</h1>
        <p className="mt-1 text-sm text-gray-500">
          Already have your products in Excel or Google Sheets? Save it as CSV and upload it here
          instead of adding them one by one.
        </p>
      </div>

      <ImportClient
        remaining={remaining}
        planLabel={TIER_LABELS[tier]}
        productLimit={limit}
        used={used}
      />
    </div>
  );
}
