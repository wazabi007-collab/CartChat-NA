import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const productId = searchParams.get("id");
    const bulkIds = searchParams.get("ids"); // comma-separated for bulk

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: merchant } = await supabase
      .from("merchants")
      .select("id")
      .eq("user_id", user.id)
      .single();

    if (!merchant) {
      return NextResponse.json({ error: "Merchant not found" }, { status: 404 });
    }

    const now = new Date().toISOString();

    if (bulkIds) {
      // Bulk soft delete
      const ids = bulkIds.split(",").map((id) => id.trim()).filter(Boolean);
      if (ids.length === 0) {
        return NextResponse.json({ error: "No product IDs provided" }, { status: 400 });
      }

      const { error } = await supabase
        .from("products")
        .update({ deleted_at: now, is_available: false })
        .in("id", ids)
        .eq("merchant_id", merchant.id)
        .is("deleted_at", null);

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({ success: true, deleted: ids.length });
    }

    if (!productId) {
      return NextResponse.json({ error: "Product ID is required" }, { status: 400 });
    }

    // Single soft delete
    const { error, count } = await supabase
      .from("products")
      .update({ deleted_at: now, is_available: false })
      .eq("id", productId)
      .eq("merchant_id", merchant.id)
      .is("deleted_at", null);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (count === 0) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST handler for form-based delete (from the products list page)
export async function POST(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const productId = searchParams.get("id");

  if (!productId) {
    return NextResponse.json({ error: "Product ID is required" }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const { data: merchant } = await supabase
    .from("merchants")
    .select("id")
    .eq("user_id", user.id)
    .single();

  if (!merchant) {
    return NextResponse.redirect(new URL("/dashboard/setup", request.url));
  }

  // Soft delete
  await supabase
    .from("products")
    .update({ deleted_at: new Date().toISOString(), is_available: false })
    .eq("id", productId)
    .eq("merchant_id", merchant.id);

  return NextResponse.redirect(new URL("/dashboard/products", request.url));
}
