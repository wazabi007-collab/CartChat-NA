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

  // Validate file type — whitelist image + PDF only
  const allowedExts = ["jpg", "jpeg", "png", "gif", "webp", "pdf"];
  const ext = file.name.split(".").pop()?.toLowerCase();
  if (!ext || !allowedExts.includes(ext)) {
    return NextResponse.json({ error: "Invalid file type. Allowed: JPG, PNG, GIF, WebP, PDF" }, { status: 400 });
  }

  const mimeMap: Record<string, string> = {
    jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png",
    gif: "image/gif", webp: "image/webp", pdf: "application/pdf",
  };

  const service = createServiceClient();

  // Verify the order belongs to this WhatsApp number
  const normalized = whatsapp.replace(/\D/g, "");
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
  const fileName = `${order.merchant_id}/${orderId}-pop.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const { data: uploadData, error: uploadError } = await supabase.storage
    .from("order-proofs")
    .upload(fileName, buffer, {
      contentType: mimeMap[ext],
      cacheControl: "3600",
      upsert: true,
    });

  if (uploadError) {
    return NextResponse.json({ error: "Failed to upload file" }, { status: 500 });
  }

  const { data: urlData } = await supabase.storage
    .from("order-proofs")
    .createSignedUrl(uploadData.path, 604800); // 7-day expiry

  const signedUrl = urlData?.signedUrl || "";

  // Update the order with the proof URL (store the path for re-signing later)
  await service
    .from("orders")
    .update({ proof_of_payment_url: uploadData.path })
    .eq("id", orderId);

  return NextResponse.json({ success: true, url: signedUrl });
}
