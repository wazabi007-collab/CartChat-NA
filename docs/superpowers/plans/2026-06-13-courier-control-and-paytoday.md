# Courier Control, PayToday Method, Courier Copy & Payment-Label Consistency — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add merchant courier control, promote PayToday to a first-class payment method, tighten "buyer books courier" copy, and make payment-method labels consistent across the public site, dashboard, checkout, and invoice via shared helpers.

**Architecture:** Two new `merchants` columns (`enabled_delivery_providers`, `paytoday_number`) drive checkout filtering and a new payment method. Label drift is killed by centralizing labels in `constants.ts` helpers. Changes follow existing patterns (the `pay2cell` method, the delivery-fee/scheduling settings cards).

**Tech Stack:** Next.js 16 (App Router, server + client components), Supabase (Postgres, RLS), Tailwind v4, TypeScript.

**Spec:** `docs/superpowers/specs/2026-06-13-courier-control-and-paytoday-design.md`

**Repo root for all paths/commands:** `chatcart-na/`

---

## Background facts (read before starting)

- **The dev server talks to the PROD Supabase project** (no separate staging DB).
  So migration `044` MUST be applied to prod before the new columns can be read.
  The orchestrator applies it via Supabase MCP **after explicit user approval**;
  **implementer subagents must NOT apply migrations.**
- `PaymentMethod` type: `src/types/database.ts:14`. `EwalletProvider`: same file
  (multi-line union after the Maris work). merchants `Row`/`Insert`/`Update` are
  in the same file.
- `PAYMENT_METHODS` / `EWALLET_PROVIDERS`: `src/lib/constants.ts:33` / `:41`.
- Settings payment + delivery: `src/app/(dashboard)/dashboard/settings/page.tsx`
  — Delivery Fee card at ~596, payment method blocks at ~467-593, pay2cell field
  at ~551-567, form state at ~53-71, load at ~96-114, save at ~139-161.
- Setup wizard: `src/app/(dashboard)/dashboard/setup/page.tsx` — `PAYMENT_METHODS.map`
  at 627, momo/pay2cell blocks at 696-720, `selectedMethods` state at 104, form
  defaults at ~39-42, `offersPickup`/`offersDelivery` toggles, merchant `.insert`
  at 277-292 (`accepted_payment_methods: selectedMethods`, `delivery_fee_nad`).
- Checkout loader: `src/app/checkout/[slug]/page.tsx` — merchant `.select` at 43,
  CheckoutForm props at ~141-154 (incl. `pay2cellNumber`).
- Checkout form: `src/app/checkout/[slug]/checkout-form.tsx` — `DELIVERY_PROVIDERS`
  at 113-156, local `getEwalletLabel` at 109-111, `deliveryProvider` state at 209
  (default `"store"`), provider radios `.map` at 935, buyer info box at 975-979,
  `courierNote` at ~273-278, pay2cell instructions block at ~1202-1220, props
  interface at ~52-74.
- Announce route: `src/app/api/orders/announce/route.ts` — `deliveryProviderLabel`
  map + `deliveryLine` (added in prior work), 6-var merchant alert.
- Orders list: `src/app/(dashboard)/dashboard/orders/page.tsx` — delivery label
  map at 71-75, payment-method ternary at 188.
- Subscription: `src/app/(dashboard)/dashboard/subscription/page.tsx:40` — payment
  label map.
- Invoice: `src/app/invoice/[orderId]/page.tsx` — `.select` at 42, `paymentMethodLabel`
  at 126-131, `ewalletLabel` at 133-138, payment rows at ~395-408.
- Public copy: `src/components/landing/how-it-works.tsx:34`, `landing/faq.tsx:12`,
  `landing/payment-trust-bar.tsx:3-9` (METHODS, lucide icons), `src/app/terms/page.tsx:40`,
  `src/app/layout.tsx:40` (keyword `"MoMo Namibia"`).

---

### Task 1: Migration 044 + database types

**Files:**
- Create: `supabase/migrations/044_delivery_providers_and_paytoday.sql`
- Modify: `src/types/database.ts`

- [ ] **Step 1: Write the migration**

