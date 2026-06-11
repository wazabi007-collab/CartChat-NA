# Preview-as-Customer Mode Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a logged-in merchant preview their own storefront (even when inactive / with hidden products) and see the checkout render, with ordering disabled — driven by a short-lived preview cookie.

**Architecture:** An `/api/preview/enter` route verifies ownership and sets an httpOnly `oshicart_preview` cookie; `/api/preview/exit` clears it. The storefront, product-detail, and checkout server routes read the cookie + authed user via a shared `readPreviewState` helper, drop the `is_active`/`store_status`/`is_available` filters only when previewing as the owner (RLS keeps it scoped to their own store), show a banner, and disable the checkout submit. No DB changes, no `place_order` changes.

**Tech Stack:** Next.js 16 (App Router, Route Handlers, server + client components, cookies), Supabase (RLS owner policies), Tailwind, TypeScript. No unit-test runner — verification is `npx tsc --noEmit`, `npm run build`, and a logged-in Playwright pass.

**Spec:** `docs/superpowers/specs/2026-06-11-preview-as-customer-design.md`

**Repo root for all paths/commands:** `chatcart-na/`

---

## Background facts (read before starting)

- `createClient()` (`@/lib/supabase/server`) is async and cookie-aware (reads
  the auth session). The storefront routes already use it, so they're already
  dynamic.
- RLS: the authenticated owner can read their own merchant row (any
  `is_active`/`store_status`) and their own products (any
  `is_available`/`moderation_status`). A non-owner querying another slug gets
  the public-active row or nothing. So dropping filters is safe — it never
  surfaces another merchant's inactive store.
- Storefront `src/app/s/[slug]/page.tsx`: merchant fetch at lines ~78-84
  (`.eq("is_active", true).eq("store_status", "active")`, then `if (!merchant)
  notFound()`); main count query at lines ~111-116
  (`.eq("is_available", true)`); main product list at lines ~188-197
  (`let productQuery = ...` already reassignable); `<TrackView .../>` at line
  ~277; `<ReportButton .../>` at line ~483; `return (` at line ~273.
- Product detail `src/app/s/[slug]/[productId]/page.tsx`: merchant fetch at
  ~62-68 (active filters), product fetch at ~73-79
  (`.eq("is_available", true).is("deleted_at", null)`).
- Checkout `src/app/checkout/[slug]/page.tsx`: merchant fetch at ~36-44 (active
  filters, explicit column select — needs `user_id` added); renders
  `<CheckoutForm ... popRequired={...} />` at ~128-147.
- `checkout-form.tsx`: `Props` ends with `popRequired: boolean;` (line ~70),
  destructure at ~198; submit button at ~1249-1262; `handleSubmit` starts at
  ~343.
- Dashboard `src/app/(dashboard)/dashboard/page.tsx`: "Preview store" `<Link
  href={storeUrl} target="_blank">` at lines ~183-189 (`storeUrl =
  /s/{slug}`).
- `@supabase/supabase-js` is a dependency (`SupabaseClient` type available).
- **No migration.** Nothing in this feature touches the DB schema.

---

### Task 1: Preview cookie machinery (helper + enter/exit routes + entry link)

**Files:**
- Create: `src/lib/preview.ts`
- Create: `src/app/api/preview/enter/route.ts`
- Create: `src/app/api/preview/exit/route.ts`
- Modify: `src/app/(dashboard)/dashboard/page.tsx` (Preview store link)

- [ ] **Step 1: Create the helper**

`src/lib/preview.ts`:

```ts
import { cookies } from "next/headers";
import type { SupabaseClient } from "@supabase/supabase-js";

export const PREVIEW_COOKIE = "oshicart_preview";

/**
 * Reads the preview cookie and the current user. Routes activate preview only
 * when previewCookie is set AND merchant.user_id === userId (checked per
 * render), so a forged cookie reveals nothing.
 */
export async function readPreviewState(
  supabase: SupabaseClient
): Promise<{ previewCookie: boolean; userId: string | null }> {
  const cookieStore = await cookies();
  const previewCookie = cookieStore.get(PREVIEW_COOKIE)?.value === "1";
  if (!previewCookie) return { previewCookie: false, userId: null };
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { previewCookie: true, userId: user?.id ?? null };
}
```

