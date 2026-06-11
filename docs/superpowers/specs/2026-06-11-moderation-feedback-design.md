# Merchant Moderation Feedback + Appeal — Design

**Date:** 2026-06-11
**Scope:** chatcart-na (Next.js + Supabase).

## Problem

When OshiCart's safety system blocks or holds a product for review, the
merchant sees only a vague "Hidden while OshiCart reviews this listing" badge —
no reason and no recourse. The reason data already exists on the product row
(`moderation_reasons[]`, `moderation_categories[]`); it just isn't shown. And
there is no way for a merchant to dispute a decision.

## What already exists (verified)

- `products.moderation_status` enum `approved | review_required | blocked`,
  plus `moderation_reasons text[]`, `moderation_categories text[]`,
  `moderation_source` — all on the product row, readable by the owning merchant.
- Editing a product's name/description **always re-runs the safety scan**
  (`apply_product_safety_scan`, migration 039) — even admin-blocked items
  re-scan on content change. So "fix and resubmit" already works; merchants
  just aren't told.
- `safety_reviews` is the admin queue (migration 028): `merchant_id`,
  `product_id`, `review_type` (`store_profile|product_listing|customer_report`),
  `severity` (`review|block`), `status` (`open|reviewed|dismissed`),
  `categories[]`, `reasons[]`, `content_excerpt`, `admin_notes`. The admin queue
  card (`safety-review-queue.tsx`) renders `review_type.replace("_"," ")`,
  reasons, and admin_notes.
- `merchants.store_status` (`pending|active|suspended|banned`) +
  `merchants.safety_notes` (free-form) for store suspension. No store categories.
- `ProductGrid` (`product-actions.tsx`) is a client component already carrying
  `moderation_reasons` on its Product type; the products list page selects
  `*, categories(name)`.

## Decisions (made with user)

- **Scope:** full reason + appeal for products; a simpler banner for suspended
  stores (no per-category flow).
- **Appeal:** in-app, reusing the existing `safety_reviews` queue (admins work
  it already). Merchants never touch the table directly — writes go through a
  server route.
- **Store appeal:** a "contact support" WhatsApp link, not a structured flow.

## Design

### 1. Data — migration `042_merchant_appeals.sql`

```sql
ALTER TABLE public.safety_reviews
  ADD COLUMN IF NOT EXISTS merchant_message text DEFAULT NULL;

ALTER TABLE public.safety_reviews
  DROP CONSTRAINT IF EXISTS safety_reviews_review_type_check;
ALTER TABLE public.safety_reviews
  ADD CONSTRAINT safety_reviews_review_type_check
  CHECK (review_type IN ('store_profile', 'product_listing', 'customer_report', 'merchant_appeal'));
```

No new table. No `database.ts` change required for `safety_reviews` only if it
is typed there — if `safety_reviews` IS in `database.ts`, add `merchant_message`
and the new enum value to its Row/Insert/Update; if not, inline types are used
(verify during implementation).

### 2. Merchant product feedback — `ProductModerationNotice` component

New client component `src/components/dashboard/product-moderation-notice.tsx`,
rendered inside `ProductGrid` in place of the current amber one-liner. Props:
`{ productId, moderationStatus, reasons, hasOpenAppeal }`.

- `review_required` → amber "In review", `blocked` → red "Blocked".
- Renders `reasons[]` as a short bulleted "Why this happened" list. If `reasons`
  is empty, a generic "This listing may violate our content policy" line.
- Guidance: "Edit the listing to remove flagged content and save — it's
  re-checked automatically. If you believe this is a mistake, request a review."
- Appeal control (see §3).

### 3. Merchant appeal flow

- In the notice: a **"Request review"** button. When `hasOpenAppeal` is true,
  it is replaced by a static "Appeal submitted — under review" line.
- Clicking reveals a small textarea (optional short note, max ~500 chars) +
  "Submit appeal". On submit → `POST /api/products/[id]/appeal` with
  `{ message }`, then `router.refresh()`.
- **Route `src/app/api/products/[id]/appeal/route.ts`** (server, service
  client, ownership-checked like `/api/subscription/cancel`):
  1. Authenticate user → resolve their merchant.
  2. Load the product; 404 if not owned by this merchant; 400 if its
     `moderation_status === 'approved'` (nothing to appeal).
  3. Dedupe: if an open `merchant_appeal` for this product already exists,
     return 409 (one open appeal per product).
  4. Insert a `safety_reviews` row: `review_type='merchant_appeal'`,
     `severity='review'`, `status='open'`, `merchant_id`, `product_id`,
     `categories`/`reasons` copied from the product (admin context),
     `content_excerpt` = first 240 chars of the product name+description,
     `merchant_message` = the note.
- The products list page (`page.tsx`) fetches the set of product_ids with an
  open `merchant_appeal` (service client) and passes `hasOpenAppeal` per card.

### 4. Suspended-store banner — dashboard

In `src/app/(dashboard)/dashboard/page.tsx`, when the merchant's
`store_status === 'suspended'`, render a red banner above the overview:
"Your store is suspended and not visible to customers." + `safety_notes` (if
present) + a "Contact support" link — pre-filled WhatsApp to OshiCart support
(`+264816274823`) with the store name. No per-category flow.

### 5. Admin queue surfacing

- `src/app/api/admin/safety/route.ts` (or wherever the queue list is fetched):
  add `merchant_message` to the `safety_reviews` select.
- `src/app/(admin)/admin/safety/safety-review-queue.tsx`: add
  `merchant_message` to the `SafetyReview` type and render it in
  `SafetyReviewCard` (e.g. a "Merchant says: …" block), alongside the existing
  reasons/admin_notes. `merchant_appeal` rows already display as "merchant
  appeal" via the existing `review_type.replace("_"," ")`. The existing
  approve/block/dismiss actions resolve appeals — no new admin action.

## Error handling

- Appeal route returns clear 400/404/409 with messages; the notice surfaces the
  error inline (e.g. "You already have an appeal under review").
- Empty `reasons` and `safety_notes` are handled with generic fallback copy.

## Non-goals

- No automated re-scan changes (edit-to-rescan already works).
- No structured store-level appeal, no new appeals table, no new admin action.
- No category-explanation glossary (reasons are already human-readable strings).

## Verification

- `npx tsc --noEmit` and `npm run build` clean.
- Migration applied; `merchant_message` exists; CHECK accepts `merchant_appeal`.
- A merchant with a blocked product (stage via SQL on the QA merchant): product
  card shows "Blocked", the reasons list, guidance; "Request review" → submit →
  becomes "Appeal submitted — under review"; a `merchant_appeal` row appears in
  `safety_reviews` (status open, merchant_message set). Second submit → 409.
- Admin `/admin/safety` shows the appeal row labelled "merchant appeal" with the
  message; approving it flips the product to approved.
- A suspended QA store shows the dashboard banner with safety_notes + support
  link; reset afterward.
- Editing the product's name to remove the flagged term re-scans and clears the
  block (existing behavior, confirmed).
