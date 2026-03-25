# Mobile-First Dashboard UX Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add mobile bottom navigation, floating add button, quick order actions, and service-aware language to the merchant dashboard.

**Architecture:** New `BottomNav` client component in the dashboard layout (mobile only, hidden on md+). Service-aware labelling via a new `useServiceLabel()` helper derived from merchant industry. FAB on products page. Quick status tap on order cards. All changes are additive — desktop experience unchanged.

**Tech Stack:** Next.js 16, Tailwind CSS, existing UI system, lucide-react icons

---

## File Structure

| Action | File | Responsibility |
|--------|------|---------------|
| Create | `src/lib/service-labels.ts` | Helper: maps industry → "Product" or "Service" labels |
| Create | `src/components/dashboard/bottom-nav.tsx` | Mobile bottom navigation bar |
| Modify | `src/app/(dashboard)/layout.tsx` | Add BottomNav + pass industry to nav |
| Modify | `src/components/dashboard/nav.tsx` | Hide mobile hamburger when BottomNav is active, pass industry |
| Modify | `src/app/(dashboard)/dashboard/products/page.tsx` | FAB button + service-aware headings |
| Create | `src/components/dashboard/quick-status.tsx` | Tappable status pill for quick order status changes |
| Modify | `src/app/(dashboard)/dashboard/orders/page.tsx` | Integrate quick status + service labels |
| Modify | `src/components/dashboard/getting-started.tsx` | Service-aware "Add your first service" label |
| Modify | `src/app/(dashboard)/dashboard/page.tsx` | Service-aware labels in quick actions |

---

### Task 1: Service Labels Helper

**Files:**
- Create: `src/lib/service-labels.ts`

- [ ] **Step 1: Create the helper**

```typescript
import { getArchetype, type IndustryArchetype } from "./industry";

const SERVICE_ARCHETYPES: IndustryArchetype[] = ["beauty", "services"];

export interface ServiceLabels {
  item: string;          // "Product" or "Service"
  itemPlural: string;    // "Products" or "Services"
  addItem: string;       // "Add Product" or "Add Service"
  firstItem: string;     // "Add your first product" or "Add your first service"
  isService: boolean;
}

export function getServiceLabels(industry: string | null | undefined): ServiceLabels {
  const archetype = getArchetype(industry || "other");
  const isService = SERVICE_ARCHETYPES.includes(archetype);

  return {
    item: isService ? "Service" : "Product",
    itemPlural: isService ? "Services" : "Products",
    addItem: isService ? "Add Service" : "Add Product",
    firstItem: isService ? "Add your first service" : "Add your first product",
    isService,
  };
}
```

Note: `getArchetype` is exported from `src/lib/industry.ts` — verify it exists. If not, the function that maps industry string → archetype may be named differently. Read `src/lib/industry.ts` to find the correct function name.

- [ ] **Step 2: Commit**

```bash
git add src/lib/service-labels.ts
git commit -m "feat: service-aware label helper for dashboard"
```

---

### Task 2: Mobile Bottom Navigation Bar

**Files:**
- Create: `src/components/dashboard/bottom-nav.tsx`

- [ ] **Step 1: Create the BottomNav component**

A client component with a fixed bottom bar, visible only on mobile (hidden on `md:` breakpoint).

Props:
```typescript
interface BottomNavProps {
  pendingOrders: number;
  industry?: string | null;
}
```

5 nav items:
1. Home → `/dashboard` (icon: `LayoutDashboard`)
2. Products/Services → `/dashboard/products` (icon: `Package`) — label from `getServiceLabels(industry)`
3. Orders → `/dashboard/orders` (icon: `ShoppingCart`) — red badge if `pendingOrders > 0`
4. Analytics → `/dashboard/analytics` (icon: `BarChart3`)
5. More → opens a slide-up sheet with: Coupons, Account, Settings, Sign out

Uses `usePathname()` to highlight active item. Active = green-600 text + icon, inactive = gray-400.

"More" sheet: a simple `useState` toggle that shows a fixed overlay with remaining nav items. No external library needed — just a conditional div with backdrop.

