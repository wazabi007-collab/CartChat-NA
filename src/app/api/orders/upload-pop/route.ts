import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const orderId = formData.get("order_id") as string;
  const whatsapp = formData.get("whatsapp") as string;
  const file = formData.get("file") as File;

  if (!orderId || !whatsapp || !file) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  if (file.size > 5 * 1024 * 1024) {
    return NextResponse.json({ error: "File must be under 5MB" }, { status: 400 });
  }

  const service = createServiceClient();

  // Verify the order belongs to this WhatsApp number
  const normalized = whatsapp.replace(/\s+/g, "");
  const { data: order } = await service
    .from("orders")
    .select("id, merchant_id, proof_of_payment_url")
    .eq("id", orderId)
    .eq("customer_whatsapp", normalized)
    .single();

  if (!order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  // Upload the file to storage
  const supabase = await createClient();
  const ext = file.name.split(".").pop();
  const fileName = `${order.merchant_id}/${orderId}-pop.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const { data: uploadData, error: uploadError } = await supabase.storage
    .from("order-proofs")
    .upload(fileName, buffer, {
      contentType: file.type,
      cacheControl: "3600",
      upsert: true,
    });

  if (uploadError) {
    return NextResponse.json({ error: "Failed to upload file" }, { status: 500 });
  }

  const { data: urlData } = supabase.storage
    .from("order-proofs")
    .getPublicUrl(uploadData.path);

  // Update the order with the proof URL
  await service
    .from("orders")
    .update({ proof_of_payment_url: urlData.publicUrl })
    .eq("id", orderId);

  return NextResponse.json({ success: true, url: urlData.publicUrl });
}