- [ ] **Step 2: Create the enter route**

`src/app/api/preview/enter/route.ts`:

```ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { PREVIEW_COOKIE } from "@/lib/preview";

export async function GET(req: NextRequest) {
  const { origin, searchParams } = req.nextUrl;
  const slug = searchParams.get("slug");
  if (!slug) return NextResponse.redirect(new URL("/dashboard", origin));

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(new URL("/login", origin));

  const { data: merchant } = await supabase
    .from("merchants")
    .select("user_id")
    .eq("store_slug", slug)
    .single();

  if (!merchant || merchant.user_id !== user.id) {
    return NextResponse.redirect(new URL("/dashboard", origin));
  }

  const res = NextResponse.redirect(new URL(`/s/${slug}`, origin));
  res.cookies.set(PREVIEW_COOKIE, "1", {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 3600,
    secure: process.env.NODE_ENV === "production",
  });
  return res;
}
```

- [ ] **Step 3: Create the exit route**

`src/app/api/preview/exit/route.ts`:

```ts
import { NextRequest, NextResponse } from "next/server";
import { PREVIEW_COOKIE } from "@/lib/preview";

export async function GET(req: NextRequest) {
  const res = NextResponse.redirect(new URL("/dashboard", req.nextUrl.origin));
  res.cookies.set(PREVIEW_COOKIE, "", { path: "/", maxAge: 0 });
  return res;
}
```

- [ ] **Step 4: Point the dashboard "Preview store" link at the enter route**

In `src/app/(dashboard)/dashboard/page.tsx`, change the Preview store link's
`href` from `storeUrl` to the enter route, and drop `target="_blank"` so the
cookie+redirect happens in the same tab:

```tsx
            <Link
              href={`/api/preview/enter?slug=${merchant.store_slug}`}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-800 transition hover:bg-slate-50"
            >
              <Store size={16} />
              Preview store
            </Link>
```

- [ ] **Step 5: Typecheck + lint**

Run: `npx tsc --noEmit`
Expected: no errors.
Run: `npx eslint src/lib/preview.ts "src/app/api/preview/enter/route.ts" "src/app/api/preview/exit/route.ts" "src/app/(dashboard)/dashboard/page.tsx"`
Expected: clean.

- [ ] **Step 6: Commit**

```bash
git add src/lib/preview.ts "src/app/api/preview/enter/route.ts" "src/app/api/preview/exit/route.ts" "src/app/(dashboard)/dashboard/page.tsx"
git commit -m "Add preview cookie machinery and dashboard entry link"
```

---

### Task 2: Preview banner component

**Files:**
- Create: `src/components/storefront/preview-banner.tsx`

- [ ] **Step 1: Create the banner**

```tsx
import Link from "next/link";
import { Eye } from "lucide-react";

export function PreviewBanner() {
  return (
    <div className="sticky top-0 z-50 bg-amber-500 text-white">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-2 px-4 py-2 text-sm">
        <p className="flex items-center gap-1.5 font-bold">
          <Eye size={15} />
          Preview mode — only you can see this. Ordering is disabled.
        </p>
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="font-semibold underline-offset-2 hover:underline">
            Dashboard
          </Link>
          <a
            href="/api/preview/exit"
            className="rounded-md bg-white/20 px-2.5 py-1 font-bold transition-colors hover:bg-white/30"
          >
            Exit preview
          </a>
        </div>
      </div>
    </div>
  );
}
```

(`Exit preview` is a plain `<a>` to the route handler, not `<Link>`, because it
performs a server redirect that clears the cookie.)

- [ ] **Step 2: Typecheck + lint**

Run: `npx tsc --noEmit`
Expected: no errors.
Run: `npx eslint src/components/storefront/preview-banner.tsx`
Expected: clean.

- [ ] **Step 3: Commit**

