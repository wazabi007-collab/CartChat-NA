# Merchant Onboarding UX Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Getting Started checklist to the merchant dashboard, improve the empty-state experience for new merchants, and fix storefront UX issues.

**Architecture:** Two new boolean columns on `merchants` table (`getting_started_dismissed`, `store_link_shared`). A new client component `GettingStarted` renders the checklist. Dashboard page (server component) queries the counts and flags, passes them as props. Post-setup redirect adds `?welcome=true`. Three storefront quick fixes in product-card and layout components.

**Tech Stack:** Next.js 16 (App Router), Supabase, Tailwind CSS, existing UI system (`@/lib/ui`)

---

## File Structure

| Action | File | Responsibility |
|--------|------|---------------|
| Create | `supabase/migrations/027_getting_started.sql` | Add `getting_started_dismissed` + `store_link_shared` columns |
| Create | `src/components/dashboard/getting-started.tsx` | Getting Started checklist client component |
| Create | `src/components/dashboard/share-store-card.tsx` | Enhanced share store card with Copy + WhatsApp share |
| Modify | `src/app/(dashboard)/dashboard/page.tsx` | Integrate checklist, conditional dashboard states, welcome param |
| Modify | `src/app/(dashboard)/dashboard/setup/page.tsx` | Redirect to `?welcome=true` after setup |
| Modify | `src/components/storefront/product-card.tsx` | Fix "Only 0 left!" + N$0.00 display |
| Modify | `src/app/s/[slug]/page.tsx` | Fix "Other" → "More Products" |
| Modify | `src/components/storefront/layouts/types.ts` | Add `getDisplayPrice()` helper |
| Modify | All 5 layout components | Use `getDisplayPrice()` for N$0.00 |

---

### Task 1: Database Migration

**Files:**
- Create: `supabase/migrations/027_getting_started.sql`

- [ ] **Step 1: Create the migration file**

```sql
-- 027_getting_started.sql
-- Add columns for Getting Started checklist state

ALTER TABLE merchants
  ADD COLUMN IF NOT EXISTS getting_started_dismissed BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS store_link_shared BOOLEAN DEFAULT FALSE;
```

- [ ] **Step 2: Apply via Supabase MCP**

Use `mcp__claude_ai_Supabase__apply_migration` with project_id `pcseqiaqeiiaiqxqtfmw`, name `getting_started`, and the SQL above.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/027_getting_started.sql
git commit -m "feat: add getting_started columns to merchants table"
```

---

### Task 2: Storefront Quick Fixes

**Files:**
- Modify: `src/components/storefront/product-card.tsx`
- Modify: `src/app/s/[slug]/page.tsx`
- Modify: `src/components/storefront/layouts/types.ts`
- Modify: `src/components/storefront/layouts/compact-grid.tsx`
- Modify: `src/components/storefront/layouts/menu-list.tsx`
- Modify: `src/components/storefront/layouts/service-list.tsx`
- Modify: `src/components/storefront/layouts/horizontal-card.tsx`
- Modify: `src/components/storefront/layouts/visual-gallery.tsx`

- [ ] **Step 1: Fix "Only 0 left!" badge in product-card.tsx**

In `src/components/storefront/product-card.tsx`, the `isLowStock` check at line 39 already excludes `isOutOfStock`. But when `allow_backorder` is true and `stock_quantity` is 0, `isOutOfStock` is false and `isLowStock` fires showing "Only 0 left!".

Change the `isLowStock` condition (line 39):
```typescript
// Before:
const isLowStock = !isService && trackInventory && !isOutOfStock && (stockQuantity ?? 0) <= (lowStockThreshold ?? 5);

// After:
const isLowStock = !isService && trackInventory && !isOutOfStock && (stockQuantity ?? 0) > 0 && (stockQuantity ?? 0) <= (lowStockThreshold ?? 5);
```

The added `(stockQuantity ?? 0) > 0` ensures we never show "Only 0 left!".

- [ ] **Step 2: Fix N$0.00 display in product-card.tsx**

In `src/components/storefront/product-card.tsx` line 90, change the price display:
```typescript
// Before:
{isQuoteOnly ? "Request a Quote" : (isService && price > 0 ? `From ${formatPrice(price)}` : formatPrice(price))}

