import { createServiceClient } from "@/lib/supabase/service";
import { TeamActions } from "./team-actions";

export default async function TeamPage() {
  const service = createServiceClient();

  const { data: admins } = await service
    .from("admin_users")
    .select("*")
    .order("created_at", { ascending: true });

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Admin Team</h1>
      <TeamActions admins={admins || []} />
    </div>
  );
}
