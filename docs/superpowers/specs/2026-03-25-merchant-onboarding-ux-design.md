# Merchant Onboarding UX — Design Spec

## Goal

Improve the post-setup merchant experience so new merchants know exactly what to do after creating their store. Add a Getting Started checklist, improve the empty dashboard state, and fix small storefront UX issues.

## Architecture

Client-side Getting Started component on the dashboard page, backed by two new columns on the `merchants` table (`getting_started_dismissed`, `store_link_shared`). Product and order counts are already queryable. No new API routes needed — all state is derived from existing data plus the two new flags.

## 1. Getting Started Checklist

### Location
Top of `/dashboard` page, above stats cards. Only shown when:
- Not all 4 items are complete, AND
- `getting_started_dismissed` is `false`

### The 4 Items

| # | Item | Completion Check | Action |
|---|------|-----------------|--------|
| 1 | Create your store | Always complete (merchant exists) | Green checkmark, no button |
| 2 | Add your first product | `products` count > 0 for merchant | Button: "Add Product" → `/dashboard/products/new` |
| 3 | Share your store link | `store_link_shared` flag is `true` | Shows store URL + Copy button + WhatsApp share. Marked complete on click |
| 4 | Get your first order | `orders` count > 0 for merchant | No action — "Waiting for your first order..." auto-completes |

### Visual Treatment
- Green-tinted card (`bg-green-50 border-green-200`)
- Progress bar at top: "2 of 4 complete"
- Each item: circle checkbox (green filled when done, empty when not) + label + action button
- Completed items: green checkmark, muted text
- Incomplete items: empty circle, bold text, action button on right

### Completion Behavior
- When all 4 items complete: show "You're all set! Your store is ready for business." banner with CheckCircle icon
- Auto-hides after 5 seconds
- Sets an internal state so it doesn't flash on next visit

### Dismiss Behavior
- Small "Dismiss" link at top-right of checklist card
- Sets `getting_started_dismissed = true` on merchants table
- Checklist disappears immediately

### Re-access
- If checklist was dismissed but not all items complete, show a subtle "Resume Getting Started" link in the dashboard quick actions area
- Clicking it sets `getting_started_dismissed = false`

## 2. Dashboard States

### New Merchant (0 products)
```
[Getting Started Checklist — 1/4 complete]
[Welcome card: "Your store is live at oshicart.com/s/{slug}" + Preview button]
[Empty state: "Add your first product to start selling"]
```

Stats grid is hidden (all zeros are discouraging). Quick actions simplified.

### Active Merchant (1+ products, checklist incomplete)
```
[Getting Started Checklist — 2/4 or 3/4 complete]
[Share Store card]
[Stats Grid: Products | Pending Orders | Completed | Revenue]
[Low stock warnings]
[Quick actions]
```

### Established Merchant (checklist complete or dismissed)
```
[Share Store card (compact)]
[Stats Grid: Products | Pending Orders | Completed | Revenue]
[Low stock warnings]
[Quick actions]
```

Current dashboard layout unchanged for established merchants.

## 3. Post-Setup Redirect

After the setup wizard completes:
- Redirect to `/dashboard?welcome=true` (instead of plain `/dashboard`)
- Dashboard detects `?welcome=true` and:
  - Shows a brief celebration: "Your store is live!" heading with party popper
  - Getting Started checklist visible with step 1 pre-checked
  - Step 2 "Add your first product" is highlighted
- The `welcome` param is consumed on first render (removed from URL via `router.replace`)

## 4. Share Store Card

A compact card always visible on the dashboard for all merchants (below stats for active merchants, prominent for new merchants).

### Content
- Store URL: `oshicart.com/s/{slug}`
- Copy Link button (copies to clipboard, shows "Copied!" feedback)
- Share on WhatsApp button (opens `wa.me` share with pre-filled message)
- When either button is clicked, sets `store_link_shared = true` on merchants table

### Pre-filled WhatsApp message
"Check out my store on OshiCart! 🛒 {store_url}"

## 5. Storefront Quick Fixes

### 5a. "Only 0 left!" → "Out of Stock"
**File:** `src/components/storefront/product-card.tsx`
**Change:** When `stockQuantity === 0`, the badge already shows "Out of Stock" via `isOutOfStock`. The "Only X left!" badge at line 72 should not render when `stockQuantity === 0`:
```
Current: {isLowStock && <span>Only {stockQuantity} left!</span>}
Fix: isLowStock already excludes isOutOfStock, but some products have stock_quantity=0 with allow_backorder=true.
For these, don't show "Only 0 left!" — show nothing (backorder means it's available).
```

### 5b. "Other" section heading → "More Products"
**File:** `src/app/s/[slug]/page.tsx`
**Change:** Line 165: `fallbackName = "Other"` → `fallbackName = "More Products"`

### 5c. N$0.00 → "Price on request"
**File:** `src/components/storefront/product-card.tsx` and all layout components
**Change:** When `price === 0` and `itemType !== "service"`, show "Price on request" instead of "N$0.00". Services already handle zero price with "Request a Quote".

## Database Changes

Migration `027_getting_started.sql`:
```sql
ALTER TABLE merchants
  ADD COLUMN IF NOT EXISTS getting_started_dismissed BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS store_link_shared BOOLEAN DEFAULT FALSE;
```

## Files to Create/Modify

| Action | File | What |
|--------|------|------|
| Create | `supabase/migrations/027_getting_started.sql` | Add two columns |
| Create | `src/components/dashboard/getting-started.tsx` | Checklist component |
| Modify | `src/app/(dashboard)/dashboard/page.tsx` | Integrate checklist, dashboard states, welcome param |
| Create | `src/components/dashboard/share-store-card.tsx` | Share store card component |
| Modify | `src/app/(dashboard)/dashboard/setup/page.tsx` | Redirect to `?welcome=true` |
| Modify | `src/components/storefront/product-card.tsx` | Fix "0 left" badge + N$0.00 display |
| Modify | `src/app/s/[slug]/page.tsx` | Fix "Other" → "More Products" |
| Modify | All 5 layout components | Fix N$0.00 display |

## Success Criteria

1. New merchant completes setup → sees celebration + getting started checklist
2. Merchant adds first product → checklist item auto-checks
3. Merchant shares store link → checklist item marks complete
4. First order arrives → checklist auto-completes, hides
5. Merchant can dismiss checklist anytime
6. Dismissed checklist can be re-accessed
7. Storefront no longer shows "Only 0 left!", "Other", or "N$0.00"