`supabase/migrations/044_delivery_providers_and_paytoday.sql`:
```sql
-- Merchant-controlled delivery couriers + PayToday as its own payment method.
ALTER TABLE public.merchants
  ADD COLUMN IF NOT EXISTS enabled_delivery_providers text[] NOT NULL DEFAULT '{store,yango,indrive}',
  ADD COLUMN IF NOT EXISTS paytoday_number text DEFAULT NULL;

-- Backfill: merchants who used PayToday-as-eWallet move to the new method.
UPDATE public.merchants
SET paytoday_number = ewallet_number,
    accepted_payment_methods = array_replace(accepted_payment_methods, 'ewallet', 'paytoday'),
    ewallet_provider = NULL,
    ewallet_number = NULL
WHERE ewallet_provider = 'paytoday';
```

- [ ] **Step 2: Update the TypeScript types**

In `src/types/database.ts`:
- `PaymentMethod` (line 14): add `"paytoday"` →
  `export type PaymentMethod = "eft" | "cod" | "momo" | "ewallet" | "pay2cell" | "paytoday" | "dpo";`
- `EwalletProvider`: remove the `"paytoday"` member (keep fnb_ewallet, bluewallet,
  easywallet, nedbank_money, paypulse).
- merchants `Row`: add `enabled_delivery_providers: string[];` and
  `paytoday_number: string | null;`
- merchants `Insert` and `Update`: add `enabled_delivery_providers?: string[];`
  and `paytoday_number?: string | null;`

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors (other files referencing these are updated in later tasks;
if a missing-property error appears in an unmodified file, note it for the
relevant task — do not fix unrelated code here).

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/044_delivery_providers_and_paytoday.sql src/types/database.ts
git commit -m "Add migration 044 + types for courier control and PayToday"
```

> **Orchestrator action (NOT the implementer):** after this task, ask the user
> to approve applying migration 044 to prod, then apply it via Supabase MCP and
> verify both columns exist + the backfill ran. Subsequent tasks need the columns.

---

### Task 2: Payment-method constants + shared label helpers

**Files:**
- Modify: `src/lib/constants.ts`

- [ ] **Step 1: Add PayToday method, remove it from eWallet providers**

In `PAYMENT_METHODS` (line 33), add after the `pay2cell` entry:
```ts
  { value: "paytoday", label: "PayToday", icon: "⚡" },
```
In `EWALLET_PROVIDERS` (line 41), remove the line
`{ value: "paytoday", label: "PayToday" },`.

- [ ] **Step 2: Add shared label helpers (DRY)**

Append to `src/lib/constants.ts`:
```ts
export function getPaymentMethodLabel(value: string | null | undefined): string {
  return PAYMENT_METHODS.find((m) => m.value === value)?.label ?? "Payment";
}

export function getEwalletProviderLabel(value: string | null | undefined): string {
  return EWALLET_PROVIDERS.find((p) => p.value === value)?.label ?? "eWallet";
}
```

- [ ] **Step 2b: Typecheck + commit**

Run: `npx tsc --noEmit` (expect no NEW errors in this file).
```bash
git add src/lib/constants.ts
git commit -m "Add PayToday method and shared payment-label helpers"
```

---

### Task 3: Settings — courier checkboxes + PayToday field

**Files:**
- Modify: `src/app/(dashboard)/dashboard/settings/page.tsx`

- [ ] **Step 1: Form state + load + save**

- Add to the `form` state object (~line 53-71): `paytoday_number: ""` and
  `enabled_delivery_providers: ["store", "yango", "indrive"] as string[]`.
- In the load effect (~96-114): `paytoday_number: merchant.paytoday_number || ""`
  and `enabled_delivery_providers: merchant.enabled_delivery_providers ?? ["store","yango","indrive"]`.
- In the save `.update({...})` (~139-161): `paytoday_number: form.paytoday_number || null`
  and `enabled_delivery_providers: form.enabled_delivery_providers`.

- [ ] **Step 2: PayToday number field (mirror Pay2Cell)**

After the Pay2Cell conditional block (~551-567), add an analogous block:
```tsx
          {form.accepted_payment_methods.includes("paytoday") && (
            <div>
              <label className={label}>PayToday Number</label>
              <input
                type="tel"
                value={form.paytoday_number}
                onChange={(e) => setForm((p) => ({ ...p, paytoday_number: e.target.value }))}
                placeholder="+264 81 123 4567"
                className={`${inputBase} ${focusGreen}`}
              />
              <p className={helperText}>
                Customers will send PayToday payments to this number.
              </p>
            </div>
          )}
