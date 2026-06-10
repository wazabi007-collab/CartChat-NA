# Tier Canonicalization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make subscription tiers consistent everywhere — fix Oshi-Pro's price, make it a public third plan (N$799), make the free trial full-featured (20 products / 50 orders, all features), and route every public surface through one shared plan source so prices can't drift again.

**Architecture:** `src/lib/tier-limits.ts` (+ the DB `tier_limits` table) stay the single source for prices/limits/feature flags. A new `src/lib/plans.ts` derives public plan cards (price + count lines from `TIER_LIMITS`, marketing copy inline) and is consumed by the homepage pricing section, the `/pricing` page, and the subscription checkout — replacing three hardcoded copies.

**Tech Stack:** Next.js 16 (App Router), Supabase (Postgres), Tailwind, TypeScript, lucide-react. No unit-test runner in repo — verification is `npx tsc --noEmit`, `npm run build`, targeted `grep`, a SQL check, and a Playwright visual pass.

**Spec:** `docs/superpowers/specs/2026-06-10-tier-canonicalization-design.md`

**Repo root for all paths/commands:** `chatcart-na/`

---

## Background facts (read before starting)

- Canonical tiers after this change:
  | key | name | price | products | orders/mo | inventory | coupons | branding |
  |-----|------|-------|----------|-----------|-----------|---------|----------|
  | `oshi_start` | Oshi-Start (trial) | Free | 20 | 50 | on | on | removed |
  | `oshi_basic` | Oshi-Storefront | N$149 | 50 | 300 | off | off | removed |
  | `oshi_grow` | Oshi-Automate | N$399 | 200 | 1,000 | on | on | removed |
  | `oshi_pro` | Oshi-Pro | N$799 | -1 (∞) | -1 (∞) | on | on | removed |
- `tier_limits` table columns: `tier, max_products, max_orders_per_month,
  has_inventory, has_coupons, has_branding, price_nad`.
- In `tier-limits.ts`, the `TierLimit` interface field is named `branding`
  (true = OshiCart branding shown). `showBranding(tier)` returns it.
- The homepage `pricing.tsx` and `/pricing` `page.tsx` each hardcode their own
  `TIERS`/`PLANS` arrays with literal `"N$149"`/`"N$399"`. The checkout
  hardcodes `VALID_TIERS = ["oshi_basic","oshi_grow"]` and a local
  `TIER_FEATURES`. These three are what we route through `plans.ts`.
- Checkout already derives its displayed price from
  `TIER_LIMITS[tier].price_nad`, so the Pro price flows there automatically once
  `tier-limits.ts` is fixed; only `VALID_TIERS` + features are hardcoded.
- `/signup?tier=X` ignores the query param (new merchants always start on
  trial) — no signup changes needed; the CTA hrefs stay `/signup?tier=<key>`.
- lucide-react exports `Store`, `BotMessageSquare`, and `Rocket` (used for the
  three plan icons).
- **Migration application:** the implementer only creates the `.sql` file. The
  orchestrator applies it to the hosted Supabase project
  (`pcseqiaqeiiaiqxqtfmw`) via the Supabase MCP after the file lands — do not
  attempt to apply it from the subagent.

---

### Task 1: Fix tier data (migration file + code source)

**Files:**
- Create: `supabase/migrations/040_tier_canonicalization.sql`
- Modify: `src/lib/tier-limits.ts` (the `TIER_LIMITS` object, lines ~14-19)

- [ ] **Step 1: Write the migration file**

```sql
-- 040_tier_canonicalization.sql
-- 1. Oshi-Pro: correct the stale price (was 120000 / N$1,200) to the public N$799.
UPDATE public.tier_limits SET price_nad = 79900 WHERE tier = 'oshi_pro';

-- 2. Free trial (oshi_start): full-featured, volume-capped.
--    Unlock inventory + coupons, remove OshiCart branding, lift caps to 20/50.
UPDATE public.tier_limits
SET max_products         = 20,
    max_orders_per_month = 50,
    has_inventory        = true,
    has_coupons          = true,
    has_branding         = false
WHERE tier = 'oshi_start';
```

- [ ] **Step 2: Update the code source of truth**

