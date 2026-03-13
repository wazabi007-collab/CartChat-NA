import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { getAuthenticatedAdmin } from "@/lib/admin-auth";
import { hasPermission } from "@/lib/admin-permissions";

export async function GET() {
  const admin = await getAuthenticatedAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  if (!hasPermission(admin.role, "view_team")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const service = createServiceClient();
  const { data, error } = await service
    .from("admin_users")
    .select("*")
    .order("created_at", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ admins: data || [] });
}

export async function POST(request: NextRequest) {
  const admin = await getAuthenticatedAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  if (!hasPermission(admin.role, "manage_team")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { email, role } = await request.json();
  if (!email || !["super_admin", "support", "finance"].includes(role)) {
    return NextResponse.json({ error: "Invalid email or role" }, { status: 400 });
  }

  const service = createServiceClient();

  // Look up user by email in auth.users
  const { data: users } = await service.auth.admin.listUsers();
  const targetUser = users?.users?.find((u) => u.email?.toLowerCase() === email.toLowerCase());

  if (!targetUser) {
    return NextResponse.json({ error: "User not found. They must sign up first." }, { status: 404 });
  }

  // Check if already an admin
  const { data: existing } = await service
    .from("admin_users")
    .select("id")
    .eq("user_id", targetUser.id)
    .single();

  if (existing) {
    return NextResponse.json({ error: "User is already an admin" }, { status: 409 });
  }

  const { error } = await service.from("admin_users").insert({
    user_id: targetUser.id,
    email: targetUser.email,
    role,
    created_by: admin.adminId !== "env-fallback" ? admin.adminId : null,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await service.from("admin_actions").insert({
    admin_user_id: admin.adminId !== "env-fallback" ? admin.adminId : null,
    action: "invite_admin",
    target_type: "admin",
    target_id: targetUser.id,
    details: { email, role },
  });

  return NextResponse.json({ success: true });
}

export async function PATCH(request: NextRequest) {
  const admin = await getAuthenticatedAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  if (!hasPermission(admin.role, "manage_team")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { adminId, role } = await request.json();
  if (!adminId || !["super_admin", "support", "finance"].includes(role)) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  if (adminId === admin.adminId) {
    return NextResponse.json({ error: "Cannot change your own role" }, { status: 400 });
  }

  const service = createServiceClient();
  const { data: before } = await service.from("admin_users").select("role").eq("id", adminId).single();

  const { error } = await service.from("admin_users").update({ role }).eq("id", adminId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await service.from("admin_actions").insert({
    admin_user_id: admin.adminId !== "env-fallback" ? admin.adminId : null,
    action: "change_admin_role",
    target_type: "admin",
    target_id: adminId,
    details: { before: before?.role, after: role },
  });

  return NextResponse.json({ success: true });
}

export async function DELETE(request: NextRequest) {
  const admin = await getAuthenticatedAdmin();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  if (!hasPermission(admin.role, "manage_team")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { adminId } = await request.json();
  if (!adminId) return NextResponse.json({ error: "Missing adminId" }, { status: 400 });

  if (adminId === admin.adminId) {
    return NextResponse.json({ error: "Cannot remove yourself" }, { status: 400 });
  }

  const service = createServiceClient();
  const { data: target } = await service.from("admin_users").select("email, role").eq("id", adminId).single();

  const { error } = await service.from("admin_users").delete().eq("id", adminId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await service.from("admin_actions").insert({
    admin_user_id: admin.adminId !== "env-fallback" ? admin.adminId : null,
    action: "remove_admin",
    target_type: "admin",
    target_id: adminId,
    details: { email: target?.email, role: target?.role },
  });

  return NextResponse.json({ success: true });
}