```

- [ ] **Step 3: "Delivery options" courier checkboxes + guard**

Inside the Delivery Fee card (`src/app/(dashboard)/dashboard/settings/page.tsx`
~596-633), after the delivery-estimate field, add a courier block. Use this
helper just above the `return` (with the other consts) and the JSX inside the
card:
```tsx
  const DELIVERY_OPTIONS = [
    { value: "store", label: "Store delivery" },
    { value: "yango", label: "Yango" },
    { value: "indrive", label: "inDrive" },
  ];
  const toggleProvider = (value: string, checked: boolean) =>
    setForm((p) => ({
      ...p,
      enabled_delivery_providers: checked
        ? [...p.enabled_delivery_providers, value]
        : p.enabled_delivery_providers.filter((v) => v !== value),
    }));
```
```tsx
          <div className="border-t border-gray-100 pt-4">
            <label className={label}>Delivery options shown at checkout</label>
            <div className="mt-2 space-y-2">
              {DELIVERY_OPTIONS.map((opt) => (
                <label key={opt.value} className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.enabled_delivery_providers.includes(opt.value)}
                    onChange={(e) => toggleProvider(opt.value, e.target.checked)}
                  />
                  <span className="text-sm text-gray-700">{opt.label}</span>
                </label>
              ))}
            </div>
            <p className={helperText}>
              Yango and inDrive are buyer-booked — the buyer pays the courier and you just prepare the parcel.
            </p>
          </div>
```

- [ ] **Step 4: Block saving zero couriers**

In the save handler (the `handleSave`/submit function, near the top of the
`.update`), add a guard BEFORE the update call:
```tsx
    if (form.enabled_delivery_providers.length === 0) {
      setError("Select at least one delivery option (Store, Yango, or inDrive).");
      setSaving(false);
      return;
    }
```
(Match the existing error-state setter name in this file — read it; it sets a
message shown in the form's error area. Match the existing `setSaving`/`setLoading`
flag name too.)

- [ ] **Step 5: Typecheck, lint, commit**

Run: `npx tsc --noEmit` and `npx eslint "src/app/(dashboard)/dashboard/settings/page.tsx"`
Expected: clean.
```bash
git add "src/app/(dashboard)/dashboard/settings/page.tsx"
git commit -m "Settings: courier checkboxes (with guard) and PayToday field"
```

---

### Task 4: Setup wizard — courier checkboxes + PayToday field

**Files:**
- Modify: `src/app/(dashboard)/dashboard/setup/page.tsx`

- [ ] **Step 1: Form state + persistence**

- Add `paytoday_number: ""` to the form defaults (~39-42).
- Add state `const [enabledProviders, setEnabledProviders] = useState<string[]>(["store","yango","indrive"]);`
  near `selectedMethods` (line 104). Include it in the draft persist/restore
  (the `JSON.stringify({... })` at ~149 and the restore at ~126) the same way
  `selectedMethods` is handled.
- In the merchant `.insert({...})` (277-292): add
  `paytoday_number: form.paytoday_number || null` and
  `enabled_delivery_providers: enabledProviders`.

- [ ] **Step 2: PayToday number block (mirror momo/pay2cell at 696-720)**

After the pay2cell block (~709-720), add:
```tsx
              {/* PayToday number — shown if PayToday selected */}
              {selectedMethods.includes("paytoday") && (
                <div className="border-t pt-3">
                  <PhoneInput
                    id="paytoday-number"
                    labelText="PayToday Number"
                    value={form.paytoday_number}
                    onChange={(val) => update("paytoday_number", val)}
                    variant="green"
                  />
                </div>
              )}
```
(The PayToday checkbox itself appears automatically — setup renders
`PAYMENT_METHODS.map` at line 627, and Task 2 added `paytoday`.)

- [ ] **Step 3: Courier checkboxes in the delivery step**

In the delivery step (near the delivery-fee input at ~573, gated by
`offersDelivery`), add a courier multi-select mirroring Step 1 of Task 3
(checkboxes for Store delivery / Yango / inDrive bound to `enabledProviders` via
`setEnabledProviders`). Helper text: "Yango and inDrive are buyer-booked." A
zero-selected guard is optional here (default is all three); if you add one, also
gate the step's Continue/Submit on `enabledProviders.length > 0` when
`offersDelivery`.

- [ ] **Step 4: Typecheck, lint, commit**

Run: `npx tsc --noEmit` and `npx eslint "src/app/(dashboard)/dashboard/setup/page.tsx"`
```bash
git add "src/app/(dashboard)/dashboard/setup/page.tsx"
git commit -m "Setup wizard: courier checkboxes and PayToday field"
```

---

### Task 5: Checkout — provider filtering + PayToday method

**Files:**
- Modify: `src/app/checkout/[slug]/page.tsx`
- Modify: `src/app/checkout/[slug]/checkout-form.tsx`

- [ ] **Step 1: Loader passes the new fields**

In `checkout/[slug]/page.tsx`: add `enabled_delivery_providers, paytoday_number`
to the merchant `.select(...)` string (line 43). Pass two new props to
`<CheckoutForm>` (~141-154):
```tsx
          paytodayNumber={merchant.paytoday_number ?? null}
          enabledDeliveryProviders={merchant.enabled_delivery_providers ?? ["store", "yango", "indrive"]}
