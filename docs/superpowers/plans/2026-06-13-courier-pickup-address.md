# Courier Pickup Address — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Add a merchant `pickup_address`, required when Yango/inDrive is enabled, and show it at checkout for buyer-booked couriers and the Pickup method.

**Architecture:** One new nullable `merchants` column + conditional settings/setup field with a required-when-courier guard + checkout display reading `merchant.pickup_address`. Mirrors the just-built courier-control patterns.

**Tech Stack:** Next.js 16, Supabase, Tailwind v4, TypeScript.

**Spec:** `docs/superpowers/specs/2026-06-13-courier-pickup-address-design.md`
**Repo root:** `chatcart-na/`

## Background facts
- **Dev hits PROD Supabase** → migration 045 must be applied (orchestrator, after user approval; implementers must NOT apply migrations).
- Settings (`(dashboard)/dashboard/settings/page.tsx`): `saving`/`error` state lines 41-42; form state `enabled_delivery_providers` line 69; load line 114; save handler starts ~130 (`setSaving(true)`/`setError("")`), the **≥1 courier guard at 143-146**, `.update({...})` at 151 (has `enabled_delivery_providers` at 168); `toggleProvider` 225-230; the "Delivery options shown at checkout" courier-checkbox block at ~675-690 inside the Delivery Fee card. Class consts: `label`, `inputBase`, `focusGreen`, `helperText`.
- Setup (`(dashboard)/dashboard/setup/page.tsx`): form defaults ~39-42; `enabledProviders` state; courier checkboxes placed inside the `offersDelivery` `ml-7` wrapper near the delivery-fee input; merchant `.insert({...})` ~277-292; final submit button has a `disabled={...}` condition.
- Checkout loader (`checkout/[slug]/page.tsx`): merchant `.select` line ~43; CheckoutForm props ~150-153 (`paytodayNumber`, `enabledDeliveryProviders`).
- Checkout form (`checkout-form.tsx`): Props interface ~52-74; `buyerPaidCourier` computed ~259; `deliveryProviderLabel` (the getter `getDeliveryProviderLabel`); the buyer-paid-courier blue info box at ~975-979 (inside `deliveryMethod === "delivery"`); a Pickup branch exists for `deliveryMethod === "pickup"`; the order-success confirmation view builds a list of lines (~630-636).

---

### Task 1: Migration 045 + types
**Files:** Create `supabase/migrations/045_pickup_address.sql`; Modify `src/types/database.ts`.

- [ ] **Step 1:** Migration:
```sql
ALTER TABLE public.merchants
  ADD COLUMN IF NOT EXISTS pickup_address text DEFAULT NULL;
```
- [ ] **Step 2:** `database.ts` merchants `Row`: add `pickup_address: string | null;`; `Insert` + `Update`: add `pickup_address?: string | null;` (place near `paytoday_number`).
- [ ] **Step 3:** `npx tsc --noEmit` (clean for database.ts; later-task files add usage).
- [ ] **Step 4:** Commit:
```bash
git add supabase/migrations/045_pickup_address.sql src/types/database.ts
git commit -m "Add migration 045 + types for merchant pickup_address"
```
> **Orchestrator:** apply 045 to prod (user-approved) before Task 2+ QA; do NOT let implementers apply it.

---

### Task 2: Settings — pickup address field + required guard
**Files:** Modify `src/app/(dashboard)/dashboard/settings/page.tsx`.

- [ ] **Step 1: state/load/save.** Add `pickup_address: ""` to form state (near line 69). Load (near 114): `pickup_address: merchant.pickup_address || ""`. Save (in `.update` near 168): `pickup_address: form.pickup_address.trim() || null`.

- [ ] **Step 2: required guard.** Immediately AFTER the existing ≥1-courier guard (lines 143-146), add:
```tsx
    const offersCourier =
      form.enabled_delivery_providers.includes("yango") ||
      form.enabled_delivery_providers.includes("indrive");
    if (offersCourier && !form.pickup_address.trim()) {
      setError("Add a pickup address so Yango/inDrive couriers know where to collect.");
      setSaving(false);
      return;
    }
```