In `src/lib/tier-limits.ts`, replace the `oshi_start` and `oshi_pro` lines in
`TIER_LIMITS` (leave `oshi_basic` and `oshi_grow` exactly as they are):

```ts
  oshi_start: { products: 20,  orders_per_month: 50,  inventory: true,  coupons: true,  branding: false, price_nad: 0 },
  oshi_basic: { products: 50,  orders_per_month: 300, inventory: false, coupons: false, branding: false, price_nad: 14900 },
  oshi_grow:  { products: 200, orders_per_month: 1000, inventory: true,  coupons: true,  branding: false, price_nad: 39900 },
  oshi_pro:   { products: -1,  orders_per_month: -1,  inventory: true,  coupons: true,  branding: false, price_nad: 79900 },
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/040_tier_canonicalization.sql src/lib/tier-limits.ts
git commit -m "Align Oshi-Pro price and unlock full-featured trial tier"
```

- [ ] **Step 5: Orchestrator applies the migration**

(Orchestrator, not subagent.) Apply `040_tier_canonicalization.sql` to project
`pcseqiaqeiiaiqxqtfmw` via the Supabase MCP `apply_migration`, then verify with
`execute_sql`:

```sql
SELECT tier, max_products, max_orders_per_month, has_inventory, has_coupons, has_branding, price_nad
FROM tier_limits WHERE tier IN ('oshi_start','oshi_pro') ORDER BY tier;
```

Expected: `oshi_pro` price `79900`; `oshi_start` → `20, 50, true, true, false, 0`.

---

### Task 2: Shared public-plans source

**Files:**
- Create: `src/lib/plans.ts`

- [ ] **Step 1: Create `src/lib/plans.ts`**

```ts
import { TIER_LIMITS, TIER_LABELS, type SubscriptionTier } from "@/lib/tier-limits";

export type PlanIconKey = "store" | "automate" | "pro";

export interface PublicPlan {
  tier: SubscriptionTier;
  name: string;
  priceDisplay: string; // e.g. "N$149" — derived from TIER_LIMITS
  period: string;       // "/month"
  audience: string;
  cta: string;
  href: string;
  highlighted: boolean;
  iconKey: PlanIconKey;
  features: string[];   // count lines (derived) + marketing copy
}

function priceDisplay(tier: SubscriptionTier): string {
  const cents = TIER_LIMITS[tier].price_nad;
  return cents === 0 ? "Free" : `N$${(cents / 100).toLocaleString()}`;
}

function countLines(tier: SubscriptionTier): string[] {
  const { products, orders_per_month } = TIER_LIMITS[tier];
  return [
    products === -1 ? "Unlimited products" : `${products} products`,
    orders_per_month === -1
      ? "Unlimited orders/month"
      : `${orders_per_month.toLocaleString()} orders/month`,
  ];
}

/**
 * Single source of truth for the public, sellable plans (excludes the free
 * trial). Prices and product/order counts are derived from TIER_LIMITS so a
 * price change happens in exactly one place. Consumed by the homepage pricing
 * section, the /pricing page, and the subscription checkout.
 */
export const PUBLIC_PLANS: PublicPlan[] = [
  {
    tier: "oshi_basic",
    name: TIER_LABELS.oshi_basic,
    priceDisplay: priceDisplay("oshi_basic"),
    period: "/month",
    audience: "For vendors, home businesses, and small shops",
    cta: "Start Storefront",
    href: "/signup?tier=oshi_basic",
    highlighted: false,
    iconKey: "store",
    features: [
      ...countLines("oshi_basic"),
      "OshiCart store link",
      "Local payments (EFT, COD, MoMo, eWallet)",
      "Proof-of-payment upload",
      "Sales analytics",
      "No OshiCart branding",
    ],
  },
  {
    tier: "oshi_grow",
    name: TIER_LABELS.oshi_grow,
    priceDisplay: priceDisplay("oshi_grow"),
    period: "/month",
    audience: "For growing sellers who want automated customer updates",
    cta: "Start Automate",
    href: "/signup?tier=oshi_grow",
    highlighted: true,
    iconKey: "automate",
    features: [
      ...countLines("oshi_grow"),
      "Everything in Storefront",
      "Automated WhatsApp updates (confirmed, ready, completed)",
      "Inventory tracking",
      "Coupon & discount codes",
    ],
  },
  {
    tier: "oshi_pro",
    name: TIER_LABELS.oshi_pro,
    priceDisplay: priceDisplay("oshi_pro"),
    period: "/month",
    audience: "For high-volume stores that have outgrown order limits",
    cta: "Start Pro",
    href: "/signup?tier=oshi_pro",
    highlighted: false,
    iconKey: "pro",
    features: [
      ...countLines("oshi_pro"),
      "Everything in Oshi-Automate",
      "Automated WhatsApp order updates",
      "Inventory tracking and coupons",
    ],
  },
];
```