Styling:
- `fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 md:hidden`
- Height: `h-16` with safe area padding `pb-[env(safe-area-inset-bottom)]`
- Each item: `flex flex-col items-center justify-center gap-0.5 text-[10px] font-medium`
- Pending orders badge: `absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[9px] rounded-full flex items-center justify-center`

- [ ] **Step 2: Commit**

```bash
git add src/components/dashboard/bottom-nav.tsx
git commit -m "feat: mobile bottom navigation bar"
```

---

### Task 3: Integrate BottomNav into Dashboard Layout

**Files:**
- Modify: `src/app/(dashboard)/layout.tsx`
- Modify: `src/components/dashboard/nav.tsx`

- [ ] **Step 1: Update the layout to include BottomNav**

In `src/app/(dashboard)/layout.tsx`:
1. Add `industry` to the merchant select query: change `.select("id, store_name, store_slug")` to `.select("id, store_name, store_slug, industry")`
2. Query pending orders count for the badge (new query):
```typescript
const { count: pendingCount } = await supabase
  .from("orders")
  .select("id", { count: "exact", head: true })
  .eq("merchant_id", merchant.id)
  .eq("status", "pending");
```
3. Import and render `BottomNav` after the `<main>` tag:
```tsx
import { BottomNav } from "@/components/dashboard/bottom-nav";

// In the return, after </main>:
<BottomNav pendingOrders={pendingCount ?? 0} industry={merchant.industry} />
```
4. Add bottom padding to main content so it's not hidden behind the bottom nav:
```tsx
<main className="max-w-6xl mx-auto px-4 py-6 pb-20 md:pb-6">{children}</main>
```

- [ ] **Step 2: Update DashboardNav to hide mobile hamburger**

In `src/components/dashboard/nav.tsx`:
1. Hide the mobile header on screens where BottomNav is active. Change the mobile header div class from `md:hidden` to `hidden` (completely hide it — BottomNav replaces it).
2. Keep the desktop sidebar unchanged (`hidden md:flex`).

Actually — keep the mobile header but simplify it: just show the logo (no hamburger), since BottomNav handles navigation. Remove the hamburger button and mobile menu overlay.

- [ ] **Step 3: Pass industry to DashboardNav**

Add `industry` to the `NavProps` interface and the merchant select in layout. Pass it through:
```tsx
<DashboardNav
  merchant={merchant}
  userPhone={user.phone || ""}
  subscriptionTier={subscriptionTier}
  industry={merchant.industry}
/>
```

Update the desktop sidebar to use service-aware labels:
- "Products" nav item label → `labels.itemPlural`

Import `getServiceLabels` in `nav.tsx` and derive labels from the `industry` prop.

- [ ] **Step 4: Typecheck**

```bash
npx tsc --noEmit
```

- [ ] **Step 5: Commit**

```bash
git add src/app/(dashboard)/layout.tsx src/components/dashboard/nav.tsx
git commit -m "feat: integrate bottom nav + service-aware labels in dashboard"
```

---

### Task 4: Floating Action Button on Products Page

**Files:**
- Modify: `src/app/(dashboard)/dashboard/products/page.tsx`

- [ ] **Step 1: Add FAB and service-aware headings**

1. Import `getServiceLabels` from `@/lib/service-labels`
2. Add `industry` to merchant select: `.select("*, categories(name)")` already uses `*` so industry is included via the merchant query — but the merchant query only selects `*` from merchants. Check if industry is available.
3. Derive labels: `const labels = getServiceLabels(merchant.industry);`
4. Replace hardcoded strings:
   - `"Products"` heading → `labels.itemPlural`
   - `"Add Product"` button → `labels.addItem`
   - `"product"` count text → `labels.item.toLowerCase()`
   - Empty state text → `labels.firstItem`
5. Add a mobile FAB at the bottom-right (above bottom nav):

```tsx
{/* Mobile FAB */}
<Link
  href="/dashboard/products/new"
  className="fixed bottom-20 right-4 z-40 md:hidden w-14 h-14 bg-green-600 text-white rounded-full shadow-lg flex items-center justify-center hover:bg-green-700 transition-colors"
  aria-label={labels.addItem}
>
  <Plus size={24} />
</Link>
```

Position: `bottom-20` to sit above the bottom nav bar (which is `h-16`).