- [ ] **Step 3: field.** Inside the Delivery Fee card, right AFTER the "Delivery options shown at checkout" courier-checkbox block (~675-690), add a conditional textarea:
```tsx
          {(form.enabled_delivery_providers.includes("yango") ||
            form.enabled_delivery_providers.includes("indrive")) && (
            <div className="border-t border-gray-100 pt-4">
              <label className={label}>Pickup address</label>
              <textarea
                value={form.pickup_address}
                onChange={(e) => setForm((p) => ({ ...p, pickup_address: e.target.value }))}
                rows={2}
                placeholder="e.g. Shop 4, Maerua Mall, Windhoek"
                className={`${inputBase} ${focusGreen}`}
              />
              <p className={helperText}>
                Where Yango/inDrive couriers collect orders. Buyers see this to book the driver.
              </p>
            </div>
          )}
```

- [ ] **Step 4:** `npx tsc --noEmit` + `npx eslint "src/app/(dashboard)/dashboard/settings/page.tsx"` clean.
- [ ] **Step 5:** Commit:
```bash
git add "src/app/(dashboard)/dashboard/settings/page.tsx"
git commit -m "Settings: pickup address field required when courier enabled"
```

---

### Task 3: Setup wizard — pickup address field + submit guard
**Files:** Modify `src/app/(dashboard)/dashboard/setup/page.tsx`.

- [ ] **Step 1:** Add `pickup_address: ""` to the form defaults (~39-42). In `.insert` (~277-292) add `pickup_address: form.pickup_address.trim() || null`.

- [ ] **Step 2: field.** In the delivery step, right after the courier checkboxes (inside the `offersDelivery` block), add a textarea shown when a courier is enabled:
```tsx
                        {(enabledProviders.includes("yango") || enabledProviders.includes("indrive")) && (
                          <div className="mt-4">
                            <label className="mb-1 block text-sm font-medium text-slate-700">Pickup address</label>
                            <textarea
                              value={form.pickup_address}
                              onChange={(e) => update("pickup_address", e.target.value)}
                              rows={2}
                              placeholder="e.g. Shop 4, Maerua Mall, Windhoek"
                              className={`${inputBase} ${focusGreen}`}
                            />
                            <p className="mt-1 text-xs text-slate-500">Where Yango/inDrive couriers collect orders.</p>
                          </div>
                        )}
```
(Use the file's actual input class consts; if `inputBase`/`focusGreen` don't exist in setup, match the styling of an existing setup textarea/input.)

- [ ] **Step 3: submit guard.** Find the final submit button's `disabled={...}` (the one gated on `selectedMethods.length === 0 || !acceptedPolicy`). Extend it so it's also disabled when a courier is enabled with delivery offered and no pickup address:
```tsx
disabled={loading || selectedMethods.length === 0 || !acceptedPolicy ||
  (offersDelivery && (enabledProviders.includes("yango") || enabledProviders.includes("indrive")) && !form.pickup_address.trim())}
```
(Adapt to the actual existing condition; keep all existing clauses.)

- [ ] **Step 4:** `npx tsc --noEmit` + `npx eslint "src/app/(dashboard)/dashboard/setup/page.tsx"` clean.
- [ ] **Step 5:** Commit:
```bash
git add "src/app/(dashboard)/dashboard/setup/page.tsx"
git commit -m "Setup wizard: pickup address field required when courier enabled"
```

---

### Task 4: Checkout — show pickup address (courier + pickup method + success view)
**Files:** Modify `src/app/checkout/[slug]/page.tsx`, `src/app/checkout/[slug]/checkout-form.tsx`.

