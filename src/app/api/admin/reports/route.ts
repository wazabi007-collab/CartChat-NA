import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { getAuthenticatedAdmin } from "@/lib/admin-auth";
import { hasPermission } from "@/lib/admin-permissions";

export async function PATCH(request: NextRequest) {
  // Use the admin_users role model (not ADMIN_EMAILS-only) so report
  // moderation is gated by the manage_reports permission like every other
  // admin mutation.
  const admin = await getAuthenticatedAdmin();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }
  if (!hasPermission(admin.role, "manage_reports")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { reportId, status, adminNotes } = await request.json();

  if (!reportId || !["reviewed", "dismissed"].includes(status)) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const service = createServiceClient();
  const { error } = await service
    .from("reports")
    .update({
      status,
      admin_notes: adminNotes || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", reportId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
