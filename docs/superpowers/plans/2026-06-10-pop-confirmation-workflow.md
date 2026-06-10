# POP Confirmation Workflow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Merchants see proof-of-payment previews on orders, confirm payment in one click, and can require POP for EFT checkouts.

**Architecture:** Add `merchants.pop_required` (boolean). Checkout enforces a required proof file for EFT when the flag is set and stores the storage *path* (not a signed URL) in `orders.proof_of_payment_url`. The merchant orders page resolves paths (and legacy signed URLs) server-side into fresh 1-hour signed URLs, renders badges + preview, and the existing Confirm action is relabeled "Confirm payment" when proof exists. No new WhatsApp templates; `order_confirmed` fires as today.

**Tech Stack:** Next.js 16 (App Router), Supabase (Postgres + Storage RLS), Tailwind, TypeScript. No unit-test runner in repo — verification is `npx tsc --noEmit`, `npm run build`, and a scripted manual pass.

**Spec:** `docs/superpowers/specs/2026-06-10-pop-confirmation-workflow-design.md`

**Repo root for all paths/commands:** `chatcart-na/`

---

## Background facts (read before starting)

- `orders.proof_of_payment_url` currently holds EITHER a storage path
  (`{merchant_id}/{order_id}-pop.{ext}`, written by `/api/orders/upload-pop`)
  OR a full 7-day signed URL (written by the checkout form via `place_order`'s
  `p_proof_url`). The merchant orders page link at
  `src/app/(dashboard)/dashboard/orders/page.tsx:209-218` uses the raw value as
  `href` — broken for paths, expiring for URLs. This plan fixes both.
- Buyer-facing components (`src/app/track/[token]/tracker-client.tsx`,
  `src/components/storefront/order-tracker.tsx`) use `proof_of_payment_url`
  only as a truthy flag — switching checkout to store paths is safe for them.
- The `order-proofs` bucket is private; RLS allows the owning merchant to read
  its objects, so the merchant's authenticated server client can create signed
  URLs.
- `storeSetupSchema` (`src/lib/validations.ts:6-22`) is a non-strict zod
  object — adding `pop_required` to the settings form object passes through
  `safeParse` untouched. No schema change needed.

---

### Task 1: Migration + TypeScript types

**Files:**
- Create: `supabase/migrations/038_pop_required.sql`
- Modify: `src/types/database.ts:46` (merchants Row), `:72` (Insert), `:98` (Update)

- [ ] **Step 1: Write the migration**

```sql
-- 038_pop_required.sql
-- Per-merchant toggle: require proof of payment at checkout for EFT orders.
ALTER TABLE merchants
  ADD COLUMN IF NOT EXISTS pop_required boolean NOT NULL DEFAULT false;
```

- [ ] **Step 2: Apply the migration to the hosted Supabase project**

Use the Supabase MCP tool `apply_migration` with name `pop_required` and the
SQL above (project is hosted on Supabase Pro; there is no local stack).
Verify with `execute_sql`:

```sql
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'merchants' AND column_name = 'pop_required';
```

Expected: one row, `boolean`, default `false`.

- [ ] **Step 3: Add the column to the Database types**

In `src/types/database.ts`, merchants `Row` (after `vat_inclusive: boolean;` on line 46):

```ts
          pop_required: boolean;
```

In `Insert` (after `vat_inclusive?: boolean;` on line 72) and `Update` (after
line 98), add:

```ts
          pop_required?: boolean;
```

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/038_pop_required.sql src/types/database.ts
git commit -m "Add merchants.pop_required column and types"
```

---

### Task 2: Settings toggle ("Require proof of payment for EFT")

**Files:**
- Modify: `src/app/(dashboard)/dashboard/settings/page.tsx`
  - form state (line 53-69), load (line 94-110), save (line 137-154),
    Payment Methods card (after the `pay2cell` block ending line 561)

- [ ] **Step 1: Add `pop_required` to form state**

In the `useState` form object (line 68, after `vat_inclusive: false,`):

```ts
    pop_required: false,
```

- [ ] **Step 2: Load it from the merchant row**

In the `setForm({...})` inside `load()` (line 109, after `vat_inclusive: false,`):

```ts
          pop_required: merchant.pop_required ?? false,
```

- [ ] **Step 3: Persist it in `handleSave`**

In the `.update({...})` payload (line 153, after `vat_inclusive: false,`):

```ts
        pop_required: form.pop_required,
