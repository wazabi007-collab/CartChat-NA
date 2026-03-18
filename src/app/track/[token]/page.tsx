import { createServiceClient } from "@/lib/supabase/service";
import { TrackerClient } from "./tracker-client";
import Link from "next/link";

export default async function TrackPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const supabase = createServiceClient();

  const { data: order } = await supabase
    .from("orders")
    .select(`
      id, order_number, status, status_history, created_at,
      customer_name, customer_whatsapp, delivery_method,
      delivery_address, delivery_date, delivery_time, notes,
      subtotal_nad, delivery_fee_nad, discount_nad,
      payment_method, payment_reference, proof_of_payment_url,
      tracking_token,
      merchants!inner(store_name, store_slug, whatsapp_number),
      order_items(id, product_name, product_price, quantity, line_total)
    `)
    .eq("tracking_token", token)
    .single();

  if (!order) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-4">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Order not found</h1>
          <p className="text-gray-500 mb-6">This tracking link may be invalid or expired.</p>
          <Link
            href="/stores"
            className="inline-flex items-center px-4 py-2 bg-[#2B5EA7] text-white rounded-lg hover:bg-[#244e8a]"
          >
            Browse stores
          </Link>
        </div>
      </div>
    );
  }

  // Supabase returns !inner join as array, normalize to single object
  const normalized = {
    ...order,
    merchants: Array.isArray(order.merchants) ? order.merchants[0] : order.merchants,
  };

  return <TrackerClient initialOrder={normalized as any} token={token} />;
}
