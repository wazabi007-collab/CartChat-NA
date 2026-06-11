import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

/**
 * POST /api/products/[id]/appeal  { message?: string }
 * Creates a merchant_appeal row in safety_reviews for the authenticated
 * merchant's blocked/in-review product. One open appeal per product.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: productId } = await params;

  const supabaseAuth = await createClient();
  const {
    data: { user },
  } = await supabaseAuth.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const rawMessage = typeof body?.message === "string" ? body.message.trim() : "";
  const message = rawMessage ? rawMessage.slice(0, 500) : null;

  const service = createServiceClient();

  const { data: merchant } = await service
    .from("merchants")
    .select("id")
    .eq("user_id", user.id)
    .single();
  if (!merchant) {
    return NextResponse.json({ error: "No store found" }, { status: 404 });
  }

  const { data: product } = await service
    .from("products")
    .select("id, merchant_id, name, description, moderation_status, moderation_reasons, moderation_categories")
    .eq("id", productId)
    .single();
  if (!product || product.merchant_id !== merchant.id) {
    return NextResponse.json({ error: "Product not found" }, { status: 404 });
  }
  if (product.moderation_status === "approved") {
    return NextResponse.json(
      { error: "This listing is already approved" },
      { status: 400 }
    );
  }

  const { data: existing } = await service
    .from("safety_reviews")
    .select("id")
    .eq("product_id", productId)
    .eq("review_type", "merchant_appeal")
    .eq("status", "open")
    .limit(1)
    .maybeSingle();
  if (existing) {
    return NextResponse.json(
      { error: "You already have an appeal under review for this listing" },
      { status: 409 }
    );
  }

  const excerpt = `${product.name} ${product.description ?? ""}`.trim().slice(0, 240);

  const { error } = await service.from("safety_reviews").insert({
    merchant_id: merchant.id,
    product_id: productId,
    review_type: "merchant_appeal",
    severity: "review",
    status: "open",
    categories: product.moderation_categories ?? [],
    reasons: product.moderation_reasons ?? [],
    content_excerpt: excerpt,
    merchant_message: message,
  });
  if (error) {
    return NextResponse.json({ error: "Failed to submit appeal" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