```

- [ ] **Step 2: checkout-form props + provider filtering + default**

In `checkout-form.tsx`:
- Add to `Props` (~52-74): `paytodayNumber: string | null;` and
  `enabledDeliveryProviders: string[];`. Destructure them in the component
  signature.
- Replace the local `getEwalletLabel` (109-111) by importing the shared helper:
  add `getEwalletProviderLabel` to the `@/lib/constants` import and replace
  call sites `getEwalletLabel(ewalletProvider)` → `getEwalletProviderLabel(ewalletProvider)`
  (delete the local function).
- Compute the visible providers from `DELIVERY_PROVIDERS`:
```tsx
  const visibleDeliveryProviders = DELIVERY_PROVIDERS.filter((p) =>
    enabledDeliveryProviders.includes(p.value)
  );
```
- Default the `deliveryProvider` state to the first enabled provider:
  change line 209 to
```tsx
  const [deliveryProvider, setDeliveryProvider] = useState<DeliveryProvider>(
    (enabledDeliveryProviders[0] as DeliveryProvider) ?? "store"
  );
```
- In the provider radios `.map` (line 935), map over `visibleDeliveryProviders`
  instead of `DELIVERY_PROVIDERS`.
- Guard the selected provider: add an effect so if `deliveryProvider` is not in
  the enabled set, reset it to the first enabled:
```tsx
  useEffect(() => {
    if (!enabledDeliveryProviders.includes(deliveryProvider)) {
      setDeliveryProvider((enabledDeliveryProviders[0] as DeliveryProvider) ?? "store");
    }
  }, [enabledDeliveryProviders, deliveryProvider]);
```
  (Place it with the other `useEffect`s; `useEffect` is already imported, else add it.)

- [ ] **Step 3: PayToday payment instructions block (mirror Pay2Cell ~1202-1220)**

After the Pay2Cell instructions block, add:
```tsx
        {paymentMethod === "paytoday" && (
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 text-sm text-purple-800 space-y-1">
            <p className="font-medium">PayToday Payment</p>
            {paytodayNumber ? (
              <>
                <p>
                  Send <span className="font-bold">{formatPrice(total)}</span> via PayToday to:
                </p>
                <p className="font-bold text-lg">{paytodayNumber}</p>
                <p className="text-xs mt-1">
                  Open your PayToday app and send to this number. Upload proof of payment below.
                </p>
              </>
            ) : (
              <p>Contact the merchant for their PayToday number.</p>
            )}
          </div>
        )}
```
(PayToday appears as a selectable method automatically — the radios map
`acceptedPaymentMethods`, and `PAYMENT_METHODS` now includes `paytoday`. Proof
upload already applies to all non-COD methods — confirm the existing
proof-upload condition includes `paytoday`; it should, as it excludes only
`cod`.)

- [ ] **Step 4: Typecheck, lint, commit**

Run: `npx tsc --noEmit` and
`npx eslint "src/app/checkout/[slug]/page.tsx" "src/app/checkout/[slug]/checkout-form.tsx"`
```bash
git add "src/app/checkout/[slug]/page.tsx" "src/app/checkout/[slug]/checkout-form.tsx"
git commit -m "Checkout: filter delivery couriers and add PayToday method"
```

---

### Task 6: Invoice — PayToday row + label helpers

**Files:**
- Modify: `src/app/invoice/[orderId]/page.tsx`

- [ ] **Step 1: Select paytoday_number**

Add `paytoday_number` to the merchant `.select` (line 42) and to the merchant
type (the inline `momo_number/ewallet_*` block at ~61-63): `paytoday_number: string | null;`.

- [ ] **Step 2: Replace hardcoded label maps with shared helpers**

- Import `getPaymentMethodLabel, getEwalletProviderLabel` from `@/lib/constants`.
- Delete the local `paymentMethodLabel` (126-131) and `ewalletLabel` (133-138)
  maps; replace their use sites:
  - where `paymentMethodLabel[order.payment_method]` is used → `getPaymentMethodLabel(order.payment_method)`
  - where `ewalletLabel[merchant.ewallet_provider ?? ""]` is used (line ~407) →
    `getEwalletProviderLabel(merchant.ewallet_provider)`

- [ ] **Step 3: PayToday payment row (mirror the Pay2Cell/eWallet rows ~395-408)**

```tsx
              {order.payment_method === "paytoday" && (
                <PaymentRow label="PayToday Number" value={merchant.paytoday_number ?? "—"} />
              )}
