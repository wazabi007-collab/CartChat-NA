import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";

export async function POST(request: Request) {
  const { email } = await request.json();
  if (!email) return NextResponse.json({ exists: false });

  const supabase = createServiceClient();
  const { data } = await supabase.auth.admin.listUsers();

  const exists = (data?.users ?? []).some(
    (u) => u.email?.toLowerCase() === email.toLowerCase()
  );

  return NextResponse.json({ exists });
}
