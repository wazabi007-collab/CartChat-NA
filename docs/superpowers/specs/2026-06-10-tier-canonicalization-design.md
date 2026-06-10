# Tier Canonicalization — Design

**Date:** 2026-06-10
**Scope:** chatcart-na (Next.js + Supabase). Sub-project A of the subscription work; prerequisite for the subscription-management page (sub-project B).

## Problem

Subscription tiers are presented inconsistently because each surface hardcodes
its own prices/limits:

- **Public site** (homepage `pricing.tsx`, `/pricing`, checkout) sells **two**
  paid plans: Oshi-Storefront N$149 (50 products / 300 orders) and
  Oshi-Automate N$399 (200 products / 1,000 orders).
- **Backend** has **four** tiers: those two plus the free trial
  (`oshi_start`, 10 products) and a hidden `oshi_pro` (unlimited).
- **`oshi_pro` price is wrong in production:** `tier_limits.oshi_pro.price_nad`
  is `120000` (N$1,200) in the DB but `49900` (N$499) in code
  (`src/lib/tier-limits.ts`) — the 029 "pricing alignment" migration updated
  basic and grow but never pro.
- **Live data:** 15 merchants on the free trial, **7 on `oshi_pro`**, 0 on the
  two publicly-sold plans. `oshi_pro` is in real use as an admin-comped
  unlimited tier.

Decision (made with user): **make Oshi-Pro a public third plan priced at
N$799/mo (unlimited products + orders).** Canonical ladder:

| Tier key | Name | Price | Products | Orders/mo |
|----------|------|-------|----------|-----------|
| `oshi_start` | Oshi-Start (free trial) | Free | 10 | 20 |
| `oshi_basic` | Oshi-Storefront | N$149 | 50 | 300 |
| `oshi_grow` | Oshi-Automate | N$399 | 200 | 1,000 |
| `oshi_pro` | Oshi-Pro | **N$799** | Unlimited | Unlimited |

## Design

### 1. Fix the data

- **Migration `040_align_oshi_pro_pricing.sql`:**
  `UPDATE public.tier_limits SET price_nad = 79900 WHERE tier = 'oshi_pro';`
  Apply to production Supabase (project pcseqiaqeiiaiqxqtfmw). Limits stay
  `-1/-1` (already correct).
- **`src/lib/tier-limits.ts`:** set `oshi_pro.price_nad` `49900 → 79900`.
  This file stays the single code-side source of truth for prices/limits.

### 2. Single source for public plan presentation — `src/lib/plans.ts` (new)

Root-cause fix for the drift. One exported array drives the homepage, the
`/pricing` page, and the checkout's valid-tier list and feature bullets.

```ts
import { TIER_LIMITS, TIER_LABELS, type SubscriptionTier } from "@/lib/tier-limits";

export interface PublicPlan {
  tier: SubscriptionTier;      // oshi_basic | oshi_grow | oshi_pro
  name: string;                // TIER_LABELS[tier]
  priceDisplay: string;        // derived from TIER_LIMITS[tier].price_nad
  audience: string;
  cta: string;
  highlighted: boolean;
  iconKey: "store" | "automate" | "pro"; // mapped to lucide in each component
  features: string[];          // first lines derived from limits, rest = copy
}
```

- `priceDisplay` and the "X products" / "Y orders/month" feature lines are
  **derived from `TIER_LIMITS`** (`-1 → "Unlimited products"` /
  `"Unlimited orders/month"`), so any future price/limit change in
  `tier-limits.ts` propagates to all three surfaces automatically.
- Marketing copy (audience, CTA, the non-count feature bullets, highlight,
  icon key) is defined per plan in `plans.ts`.
- Only the three **paid** plans are in `PUBLIC_PLANS`. The free trial is not a
  checkout plan; it's mentioned in the pricing-page FAQ only (as today).
- Oshi-Pro entry:
  - audience: "For high-volume stores that have outgrown order limits."
  - cta: "Start Pro", iconKey: "pro" (lucide `Rocket`), highlighted: false.
  - features (truthful, no invented capabilities): "Unlimited products",
    "Unlimited orders/month", "Everything in Oshi-Automate",
    "Automated WhatsApp order updates", "Inventory tracking and coupons".
- Oshi-Automate keeps `highlighted: true` ("Best for automation") as the
  recommended middle plan.

### 3. Consume the source on every surface

- **`src/components/landing/pricing.tsx`:** replace the local `TIERS` array
  with `PUBLIC_PLANS`; map `iconKey` → lucide icon locally; grid
  `md:grid-cols-2 → md:grid-cols-3`, widen container (`max-w-5xl → max-w-6xl`);
  headline "Two clear plans…" → "Plans that scale with your store."
- **`src/app/pricing/page.tsx`:** replace the local `PLANS` array with
  `PUBLIC_PLANS`; same icon map and 3-column grid; h1 "Two simple categories…"
  → "Plans that scale with your store."; keep the FAQ (the free-trial answer
  already covers `oshi_start`).
- **`src/app/pricing/checkout/page.tsx`:** derive
  `VALID_TIERS = PUBLIC_PLANS.map(p => p.tier)` (now includes `oshi_pro`) and
  `TIER_FEATURES` from `PUBLIC_PLANS`, removing the hardcoded copies. Default
  tier and the manual-EFT/DPO flow are unchanged.

### 4. Sweep for stragglers

Grep for hardcoded tier prices/limits and align or replace with the source:
`grep -rn "N\\$149\|N\\$399\|N\\$499\|N\\$1,200\|49900\|120000\|79900\|\"oshi_pro\"" src/`.
Known consumers to verify: `src/app/(dashboard)/dashboard/page.tsx` (reads
`TIER_LABELS`/`TIER_LIMITS` — fine), admin billing/merchant tabs (read DB/code
— Pro price now consistent), signup `?tier=` handling (must accept
`oshi_pro`).

## Non-goals

- No change to enforcement logic (`place_order` limits, cron lifecycle).
- No change to the free-trial flow or who can be assigned which tier by admin.
- The subscription-management page and `scheduled_tier` mechanism are
  sub-project B — not in this spec.

## Verification

- `npx tsc --noEmit` and `npm run build` clean.
- Migration applied; `SELECT price_nad FROM tier_limits WHERE tier='oshi_pro'`
  returns `79900`.
- Homepage and `/pricing` show three cards: N$149 / N$399 / N$799 with correct
  product/order counts; Automate highlighted.
- Checkout `/pricing/checkout?tier=oshi_pro` renders (N$799, unlimited
  features) and does not redirect; `?tier=oshi_basic` / `oshi_grow` unchanged;
  an invalid tier still redirects to `/#pricing`.
- Dashboard for an existing `oshi_pro` merchant shows "Oshi-Pro" with unlimited
  quotas and no broken price.
- Visual check at desktop + mobile that 3 cards lay out cleanly.