- [ ] **Step 2: Typecheck + sanity grep**

Run: `npx tsc --noEmit`
Expected: no errors (this also confirms `PUBLIC_PLANS` typechecks against `PublicPlan`).

Run: `grep -c "tier:" src/lib/plans.ts`
Expected: `3` (three plan entries).

- [ ] **Step 3: Commit**

```bash
git add src/lib/plans.ts
git commit -m "Add shared PUBLIC_PLANS source derived from tier limits"
```

---

### Task 3: Homepage pricing section consumes the source

**Files:**
- Modify: `src/components/landing/pricing.tsx` (full rewrite of the data + grid + headline)

- [ ] **Step 1: Rewrite `src/components/landing/pricing.tsx`**

```tsx
import Link from "next/link";
import { ArrowRight, BotMessageSquare, Check, Rocket, Store, type LucideIcon } from "lucide-react";
import { PUBLIC_PLANS, type PlanIconKey } from "@/lib/plans";

const ICONS: Record<PlanIconKey, LucideIcon> = {
  store: Store,
  automate: BotMessageSquare,
  pro: Rocket,
};

export function Pricing() {
  return (
    <section id="pricing" className="bg-sand py-16 lg:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-terracotta">
            Simple pricing
          </p>
          <h2 className="mt-3 text-3xl font-black tracking-tight text-walnut sm:text-4xl">
            Plans that scale with your store.
          </h2>
          <p className="mt-3 text-base leading-7 text-walnut-2">
            OshiCart should stay local, simple, and affordable while charging
            properly for automation where it creates real value.
          </p>
        </div>

        <div className="mx-auto mt-10 grid max-w-6xl gap-5 md:grid-cols-3">
          {PUBLIC_PLANS.map((plan) => {
            const Icon = ICONS[plan.iconKey];
            return (
              <div
                key={plan.tier}
                className={`relative rounded-2xl border bg-white p-6 ${
                  plan.highlighted
                    ? "border-terracotta shadow-xl shadow-terracotta/10 ring-2 ring-terracotta"
                    : "border-border-warm shadow-sm"
                }`}
              >
                {plan.highlighted && (
                  <span className="absolute -top-3 left-6 rounded-full bg-terracotta px-3 py-1 text-xs font-black text-white">
                    Best for automation
                  </span>
                )}
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-xl font-black text-walnut">{plan.name}</h3>
                    <p className="mt-1 text-sm font-semibold text-walnut-2">
                      {plan.audience}
                    </p>
                  </div>
                  <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-terracotta-soft text-terracotta">
                    <Icon size={24} />
                  </span>
                </div>
                <div className="mt-6 flex items-end gap-1">
                  <span className="text-5xl font-black tracking-tight text-walnut">
                    {plan.priceDisplay}
                  </span>
                  <span className="pb-1 text-sm font-bold text-walnut-2">
                    {plan.period}
                  </span>
                </div>
                <ul className="mt-6 space-y-3">
                  {plan.features.map((feature) => (
                    <li
                      key={feature}
                      className="flex items-start gap-2 text-sm font-semibold leading-5 text-walnut-2"
                    >
                      <Check size={16} className="mt-0.5 shrink-0 text-acacia" />
                      {feature}
                    </li>
                  ))}
                </ul>
                <Link
                  href={plan.href}
                  className={`mt-7 inline-flex w-full items-center justify-center gap-2 rounded-lg px-4 py-3 text-sm font-black transition ${
                    plan.highlighted
                      ? "bg-terracotta text-white hover:bg-[#234B86]"
                      : "bg-walnut text-white hover:bg-[#1d2a3c]"
                  }`}
                >
                  {plan.cta} <ArrowRight size={16} />
                </Link>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Typecheck + lint**

Run: `npx tsc --noEmit`
Expected: no errors.
Run: `npx eslint src/components/landing/pricing.tsx`
Expected: clean.

- [ ] **Step 3: Commit**

```bash
git add src/components/landing/pricing.tsx
git commit -m "Render homepage pricing from shared PUBLIC_PLANS (3 plans)"
```

---

### Task 4: `/pricing` page consumes the source

**Files:**
- Modify: `src/app/pricing/page.tsx` (replace local `PLANS`, headline, grid; `PricingCard`/`FAQ` helpers stay)

- [ ] **Step 1: Replace the imports + `PLANS` array + page header**

At the top of `src/app/pricing/page.tsx`, replace the lucide import line and
delete the local `PLANS` array. The imports become:

```tsx
import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, BotMessageSquare, Check, Rocket, Store } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { PublicNavbar } from "@/components/public-navbar";
import { PUBLIC_PLANS, type PlanIconKey } from "@/lib/plans";

