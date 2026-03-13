import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { ADMIN_EMAILS } from "@/lib/constants";
import { AdminNav } from "@/components/admin/nav";
import type { AdminRole } from "@/lib/admin-permissions";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");
  if (!user.email) redirect("/dashboard");

  // Check admin_users table first
  const service = createServiceClient();
  const { data: adminUser } = await service
    .from("admin_users")
    .select("id, role")
    .eq("user_id", user.id)
    .single();

  // Fallback to ADMIN_EMAILS env var (transition period)
  let role: AdminRole = "super_admin";
  if (adminUser) {
    role = adminUser.role as AdminRole;
  } else if (!ADMIN_EMAILS.includes(user.email.toLowerCase())) {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <AdminNav userEmail={user.email} adminRole={role} />
      <main className="md:ml-56 max-w-7xl mx-auto px-4 py-6">{children}</main>
    </div>
  );
}
