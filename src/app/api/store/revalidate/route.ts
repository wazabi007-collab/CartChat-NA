import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { createClient } from "@/lib/supabase/server";

/**
 * Drop the cached storefront reads for the caller's own store.
 *
 * The storefront caches payment configuration for five minutes so every
 * visitor is not charged a database round-trip for something that only changes
 * when a merchant edits a form. Without this, a merchant who adds a payment
 * method would check their shop, not see it, and reasonably conclude the save
 * had failed. Settings calls this after a successful save.
 *
 * Scoped by the session: a merchant can only ever bust their own tag, so this
 * cannot be used to hammer the cache for somebody else's store.
 */
export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const { data: merchant } = await supabase
    .from("merchants")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!merchant) return NextResponse.json({ ok: false }, { status: 404 });

  // Next 16 takes a cache profile as the second argument. "max" expires the
  // tag everywhere rather than only in this render's own cache.
  revalidateTag(`store-${merchant.id}`, "max");
  return NextResponse.json({ ok: true });
}
