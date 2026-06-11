import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { PREVIEW_COOKIE } from "@/lib/preview";

export async function GET(req: NextRequest) {
  const { origin, searchParams } = req.nextUrl;
  const slug = searchParams.get("slug");
  if (!slug) return NextResponse.redirect(new URL("/dashboard", origin));

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(new URL("/login", origin));

  const { data: merchant } = await supabase
    .from("merchants")
    .select("user_id")
    .eq("store_slug", slug)
    .single();

  if (!merchant || merchant.user_id !== user.id) {
    return NextResponse.redirect(new URL("/dashboard", origin));
  }

  const res = NextResponse.redirect(new URL(`/s/${slug}`, origin));
  res.cookies.set(PREVIEW_COOKIE, "1", {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 3600,
    secure: process.env.NODE_ENV === "production",
  });
  return res;
}
