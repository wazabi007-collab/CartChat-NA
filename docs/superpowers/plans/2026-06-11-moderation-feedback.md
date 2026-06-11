# Merchant Moderation Feedback + Appeal Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show merchants WHY a product was blocked/held for review and let them appeal in-app, plus a suspended-store banner.

**Architecture:** Surface `products.moderation_reasons[]` (already on the row) in a new `ProductModerationNotice` client component. Appeals reuse the existing `safety_reviews` admin queue via a server route (new `merchant_message` column + `merchant_appeal` review_type). A dashboard banner covers suspended stores with a support link. The admin queue renders the merchant's message.

**Tech Stack:** Next.js 16 (App Router, server + client components, dynamic route params), Supabase (Postgres, service client), Tailwind, TypeScript. No unit-test runner — verification is `npx tsc --noEmit`, `npm run build`, SQL staging, and a Playwright pass.

**Spec:** `docs/superpowers/specs/2026-06-11-moderation-feedback-design.md`

**Repo root for all paths/commands:** `chatcart-na/`

---

## Background facts (read before starting)

- `products` already has `moderation_status` (`approved|review_required|blocked`),
  `moderation_reasons text[]`, `moderation_categories text[]`,
  `moderation_source`, all merchant-readable.
- `safety_reviews` columns: `merchant_id, product_id, review_type
  (store_profile|product_listing|customer_report), severity (review|block),
  status (open|reviewed|dismissed), categories[], reasons[], content_excerpt,
  admin_notes, created_at, updated_at, resolved_at`. This plan adds
  `merchant_message` and the `merchant_appeal` review_type.
- `safety_reviews` IS typed in `src/types/database.ts` (Row/Insert/Update) — the
  migration task updates it.
- `ProductGrid` (`src/app/(dashboard)/dashboard/products/product-actions.tsx`) is
  a `"use client"` component; its `Product` interface (lines ~10-25) carries
  `moderation_status` and `moderation_reasons`. The current amber banner is the
  block `{product.moderation_status !== "approved" && (<p ...>Hidden while
  OshiCart reviews this listing.</p>)}` near line 282.
- The products list page (`page.tsx`) maps `productList` into `<ProductGrid
  products={...} />` (around line 151) using the user-scoped `supabase` client.
- Dashboard (`src/app/(dashboard)/dashboard/page.tsx`) selects merchant with
  `*` (has `store_status`, `safety_notes`); top wrapper is `<div className="md:ml-64">` at line 150.
- Admin safety page query already does `.select("*, merchants(...),
  products(...)")` on `safety_reviews` — so `merchant_message` flows
  automatically once the column exists; only the inline `SafetyReview` type in
  `safety-review-queue.tsx` and the card render need updating.
- Support WhatsApp number: `+264816274823`.
- **Migration application** is an orchestrator step (the auto-classifier blocks
  DB migrations from subagents); the implementer only creates the `.sql` file.

---

### Task 1: Migration — appeal column + review_type, types

**Files:**
- Create: `supabase/migrations/042_merchant_appeals.sql`
- Modify: `src/types/database.ts` (safety_reviews Row/Insert/Update)

- [ ] **Step 1: Write the migration**

```sql
-- 042_merchant_appeals.sql
-- Merchant-facing moderation appeals reuse the safety_reviews admin queue.
ALTER TABLE public.safety_reviews
  ADD COLUMN IF NOT EXISTS merchant_message text DEFAULT NULL;

ALTER TABLE public.safety_reviews
  DROP CONSTRAINT IF EXISTS safety_reviews_review_type_check;
ALTER TABLE public.safety_reviews
  ADD CONSTRAINT safety_reviews_review_type_check
  CHECK (review_type IN ('store_profile', 'product_listing', 'customer_report', 'merchant_appeal'));
```

- [ ] **Step 2: Add `merchant_message` to the safety_reviews type**

