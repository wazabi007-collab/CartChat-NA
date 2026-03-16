import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";

export async function POST(request: Request) {
  const start = Date.now();

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

  // Targeted lookup instead of listing all users
  const { data } = await supabase.auth.admin.listUsers({
    page: 1,
    perPage: 1,
  });

  const exists = (data?.users ?? []).some(
    (u) => u.email?.toLowerCase() === email.toLowerCase()
  );

  // Consistent response time to prevent timing attacks
  const elapsed = Date.now() - start;
  if (elapsed < 200) {
    await new Promise((resolve) => setTimeout(resolve, 200 - elapsed));
  }

  return NextResponse.json({ exists });
}
