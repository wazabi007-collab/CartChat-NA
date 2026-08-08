import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  CreditCard,
  FileText,
  LayoutDashboard,
  Megaphone,
  Package,
  Settings,
  Share2,
  ShoppingCart,
  Star,
  Ticket,
  User,
  Users,
} from "lucide-react";

/**
 * The dashboard's navigation, defined once.
 *
 * The sidebar and the mobile bottom bar used to keep separate lists. The
 * sidebar is hidden below 768px, so anything added to it and forgotten in the
 * mobile menu became unreachable on a phone — which is how Share store,
 * Customers, Broadcast, Reviews and Statements all ended up with no mobile
 * entry point at once. Both surfaces now read this array, so a section cannot
 * exist in one and not the other.
 *
 * scripts/check-dashboard-nav.ts goes further and fails if a dashboard route
 * exists on disk with no entry here at all.
 */
export interface DashboardNavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Hidden unless the merchant's tier includes this feature. */
  requireFeature: "coupons" | "inventory" | null;
  /** Takes the merchant's Products/Services wording instead of `label`. */
  usesItemWording?: boolean;
  /**
   * Shown directly in the mobile bottom bar. Everything else lives under More.
   * Four is the practical limit before the bar stops being tappable at 375px.
   */
  primary?: boolean;
}

export const DASHBOARD_NAV: DashboardNavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, requireFeature: null, primary: true },
  { href: "/dashboard/products", label: "Products", icon: Package, requireFeature: null, usesItemWording: true, primary: true },
  { href: "/dashboard/orders", label: "Orders", icon: ShoppingCart, requireFeature: null, primary: true },
  { href: "/dashboard/analytics", label: "Analytics", icon: BarChart3, requireFeature: null, primary: true },

  { href: "/dashboard/share", label: "Share store", icon: Share2, requireFeature: null },
  { href: "/dashboard/customers", label: "Customers", icon: Users, requireFeature: null },
  { href: "/dashboard/broadcast", label: "Broadcast", icon: Megaphone, requireFeature: null },
  { href: "/dashboard/reviews", label: "Reviews", icon: Star, requireFeature: null },
  { href: "/dashboard/coupons", label: "Coupons", icon: Ticket, requireFeature: "coupons" },
  { href: "/dashboard/statements", label: "Statements", icon: FileText, requireFeature: null },
  { href: "/dashboard/account", label: "Account", icon: User, requireFeature: null },
  { href: "/dashboard/subscription", label: "Subscription", icon: CreditCard, requireFeature: null },
  { href: "/dashboard/settings", label: "Settings", icon: Settings, requireFeature: null },
];

/** Order the sidebar shows: the merchant's own reading order, not by surface. */
export const SIDEBAR_ORDER = [
  "/dashboard",
  "/dashboard/products",
  "/dashboard/share",
  "/dashboard/orders",
  "/dashboard/customers",
  "/dashboard/broadcast",
  "/dashboard/reviews",
  "/dashboard/coupons",
  "/dashboard/analytics",
  "/dashboard/statements",
  "/dashboard/account",
  "/dashboard/subscription",
  "/dashboard/settings",
];

export function sidebarItems(): DashboardNavItem[] {
  const byHref = new Map(DASHBOARD_NAV.map((item) => [item.href, item]));
  return SIDEBAR_ORDER.map((href) => byHref.get(href)).filter(
    (item): item is DashboardNavItem => Boolean(item)
  );
}

/** The four shown in the mobile bar. */
export function primaryItems(): DashboardNavItem[] {
  return DASHBOARD_NAV.filter((item) => item.primary);
}

/** Everything the mobile bar cannot show, in sidebar order. */
export function overflowItems(): DashboardNavItem[] {
  return sidebarItems().filter((item) => !item.primary);
}