```

- [ ] **Step 4: Add the toggle UI**

In the Payment Methods card, immediately after the `pay2cell` conditional block
(after line 561, before the card's closing `</div>`), add — shown only when
EFT is an accepted method:

```tsx
          {form.accepted_payment_methods.includes("eft") && (
            <div className="border-t border-gray-100 pt-4">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.pop_required}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, pop_required: e.target.checked }))
                  }
                  className="mt-0.5 w-4 h-4 text-green-600 rounded focus:ring-green-500"
                />
                <span>
                  <span className="block text-sm font-medium text-gray-700">
                    Require proof of payment for EFT
                  </span>
                  <span className={helperText}>
                    Customers paying by bank transfer must upload proof before
                    placing the order. Instant mobile payments (eWallet,
                    Pay2Cell, MoMo) and Cash on Delivery are not affected.
                  </span>
                </span>
              </label>
            </div>
          )}
```

- [ ] **Step 5: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add "src/app/(dashboard)/dashboard/settings/page.tsx"
git commit -m "Add POP-required toggle to merchant payment settings"
```

---

### Task 3: Checkout enforcement (EFT only) + store path instead of signed URL

**Files:**
- Modify: `src/app/checkout/[slug]/page.tsx:39` (select), `:127-145` (props)
- Modify: `src/app/checkout/[slug]/checkout-form.tsx`
  - Props interface (line 51-70), proof constants (line 263), submit
    validation (line 343-370), proof upload (line 452-473), POP upload UI
    (line 1186-1208)

- [ ] **Step 1: Fetch and pass `pop_required` from the server component**

In `src/app/checkout/[slug]/page.tsx` line 39, append `, pop_required` to the
select string:

```ts
      "id, store_name, whatsapp_number, bank_name, bank_account_number, bank_account_holder, bank_branch_code, delivery_slots, delivery_fee_nad, accepted_payment_methods, momo_number, ewallet_number, ewallet_provider, pay2cell_number, vat_number, vat_inclusive, pop_required"
```

And where `<CheckoutForm ...>` is rendered (near line 145), add:

```tsx
          popRequired={merchant.pop_required ?? false}
```

- [ ] **Step 2: Add the prop to the form**

In `checkout-form.tsx` `Props` interface (after `vatInclusive: boolean;` line 69):

```ts
  popRequired: boolean;
}
```

Add `popRequired,` to the destructured component parameters alongside
`vatInclusive`.

- [ ] **Step 3: Compute the per-method requirement**

Replace line 263:

```ts
  const needsProof = paymentMethod !== "cod";
```

with:

```ts
  const needsProof = paymentMethod !== "cod";
  const proofRequired = popRequired && paymentMethod === "eft";
```

- [ ] **Step 4: Block submit without a file when required**

In `handleSubmit`, after the delivery-slot validation (after line 370, before
`setSubmitting(true)`):

```ts
    if (proofRequired && !proofFile) {
      setError(
        "This store requires proof of payment for EFT orders. Please upload your payment confirmation before placing the order."
      );
      return;
    }
```

- [ ] **Step 5: Store the storage path, not the signed URL**

In the proof-upload block (lines 452-473), delete the `createSignedUrl` call
and assign the path. The block becomes:

```ts
      // Upload proof of payment if provided. Store the storage PATH —
      // consumers re-sign it on demand (signed URLs expire after 7 days).
      let proofUrl: string | null = null;
      if (proofFile) {
        const ext = proofFile.name.split(".").pop();
        const fileName = `${merchantId}/${Date.now()}.${ext}`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from("order-proofs")
          .upload(fileName, proofFile, {
            cacheControl: "3600",
            upsert: false,
          });

        if (uploadError) {
          throw new Error("Failed to upload proof of payment");
        }

        proofUrl = uploadData.path;
      }
```

- [ ] **Step 6: Update the POP upload UI label**

Replace the label and helper (lines 1189-1194):

```tsx
            <label className={label}>
              Proof of Payment {proofRequired ? "(required)" : "(optional)"}
            </label>
            <p className={`${helperText} mb-2`}>
              {proofRequired
                ? "This store requires proof for EFT orders. Upload a screenshot of your payment confirmation. Max 5MB."
                : "Upload a screenshot of your payment confirmation. Max 5MB."}
            </p>
```

- [ ] **Step 7: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 8: Commit**

```bash
git add "src/app/checkout/[slug]/page.tsx" "src/app/checkout/[slug]/checkout-form.tsx"
git commit -m "Enforce POP requirement for EFT checkout and store proof path"
```

---

### Task 4: Proof path helper + merchant orders badges & preview

