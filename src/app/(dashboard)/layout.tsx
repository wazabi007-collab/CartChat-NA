import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { DashboardNav } from "@/components/dashboard/nav";
import { BottomNav } from "@/components/dashboard/bottom-nav";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Check if merchant has completed store setup
  const { data: merchant } = await supabase
    .from("merchants")
    .select("id, store_name, store_slug, industry")
    .eq("user_id", user.id)
    .single();

  // Fetch subscription tier for nav (coupon visibility)
  let subscriptionTier: string | null = null;
  if (merchant) {
    const service = createServiceClient();
    const { data: sub } = await service
      .from("subscriptions")
      .select("tier, status")
      .eq("merchant_id", merchant.id)
      .single();

    subscriptionTier = sub?.tier || null;

    // Hard suspend: redirect to suspended page
    if (sub?.status === "hard_suspended") {
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
          <div className="bg-white rounded-lg border p-8 max-w-sm text-center">
            <p className="text-lg font-bold text-gray-900">Store Suspended</p>
            <p className="text-sm text-gray-500 mt-2">
              Your store has been suspended due to non-payment. Contact support@oshicart.com to reactivate.
            </p>
          </div>
        </div>
      );
    }
  }

  let pendingCount = 0;
  if (merchant) {
    const { count } = await supabase
      .from("orders")
      .select("id", { count: "exact", head: true })
      .eq("merchant_id", merchant.id)
      .eq("status", "pending");
    pendingCount = count ?? 0;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <DashboardNav
        merchant={merchant}
        userPhone={user.phone || ""}
        subscriptionTier={subscriptionTier}
        industry={merchant?.industry}
      />
      <main className="max-w-6xl mx-auto px-4 py-6 pb-20 md:pb-6">{children}</main>
      {merchant && <BottomNav pendingOrders={pendingCount} industry={merchant.industry} />}
    </div>
  );
}
