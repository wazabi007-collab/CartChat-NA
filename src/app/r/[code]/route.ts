import { NextResponse } from "next/server";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;
  const { origin } = new URL(request.url);
  const safe = encodeURIComponent(code.toLowerCase());
  return NextResponse.redirect(`${origin}/signup?ref=${safe}`);
}