- [ ] **Step 2: Commit**

```bash
git add src/app/(dashboard)/dashboard/products/page.tsx
git commit -m "feat: FAB + service-aware labels on products page"
```

---

### Task 5: Quick Status Tap on Orders

**Files:**
- Create: `src/components/dashboard/quick-status.tsx`
- Modify: `src/app/(dashboard)/dashboard/orders/page.tsx`

- [ ] **Step 1: Create QuickStatus component**

A client component that renders a tappable status pill. When tapped, it advances the order to the next status in the state machine: `pending → confirmed → ready → completed`.

Props:
```typescript
interface QuickStatusProps {
  orderId: string;
  currentStatus: string;
  merchantId: string;
  merchantIndustry: string;
  merchantStoreName: string;
  customerName: string;
  customerWhatsapp: string;
  orderNumber: number;
  trackingToken: string;
  deliveryMethod: string;
}
```

Behavior:
- Renders the current status as a tappable pill (using existing `statusColors` + `statusPill` from `@/lib/ui`)
- On tap: shows a confirmation popover/toast: "Confirm order #123?" with "Yes" button
- On confirm: calls the existing order status update logic (POST to `/api/orders/status` or direct Supabase update — check how `OrderActions` component does it)
- After update: calls `router.refresh()` to reload
- Status `completed` and `cancelled` are not tappable (end states)
- Shows a small arrow indicator `→ Confirmed` next to the pill to hint what the next status is

Read `src/app/(dashboard)/dashboard/orders/order-actions.tsx` first to understand the existing status update pattern and reuse the same API/logic.

- [ ] **Step 2: Integrate into orders page**

In `src/app/(dashboard)/dashboard/orders/page.tsx`:
1. Replace the static status `<span>` with `<QuickStatus>` component
2. Pass the required props from the order data
3. Keep the existing `OrderActions` component for full controls (expand/collapse on desktop)

- [ ] **Step 3: Commit**

```bash
git add src/components/dashboard/quick-status.tsx src/app/(dashboard)/dashboard/orders/page.tsx
git commit -m "feat: tappable quick status on order cards for mobile"
```

---

### Task 6: Service-Aware Labels in Dashboard + Getting Started

**Files:**
- Modify: `src/app/(dashboard)/dashboard/page.tsx`
- Modify: `src/components/dashboard/getting-started.tsx`

- [ ] **Step 1: Update dashboard page**

1. Import `getServiceLabels` from `@/lib/service-labels`
2. Get merchant industry (already available from `merchant.*` query)
3. Derive labels: `const labels = getServiceLabels(merchant.industry);`
4. Update quick action labels:
   - "Add your first product" → `labels.firstItem`
   - "Get started by adding products to your catalog" → `Get started by adding ${labels.itemPlural.toLowerCase()} to your catalog`
5. Pass `labels` or `industry` to `GettingStarted` component

- [ ] **Step 2: Update Getting Started component**

Add `industry` prop to `GettingStartedProps`. Import `getServiceLabels` and derive labels inside the component. Update:
- Item 2 label: "Add your first product" → `labels.firstItem`
- Item 2 action button: "Add Product" → `labels.addItem`

- [ ] **Step 3: Typecheck**

```bash
npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add src/app/(dashboard)/dashboard/page.tsx src/components/dashboard/getting-started.tsx
git commit -m "feat: service-aware labels in dashboard + getting started checklist"
```

---

### Task 7: Deploy and Test

- [ ] **Step 1: Final typecheck**

```bash
npx tsc --noEmit
```

- [ ] **Step 2: Push and deploy**

```bash
git push origin master
vercel --prod --yes
```

- [ ] **Step 3: Test on mobile viewport**

Test on a 390x844 viewport (iPhone 14):
1. Bottom nav visible with 5 items
2. Active page highlighted in green
3. Pending orders badge shows on Orders icon
4. "More" opens sheet with remaining nav items
5. Products page shows FAB (green + button)
6. Products heading says "Services" for beauty/services industry merchants
7. Order status pills are tappable → advance status
8. Getting Started says "Add your first service" for service merchants
9. Desktop sidebar unchanged — bottom nav hidden on desktop