const ICONS: Record<PlanIconKey, LucideIcon> = {
  store: Store,
  automate: BotMessageSquare,
  pro: Rocket,
};
```

(Keep the existing `export const metadata` block as-is. Delete the entire
`const PLANS = [ ... ];` array.)

- [ ] **Step 2: Update the heading and the grid mapping**

In the returned JSX, change the `<h1>` text and the grid. Replace:

```tsx
            <h1 className="text-4xl font-black tracking-tight text-walnut sm:text-5xl">
              Two simple categories for Namibian sellers.
            </h1>
```
with:
```tsx
            <h1 className="text-4xl font-black tracking-tight text-walnut sm:text-5xl">
              Plans that scale with your store.
            </h1>
```

Replace the plans grid:
```tsx
          <div className="mx-auto mt-12 grid max-w-5xl gap-5 md:grid-cols-2">
            {PLANS.map((plan) => (
              <PricingCard key={plan.name} {...plan} />
            ))}
          </div>
```
with:
```tsx
          <div className="mx-auto mt-12 grid max-w-6xl gap-5 md:grid-cols-3">
            {PUBLIC_PLANS.map((plan) => (
              <PricingCard
                key={plan.tier}
                name={plan.name}
                price={plan.priceDisplay}
                period={plan.period}
                audience={plan.audience}
                features={plan.features}
                cta={plan.cta}
                href={plan.href}
                icon={ICONS[plan.iconKey]}
                highlighted={plan.highlighted}
              />
            ))}
          </div>
```

(The `PricingCard` and `FAQ` helper components and the FAQ block stay exactly
as they are — `PricingCard`'s props already match these names.)

- [ ] **Step 3: Typecheck + lint**

Run: `npx tsc --noEmit`
Expected: no errors.
Run: `npx eslint src/app/pricing/page.tsx`
Expected: clean (no unused `LucideIcon`/icon imports — all are used by `ICONS` and `PricingCard`).

- [ ] **Step 4: Commit**

```bash
git add src/app/pricing/page.tsx
git commit -m "Render /pricing from shared PUBLIC_PLANS (3 plans)"
```

---

### Task 5: Checkout uses the source for valid tiers + features

**Files:**
- Modify: `src/app/pricing/checkout/page.tsx` (`VALID_TIERS`, remove local `TIER_FEATURES`, features lookup)

- [ ] **Step 1: Import the source and derive `VALID_TIERS`**

In `src/app/pricing/checkout/page.tsx`, add to the imports:

```tsx
import { PUBLIC_PLANS } from "@/lib/plans";
```

Replace:
```tsx
const VALID_TIERS: SubscriptionTier[] = ["oshi_basic", "oshi_grow"];
```
with:
```tsx
const VALID_TIERS: SubscriptionTier[] = PUBLIC_PLANS.map((p) => p.tier);
```

- [ ] **Step 2: Delete the local `TIER_FEATURES` and source features from the plan**

Delete the entire `const TIER_FEATURES: Record<string, string[]> = { ... };`
block (the `oshi_basic`/`oshi_grow` literal arrays).

Replace the features line:
```tsx
  const features = TIER_FEATURES[tier] || [];
```
with:
```tsx
  const features = PUBLIC_PLANS.find((p) => p.tier === tier)?.features ?? [];
