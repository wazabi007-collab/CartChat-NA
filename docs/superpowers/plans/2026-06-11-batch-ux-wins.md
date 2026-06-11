# Batch UX Wins Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship three small merchant UX wins — coupon copy-to-clipboard, bulk hide/show products, and a merchant-set delivery estimate shown to buyers.

**Architecture:** Each is independent and reuses an existing pattern. Coupon copy extracts the clipboard helper into `src/lib/clipboard.ts`. Bulk hide/show adds a `PATCH` to the existing products API mirroring the bulk-delete handler. Delivery estimate adds one nullable `merchants.delivery_estimate` text column, set in settings and rendered read-only on the storefront header + checkout.

**Tech Stack:** Next.js 16 (App Router, client + server components, route handlers), Supabase, Tailwind, TypeScript, lucide-react. No unit-test runner — verification is `npx tsc --noEmit`, `npm run build`, SQL checks, and a logged-in Playwright pass.

**Spec:** `docs/superpowers/specs/2026-06-11-batch-ux-wins-design.md`

**Repo root for all paths/commands:** `chatcart-na/`

---

## Background facts (read before starting)

- `src/app/(dashboard)/dashboard/copy-store-link.tsx` has a local `copyText`
  helper (lines 10-26): `navigator.clipboard.writeText` with a hidden-`textarea`
  + `document.execCommand("copy")` fallback. It's a `"use client"` component.
- `src/app/(dashboard)/dashboard/coupons/page.tsx` is `"use client"`; each
  coupon code renders at ~line 434 (`{coupon.code}` inside a `<span>`); lucide
  import is line 7.
- `src/app/api/products/route.ts` has bulk `DELETE` (lines 29-48): reads `ids`
  query param, auths, resolves merchant, soft-deletes scoped by `merchant_id`.
- `src/app/(dashboard)/dashboard/products/product-actions.tsx` (`"use client"`):
  lucide import line 7; `selected: Set<string>` + `deleting` state; `handleDelete`
  at lines 54-73; the bulk-action bar JSX at lines 146-175 (the `Delete {n}`
  button is inside `{selected.size > 0 && (...)}`).
- `src/app/(dashboard)/dashboard/settings/page.tsx`: Delivery Fee card at lines
  592-614; form state init, the `setForm({...})` in `load()`, and the
  `.update({...})` save payload already carry fields like `delivery_fee_display`
  and `pop_required` — add `delivery_estimate` to the same three places.
- `src/components/storefront/store-header-card.tsx`: `store` prop type (lines
  4-19); badge row at lines 54-78 (location/phone/rating chips).
- `src/app/s/[slug]/page.tsx`: builds the `store={{...}}` object for
  `StoreHeaderCard` at lines 300-312 (merchant selected with `*`, so
  `delivery_estimate` is available).
- `src/app/checkout/[slug]/page.tsx`: merchant select is an explicit column
  list (includes `pop_required`, `user_id`); passes props to `CheckoutForm`.
- `src/app/checkout/[slug]/checkout-form.tsx`: `Props` interface includes
  `popRequired`, `preview`; the Pickup/Delivery tabs close at line 916 (the
  `</div>` after the "Delivery" label) inside the "Delivery Method" card.
- **Migration application** is an orchestrator step (auto-classifier blocks DB
  migrations from subagents). Latest migration is `042`; next is `043`.

---

### Task 1: Coupon copy-to-clipboard

**Files:**
- Create: `src/lib/clipboard.ts`
- Modify: `src/app/(dashboard)/dashboard/copy-store-link.tsx`
- Modify: `src/app/(dashboard)/dashboard/coupons/page.tsx`

- [ ] **Step 1: Create the shared clipboard helper**

`src/lib/clipboard.ts`:

```ts
/** Copy text to the clipboard, with a hidden-textarea fallback for older browsers. */
export async function copyToClipboard(text: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const el = document.createElement("textarea");
    el.value = text;
    el.setAttribute("readonly", "");
    el.style.position = "absolute";
    el.style.left = "-9999px";
    document.body.appendChild(el);
    el.select();
    document.execCommand("copy");
    document.body.removeChild(el);
  }
}
```

- [ ] **Step 2: Refactor copy-store-link to use the helper**

In `copy-store-link.tsx`, add the import at the top:
```tsx
import { copyToClipboard } from "@/lib/clipboard";
```
Replace the local `copyText` function (lines 10-26) with a thin wrapper that
keeps the "Copied!" timing behavior:
```tsx
  async function copyText(text: string, setter: (v: boolean) => void) {
    await copyToClipboard(text);
    setter(true);
    setTimeout(() => setter(false), 2000);
  }
```

