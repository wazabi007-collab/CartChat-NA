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

  // This asked the admin API for a single arbitrary user and then checked
  // whether THAT user's address matched, so it answered "does not exist" for
  // nearly every real address. Now an indexed lookup on the address itself.
  const { data } = await supabase.rpc("auth_user_lookup", { p_email: email });
  const exists = Array.isArray(data) ? data.length > 0 : Boolean(data);

  // Consistent response time to prevent timing attacks
  const elapsed = Date.now() - start;
  if (elapsed < 200) {
    await new Promise((resolve) => setTimeout(resolve, 200 - elapsed));
  }

  return NextResponse.json({ exists });
}