```
(Also confirm a `pay2cell` row exists; if the invoice lacks one, add it the same
way using `merchant.pay2cell_number` — it should already be selected; if not,
add `pay2cell_number` to the `.select` too. Keep this minimal — only add what's
missing.)

- [ ] **Step 4: Typecheck, lint, commit**

Run: `npx tsc --noEmit` and `npx eslint "src/app/invoice/[orderId]/page.tsx"`
```bash
git add "src/app/invoice/[orderId]/page.tsx"
git commit -m "Invoice: PayToday row and shared payment-label helpers"
```

---

### Task 7: Courier copy + dashboard/subscription labels

**Files:**
- Modify: `src/app/api/orders/announce/route.ts`
- Modify: `src/app/(dashboard)/dashboard/orders/page.tsx`
- Modify: `src/app/(dashboard)/dashboard/subscription/page.tsx`
- Modify: `src/app/checkout/[slug]/checkout-form.tsx`

- [ ] **Step 1: WhatsApp delivery line wording**

In `api/orders/announce/route.ts`, update the `deliveryProviderLabel` map values:
```ts
    yango: "Yango (buyer books & pays courier)",
    indrive: "inDrive (buyer books & pays courier)",
```
(store unchanged.)

- [ ] **Step 2: Orders list — delivery label + payment label helper**

In `(dashboard)/dashboard/orders/page.tsx`:
- Update the `deliveryProviderLabel` map (71-75):
  `yango: "Yango — buyer books & pays courier"`, `indrive: "inDrive — buyer books & pays courier"`.
- Replace the payment-method ternary at line 188 (which wrongly maps
  pay2cell/paytoday → "EFT") with `getPaymentMethodLabel(order.payment_method)`
  (import it from `@/lib/constants`). Keep the existing short "COD" if the design
  prefers it — but `getPaymentMethodLabel` returns "Cash on Delivery"; that's
  acceptable and correct. Use the helper.

- [ ] **Step 3: Subscription label map**

In `(dashboard)/dashboard/subscription/page.tsx`, replace the local payment
label map (line 40) usage with `getPaymentMethodLabel(...)` (import from
`@/lib/constants`); delete the local map if now unused.

- [ ] **Step 4: Order notes wording**

In `checkout-form.tsx` `courierNote` (~273-278), append to the sentence:
` Prepare the parcel for courier pickup.` so it reads
`"... Courier fee is not included in this OshiCart order. Prepare the parcel for courier pickup."`

- [ ] **Step 5: Typecheck, lint, commit**

Run: `npx tsc --noEmit` and `npx eslint "src/app/api/orders/announce/route.ts" "src/app/(dashboard)/dashboard/orders/page.tsx" "src/app/(dashboard)/dashboard/subscription/page.tsx" "src/app/checkout/[slug]/checkout-form.tsx"`
```bash
git add "src/app/api/orders/announce/route.ts" "src/app/(dashboard)/dashboard/orders/page.tsx" "src/app/(dashboard)/dashboard/subscription/page.tsx" "src/app/checkout/[slug]/checkout-form.tsx"
git commit -m "Tighten courier copy and use shared payment labels in dashboard"
```

---

### Task 8: Public site payment copy

**Files:**
- Modify: `src/components/landing/how-it-works.tsx`
- Modify: `src/components/landing/faq.tsx`
- Modify: `src/components/landing/payment-trust-bar.tsx`
- Modify: `src/app/terms/page.tsx`
- Modify: `src/app/layout.tsx`

- [ ] **Step 1: MoMo → MTC Maris in copy**

- `landing/how-it-works.tsx:34`: `"Accept EFT, PayToday, Pay2Cell, eWallet, MoMo, or cash on delivery..."`
  → replace `MoMo` with `MTC Maris`.
- `landing/faq.tsx:12`: `"EFT, PayToday, FNB Pay2Cell, eWallet, MoMo, and Cash on Delivery..."`
  → replace `MoMo` with `MTC Maris`.
- `terms/page.tsx:40`: `"... Cash on Delivery, MTC MoMo, FNB Pay2Cell, and eWallet services."`
  → `MTC MoMo` → `MTC Maris`.
- `layout.tsx:40`: keyword `"MoMo Namibia"` → `"MTC Maris Namibia"`.

- [ ] **Step 2: Trust bar — add MTC Maris**

In `landing/payment-trust-bar.tsx` `METHODS` (3-9), add an entry so the list is
PayToday / EFT / Pay2Cell / eWallet / MTC Maris / Cash on Delivery. Use an
existing lucide icon already imported (e.g. `Smartphone` for MTC Maris):
```tsx
  { name: "MTC Maris", icon: Smartphone },
