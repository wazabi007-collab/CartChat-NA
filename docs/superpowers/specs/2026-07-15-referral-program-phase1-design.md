# Referral Program — Phase 1 Design Spec

**Date:** 2026-07-15
**Status:** Approved design → ready for implementation plan
**Author:** OshiCart team

## Goal

Let vetted promoters refer merchants to OshiCart and earn a cash bounty when a referred merchant becomes a **paying subscriber**. Phase 1 = attribution + tracking + a manual-payout admin console. No automated payouts, no self-serve promoter portal.

## Context that shapes the design

- **OshiCart earns from subscriptions, not GMV** (zero commission on merchant sales). A referral is only worth money once the merchant converts from the free trial to a **paid** tier (`subscriptions.status = 'active'` on a paid plan). So we pay for **paying conversions, never sign-ups**.
- Live tiers (monthly, cents): `oshi_start` 0 (free/trial) · `oshi_basic` 14900 · `oshi_grow` 39900 · `oshi_pro` 79900.
- New merchants get a **30-day trial** (`oshi_start`, `status: 'trial'`) created in the setup wizard's `handleSubmit`.
- The `?tier=` query param already survives the whole `/signup → (email or Google OAuth) → /auth/callback → /dashboard/setup` path; `?ref=` rides the same rails.
- The merchant row is created in **`/dashboard/setup`** (`handleSubmit`), client-side via the user's session — that insert is the single place to stamp attribution.
- First real payment flips `status → active` in the **DPO callback** (`/api/payments/dpo/callback`). Phase 1 does **not** touch that path — the admin console reads status live.
- Admin uses a role model (`super_admin`, `support`, `finance`) with `hasPermission(role, permission)`, `getVisibleNavItems(role)`, and `requireAdminPermission(permission)`.

## Decisions (locked)

1. **Commission:** one-time tiered bounty, paid **manually** by admin after the referred merchant is paying + retained ~30 days.
   `oshi_basic → N$75 · oshi_grow → N$200 · oshi_pro → N$400 · oshi_start/free → N$0`.
2. **Referrers are admin-created** (no self-serve signup in Phase 1).
3. **Double-sided perk:** a referred merchant gets a **45-day trial instead of 30** (extra 15 days). Chosen over a first-month discount because it needs no payment/discount logic.
4. **Manual payout:** the system tracks and totals what's owed; admin pays by hand (eWallet) and records the reference. No money movement in code.
5. **No changes to the payment/DPO flow, no automated qualification** (Phase 2), **no promoter dashboard** (Phase 3).

## 1. Data model — migration `053_referral_program.sql`

```sql
-- Promoters. Admin-created; one row per person who refers merchants.
CREATE TABLE referrers (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code          text NOT NULL UNIQUE,          -- short share code, e.g. 'maria'
  name          text NOT NULL,
  whatsapp      text,
  payout_number text,                          -- eWallet / bank cell for payout
  is_active     boolean NOT NULL DEFAULT true,
  notes         text,
  created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_referrers_code_active ON referrers (code) WHERE is_active = true;

-- Which promoter (if any) a merchant signed up through. Loose text stamp,
-- validated at write time — no FK so a later referrer edit can't orphan rows.
ALTER TABLE merchants ADD COLUMN IF NOT EXISTS referred_by_code text DEFAULT NULL;
CREATE INDEX idx_merchants_referred_by ON merchants (referred_by_code) WHERE referred_by_code IS NOT NULL;

-- Ledger of settled bounties. A row = "this referral has been paid."
CREATE TABLE referral_payouts (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_code  text NOT NULL,
  merchant_id    uuid NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
  commission_nad integer NOT NULL,             -- cents, snapshot at payout time
  paid_reference text,                         -- eWallet/txn ref the admin logs
  admin_note     text,
  paid_by        uuid,                         -- admin user_id
  paid_at        timestamptz NOT NULL DEFAULT now(),
  UNIQUE (merchant_id)                         -- one bounty per referred merchant
);

-- RLS: referral tables are service-role / admin only. No public or merchant read.
ALTER TABLE referrers ENABLE ROW LEVEL SECURITY;
ALTER TABLE referral_payouts ENABLE ROW LEVEL SECURITY;
-- (No policies added → only the service-role client can read/write, matching
--  how other admin-only tables in this project are gated.)
GRANT ALL ON referrers, referral_payouts TO service_role;
```

Notes:
- `merchants.referred_by_code` is a plain text stamp validated against `referrers` at write time; deliberately **not** a FK so deactivating/renaming a referrer can't break merchant rows.
- `referral_payouts.merchant_id` is `UNIQUE` → a merchant can only ever pay out one bounty (idempotent, no double-pay).

## 2. Types & constants

- Add `referrers` / `referral_payouts` Row/Insert/Update + `merchants.referred_by_code` to `src/types/database.ts`.
- Add to `src/lib/constants.ts`:
  ```ts
  // One-time referral bounty per paid tier (cents). Free tier earns nothing.
  export const REFERRAL_BOUNTY_NAD: Record<string, number> = {
    oshi_start: 0,
    oshi_basic: 7500,
    oshi_grow: 20000,
    oshi_pro: 40000,
  };
  export const REFERRED_TRIAL_DAYS = 45; // vs the standard 30
  export const STANDARD_TRIAL_DAYS = 30;
  ```
