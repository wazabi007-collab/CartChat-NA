# Merchant Subscription Management Page — Design

**Date:** 2026-06-10
**Scope:** chatcart-na (Next.js + Supabase). Sub-project B; builds on the tier
canonicalization (sub-project A, shipped).

## Problem

Merchants have no self-service view of their subscription. The `subscriptions`
and `payments` tables, the tier lifecycle cron, and admin tier controls all
exist, but merchants can't see their plan, renewal date, usage, or payment
history, nor cancel. Everything is admin-mediated today.

## Decisions (made with user)

- **Cancel = lapse, not freemium.** There is no permanent free plan
  (`oshi_start` is the 30-day trial). Cancel sets a flag; at period end the
  *existing* lifecycle cron lapses the unpaid sub (grace → suspended → store
  offline). No new free tier.
- **Paid→paid downgrade deferred.** Near-zero frequency today (0 paying
  merchants, 7 comped Pro). v1 routes "change/downgrade plan" to a pre-filled
  WhatsApp-to-support message; admin adjusts the tier. No `scheduled_tier`
  column, no cron-application logic, no guard-trigger change.
- **Upgrade reuses existing checkout** (`/pricing/checkout?tier=X`, DPO or
  manual EFT). Nothing rebuilt.

## Data model — migration `041_subscription_cancel_flag.sql`

```sql
ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS cancel_at_period_end boolean NOT NULL DEFAULT false;
```

- `cancel_at_period_end` is NOT an entitlement field, so the existing
  `guard_subscription_update` trigger (which blocks merchants from changing
  tier/status/periods/pending_*) does not restrict it. No guard change.
- Update `src/types/database.ts` subscriptions Row/Insert/Update with
  `cancel_at_period_end`.

## The page — `/dashboard/subscription` (server component)

New route `src/app/(dashboard)/dashboard/subscription/page.tsx`. Reads the
merchant's subscription (service client, as the dashboard overview does) and
the merchant's own `payments` rows (user-scoped server client — merchants
already have RLS read on own payments). Renders:

### Current plan card
- Tier label (`TIER_LABELS[tier]`) + monthly price (`formatTierPrice(tier)`).
- Status badge (`STATUS_LABELS[status]`).
- Date line by status:
  - `trial` → "Free trial ends {trial_ends_at}".
  - `active` → "Renews {current_period_end}" (or "Ends {current_period_end}"
    when `cancel_at_period_end`).
  - `grace` → "Payment overdue — store pauses {grace_ends_at}".
  - `soft_suspended` / `hard_suspended` → "Suspended — reactivate to reopen".
- Usage quotas (reuse the dashboard overview's logic): products used / limit
  and orders-this-month / limit, rendering "Unlimited" when the limit is -1.

### Cancellation banner
Only when `cancel_at_period_end` is true: an amber banner — "Your subscription
is set to end on {current_period_end}. Your store will go offline after this
date." with a **Keep my plan** button (clears the flag).

### Payment history
The merchant's `payments` rows (newest first, `voided_at IS NULL`): date
(`created_at`), amount (`amount_nad`), method (`payment_method`), and billing
period (`period_start`–`period_end`). Empty state: "No payments yet" (trial
merchants).

### Actions
- **Upgrade** buttons → `/pricing/checkout?tier=X` for each tier ranked above
  the current one (ranks: start 0, basic 1, grow 2, pro 3). Hidden when on Pro.
- **Change or downgrade plan** → a link opening a pre-filled WhatsApp to
  OshiCart support (reuse the support number used in pricing checkout):
  "Hi OshiCart, I'd like to change my plan for {store_name}…".
- **Cancel plan** (active, not already cancelling) / **Resume** (when
  cancelling) → confirm dialog → toggles the flag.

### Edge cases
- **Trial:** show "Free trial ends {date}", upgrade CTAs, support link; **no**
  Cancel button (nothing is being paid).
- **Suspended:** show status, a "Reactivate" CTA pointing to checkout; no
  Cancel.

## Cancel action + wiring

- **Route `src/app/api/subscription/cancel/route.ts`** (POST `{ cancel: boolean }`):
  authenticate the user → resolve their merchant → set
  `subscriptions.cancel_at_period_end = cancel` for that merchant via the
  service client. Routing through a server route (not a direct client write)
  keeps writes off the guarded `subscriptions` table and gives one audit seam.
  Only togglable from `active`/`grace`; returns 400 otherwise.
- **Client component `subscription-actions.tsx`**: Cancel/Resume/Keep-my-plan
  buttons with a confirm dialog, calling the route then `router.refresh()`,
  mirroring `order-actions.tsx`.
- **Nav:** add `{ href: "/dashboard/subscription", label: "Subscription",
  icon: CreditCard, requireFeature: null }` to `baseNavItems` in
  `src/components/dashboard/nav.tsx` (after Account).
- **Reminder cron** `src/app/api/cron/check-subscriptions/route.ts`: add
  `cancel_at_period_end` to the select and skip subs where it is true (don't
  send renewal/expiry reminders to someone who chose to cancel). The lifecycle
  cron (`check_expired_subscriptions`) is unchanged — it lapses them normally.

## Non-goals

- No `scheduled_tier`, no self-service paid→paid downgrade, no freemium tier.
- No new payment/DPO logic; no change to `check_expired_subscriptions`.
- No admin-side changes (admin billing already exists).

## Verification

- `npx tsc --noEmit` and `npm run build` clean.
- Migration applied; `cancel_at_period_end` defaults false on all rows.
- A trial merchant: page shows "Free trial ends …", quotas, empty payment
  history, upgrade CTAs, no Cancel button.
- An active merchant (simulate by setting status/period on a QA sub): shows
  "Renews …", Cancel → confirm → flag set → banner appears + "Ends …" +
  Resume; reminder cron query excludes it; Keep-my-plan clears it.
- A Pro merchant: quotas show "Unlimited", no upgrade buttons.
- Payment history renders a recorded payment (insert a test `payments` row for
  the QA merchant), voided rows excluded.