**Files:**
- Create: `src/lib/proof.ts`
- Modify: `src/app/(dashboard)/dashboard/orders/page.tsx`
  - merchant select (line 27), order rendering (badge near line 152-168,
    proof link block lines 209-218)

- [ ] **Step 1: Create the proof helper**

`src/lib/proof.ts`:

```ts
/**
 * orders.proof_of_payment_url historically held either a storage path
 * ("merchantId/file.ext") or a full 7-day signed URL. Normalize both to the
 * storage path so callers can mint fresh signed URLs.
 */
export function resolveProofPath(value: string | null): string | null {
  if (!value) return null;
  if (!value.startsWith("http")) return value;
  const match = value.match(/\/object\/sign\/order-proofs\/([^?]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

export function isPdfProof(path: string): boolean {
  return path.toLowerCase().endsWith(".pdf");
}
```

- [ ] **Step 2: Select `pop_required` with the merchant**

In `orders/page.tsx` line 27:

```ts
    .select("id, industry, store_name, store_slug, pop_required")
```

- [ ] **Step 3: Batch-sign proof URLs server-side**

After `const orderList = orders || [];` (line 48), add:

```ts
  const proofPaths = orderList
    .map((order) => resolveProofPath(order.proof_of_payment_url))
    .filter((p): p is string => p !== null);
  const proofUrlByPath = new Map<string, string>();
  if (proofPaths.length > 0) {
    const { data: signed } = await supabase.storage
      .from("order-proofs")
      .createSignedUrls([...new Set(proofPaths)], 3600);
    for (const item of signed || []) {
      if (item.signedUrl && item.path) {
        proofUrlByPath.set(item.path, item.signedUrl);
      }
    }
  }
```

Add the imports at the top of the file:

```ts
import { resolveProofPath, isPdfProof } from "@/lib/proof";
import { FileText, ImageIcon, ReceiptText } from "lucide-react";
```

(merge with the existing `lucide-react` import on line 10).

- [ ] **Step 4: Add badge + preview inside the order map**

Inside `orderList.map((order) => {` (line 139), after
`const orderTotal = getOrderPayableTotal(order);` add:

```ts
            const proofPath = resolveProofPath(order.proof_of_payment_url);
            const proofUrl = proofPath ? proofUrlByPath.get(proofPath) ?? null : null;
            const awaitingProof =
              merchant.pop_required &&
              order.payment_method === "eft" &&
              !order.proof_of_payment_url &&
              order.status === "pending";
```

In the badge row (next to `<QuickStatus ...>` / payment-method pill, after line
168), add:

```tsx
                    {order.proof_of_payment_url && (
                      <span className={`${statusPill} bg-emerald-100 text-emerald-700`}>
                        Proof uploaded
                      </span>
                    )}
                    {awaitingProof && (
                      <span className={`${statusPill} bg-amber-100 text-amber-700`}>
                        Awaiting proof
                      </span>
                    )}
```

- [ ] **Step 5: Replace the broken "View proof" link with a real preview**

Delete lines 209-218 (the `<a href={order.proof_of_payment_url}>` block) and,
below the notes block (after line 231, before `<OrderItemsToggle ...>`), add:

```tsx
              {order.proof_of_payment_url && (
                <div className="mt-3 rounded-xl border border-emerald-100 bg-emerald-50/50 p-3">
                  <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-emerald-700">
                    <ReceiptText size={14} />
                    Proof of payment
                  </p>
                  {proofUrl ? (
                    proofPath && isPdfProof(proofPath) ? (
                      <a
                        href={proofUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-2 inline-flex items-center gap-1.5 text-sm font-medium text-emerald-700 hover:underline"
                      >
                        <FileText size={16} />
                        View proof (PDF)
                      </a>
                    ) : (
                      <a
                        href={proofUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-2 block w-fit"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={proofUrl}
                          alt={`Proof of payment for order #${order.order_number}`}
                          className="max-h-40 rounded-lg border border-emerald-200 object-contain"
                        />
                      </a>
                    )
                  ) : (
                    <p className="mt-2 flex items-center gap-1.5 text-sm text-gray-500">
                      <ImageIcon size={16} />
                      Proof unavailable (file may have been removed)
                    </p>
                  )}
                </div>
              )}
```

Note: plain `<img>` is intentional — signed Supabase URLs are short-lived and
`next/image` would proxy/cache them; the existing codebase has the same P2
known issue for Supabase URLs.

- [ ] **Step 6: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add src/lib/proof.ts "src/app/(dashboard)/dashboard/orders/page.tsx"
git commit -m "Show proof-of-payment badge and preview on merchant orders"
```

