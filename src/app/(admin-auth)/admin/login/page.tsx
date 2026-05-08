import { redirect } from "next/navigation";
import { getAuthenticatedAdmin } from "@/lib/admin-auth";
import { AdminLoginForm } from "./admin-login-form";

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const admin = await getAuthenticatedAdmin();
  if (admin) redirect("/admin");

  const params = await searchParams;

  return <AdminLoginForm initialError={params.error} />;
}
