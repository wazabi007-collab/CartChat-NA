import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { ADMIN_EMAILS } from "@/lib/constants";
import type { AdminRole } from "@/lib/admin-permissions";

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