```bash
git add src/components/storefront/preview-banner.tsx
git commit -m "Add storefront preview banner"
```

---

### Task 3: Storefront page preview branch

**Files:**
- Modify: `src/app/s/[slug]/page.tsx`

- [ ] **Step 1: Imports + read preview state**

Add imports near the existing component imports:
```tsx
import { PreviewBanner } from "@/components/storefront/preview-banner";
import { readPreviewState } from "@/lib/preview";
```
Right after `const supabase = await createClient();` (the one inside
`StorefrontPage`, ~line 75), add:
```tsx
  const { previewCookie, userId } = await readPreviewState(supabase);
```

- [ ] **Step 2: Make the merchant fetch preview-aware**

Replace the merchant fetch (the `.eq("is_active", true).eq("store_status",
"active")` chain, ~lines 78-84) with a conditional build, then compute
`isPreview`:
```tsx
  let merchantQuery = supabase
    .from("merchants")
    .select("*")
    .eq("store_slug", slug);
  if (!previewCookie) {
    merchantQuery = merchantQuery.eq("is_active", true).eq("store_status", "active");
  }
  const { data: merchant } = await merchantQuery.single();

  if (!merchant) notFound();

  const isPreview = previewCookie && !!userId && merchant.user_id === userId;
```

- [ ] **Step 3: Drop `is_available` on the count + product-list queries in preview**

In the count query (~lines 111-116), remove `.eq("is_available", true)` from
the chain and add it conditionally:
```tsx
  const countQuery = supabase
    .from("products")
    .select("id", { count: "exact", head: true })
    .eq("merchant_id", merchant.id)
    .is("deleted_at", null);
  if (!isPreview) countQuery.eq("is_available", true);
  if (categoryFilter) countQuery.eq("category_id", categoryFilter);
```
In the main product list (`let productQuery = ...`, ~lines 188-197), remove
`.eq("is_available", true)` from the chain and add the conditional after it:
```tsx
  let productQuery = supabase
    .from("products")
    .select("*")
    .eq("merchant_id", merchant.id)
    .is("deleted_at", null)
    .order("sort_order", { ascending: true })
    .range(offset, offset + PRODUCTS_PER_PAGE - 1);
  if (!isPreview) productQuery = productQuery.eq("is_available", true);
  if (categoryFilter) productQuery = productQuery.eq("category_id", categoryFilter);
  if (searchFilterParts.length > 0) productQuery = productQuery.or(searchFilterParts.join(","));
```
(Leave the per-category count/image queries at ~lines 145-160 unchanged — in
preview, category tiles count only available products; the products still
appear in the main grid. This is an accepted minor cosmetic limitation.)

- [ ] **Step 4: Render banner; suppress view-tracking + report in preview**

Just inside `return ( <div className="min-h-screen bg-slate-50">` (~line 274),
add as the first child:
```tsx
      {isPreview && <PreviewBanner />}
```
Wrap the `<TrackView merchantId={merchant.id} />` (~line 277):
```tsx
      {!isPreview && <TrackView merchantId={merchant.id} />}
```
Wrap the `<ReportButton merchantId={merchant.id} storeName={merchant.store_name} />`
(~line 483):
```tsx
          {!isPreview && (
            <ReportButton merchantId={merchant.id} storeName={merchant.store_name} />
          )}
```

- [ ] **Step 5: Typecheck + lint**

Run: `npx tsc --noEmit`
Expected: no errors.
Run: `npx eslint "src/app/s/[slug]/page.tsx"`
Expected: clean.

- [ ] **Step 6: Commit**

```bash
git add "src/app/s/[slug]/page.tsx"
git commit -m "Preview own storefront (inactive + hidden products) via cookie"
```

---

### Task 4: Product detail page preview branch

**Files:**
- Modify: `src/app/s/[slug]/[productId]/page.tsx`

- [ ] **Step 1: Imports + read preview state**

Add imports:
```tsx
import { PreviewBanner } from "@/components/storefront/preview-banner";
import { readPreviewState } from "@/lib/preview";
```
After `const supabase = await createClient();`, add:
```tsx
  const { previewCookie, userId } = await readPreviewState(supabase);
```

