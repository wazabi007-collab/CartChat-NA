import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const email = body?.email;

  if (!email || typeof email !== "string") {
    return NextResponse.json({ exists: false });
  }

  // Basic email format validation to prevent abuse
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
    return NextResponse.json({ exists: false });
  }

  const supabase = createServiceClient();
  const { data } = await supabase.auth.admin.listUsers();

  const exists = (data?.users ?? []).some(
    (u) => u.email?.toLowerCase() === email.toLowerCase()
  );

  return NextResponse.json({ exists });
}
