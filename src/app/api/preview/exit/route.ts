import { NextRequest, NextResponse } from "next/server";
import { PREVIEW_COOKIE } from "@/lib/preview";

export async function GET(req: NextRequest) {
  const res = NextResponse.redirect(new URL("/dashboard", req.nextUrl.origin));
  res.cookies.set(PREVIEW_COOKIE, "", { path: "/", maxAge: 0 });
  return res;
}