- [ ] **Step 2: Preview-aware merchant + product fetches**

Replace the merchant fetch (active filters, ~62-68) with a conditional build
and `user_id` in the select:
```tsx
  let merchantQuery = supabase
    .from("merchants")
    .select("id, store_name, industry, user_id")
    .eq("store_slug", slug);
  if (!previewCookie) {
    merchantQuery = merchantQuery.eq("is_active", true).eq("store_status", "active");
  }
  const { data: merchant } = await merchantQuery.single();

  if (!merchant) notFound();

  const isPreview = previewCookie && !!userId && merchant.user_id === userId;
```
Replace the product fetch (~73-79) so `is_available` is conditional:
```tsx
  let productQuery = supabase
    .from("products")
    .select("*")
    .eq("id", productId)
    .eq("merchant_id", merchant.id)
    .is("deleted_at", null);
  if (!isPreview) productQuery = productQuery.eq("is_available", true);
  const { data: product } = await productQuery.single();

  if (!product) notFound();
```

- [ ] **Step 3: Render banner at the top**

Find the top-level wrapper `<div ...>` that the page returns and add as its
first child:
```tsx
      {isPreview && <PreviewBanner />}
```
(If the return's outermost element is a fragment or specific wrapper, place the
banner as the first child of the outermost rendered container.)

- [ ] **Step 4: Typecheck + lint**

Run: `npx tsc --noEmit`
Expected: no errors.
Run: `npx eslint "src/app/s/[slug]/[productId]/page.tsx"`
Expected: clean.

- [ ] **Step 5: Commit**

```bash
git add "src/app/s/[slug]/[productId]/page.tsx"
git commit -m "Preview product detail (in-review products) via cookie"
```

---

### Task 5: Checkout preview (banner + disabled submit)

**Files:**
- Modify: `src/app/checkout/[slug]/page.tsx`
- Modify: `src/app/checkout/[slug]/checkout-form.tsx`

- [ ] **Step 1: Checkout page — preview branch + pass prop**

In `src/app/checkout/[slug]/page.tsx`, add imports:
```tsx
import { PreviewBanner } from "@/components/storefront/preview-banner";
import { readPreviewState } from "@/lib/preview";
```
After `const supabase = await createClient();`, add:
```tsx
  const { previewCookie, userId } = await readPreviewState(supabase);
```
Change the merchant fetch (~36-44) to add `user_id` to the select and make the
active filters conditional:
```tsx
  let merchantQuery = supabase
    .from("merchants")
    .select(
      "id, user_id, store_name, whatsapp_number, bank_name, bank_account_number, bank_account_holder, bank_branch_code, delivery_slots, delivery_fee_nad, accepted_payment_methods, momo_number, ewallet_number, ewallet_provider, pay2cell_number, vat_number, vat_inclusive, pop_required"
    )
    .eq("store_slug", slug);
  if (!previewCookie) {
    merchantQuery = merchantQuery.eq("is_active", true).eq("store_status", "active");
  }
  const { data: merchant } = await merchantQuery.single();

  if (!merchant) notFound();

  const isPreview = previewCookie && !!userId && merchant.user_id === userId;
```
Add the banner as the first child of the page's outermost returned `<div>`:
```tsx
      {isPreview && <PreviewBanner />}
```
Add the `preview` prop to the `<CheckoutForm .../>` call (alongside
`popRequired={...}`):
```tsx
          preview={isPreview}
```

- [ ] **Step 2: CheckoutForm — accept prop, disable submit**

In `src/app/checkout/[slug]/checkout-form.tsx`, add to the `Props` interface
after `popRequired: boolean;`:
```tsx
  preview?: boolean;
```
Add `preview = false,` to the destructured component params (after
`popRequired,`).

At the very top of `handleSubmit` (the `const handleSubmit = async (e) => {`
body, right after `e.preventDefault();`), short-circuit in preview:
```tsx
    if (preview) return;
```