// After:
{isQuoteOnly ? "Request a Quote" : isService && price > 0 ? `From ${formatPrice(price)}` : price === 0 && !isService ? "Price on request" : formatPrice(price)}
```

- [ ] **Step 3: Fix "Other" → "More Products" in storefront page**

In `src/app/s/[slug]/page.tsx`, find the line:
```typescript
fallbackName = "Other";
```
Change to:
```typescript
fallbackName = "More Products";
```

- [ ] **Step 4: Add `getDisplayPrice()` helper to layout types**

In `src/components/storefront/layouts/types.ts`, add after the `getCtaText` function:

```typescript
/** Returns formatted price or "Price on request" for zero-price products */
export function getDisplayPrice(product: LayoutProduct, formatPrice: (n: number) => string): string {
  if (product.item_type === "service" && product.price_nad === 0) return "Request a Quote";
  if (product.item_type === "service" && product.price_nad > 0) return `From ${formatPrice(product.price_nad)}`;
  if (product.price_nad === 0) return "Price on request";
  return formatPrice(product.price_nad);
}
```

- [ ] **Step 5: Update all 5 layout components to use `getDisplayPrice()`**

In each layout file, import `getDisplayPrice` alongside `getCtaText` and replace the `formatPrice(product.price_nad)` call with `getDisplayPrice(product, formatPrice)`.

Files: `compact-grid.tsx`, `menu-list.tsx`, `service-list.tsx`, `horizontal-card.tsx`, `visual-gallery.tsx`

- [ ] **Step 6: Typecheck**

```bash
npx tsc --noEmit
```

- [ ] **Step 7: Commit**

```bash
git add src/components/storefront/ src/app/s/
git commit -m "fix: storefront UX — no more 'Only 0 left', N$0.00, or 'Other' heading"
```

---

### Task 3: Share Store Card Component

**Files:**
- Create: `src/components/dashboard/share-store-card.tsx`

- [ ] **Step 1: Create the share store card**

A client component that replaces the existing `CopyStoreLink` with an enhanced version including WhatsApp share and the `store_link_shared` flag update.

```typescript
"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Link2, MessageCircle, Check, ExternalLink } from "lucide-react";
import Link from "next/link";

interface ShareStoreCardProps {
  storeUrl: string;       // absolute URL: https://oshicart.com/s/slug
  storeName: string;
  merchantId: string;
  storeLinkShared: boolean;
  compact?: boolean;      // compact mode for established merchants
}