---

### Task 5: "Confirm payment" one-click label

**Files:**
- Modify: `src/app/(dashboard)/dashboard/orders/order-actions.tsx`
  (props line 26-39, labels line 19-24, confirm dialog line 166-198, button
  line 254-261)
- Modify: `src/app/(dashboard)/dashboard/orders/page.tsx` (OrderActions usage
  line 237-250)

- [ ] **Step 1: Add `hasProof` prop**

In `OrderActionsProps` (after `deliveryMethod: string;` line 38):

```ts
  hasProof: boolean;
```

Add `hasProof,` to the destructured parameters.

- [ ] **Step 2: Make the confirm label proof-aware**

Replace the constant `STATUS_LABELS` usage for "confirmed" with a computed
label. After the destructuring inside the component body, add:

```ts
  const confirmLabel = hasProof ? "Confirm payment" : "Confirm";
  const statusLabels: Record<string, string> = {
    ...STATUS_LABELS,
    confirmed: confirmLabel,
  };
```

Then replace every `STATUS_LABELS[confirmAction]` in the confirmation dialog
(lines 175 and 187) with `statusLabels[confirmAction]`, and the Confirm button
text (line 259) with `{confirmLabel}`.

- [ ] **Step 3: Pass the prop from the orders page**

In `orders/page.tsx` where `<OrderActions ...>` is rendered (line 237-250), add:

```tsx
                  hasProof={!!order.proof_of_payment_url}
```

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add "src/app/(dashboard)/dashboard/orders/order-actions.tsx" "src/app/(dashboard)/dashboard/orders/page.tsx"
git commit -m "Relabel Confirm as Confirm payment when proof is attached"
```

---

### Task 6: Build + manual verification pass

- [ ] **Step 1: Full build**

Run: `npm run build`
Expected: build succeeds, 0 type errors. (Warnings acceptable if pre-existing.)

- [ ] **Step 2: Manual pass on local dev server (Playwright browser or manual)**

Start `npm run dev`, then walk:

1. Log in as a merchant → Settings → Payment Methods: toggle "Require proof
   of payment for EFT" on → Save → reload → toggle still on.
2. Open the store's checkout with an EFT-accepting cart:
   - Label reads "Proof of Payment (required)".
   - Submitting without a file shows the inline error and creates no order.
   - Switch payment method to eWallet/Pay2Cell/MoMo/COD (whichever the store
     accepts): label reverts to "(optional)" (hidden entirely for COD) and
     submit is not blocked.
3. Place an EFT order WITH a proof image → dashboard → Orders:
   - Green "Proof uploaded" badge; thumbnail renders; click opens full image.
   - Button reads "Confirm payment"; dialog "Confirm payment order #N?";
     confirm moves status to confirmed.
   - Check `whatsapp_messages` table for an `order_confirmed` row for the
     order (via Supabase `execute_sql`).
4. Place an EFT order WITHOUT proof while the toggle is OFF → "Awaiting
   proof" badge must NOT show; turn toggle ON → badge logic only affects new
   page loads (server-rendered) — pending EFT order without proof now shows
   amber "Awaiting proof".
5. Toggle off → checkout shows "(optional)" again.

- [ ] **Step 3: Final commit (if any fixups) and update handoff**

```bash
git add -A && git commit -m "POP workflow verification fixups"
```

Update `.remember/remember.md` noting: feature complete, NOT yet pushed;
deploy is `git push origin master` (Vercel auto-deploys) and the migration
must already be applied to production Supabase (Task 1 Step 2).

---

## Self-review notes

- Spec coverage: migration (T1), settings toggle (T2), checkout EFT-only
  enforcement + copy (T3), badge/preview/signed URLs (T4), Confirm payment
  label (T5), verification list (T6). Legacy two-format `proof_of_payment_url`
  handled by `resolveProofPath` (T4 Step 1); new writes normalized to path
  (T3 Step 5). No new WhatsApp template anywhere — matches spec non-goals.
- The spec's "upload retry after order creation" scenario does not occur in
  the real checkout flow: checkout uploads BEFORE `place_order` and aborts on
  upload failure, which satisfies the requirement more strictly. The
  tracking-page upload path (`/api/orders/upload-pop`) is untouched.
- Types: `pop_required` defined in T1 and consumed in T2/T3/T4 with the same
  name; `hasProof`/`proofRequired`/`resolveProofPath` names consistent across
  tasks.