Replace the submit button block (~1249-1262) so preview shows a disabled
control:
```tsx
        {preview ? (
          <button
            type="button"
            disabled
            className={`${btnPrimaryGreen} flex items-center justify-center gap-2 opacity-60`}
          >
            Preview — ordering disabled
          </button>
        ) : (
          <button
            type="submit"
            disabled={submitting || cartItems.length === 0}
            className={`${btnPrimaryGreen} flex items-center justify-center gap-2`}
          >
            {submitting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Placing Order...
              </>
            ) : (
              "Place Order"
            )}
          </button>
        )}
```

- [ ] **Step 3: Typecheck + lint**

Run: `npx tsc --noEmit`
Expected: no errors.
Run: `npx eslint "src/app/checkout/[slug]/page.tsx" "src/app/checkout/[slug]/checkout-form.tsx"`
Expected: clean.

- [ ] **Step 4: Commit**

```bash
git add "src/app/checkout/[slug]/page.tsx" "src/app/checkout/[slug]/checkout-form.tsx"
git commit -m "Render checkout in preview with ordering disabled"
```

---

### Task 6: Build + manual verification

- [ ] **Step 1: Full build**

Run: `npm run build`
Expected: build succeeds, 0 type errors; `/api/preview/enter` and
`/api/preview/exit` appear in the route list.

- [ ] **Step 2: Manual pass (orchestrator, logged-in QA merchant)**

QA merchant `afbc66c3-4b3d-407d-aeb1-d815e27b20b8` (store_slug
`oshi-qa-8956093`, currently `store_status='suspended'`). Logged-in browser via
`tests/e2e/helpers/auth.ts` (`TEST_MERCHANT_EMAIL=
oshicart-test-8956093@example.com`).

1. **Public still gated:** anonymous `GET /s/oshi-qa-8956093` → 404 (suspended).
2. **Enter preview:** logged-in, `GET /api/preview/enter?slug=oshi-qa-8956093`
   → redirects to `/s/oshi-qa-8956093`, which now renders (despite suspended)
   with the amber preview banner. Stage a hidden product
   (`UPDATE products SET is_available=false WHERE id=...`) and confirm it shows
   in preview; reset it after.
3. **Persistence:** click a product → product detail renders with banner (cookie
   persists, no param). Navigate to `/checkout/oshi-qa-8956093` → renders with
   the disabled "Preview — ordering disabled" control; no order created.
4. **Exit:** click "Exit preview" (`/api/preview/exit`) → cookie cleared,
   redirect to dashboard; `/s/oshi-qa-8956093` returns to 404 for the (now
   cookieless) browser.
5. **Non-owner safety:** with the preview cookie set, visiting a store the user
   doesn't own behaves as public (404 if inactive) — no banner, no hidden
   products. (Can reason from code if a second store isn't handy.)

- [ ] **Step 3: Final commit (if fixups) + update handoff**

```bash
git add -A && git commit -m "Preview-as-customer verification fixups"
```

Update `.remember/remember.md`: preview-as-customer done; whether pushed; no
migration; cookie name `oshicart_preview`.

---

## Self-review notes

- **Spec coverage:** cookie helper + enter/exit routes + dashboard entry (T1);
  banner with exit (T2); storefront preview branch incl. suppressed
  TrackView/ReportButton (T3); product-detail preview (T4); checkout banner +
  disabled submit + handleSubmit short-circuit (T5); build + manual incl.
  non-owner/exit edges (T6). No migration (matches spec — no DB changes).
- **Security:** activation is `previewCookie && merchant.user_id === userId`
  per render in every route; enter route verifies ownership before setting the
  cookie; dropping filters is RLS-safe. Matches the spec's Security section.
- **Type consistency:** `readPreviewState` returns `{ previewCookie, userId }`
  used identically in T3/T4/T5; `PreviewBanner` is a no-prop component used in
  T3/T4/T5; `CheckoutForm` gains `preview?: boolean` (default false) consumed in
  the submit block and `handleSubmit`.
- **Known cosmetic limitation (documented):** category tile counts use
  available-only even in preview (per-category queries left unchanged); products
  still appear in the main grid.
