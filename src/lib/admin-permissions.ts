export type AdminRole = "super_admin" | "support" | "finance";

export interface AdminUser {
  id: string;
  user_id: string;
  email: string;
  role: AdminRole;
  created_at: string;
}

type Permission =
  | "view_overview"
  | "view_merchants"
  | "view_merchant_detail"
  | "manage_merchants"       // suspend, ban, approve
  | "view_billing"
  | "manage_billing"         // record payments
  | "view_analytics"
  | "view_reports"
  | "manage_reports"         // resolve reports
  | "view_team"
  | "manage_team"            // invite, remove, change role
  | "view_audit";

const ROLE_PERMISSIONS: Record<AdminRole, Permission[]> = {
  super_admin: [
    "view_overview", "view_merchants", "view_merchant_detail", "manage_merchants",
    "view_billing", "manage_billing", "view_analytics",
    "view_reports", "manage_reports",
    "view_team", "manage_team", "view_audit",
  ],
  support: [
    "view_overview", "view_merchants", "view_merchant_detail",
    "view_billing", "view_analytics",
    "view_reports", "manage_reports",
  ],
  finance: [
    "view_overview",
    "view_merchants",
    "view_billing", "manage_billing",
  ],
};

export function hasPermission(role: AdminRole, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

export function getVisibleNavItems(role: AdminRole) {
  const items = [
    { label: "Overview", href: "/admin", permission: "view_overview" as Permission },
    { label: "Merchants", href: "/admin/merchants", permission: "view_merchants" as Permission },
    { label: "Billing", href: "/admin/billing", permission: "view_billing" as Permission },
    { label: "Analytics", href: "/admin/analytics", permission: "view_analytics" as Permission },
    { label: "Reports", href: "/admin/reports", permission: "view_reports" as Permission },
    { label: "Admin Team", href: "/admin/team", permission: "view_team" as Permission },
    { label: "Audit Log", href: "/admin/audit", permission: "view_audit" as Permission },
  ];
  return items.filter((item) => hasPermission(role, item.permission));
}