- Helper `getReferralBounty(tier: string): number` → `REFERRAL_BOUNTY_NAD[tier] ?? 0`.

## 3. Attribution flow

1. **Share link:** `oshicart.com/r/<code>` — a thin route (`src/app/r/[code]/route.ts`) that 302-redirects to `/signup?ref=<code>`. (Nicer to share than the raw query string.)
2. **Signup:** `/signup?ref=<code>` — on mount, if `ref` is present, stash it in `localStorage` (`oshicart_ref`) as a backstop, and forward it in the redirect to setup alongside `tier` (both the email path's `window.location.href` and the Google button's `redirectTo`).
3. **OAuth callback:** `/auth/callback` reads `ref` (like `tier`) and forwards it to `/dashboard/setup?ref=<code>`.
4. **Setup (`handleSubmit`):** resolve the code from `?ref=` **or** `localStorage`. Validate via `POST /api/referral/validate { code }` (service-role lookup of an active referrer). If valid:
   - include `referred_by_code: <code>` in the `merchants.insert(...)`,
   - create the trial subscription with `trial_ends_at = now + REFERRED_TRIAL_DAYS` instead of `STANDARD_TRIAL_DAYS`,
   - clear `localStorage.oshicart_ref`.
   If invalid/absent: standard 30-day trial, no attribution. Never trust the client — the validate endpoint is authoritative.

## 4. Merchant perk (double-sided)

- Referred merchants get **45-day trial** (above).
- **Visible at signup/setup:** when a valid `ref` is present, show a small banner: *"Referred by a friend — you get a 45-day free trial 🎉"*. The banner calls `/api/referral/validate` so it only shows for real codes (returns `{ valid, referrerName }`).

## 5. Commission logic (computed live)

For each merchant with a `referred_by_code`, the admin view computes:
- **bounty** = `getReferralBounty(subscription.tier)` (0 while on free/trial).
- **status** = the merchant's subscription status (`trial`/`active`/…).
- **eligible to pay** = `status === 'active'` (i.e. actually paying). This is the only automated gate. The **30-day retention** is the admin's manual judgment — the page shows the subscription's `current_period_end` and displays guidance ("confirm the merchant has been paying ~30 days before paying out"); no fragile day-count is auto-computed in Phase 1.
- A referral is **settled** iff a `referral_payouts` row exists for that merchant.

## 6. Admin console — `/admin/referrals`

Gated by a new permission `manage_referrals` (granted to `super_admin` + `finance`; add to `Permission` union, `ROLE_PERMISSIONS`, and `getVisibleNavItems` with a nav icon).

- **Referrers section:** create a referrer (name, code, whatsapp, payout number) and list existing ones with their share link `oshicart.com/r/<code>`, active toggle, and totals (referred / paying / N$ paid / N$ outstanding).
- **Referrals table:** every merchant with a `referred_by_code` → columns: referrer, store, plan/tier, subscription status, "active since," computed bounty, and **Paid?**. Unpaid+eligible rows get a **"Mark paid"** action (prompts for the payout reference + note → inserts a `referral_payouts` row). Paid rows show the reference/date.
- All reads/writes go through the **service-role** client in server components / server actions (referral tables have no public RLS).

## Fraud guards
- Bounty is computed only for **paying** merchants (`status = active`); trial/free = N$0 → sign-up farming earns nothing.
- **Admin approves** each payout (30-day retention is the admin's manual check, guided by on-page text).
- `referral_payouts.merchant_id UNIQUE` → never double-pay a merchant.
- WhatsApp number is already unique per store (existing dedup) → one number = one store = at most one bounty.
- Self-referral: validate rejects a code whose referrer WhatsApp matches the signing-up merchant's number (best-effort check in the validate endpoint).
- Referral tables are service-role only — codes/payout data are never exposed to the public or to merchants.

## Edge cases
- **Unknown/inactive code:** ignored; standard trial; no attribution.
- **Merchant upgrades/downgrades tier:** bounty reflects the tier at the moment the admin marks paid (snapshotted into `referral_payouts.commission_nad`).
- **Merchant churns before payout:** simply never becomes eligible; admin doesn't pay. If churn happens after payout, no clawback in Phase 1 (accepted; retention window makes this rare).
- **Referrer deactivated after referrals exist:** their existing referred merchants still show and can still be paid (stamp is on the merchant row).

## Out of scope (later phases)
- Phase 2: auto-qualification hook in the DPO callback + a real referral status ledger + clawback window.
- Phase 3: self-serve promoter signup + a promoter-facing stats page + recurring revenue-share tier.
- First-month **discount** perk (heavier billing change) — deferred in favour of the extended trial.

## Verification
- Migration applies; `referrers`/`referral_payouts` present + service-role-only; `merchants.referred_by_code` nullable.
- `/r/<code>` redirects to `/signup?ref=<code>`.
- Signup with `?ref=<valid>` → banner shows "45-day trial"; completing setup writes `referred_by_code` and a 45-day trial subscription. Invalid code → 30-day trial, no stamp.
- Attribution survives both the email and Google-OAuth signup paths.
- `/admin/referrals` (as finance/super_admin) lists referred merchants with correct computed bounty; "Mark paid" writes a payout row and flips the row to paid; a second mark-paid on the same merchant is blocked by the UNIQUE constraint.
- Non-finance/support admin cannot see the page (permission gate).
- `npm run build` + lint clean.
