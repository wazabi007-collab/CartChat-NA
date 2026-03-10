import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { SITE_NAME } from "@/lib/constants";
import { CheckoutForm } from "./checkout-form";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: merchant } = await supabase
    .from("merchants")
    .select("store_name")
    .eq("store_slug", slug)
    .eq("is_active", true)
    .single();

  if (!merchant) return { title: "Checkout" };

  return {
    title: `Checkout | ${merchant.store_name} | ${SITE_NAME}`,
  };
}

export default async function CheckoutPage({ params }: Props) {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: merchant } = await supabase
    .from("merchants")
    .select(
      "id, store_name, whatsapp_number, bank_name, bank_account_number, bank_account_holder, bank_branch_code"
    )
    .eq("store_slug", slug)
    .eq("is_active", true)
    .single();

  if (!merchant) notFound();

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <h1 className="text-lg font-bold text-gray-900">
            Checkout — {merchant.store_name}
          </h1>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6">
        <CheckoutForm
          merchantId={merchant.id}
          storeName={merchant.store_name}
          storeSlug={slug}
          whatsappNumber={merchant.whatsapp_number}
          bankName={merchant.bank_name}
          bankAccountNumber={merchant.bank_account_number}
          bankAccountHolder={merchant.bank_account_holder}
          bankBranchCode={merchant.bank_branch_code}
        />
      </main>

      <footer className="border-t bg-white mt-8">
        <div className="max-w-2xl mx-auto px-4 py-4 text-center text-xs text-gray-400">
          Powered by {SITE_NAME}
        </div>
      </footer>
    </div>
  );
}
