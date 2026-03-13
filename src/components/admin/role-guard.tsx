import { type AdminRole, hasPermission } from "@/lib/admin-permissions";

interface RoleGuardProps {
  role: AdminRole;
  permission: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function RoleGuard({ role, permission, children, fallback = null }: RoleGuardProps) {
  if (!hasPermission(role, permission as Parameters<typeof hasPermission>[1])) {
    return <>{fallback}</>;
  }
  return <>{children}</>;
}
