import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { ADMIN_EMAILS } from "@/lib/constants";
import { hasPermission, type AdminRole, type Permission } from "@/lib/admin-permissions";

export interface AuthenticatedAdmin {
  userId: string;
  adminId: string;
  email: string;
  role: AdminRole;
}

/**
 * Verify the current request is from an authenticated admin.
 * Returns admin info or null if not authorized.
 */
export async function getAuthenticatedAdmin(): Promise<AuthenticatedAdmin | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user?.email) return null;

  const service = createServiceClient();
  const { data: adminUser } = await service
    .from("admin_users")
    .select("id, role")
    .eq("user_id", user.id)
    .single();

  if (adminUser) {
    return {
      userId: user.id,
      adminId: adminUser.id,
      email: user.email,
      role: adminUser.role as AdminRole,
    };
  }

  // Fallback to ADMIN_EMAILS env var (transition period)
  if (ADMIN_EMAILS.includes(user.email.toLowerCase())) {
    return {
      userId: user.id,
      adminId: "env-fallback",
      email: user.email,
      role: "super_admin",
    };
  }

  return null;
}

/**
 * Server-side guard for admin pages/routes. Redirects unauthenticated users to
 * the admin login and anyone lacking the required permission back to the admin
 * overview. Use at the top of every admin Server Component page so access is
 * enforced server-side, not just by hiding nav links.
 */
export async function requireAdminPermission(permission: Permission): Promise<AuthenticatedAdmin> {
  const admin = await getAuthenticatedAdmin();
  if (!admin) redirect("/admin/login?error=not_authorized");
  if (!hasPermission(admin.role, permission)) redirect("/admin?error=forbidden");
  return admin;
}