```

(Everything else — `tierLimit`, `tierLabel`, `priceDisplay` derived from
`TIER_LIMITS`, the reference, DPO/WhatsApp flow, the "Switch plan" pills that
map `VALID_TIERS` — is unchanged and now includes Pro automatically.)

- [ ] **Step 3: Typecheck + lint**

Run: `npx tsc --noEmit`
Expected: no errors.
Run: `npx eslint src/app/pricing/checkout/page.tsx`
Expected: clean.

- [ ] **Step 4: Commit**

```bash
git add src/app/pricing/checkout/page.tsx
git commit -m "Drive checkout valid tiers and features from PUBLIC_PLANS"
```

---

### Task 6: Sweep, build, and manual verification

- [ ] **Step 1: Confirm no hardcoded prices remain in the pricing surfaces**

Run: `grep -rn "N\$149\|N\$399\|N\$499\|N\$799\|N\$1,200\|49900\|120000\|19900" src/components/landing/pricing.tsx src/app/pricing/page.tsx src/app/pricing/checkout/page.tsx`
Expected: no output (all prices now come from `TIER_LIMITS` via `plans.ts`).

- [ ] **Step 2: Confirm no surface hardcodes oshi_start feature flags**

Run: `grep -rn "oshi_start" src/ | grep -iv "tier-limits\|plans.ts\|default\|?? \"oshi_start\"\|'oshi_start'"`
Review any hits: they should only be tier *defaults* (e.g. `tier ?? "oshi_start"`), never hardcoded feature decisions. If a surface gates a feature with `tier === "oshi_start"` instead of `hasTierFeature(...)`, note it as DONE_WITH_CONCERNS (out of scope to fix here unless trivial).

- [ ] **Step 3: Full build**

Run: `npm run build`
Expected: build succeeds, 0 type errors.

- [ ] **Step 4: Manual visual + behavior pass (Playwright or manual, local dev)**

Start `npm run dev`, then verify:
1. Homepage `#pricing`: three cards — N$149 / N$399 / N$799 — with correct
   counts (50/300, 200/1,000, Unlimited/Unlimited); Automate highlighted;
   headline "Plans that scale with your store."; cards lay out cleanly at
   1440px and 390px (3-col → stacked).
2. `/pricing`: same three cards + FAQ intact.
3. `/pricing/checkout?tier=oshi_pro`: renders N$799, unlimited features, does
   not redirect; "Switch plan" pills show all three tiers.
4. `/pricing/checkout?tier=oshi_basic` and `?tier=oshi_grow`: unchanged.
5. `/pricing/checkout?tier=oshi_start` (or any invalid value): redirects to
   `/#pricing`.
6. (If a trial merchant login is available) dashboard nav shows Coupons,
   inventory is available, storefront has no "Powered by OshiCart"; otherwise
   rely on the Task 1 SQL check for the data.

- [ ] **Step 5: Final commit (if any fixups) and update handoff**

```bash
git add -A && git commit -m "Tier canonicalization verification fixups"
```

Update `.remember/remember.md`: sub-project A (tier canonicalization) complete;
note whether pushed; the migration must be applied to prod (Task 1 Step 5);
sub-project B (subscription management page) is the next piece.

---

## Self-review notes

- **Spec coverage:** data fix — migration + tier-limits.ts (T1); shared source
  `plans.ts` (T2); homepage (T3), `/pricing` (T4), checkout (T5) consume it;
  trial ripple verified + sweep + build + manual (T6). Trial entitlement change
  is in T1 (data) and verified in T6. Pro-as-public-plan covered by T2–T5.
- **No new WhatsApp/DPO logic**, no enforcement changes — matches spec
  non-goals. Checkout DPO/EFT flow untouched.
- **Type consistency:** `PublicPlan`/`PlanIconKey`/`PUBLIC_PLANS` defined in T2
  and consumed with identical names/shape in T3–T5. `ICONS` map repeated in T3
  and T4 (3 lines each) — intentional, keeps lucide out of the data module.
  `PricingCard` prop names in T4 match the existing component signature
  (`name, price, period, audience, features, cta, href, icon, highlighted`).
- **Migration application** is an orchestrator step (T1 S5), mirroring the POP
  plan, because the auto-classifier blocks DB migrations from subagents.