In `src/types/database.ts`, find the `safety_reviews` table type. In its `Row`
add `merchant_message: string | null;` (next to `admin_notes`); in `Insert` and
`Update` add `merchant_message?: string | null;`. Keep field placement adjacent
to `admin_notes` in each block.

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/042_merchant_appeals.sql src/types/database.ts
git commit -m "Add safety_reviews.merchant_message and merchant_appeal type"
```

- [ ] **Step 5: Orchestrator applies the migration**

(Orchestrator, not subagent.) Apply via Supabase MCP `apply_migration` to
project `pcseqiaqeiiaiqxqtfmw`, then verify:

```sql
SELECT column_name FROM information_schema.columns
WHERE table_name='safety_reviews' AND column_name='merchant_message';
```

Expected: one row. Also confirm the CHECK accepts `merchant_appeal` (no error on
a test insert/rollback, or inspect the constraint definition).

---

### Task 2: Appeal API route

**Files:**
- Create: `src/app/api/products/[id]/appeal/route.ts`

- [ ] **Step 1: Write the route**

```ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

/**
 * POST /api/products/[id]/appeal  { message?: string }
 * Creates a merchant_appeal row in safety_reviews for the authenticated
 * merchant's blocked/in-review product. One open appeal per product.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: productId } = await params;

  const supabaseAuth = await createClient();
  const {
    data: { user },
  } = await supabaseAuth.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const rawMessage = typeof body?.message === "string" ? body.message.trim() : "";
  const message = rawMessage ? rawMessage.slice(0, 500) : null;

  const service = createServiceClient();

  const { data: merchant } = await service
    .from("merchants")
    .select("id")
    .eq("user_id", user.id)
    .single();
  if (!merchant) {
    return NextResponse.json({ error: "No store found" }, { status: 404 });
  }

  const { data: product } = await service
    .from("products")
    .select("id, merchant_id, name, description, moderation_status, moderation_reasons, moderation_categories")
    .eq("id", productId)
    .single();
  if (!product || product.merchant_id !== merchant.id) {
    return NextResponse.json({ error: "Product not found" }, { status: 404 });
  }
  if (product.moderation_status === "approved") {
    return NextResponse.json(
      { error: "This listing is already approved" },
      { status: 400 }
    );
  }

  const { data: existing } = await service
    .from("safety_reviews")
    .select("id")
    .eq("product_id", productId)
    .eq("review_type", "merchant_appeal")
    .eq("status", "open")
    .limit(1)
    .maybeSingle();
  if (existing) {
    return NextResponse.json(
      { error: "You already have an appeal under review for this listing" },
      { status: 409 }
    );
  }

  const excerpt = `${product.name} ${product.description ?? ""}`.trim().slice(0, 240);

  const { error } = await service.from("safety_reviews").insert({
    merchant_id: merchant.id,
    product_id: productId,
    review_type: "merchant_appeal",
    severity: "review",
    status: "open",
    categories: product.moderation_categories ?? [],
    reasons: product.moderation_reasons ?? [],
    content_excerpt: excerpt,
    merchant_message: message,
  });
  if (error) {
    return NextResponse.json({ error: "Failed to submit appeal" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
```

- [ ] **Step 2: Typecheck + lint**

Run: `npx tsc --noEmit`
Expected: no errors.
Run: `npx eslint "src/app/api/products/[id]/appeal/route.ts"`
Expected: clean.

- [ ] **Step 3: Commit**

```bash
git add "src/app/api/products/[id]/appeal/route.ts"
git commit -m "Add product moderation appeal API route"
```

---

### Task 3: `ProductModerationNotice` component

**Files:**
- Create: `src/components/dashboard/product-moderation-notice.tsx`

- [ ] **Step 1: Write the component**

```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Loader2, ShieldAlert } from "lucide-react";

export function ProductModerationNotice({
  productId,
  moderationStatus,
  reasons,
  hasOpenAppeal,
}: {
  productId: string;
  moderationStatus: "review_required" | "blocked";
  reasons: string[];
  hasOpenAppeal: boolean;
}) {
  const [showForm, setShowForm] = useState(false);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [appealed, setAppealed] = useState(false);
  const router = useRouter();

  const blocked = moderationStatus === "blocked";
  const tone = blocked
    ? "border-red-200 bg-red-50 text-red-800"
    : "border-amber-200 bg-amber-50 text-amber-800";

  async function submit() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/products/${productId}/appeal`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Could not submit your appeal");
      }
      setAppealed(true);
      setShowForm(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  const appealDone = hasOpenAppeal || appealed;

  return (
    <div className={`mt-2 rounded-xl border px-3 py-2.5 text-xs ${tone}`}>
      <p className="flex items-center gap-1.5 font-bold">
        <ShieldAlert size={13} />
        {blocked ? "Blocked — hidden from customers" : "In review — hidden while we check this listing"}
      </p>

      {reasons.length > 0 ? (
        <ul className="mt-1.5 list-disc space-y-0.5 pl-4 font-medium">
          {reasons.map((r) => (
            <li key={r}>{r}</li>
          ))}
        </ul>
      ) : (
        <p className="mt-1.5 font-medium">This listing may violate our content policy.</p>
      )}

      <p className="mt-1.5 leading-4 opacity-80">
        Edit the listing to remove flagged content and save — it&apos;s re-checked
        automatically. If you believe this is a mistake, request a review.
      </p>

      {appealDone ? (
        <p className="mt-2 font-bold">Appeal submitted — under review.</p>
      ) : showForm ? (
        <div className="mt-2 space-y-2">
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            maxLength={500}
            rows={3}
            placeholder="Tell us why you think this is a mistake (optional)"
            className="w-full rounded-lg border border-current/20 bg-white px-2 py-1.5 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-current"
          />
          <div className="flex items-center gap-2">
            <button
              onClick={submit}
              disabled={loading}
              className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-bold text-white hover:bg-slate-800 disabled:opacity-60"
            >
              {loading && <Loader2 size={13} className="animate-spin" />}
              Submit appeal
            </button>
            <button
              onClick={() => setShowForm(false)}
              className="text-xs font-medium text-slate-500 hover:text-slate-700"
            >
              Cancel
            </button>
          </div>
          {error && (
            <p className="flex items-center gap-1 font-medium text-red-600">
              <AlertTriangle size={12} /> {error}
            </p>
          )}
        </div>
      ) : (
        <button
          onClick={() => setShowForm(true)}
          className="mt-2 rounded-lg border border-current/30 bg-white px-3 py-1.5 text-xs font-bold hover:bg-current/5"
        >
          Request review
        </button>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Typecheck + lint**

Run: `npx tsc --noEmit`
Expected: no errors.
Run: `npx eslint src/components/dashboard/product-moderation-notice.tsx`
Expected: clean.

- [ ] **Step 3: Commit**

```bash
git add src/components/dashboard/product-moderation-notice.tsx
git commit -m "Add ProductModerationNotice with reasons and appeal form"
```

---

### Task 4: Wire notice into ProductGrid + pass open-appeal state

**Files:**
- Modify: `src/app/(dashboard)/dashboard/products/product-actions.tsx`
- Modify: `src/app/(dashboard)/dashboard/products/page.tsx`

- [ ] **Step 1: Extend the Product type + import the notice**

In `product-actions.tsx`, add the import near the top (after the other imports):
```tsx
import { ProductModerationNotice } from "@/components/dashboard/product-moderation-notice";
```
In the `Product` interface (around lines 10-25), after `moderation_reasons: string[];` add:
```tsx
  hasOpenAppeal: boolean;
```

- [ ] **Step 2: Replace the amber banner with the notice**

Find this block (around line 282):
```tsx
              {product.moderation_status !== "approved" && (
                <p className="mt-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800">
                  Hidden while OshiCart reviews this listing.
                </p>
              )}
```
Replace with:
```tsx
              {product.moderation_status !== "approved" && (
                <ProductModerationNotice
                  productId={product.id}
                  moderationStatus={product.moderation_status}
                  reasons={product.moderation_reasons}
                  hasOpenAppeal={product.hasOpenAppeal}
                />
              )}
```
(`moderation_status` is typed `"approved" | "review_required" | "blocked"`; inside
this branch it is narrowed to the two non-approved values the notice expects.)

- [ ] **Step 3: Fetch open appeals + pass `hasOpenAppeal` from the page**

In `src/app/(dashboard)/dashboard/products/page.tsx`, add the import:
```tsx
import { createServiceClient } from "@/lib/supabase/service";
```
After `const productList = products || [];` add:
```tsx
  const service = createServiceClient();
  const { data: openAppeals } = await service
    .from("safety_reviews")
    .select("product_id")
    .eq("merchant_id", merchant.id)
    .eq("review_type", "merchant_appeal")
    .eq("status", "open");
  const appealedProductIds = new Set(
    (openAppeals ?? []).map((r) => r.product_id).filter((x): x is string => x !== null)
  );
```
In the `<ProductGrid products={productList.map((p) => ({ ... }))} />`, add to the
mapped object (after `moderation_reasons: p.moderation_reasons ?? [],`):
```tsx
            hasOpenAppeal: appealedProductIds.has(p.id),
```

- [ ] **Step 4: Typecheck + lint**

Run: `npx tsc --noEmit`
Expected: no errors.
Run: `npx eslint "src/app/(dashboard)/dashboard/products/product-actions.tsx" "src/app/(dashboard)/dashboard/products/page.tsx"`
Expected: clean.

- [ ] **Step 5: Commit**

```bash
git add "src/app/(dashboard)/dashboard/products/product-actions.tsx" "src/app/(dashboard)/dashboard/products/page.tsx"
git commit -m "Show moderation reasons and appeal on merchant product cards"
```

---

### Task 5: Suspended-store dashboard banner

**Files:**
- Modify: `src/app/(dashboard)/dashboard/page.tsx`

- [ ] **Step 1: Add the banner**

In `src/app/(dashboard)/dashboard/page.tsx`, immediately inside the top wrapper
`<div className="md:ml-64">` (line 150), before the first `<section>`, add:

```tsx
      {merchant.store_status === "suspended" && (
        <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-900">
          <p className="font-black">Your store is suspended and not visible to customers.</p>
          {merchant.safety_notes && (
            <p className="mt-1 leading-5">{merchant.safety_notes}</p>
          )}
          <a
            href={`https://wa.me/264816274823?text=${encodeURIComponent(
              `Hi OshiCart, my store "${merchant.store_name}" is suspended and I'd like to appeal.`
            )}`}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 inline-flex items-center justify-center rounded-lg bg-red-600 px-3 py-1.5 text-xs font-bold text-white transition-colors hover:bg-red-700"
          >
            Contact support
          </a>
        </div>
      )}
```

(The `merchant` object is selected with `*`, so `store_status`, `safety_notes`,
and `store_name` are present.)

- [ ] **Step 2: Typecheck + lint**

Run: `npx tsc --noEmit`
Expected: no errors.
Run: `npx eslint "src/app/(dashboard)/dashboard/page.tsx"`
Expected: clean.

- [ ] **Step 3: Commit**

```bash
git add "src/app/(dashboard)/dashboard/page.tsx"
git commit -m "Add suspended-store banner to merchant dashboard"
```

---

### Task 6: Admin queue — render merchant message

**Files:**
- Modify: `src/app/(admin)/admin/safety/safety-review-queue.tsx`

- [ ] **Step 1: Add `merchant_message` to the type**

In `safety-review-queue.tsx`, the `SafetyReview` type (around lines 10-22) has
`admin_notes: string | null;`. Add after it:
```tsx
  merchant_message: string | null;
```

- [ ] **Step 2: Render it in the card**

In `SafetyReviewCard`, near the existing `{review.admin_notes && (...)}` block,
add a merchant-message block before it:
```tsx
      {review.merchant_message && (
        <div className="mt-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-900">
          <span className="font-bold">Merchant says:</span> {review.merchant_message}
        </div>
      )}
```
(The admin page already selects `*` from `safety_reviews`, so `merchant_message`
is present on each row; `merchant_appeal` rows already display as "merchant
appeal" via the existing `review_type.replace("_", " ")`.)

- [ ] **Step 3: Typecheck + lint**

Run: `npx tsc --noEmit`
Expected: no errors.
Run: `npx eslint "src/app/(admin)/admin/safety/safety-review-queue.tsx"`
Expected: clean.

- [ ] **Step 4: Commit**

```bash
git add "src/app/(admin)/admin/safety/safety-review-queue.tsx"
git commit -m "Show merchant appeal message in admin safety queue"
```

---

### Task 7: Build + manual verification

- [ ] **Step 1: Full build**

Run: `npm run build`
Expected: build succeeds, 0 type errors; `/api/products/[id]/appeal` appears in
the route list.

- [ ] **Step 2: Manual pass (orchestrator stages QA states via SQL)**

QA merchant `afbc66c3-4b3d-407d-aeb1-d815e27b20b8`. The orchestrator uses the
Supabase MCP to stage and reset; the merchant dashboard is viewed via the e2e
auth helper (`tests/e2e/helpers/auth.ts`, `TEST_MERCHANT_EMAIL=
oshicart-test-8956093@example.com`).

1. **Blocked product feedback:** pick (or insert) a QA product and set
   `moderation_status='blocked', is_available=false,
   moderation_reasons=ARRAY['Weapons and firearms are not allowed.'],
   moderation_categories=ARRAY['weapons']`. Visit `/dashboard/products`: the
   card shows red "Blocked", the reason bullet, the fix/appeal guidance, and a
   "Request review" button.
2. **Appeal submit:** click "Request review" → type a note → Submit → it becomes
   "Appeal submitted — under review". Verify a `safety_reviews` row exists:
   `review_type='merchant_appeal', status='open', merchant_message` set, reasons
   copied. Reload the page → still shows "Appeal submitted" (hasOpenAppeal).
3. **Dedupe:** POST the appeal again (or click again before refresh) → 409, inline
   "You already have an appeal under review".
4. **Admin queue:** at `/admin/safety` the row shows "merchant appeal" with the
   "Merchant says: …" block; approving the listing flips the product to approved.
5. **Suspended-store banner:** set the QA merchant `store_status='suspended',
   safety_notes='Example suspension reason.'`. Dashboard shows the red banner +
   notes + Contact support link. Reset `store_status` afterward.
6. **Reset:** restore the QA product to `moderation_status='approved',
   is_available=true`, delete the test `merchant_appeal` row(s), reset the
   merchant `store_status` to its prior value, remove any temp e2e spec.

- [ ] **Step 3: Final commit (if fixups) + update handoff**

```bash
git add -A && git commit -m "Moderation feedback verification fixups"
```

Update `.remember/remember.md`: moderation feedback done; whether pushed;
migration 042 applied to prod (Task 1 Step 5).

---

## Self-review notes

- **Spec coverage:** migration + types (T1); appeal route w/ ownership, dedupe,
  approved-guard (T2); ProductModerationNotice reasons + fix guidance + appeal
  form + submitted state (T3); wired into ProductGrid + open-appeal fetch (T4);
  suspended-store banner (T5); admin queue merchant_message (T6); build + manual
  incl. dedupe/admin/store edges (T7).
- **No new table, no new admin action** — appeals reuse `safety_reviews` and the
  existing approve/block actions, per spec non-goals. No re-scan changes.
- **Type consistency:** `ProductModerationNotice` props
  (`productId, moderationStatus, reasons, hasOpenAppeal`) match the call site in
  T4; `hasOpenAppeal` added to the `Product` interface in T4 Step 1 and supplied
  in T4 Step 3; appeal route inserts the exact columns added in T1.
- **Migration application** is an orchestrator step (auto-classifier blocks DB
  migrations from subagents), as in prior plans.