```
(Insert before "Cash on Delivery". Do NOT change the icon style or reintroduce
the reverted brand-SVG homepage revamp.)

- [ ] **Step 3: Typecheck, lint, commit**

Run: `npx tsc --noEmit` and `npx eslint src/components/landing/ "src/app/terms/page.tsx" "src/app/layout.tsx"`
```bash
git add src/components/landing/how-it-works.tsx src/components/landing/faq.tsx src/components/landing/payment-trust-bar.tsx "src/app/terms/page.tsx" "src/app/layout.tsx"
git commit -m "Public site: MTC Maris rename and trust-bar entry"
```

---

### Task 9: Build + QA verification

- [ ] **Step 1: Full build**

Run: `npm run build`
Expected: succeeds, 0 type errors.

- [ ] **Step 2: QA pass (orchestrator, logged-in QA merchant)**

Start `npm run dev`. Using a temp Playwright spec with `loginAsMerchant`
(env: `export SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL` from `.env.local`, plus
`SUPABASE_SERVICE_ROLE_KEY`, `TEST_MERCHANT_EMAIL=oshicart-test-8956093@example.com`,
`PLAYWRIGHT_BASE_URL=http://localhost:3000`), verify:
1. Settings shows the 3 delivery-option checkboxes + PayToday field; unticking
   all couriers + Save shows the guard error and does not save.
2. Set merchant `enabled_delivery_providers={store,indrive}` (via settings save
   or SQL) → open checkout (preview cookie) → only Store + inDrive show, default
   selected = Store.
3. Enable PayToday + set a number (settings) → checkout shows the PayToday method
   with the number; an invoice for a `paytoday` order shows the PayToday row.
4. Public homepage + /faq + /terms show "MTC Maris" (no "MoMo"); trust bar lists
   MTC Maris.
5. (If feasible) place a QA Yango delivery order → orders list shows
   "Yango — buyer books & pays courier".
Reset QA merchant state afterward (enabled_delivery_providers back to all three,
paytoday_number null, accepted_payment_methods restored) and delete temp specs.

- [ ] **Step 3: Update handoff**

Update `.remember/remember.md`: feature done; whether pushed; migration 044
applied.

---

## Self-review notes

- **Spec coverage:** courier control (T1 col, T3 settings, T4 setup, T5 checkout);
  copy tightening (T7); PayToday method (T1 col/type, T2 constants, T3 settings,
  T4 setup, T5 checkout, T6 invoice); label consistency + public copy (T2 helpers,
  T6 invoice, T7 orders/subscription, T8 landing/terms/layout). Migration + backfill
  in T1.
- **Migration discipline:** T1 creates it; orchestrator applies to prod after user
  approval; implementers never apply. Dev hits prod DB, so apply before T3+ QA.
- **DRY:** labels centralized in `constants.ts` helpers; local maps deleted.
- **No placeholders;** repetitive blocks reference the concrete in-repo `pay2cell`
  pattern with exact code given for the new bits.
- **Backward-compat:** `momo` value unchanged (label only, already shipped);
  new columns additive with safe defaults; PayToday backfill handles old eWallet
  data; trust bar keeps reverted-safe lucide icons.