- [ ] **Step 3: Add the Copy button on each coupon row**

In `coupons/page.tsx`:
- Extend the lucide import (line 7) to include `Copy` and `Check` (append them
  to the existing destructured list).
- Add the helper import: `import { copyToClipboard } from "@/lib/clipboard";`
- Add state near the other `useState`s in the component:
  ```tsx
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  ```
- In the coupon row, right after the `<span ...>{coupon.code}</span>` (line
  434-436), add the button:
  ```tsx
                      <button
                        onClick={async () => {
                          await copyToClipboard(coupon.code);
                          setCopiedCode(coupon.code);
                          setTimeout(() => setCopiedCode(null), 2000);
                        }}
                        className="flex-shrink-0 px-2 py-0.5 rounded-md text-xs font-medium bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors inline-flex items-center gap-1"
                      >
                        {copiedCode === coupon.code ? (
                          <Check size={12} className="text-green-600" />
                        ) : (
                          <Copy size={12} />
                        )}
                        {copiedCode === coupon.code ? "Copied!" : "Copy"}
                      </button>
  ```

- [ ] **Step 4: Typecheck + lint**

Run: `npx tsc --noEmit`
Expected: no errors.
Run: `npx eslint src/lib/clipboard.ts "src/app/(dashboard)/dashboard/copy-store-link.tsx" "src/app/(dashboard)/dashboard/coupons/page.tsx"`
Expected: clean.

- [ ] **Step 5: Commit**

```bash
git add src/lib/clipboard.ts "src/app/(dashboard)/dashboard/copy-store-link.tsx" "src/app/(dashboard)/dashboard/coupons/page.tsx"
git commit -m "Add copy-to-clipboard for coupon codes (shared helper)"
```

---

### Task 2: Bulk hide / show products

**Files:**
- Modify: `src/app/api/products/route.ts` (add `PATCH`)
- Modify: `src/app/(dashboard)/dashboard/products/product-actions.tsx`

- [ ] **Step 1: Add the PATCH handler**

In `src/app/api/products/route.ts`, add (after the `DELETE` handler):

```ts
export async function PATCH(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const bulkIds = searchParams.get("ids");

    const body = await request.json().catch(() => ({}));
    const isAvailable = (body as { is_available?: unknown })?.is_available;
    if (typeof isAvailable !== "boolean") {
      return NextResponse.json({ error: "is_available boolean is required" }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: merchant } = await supabase
      .from("merchants")
      .select("id")
      .eq("user_id", user.id)
      .single();
    if (!merchant) {
      return NextResponse.json({ error: "Merchant not found" }, { status: 404 });
    }

    const ids = (bulkIds || "").split(",").map((id) => id.trim()).filter(Boolean);
    if (ids.length === 0) {
      return NextResponse.json({ error: "No product IDs provided" }, { status: 400 });
    }

    const { error } = await supabase
      .from("products")
      .update({ is_available: isAvailable })
      .in("id", ids)
      .eq("merchant_id", merchant.id)
      .is("deleted_at", null);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, updated: ids.length });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
```

- [ ] **Step 2: Add Hide/Show bulk handler + buttons**

In `product-actions.tsx`:
- Extend the lucide import (line 7) to include `Eye` and `EyeOff`.
- Add the handler next to `handleDelete` (after line 73):
  ```tsx
  async function handleBulkAvailability(ids: string[], isAvailable: boolean) {
    if (ids.length === 0) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/products?ids=${ids.join(",")}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_available: isAvailable }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        alert(err.error || "Failed to update");
      } else {
        setSelected(new Set());
        setSelectMode(false);
        router.refresh();
      }
    } finally {
      setDeleting(false);
    }
  }
  ```
- In the bulk-action bar, inside the existing `{selected.size > 0 && (...)}`
  block (currently just the Delete button, ~lines 163-172), add the two buttons
  BEFORE the Delete button so the row reads Hide · Show · Delete:
  ```tsx
              <button
                onClick={() => handleBulkAvailability(Array.from(selected), false)}
                disabled={deleting}
                className="flex items-center gap-1 text-xs text-slate-600 hover:text-slate-800 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg disabled:opacity-50"
              >
                <EyeOff size={14} />
                Hide {selected.size}
              </button>
              <button
                onClick={() => handleBulkAvailability(Array.from(selected), true)}
                disabled={deleting}
                className="flex items-center gap-1 text-xs text-emerald-700 hover:text-emerald-900 px-3 py-1.5 bg-emerald-50 border border-emerald-200 rounded-lg disabled:opacity-50"
              >
                <Eye size={14} />
                Show {selected.size}
              </button>
  ```
  (Wrap the three buttons so they sit together; if the existing `{selected.size
  > 0 && ( <button .../> )}` holds a single element, change it to a fragment
  `<>...</>` containing Hide, Show, then the existing Delete button.)