export function ShareStoreCard({
  storeUrl,
  storeName,
  merchantId,
  storeLinkShared,
  compact,
}: ShareStoreCardProps) {
  const [copied, setCopied] = useState(false);
  const supabase = createClient();

  async function markShared() {
    if (storeLinkShared) return;
    await supabase
      .from("merchants")
      .update({ store_link_shared: true })
      .eq("id", merchantId);
  }

  async function handleCopy() {
    await navigator.clipboard.writeText(storeUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    markShared();
  }

  function handleWhatsAppShare() {
    const msg = `Check out my store on OshiCart! 🛒 ${storeUrl}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, "_blank");
    markShared();
  }

  if (compact) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs text-gray-500">Your store</p>
          <p className="text-sm font-medium text-gray-900 truncate">{storeUrl.replace("https://", "")}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleCopy}
            className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
            title="Copy link"
          >
            {copied ? <Check size={16} className="text-green-600" /> : <Link2 size={16} className="text-gray-500" />}
          </button>
          <button
            onClick={handleWhatsAppShare}
            className="p-2 rounded-lg bg-green-600 hover:bg-green-700 text-white transition-colors"
            title="Share on WhatsApp"
          >
            <MessageCircle size={16} />
          </button>
          <Link
            href={storeUrl.replace("https://oshicart.com", "")}
            target="_blank"
            className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
            title="View store"
          >
            <ExternalLink size={16} className="text-gray-500" />
          </Link>
        </div>
      </div>
    );
  }

  // Prominent version for new merchants
  return (
    <div className="bg-green-50 rounded-xl border border-green-200 p-5 mb-6">
      <h3 className="font-semibold text-green-900 mb-1">Your store is live!</h3>
      <p className="text-sm text-green-700 mb-3 break-all">{storeUrl}</p>
      <div className="flex gap-2">
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 px-4 py-2 bg-white border border-green-300 rounded-lg text-sm font-medium text-green-800 hover:bg-green-100 transition-colors"
        >
          {copied ? <Check size={14} /> : <Link2 size={14} />}
          {copied ? "Copied!" : "Copy Link"}
        </button>
        <button
          onClick={handleWhatsAppShare}
          className="flex items-center gap-1.5 px-4 py-2 bg-green-600 rounded-lg text-sm font-medium text-white hover:bg-green-700 transition-colors"
        >
          <MessageCircle size={14} />
          Share on WhatsApp
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/dashboard/share-store-card.tsx
git commit -m "feat: share store card with copy link + WhatsApp share"
```

---

### Task 4: Getting Started Checklist Component

**Files:**
- Create: `src/components/dashboard/getting-started.tsx`

- [ ] **Step 1: Create the Getting Started checklist**

A client component that shows the 4-item checklist with progress bar, dismiss, and completion states.

Props it receives (from the server component dashboard page):
- `merchantId: string`
- `productCount: number`
- `orderCount: number`
- `storeLinkShared: boolean`
- `storeUrl: string`
- `storeName: string`
- `dismissed: boolean`
- `isWelcome: boolean` (from `?welcome=true`)

Behavior:
- Computes which items are complete from props
- Item 1 (Create store): always complete
- Item 2 (Add product): `productCount > 0`
- Item 3 (Share link): `storeLinkShared` — also embeds the ShareStoreCard inline for this step
- Item 4 (First order): `orderCount > 0`
- Progress bar: `completedCount / 4`
- Dismiss: calls `supabase.from("merchants").update({ getting_started_dismissed: true })`
- All complete: shows success banner, auto-hides after 5s
- Uses existing UI constants: `card` from `@/lib/ui`, green accent colors

The component should be approximately 150-200 lines. Use `lucide-react` icons: `Check`, `Circle`, `Package`, `Link2`, `ShoppingCart`, `PartyPopper`, `X`.

- [ ] **Step 2: Commit**

```bash
git add src/components/dashboard/getting-started.tsx
git commit -m "feat: Getting Started checklist component"
```

---

### Task 5: Integrate Into Dashboard Page

**Files:**
- Modify: `src/app/(dashboard)/dashboard/page.tsx`

- [ ] **Step 1: Update the dashboard page**

The dashboard page is a **server component**. Changes needed:

1. Accept `searchParams` prop for `?welcome=true` detection
2. Query `orderCount` (add to the existing `Promise.all`)
3. Read `merchant.getting_started_dismissed` and `merchant.store_link_shared` from the existing merchant query (already fetches `*`)
4. Compute `isNewMerchant = productCount === 0`
5. Compute `showChecklist = !allItemsComplete && !merchant.getting_started_dismissed`

Conditional rendering:
- If `showChecklist`: render `<GettingStarted>` at top, then `<ShareStoreCard>` (prominent), then stats (only if `productCount > 0`), then rest
- If `!showChecklist && !merchant.getting_started_dismissed`: all items complete, show compact `<ShareStoreCard>` + full dashboard
- If `merchant.getting_started_dismissed`: show compact `<ShareStoreCard>` + full dashboard + "Resume Getting Started" link in quick actions (only if not all complete)

Replace the existing `<CopyStoreLink>` with `<ShareStoreCard>`.

Import changes:
- Add: `import { GettingStarted } from "./getting-started"` (will need to re-export or adjust path)
- Add: `import { ShareStoreCard } from "@/components/dashboard/share-store-card"`
- Remove: `import { CopyStoreLink } from "./copy-store-link"`

The `searchParams` in Next.js 16 App Router server components:
```typescript
export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ welcome?: string }>;
}) {
  const params = await searchParams;
  const isWelcome = params.welcome === "true";
  // ... rest of the component
}
```

Add to the existing `Promise.all` for orders count (completed + pending already queried, need total orders count):
```typescript
// Add this to the Promise.all array:
supabase
  .from("orders")
  .select("id", { count: "exact", head: true })
  .eq("merchant_id", merchant.id),
```

- [ ] **Step 2: Typecheck**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add src/app/(dashboard)/dashboard/page.tsx
git commit -m "feat: integrate Getting Started checklist into dashboard"
```

---

### Task 6: Post-Setup Redirect

**Files:**
- Modify: `src/app/(dashboard)/dashboard/setup/page.tsx`

- [ ] **Step 1: Change redirect after setup**

In `src/app/(dashboard)/dashboard/setup/page.tsx`, find the redirect at the end of `handleSubmit` (around line 243-248):

```typescript
// Before:
if (tierParam) {
  router.push(`/pricing/checkout?tier=${tierParam}`);
} else {
  router.push("/dashboard");
}

// After:
if (tierParam) {
  router.push(`/pricing/checkout?tier=${tierParam}`);
} else {
  router.push("/dashboard?welcome=true");
}
```

Only change: `"/dashboard"` → `"/dashboard?welcome=true"`.

- [ ] **Step 2: Commit**

```bash
git add src/app/(dashboard)/dashboard/setup/page.tsx
git commit -m "feat: redirect to dashboard with welcome param after setup"
```

---

### Task 7: Deploy and Test

- [ ] **Step 1: Final typecheck**

```bash
npx tsc --noEmit
```

- [ ] **Step 2: Commit any remaining changes**

```bash
git add -A
git commit -m "feat: complete merchant onboarding UX improvements"
```

- [ ] **Step 3: Push and deploy**

```bash
git push origin master
vercel --prod --yes
```

- [ ] **Step 4: Test on live site**

1. Navigate to `/dashboard` as an existing merchant — should see compact share card, no checklist (if they have products + orders)
2. Create a new test account via `/signup` → complete setup → verify `?welcome=true` redirect
3. Verify Getting Started checklist appears with 1/4 complete
4. Add a product → verify checklist updates to 2/4
5. Click Copy Link or Share on WhatsApp → verify 3/4
6. Dismiss checklist → verify it hides
7. Check storefront: no "Only 0 left!", no "N$0.00", no "Other" heading