- [ ] **Step 1: loader.** In `checkout/[slug]/page.tsx`: add `pickup_address` to the merchant `.select(...)`; add prop `pickupAddress={merchant.pickup_address ?? null}` to `<CheckoutForm>`.

- [ ] **Step 2: prop.** In `checkout-form.tsx` add `pickupAddress: string | null;` to `Props` and destructure it.

- [ ] **Step 3: courier block.** Replace the existing buyer-paid-courier info box (~975-979, the blue box that reads "{label} delivery is not charged by OshiCart…") so it ALSO shows the pickup address. Keep the existing sentence and append the address:
```tsx
              {buyerPaidCourier && (
                <div className="mt-3 rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800 space-y-2">
                  <p>
                    {deliveryProviderLabel} delivery is not charged by OshiCart. The buyer books and pays the courier directly, and the merchant prepares the parcel for pickup.
                  </p>
                  <div>
                    <p className="font-semibold">Pickup address — give this to your {deliveryProviderLabel} driver:</p>
                    <p>{pickupAddress?.trim() ? pickupAddress : "Contact the merchant for the pickup address."}</p>
                  </div>
                </div>
              )}
```
(`deliveryProviderLabel` is the existing computed label var used in this scope; confirm its name — it may be `deliveryProviderLabel` from `getDeliveryProviderLabel(effectiveDeliveryProvider)`. Use whatever the scope already has.)

- [ ] **Step 4: pickup-method block.** In the `deliveryMethod === "pickup"` branch, when `pickupAddress` is set, show a collect-from note (only if set; omit when null). Find the pickup branch JSX and add:
```tsx
            {deliveryMethod === "pickup" && pickupAddress?.trim() && (
              <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
                <span className="font-semibold">Collect from:</span> {pickupAddress}
              </div>
            )}
```
Place it inside the pickup section (read the file to find where pickup is rendered; if pickup has minimal UI, add this block right after the delivery-method toggle when pickup is selected).

- [ ] **Step 5: success view.** In the order-success confirmation (the lines list ~630-636), when `buyerPaidCourier` and `pickupAddress` is set, include a line like `Pickup address (for your courier): ${pickupAddress}`. Match the existing pattern that builds those success lines.

- [ ] **Step 6:** `npx tsc --noEmit` + `npx eslint "src/app/checkout/[slug]/page.tsx" "src/app/checkout/[slug]/checkout-form.tsx"` clean (pre-existing `_merchantTier`/`<img>` warnings OK).
- [ ] **Step 7:** Commit:
```bash
git add "src/app/checkout/[slug]/page.tsx" "src/app/checkout/[slug]/checkout-form.tsx"
git commit -m "Checkout: show pickup address for couriers and pickup method"
```

---

### Task 5: Build + QA + push
- [ ] **Step 1:** `npm run build` — clean.
- [ ] **Step 2: QA (orchestrator).** With migration 045 applied: temporarily activate the QA merchant (is_active=true, store_status=active) and set `pickup_address` + `enabled_delivery_providers={store,yango}` via SQL. Logged-in settings: the pickup field shows when a courier is enabled; clearing it + Save with Yango on → guard error. Checkout (active store): select Yango → pickup address + driver instruction shown; select Pickup → "Collect from" shown. Reset QA state (is_active=false, store_status=suspended, pickup_address=null, enabled_delivery_providers={store,yango,indrive}, accepted_payment_methods={cod}) and delete temp specs/screenshots.
- [ ] **Step 3:** Push (after user OK): `git push origin master` — deploys the whole delivery + payment feature set. Update `.remember/remember.md`.

## Self-review notes
- Spec coverage: column (T1), settings field+guard (T2), setup field+guard (T3), checkout courier+pickup+success display (T4), build/QA/push (T5).
- Null-address edge: existing merchants default to couriers-enabled with null pickup_address → checkout shows graceful fallback; guard enforces it on their next settings save.
- Migration orchestrator-applied; additive nullable column, no backfill.