- [ ] **Step 3: Typecheck + lint**

Run: `npx tsc --noEmit`
Expected: no errors.
Run: `npx eslint "src/app/api/products/route.ts" "src/app/(dashboard)/dashboard/products/product-actions.tsx"`
Expected: clean.

- [ ] **Step 4: Commit**

```bash
git add "src/app/api/products/route.ts" "src/app/(dashboard)/dashboard/products/product-actions.tsx"
git commit -m "Add bulk hide/show for selected products"
```

---

### Task 3: Delivery estimate — column, types, settings field

**Files:**
- Create: `supabase/migrations/043_delivery_estimate.sql`
- Modify: `src/types/database.ts` (merchants Row/Insert/Update)
- Modify: `src/app/(dashboard)/dashboard/settings/page.tsx`

- [ ] **Step 1: Write the migration**

`supabase/migrations/043_delivery_estimate.sql`:
```sql
-- 043_delivery_estimate.sql
-- Optional merchant-set delivery/prep estimate shown to buyers (free text).
ALTER TABLE public.merchants
  ADD COLUMN IF NOT EXISTS delivery_estimate text DEFAULT NULL;
```

- [ ] **Step 2: Add the column to merchants types**

In `src/types/database.ts`, merchants `Row` add `delivery_estimate: string | null;`
(next to other nullable text columns like `safety_notes`); in `Insert` and
`Update` add `delivery_estimate?: string | null;`.

- [ ] **Step 3: Add the settings field**

In `src/app/(dashboard)/dashboard/settings/page.tsx`:
- Add `delivery_estimate: ""` to the `useState` form-init object (next to
  `delivery_fee_display`).
- In the `setForm({...})` inside `load()`, add
  `delivery_estimate: merchant.delivery_estimate ?? "",`.
- In the `.update({...})` save payload, add
  `delivery_estimate: form.delivery_estimate.trim() || null,`.
- Inside the Delivery Fee card (after the fee input `</div>` at line 613, before
  the card's closing `</div>` at 614), add the field:
  ```tsx
          <div>
            <label className={label}>Delivery estimate</label>
            <input
              type="text"
              maxLength={40}
              value={form.delivery_estimate}
              onChange={(e) =>
                setForm((p) => ({ ...p, delivery_estimate: e.target.value }))
              }
              className={`${inputBase} ${focusGreen}`}
              placeholder="e.g. 1–2 days, same-day, 30 min"
            />
            <p className={helperText}>
              Optional. Shown to customers as &quot;Usually ready in …&quot;.
            </p>
          </div>
  ```

- [ ] **Step 4: Typecheck + lint**

Run: `npx tsc --noEmit`
Expected: no errors.
Run: `npx eslint src/types/database.ts "src/app/(dashboard)/dashboard/settings/page.tsx"`
Expected: clean.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/043_delivery_estimate.sql src/types/database.ts "src/app/(dashboard)/dashboard/settings/page.tsx"
git commit -m "Add merchant delivery estimate column and settings field"
```

- [ ] **Step 6: Orchestrator applies the migration**

(Orchestrator, not subagent.) Apply `043_delivery_estimate.sql` to project
`pcseqiaqeiiaiqxqtfmw` via Supabase MCP `apply_migration`, then verify:
```sql
SELECT column_name FROM information_schema.columns
WHERE table_name='merchants' AND column_name='delivery_estimate';
```
Expected: one row.

---

### Task 4: Delivery estimate — buyer surfaces (storefront + checkout)

**Files:**
- Modify: `src/components/storefront/store-header-card.tsx`
- Modify: `src/app/s/[slug]/page.tsx`
- Modify: `src/app/checkout/[slug]/page.tsx`
- Modify: `src/app/checkout/[slug]/checkout-form.tsx`

- [ ] **Step 1: Storefront header badge**

In `store-header-card.tsx`:
- Add `Clock` to the lucide import (line 1).
- Add `deliveryEstimate?: string | null;` to the `store` prop type (in the
  block at lines 5-16).
- In the badge row (after the rating chip, before the closing `</div>` at line
  78), add:
  ```tsx
          {store.deliveryEstimate && (
            <span className="inline-flex items-center gap-1.5 text-xs px-3 py-1 rounded-full bg-slate-50 border border-slate-200 text-slate-600">
              <Clock size={13} />
              Usually ready in {store.deliveryEstimate}
            </span>
          )}
  ```

- [ ] **Step 2: Pass it from the storefront page**

In `src/app/s/[slug]/page.tsx`, in the `store={{...}}` object passed to
`StoreHeaderCard` (lines 301-312), add:
```tsx
            deliveryEstimate: merchant.delivery_estimate,
```

- [ ] **Step 3: Checkout — select the column + pass the prop**

In `src/app/checkout/[slug]/page.tsx`, add `delivery_estimate` to the merchant
`.select("...")` column string (alongside `pop_required`). Pass a prop to
`CheckoutForm`:
```tsx
          deliveryEstimate={merchant.delivery_estimate ?? null}
```

- [ ] **Step 4: Checkout form — accept prop + render the line**

In `src/app/checkout/[slug]/checkout-form.tsx`:
- Add `deliveryEstimate?: string | null;` to the `Props` interface (next to
  `preview`).
- Add `deliveryEstimate = null,` to the destructured params.
- Right after the Pickup/Delivery tabs `</div>` (line 916), add:
  ```tsx
        {deliveryEstimate && (
          <p className="flex items-center gap-1.5 text-sm text-slate-600">
            <Clock className="w-4 h-4 text-slate-400" />
            Usually ready in {deliveryEstimate}
          </p>
        )}
  ```
- Ensure `Clock` is imported from lucide-react at the top of the file (add it to
  the existing lucide import if not already present).

- [ ] **Step 5: Typecheck + lint**

Run: `npx tsc --noEmit`
Expected: no errors.
Run: `npx eslint "src/components/storefront/store-header-card.tsx" "src/app/s/[slug]/page.tsx" "src/app/checkout/[slug]/page.tsx" "src/app/checkout/[slug]/checkout-form.tsx"`
Expected: clean.

- [ ] **Step 6: Commit**

```bash
git add "src/components/storefront/store-header-card.tsx" "src/app/s/[slug]/page.tsx" "src/app/checkout/[slug]/page.tsx" "src/app/checkout/[slug]/checkout-form.tsx"
git commit -m "Show delivery estimate on storefront header and checkout"
```

---

### Task 5: Build + manual verification

- [ ] **Step 1: Full build**

Run: `npm run build`
Expected: build succeeds, 0 type errors.

- [ ] **Step 2: Manual pass (logged-in QA merchant)**

QA merchant `afbc66c3-4b3d-407d-aeb1-d815e27b20b8` (slug `oshi-qa-8956093`,
store_status `suspended`). Logged-in browser via `tests/e2e/helpers/auth.ts`;
storefront/checkout viewed via the preview cookie (`/api/preview/enter?slug=oshi-qa-8956093`).

1. **Coupon copy:** dashboard → Coupons. If no coupon exists, create one. Click
   Copy on a coupon → button shows "Copied!" for ~2s; paste confirms the code.
2. **Bulk hide/show:** dashboard → Products → Select → tick the QA product →
   Hide → verify `SELECT is_available FROM products WHERE id='619d80ad-b283-483f-a605-cf6da59e5fb3'`
   is `false`; selection clears, list refreshes. Select again → Show → back to
   `true`. Delete button still present and unchanged.
3. **Delivery estimate:** Settings → set Delivery estimate = "1–2 days" → Save →
   reload, value persists; `SELECT delivery_estimate FROM merchants WHERE id=…`
   returns "1–2 days". Enter preview → storefront header shows the
   "Usually ready in 1–2 days" badge; `/checkout/oshi-qa-8956093` shows the
   "Usually ready in 1–2 days" line under the delivery tabs. Clear it in
   settings → both disappear.
4. **Reset:** QA product `is_available=true`; clear the test
   `delivery_estimate` (set NULL); remove any temp e2e spec; exit preview.

- [ ] **Step 3: Final commit (if fixups) + update handoff**

```bash
git add -A && git commit -m "Batch UX wins verification fixups"
```

Update `.remember/remember.md`: batch UX wins done; whether pushed; migration
043 applied to prod.

---

## Self-review notes

- **Spec coverage:** coupon copy via shared helper (T1); bulk hide/show PATCH +
  buttons (T2); delivery estimate column/types/settings (T3) + storefront &
  checkout display (T4); build + manual (T5). All three spec sections covered.
- **No placeholders;** complete code in every step.
- **Type consistency:** `copyToClipboard(text)` defined T1 used T1; PATCH body
  shape `{ is_available: boolean }` matches the client `handleBulkAvailability`
  fetch in T2; `delivery_estimate` column (T3) → `deliveryEstimate` prop on
  `StoreHeaderCard.store` and `CheckoutForm` (T4), nullable throughout.
- **Migration application** is an orchestrator step (auto-classifier blocks DB
  migrations from subagents), as in prior plans.
- **Ownership:** PATCH scopes by `merchant_id` exactly like the bulk DELETE — no
  cross-tenant writes.
