# OshiCart — Pre-Launch Readiness Review

**Date:** 2026-05-30
**Method:** 11 parallel specialist reviewers across every flow → adversarial verification of every critical/high finding (a second agent tried to *refute* each by re-reading the code). 74 findings total; 35 critical/high verified; **31 confirmed, 4 partially-confirmed, 0 refuted.**

## Verdict: **NOT launch-ready.** 14 confirmed launch blockers (7 critical, 7 high).

The single root theme: **the browser uses the Supabase anon key + RLS, but several `SECURITY DEFINER` RPCs and RLS policies don't enforce ownership or column scoping — so the client-side guards that "protect" them are trivially bypassed by calling PostgREST/`supabase.rpc` directly.** Fix the data layer and most of these close at once.

---

## CRITICAL launch blockers

### C1. `append_order_status` RPC — cross-tenant order tampering (IDOR)
*Found independently by 3 reviewers.*
`supabase/migrations/022_order_tracking.sql:22-32` defines `append_order_status(p_order_id, p_status)` as `SECURITY DEFINER` with a bare `UPDATE orders ... WHERE id = p_order_id` — **no ownership check**, no `REVOKE` (so `EXECUTE` defaults to PUBLIC). `001:220` grants `ALL ON ALL ROUTINES` to `anon, authenticated`. Called directly from the browser (`order-actions.tsx:72`, `quick-status.tsx:69`); the `VALID_TRANSITIONS` map is client-side only. Because it's `SECURITY DEFINER` it **bypasses the orders RLS UPDATE policy entirely.**
**Impact:** any logged-in merchant who has another merchant's order UUID can set it to `completed` (mark unpaid as paid), `cancelled` (fires restock trigger + customer WhatsApp), or any status — across tenants.
**Fix:** add ownership guard inside the function (`EXISTS(... JOIN merchants m ON m.user_id = auth.uid())` else `RAISE`), validate `p_status` transitions in SQL, `REVOKE EXECUTE FROM public/anon; GRANT TO authenticated`.

### C2. `/api/whatsapp/send` — unauthenticated, arbitrary WhatsApp blasting
*Found by 2 reviewers.*
`src/app/api/whatsapp/send/route.ts:11-54` has **zero auth** — only `isWhatsAppEnabled()` + template-shape validation. The code comment "Not publicly accessible" is false: middleware only guards `/dashboard` and `/admin`, and it's called from the public `checkout-form.tsx:479,498`. Caller fully controls `recipient_phone`, `template_name` (incl. `authentication_otp`), and variables.
**Impact:** anyone can drive OshiCart's verified WhatsApp Business number to message any phone with attacker-chosen content → metered billing burn, smishing from your sender, **Meta spam-flagging/ban that kills the platform's signature channel for all merchants**, unbounded `whatsapp_messages` rows.
**Fix:** stop calling from the browser — send server-side via `sendWhatsAppEvent()`. If a network endpoint must exist, require an internal shared secret (`timingSafeEqual`) + per-recipient/global rate limit.

### C3. Subscriptions RLS — merchants can grant themselves any paid tier for free
*Found by 2 reviewers.*
`017_security_and_performance_fixes.sql:165-169` — "Subscriptions: merchant updates pending tier" is `FOR UPDATE` with `USING/WITH CHECK` validating **only `merchant_id` ownership**. Postgres RLS cannot restrict columns, so the policy authorizes writing **every** column. From the browser (anon key + their JWT) a merchant runs `UPDATE subscriptions SET tier='oshi_pro', status='active', current_period_end='2099-01-01' WHERE merchant_id=<own>`. `place_order` and `tier-limits.ts` trust `subscriptions.tier/status`, so the entire paywall is self-serviceable.
**Fix:** remove the merchant UPDATE policy (all real writes go through service-role server code), or replace with a column-restricting `BEFORE UPDATE` trigger / `SECURITY DEFINER` RPC that only writes `pending_tier`.

### C4. DPO subscription columns missing from migrations — broken payment flow + schema drift
*Found by 2 reviewers.*
`subscriptions` (defined in `012`) never gets `pending_tier`, `pending_months`, `dpo_transaction_token`, or `payment_reference` in **any** migration (grep across all 32 = 0 matches; `025` adds `dpo_transaction_token` to **orders**, not subscriptions). Yet `pricing/checkout/page.tsx:80-85`, `dpo/create:105-111`, and `dpo/callback:44-67` read/write them. On a clean deploy these throw "column does not exist"; the checkout update swallows the error so `pending_tier` is never set → the callback guard `if (sub && sub.pending_tier)` never fires → **a successfully-paid DPO subscription is never activated (merchant charged, no upgrade).** Production must be running undocumented manual schema changes.
**Fix:** add a migration creating these columns; reconcile migration history against the live DB before launch. (Same root as the `products.deleted_at` drift.)

### C5. `/api/orders/lookup` — unauthenticated customer PII leak
`src/app/api/orders/lookup/route.ts` uses the **service client (RLS bypassed)**, no auth, no rate limit, only guard `digits.length >= 8`. Returns up to 20 full orders (items, amounts, dates, delivery/payment method) for any `(merchant_id, whatsapp)`. `merchant_id` is public (in the storefront bundle, `s/[slug]/page.tsx:334`) and Namibian numbers are low-entropy (predictable prefixes + ~7 digits).
**Impact:** enumerate phone numbers against any store → harvest customer purchase history. Unauthenticated personal-data breach (Namibia data-protection exposure).
**Fix:** require a possession proof (OTP to the WhatsApp number — `phone_otp_codes` already exists) or scope to the opaque per-order token (the `track/[token]` route already exists). At minimum strict IP+number rate limiting + generic responses.

### C6. JSON-LD stored XSS via merchant content
`src/components/json-ld.tsx:7,15` does `JSON.stringify(data)` into `dangerouslySetInnerHTML`. `JSON.stringify` does **not** escape `</script>`. Merchant-controlled `store_name`/`description`/product fields flow in (`s/[slug]/page.tsx:256-265`, `[productId]/page.tsx:98-117`); `validations.ts` enforces only length, no character filtering. A 50-char store name like `</script><script>…` breaks out and runs JS on the public storefront for every visitor — same origin as cart/checkout.
**Fix:** `JSON.stringify(data).replace(/</g, '\\u003c')`. Fix the misleading security comment; add character validation as defense-in-depth.

### C7. `order-proofs` storage — cross-tenant read of payment proofs
`002_storage_buckets.sql:28` — SELECT policy is `bucket_id='order-proofs' AND auth.role()='authenticated'` with **no path/merchant scoping**, even though files live under `${merchant_id}/...` and `merchant-assets` in the same file correctly scopes by `(storage.foldername(name))[1]`.
**Impact:** any authenticated merchant can list/download **every** merchant's customer payment proofs (bank slips, account numbers, PII). The INSERT policy "anyone upload" is also unscoped (storage flooding).
**Fix:** scope SELECT to `(storage.foldername(name))[1] IN (SELECT id::text FROM merchants WHERE user_id = auth.uid())`; tighten the anon INSERT policy.

---

## HIGH launch blockers

### H1. Order header totals trusted from the client → underpayment fraud
Live `place_order` (migration **031**, not 023) correctly recomputes per-line prices from the DB, BUT writes `orders.subtotal_nad = p_subtotal_nad` and `delivery_fee_nad = p_delivery_fee` **verbatim** from the anon client (`031:201-218`), never reconciling against summed line totals or the merchant's configured fee. No `CHECK (delivery_fee_nad >= 0)` (negative fees accepted). The invoice renders these tampered headers. Since buyer orders settle by **manual EFT/MoMo/COD** against the displayed total, a buyer can legitimately underpay (and inflate the % coupon base).
**Fix:** accumulate server line totals into `v_computed_subtotal` and use that for storage, the coupon min-order gate, and the discount base (ignore `p_subtotal_nad`, as `p_discount_nad` already is). Look up the real `delivery_fee_nad`. Add `CHECK (delivery_fee_nad >= 0)`.

### H2. DPO callback never verifies paid amount / tier ↔ token binding
`dpo/callback:43` activates on `result.isPaid` only; `transactionAmount`/`Currency` are used only in the receipt, never compared to `TIER_LIMITS[tier].price_nad × months`. `pending_tier` is set as a side-effect of the checkout **GET** render (`checkout/page.tsx:80-85`) and `create` never binds tier to the token. **Self-service exploit:** open checkout for `oshi_pro` (sets pending_tier), call `/create` for `oshi_basic` (mints cheap token), pay N$149, callback activates `oshi_pro`.
**Fix:** persist expected amount+tier bound to the token at create time (or a `payment_intents` table); in the callback reject unless `transactionAmount` matches expected and currency = NAD. Activate strictly from token-bound values.

### H3. Auto-cancel cron double-restocks inventory
`cron/payment-reminders:190-193` sets `status='cancelled'` → fires `trg_restock_on_cancel` (restock #1, respects `track_inventory`), then `:201-217` manually restocks **again** unconditionally (no `track_inventory` check). Products that track inventory get +2× the order qty; non-tracking products wrongly get +1×. Silent stock corruption → overselling. The audit log only records the trigger's increment, hiding half the corruption.
**Fix:** delete the manual restock loop; rely solely on the trigger.

### H4. Proof-of-payment upload on `/track/[token]` is broken (always 400s)
`track/[token]/tracker-client.tsx:133` sends field `customer_whatsapp`; `upload-pop/route.ts:10,13` reads `whatsapp` → returns 400 "Missing required fields". The client catch block is a silent fail. The `/track` link is exactly what customers are sent — so the entire EFT/MoMo proof-confirmation journey is dead on that page. (Storefront `order-tracker.tsx` uses the correct field.)
**Fix:** change the field to `whatsapp`; surface upload errors to the user.

### H5. Owner UPDATE policies lack `WITH CHECK` → tenant-id reassignment
`017:112-115` (orders) and `020` (products/categories/coupons/merchants) have `USING` but no `WITH CHECK`. Postgres applies no check to the NEW row, so an owner can `UPDATE` and set `merchant_id`/`user_id` to **another tenant**, or rewrite order financial fields. Exploitable via raw PostgREST PATCH with the anon key + JWT.
**Fix:** add matching `WITH CHECK (merchant_id IN (SELECT id FROM merchants WHERE user_id = auth.uid()))` (and `user_id = auth.uid()` for merchants) to every owner UPDATE policy.

### H6. Admin pages enforce no role — intra-admin privilege escalation
Admin **API** routes correctly call `getAuthenticatedAdmin()` + `hasPermission()`, but the admin **Server Component pages** only check "is any admin." A finance/support admin can navigate directly to `/admin/team` and `/admin/audit` and read all admin identities, roles, and the full audit log (role model enforced only by hidden nav). Also `/api/admin/reports` uses a broken `ADMIN_EMAILS`-only auth path that ignores the role model.
**Fix:** add a server-side permission gate per admin page (or in the admin layout) via `getAuthenticatedAdmin()` + `hasPermission(role, 'view_*')`; refactor `/api/admin/reports` to the role model.

### H7. Admin password reset doesn't revoke existing sessions
`admin/auth/complete-reset/route.ts:68-71` calls `updateUserById({ password })` but never revokes refresh tokens. In the exact "account compromised" scenario that triggers a reset, an attacker's existing session stays valid for a control-center with merchant-delete + payment powers.
**Fix:** after the password update, revoke all sessions/refresh tokens for that user.

---

## Pre-launch hardening (confirmed, not blockers but do before/at launch)

| # | Issue | Action |
|---|-------|--------|
| 1 | **Live prod `service_role` + Resend keys on disk** in `.env.local` | **Rotate all keys now** (treat as compromised), store only in Vercel env, confirm never committed (`git log --all -- .env*`) |
| 2 | `check-email` uses `perPage:1` then `.some()` | **Correctness bug — returns `exists:false` for everyone.** Replace `listUsers` scans (signup/check-identity/OTP also cap at 1000) with indexed lookups |
| 3 | Analytics "Top Products" queries non-existent `unit_price_nad` | Broken feature — use `product_price`/`line_total` |
| 4 | Store page-view tracking blocked by RLS (`page_views` stays 0) | Use service client for the upsert |
| 5 | Tier limits enforced client-side only | Enforce product count + monthly orders in a trigger/`place_order` |
| 6 | Tracking tokens = 32-bit md5 prefix, no rate limit | Use `gen_random_bytes(16+)`; rate-limit `/track` |
| 7 | Email/identity/phone enumeration (no auth/rate limit) | Rate-limit + uniform responses + CAPTCHA |
| 8 | WhatsApp OTP send: per-phone limit only | Add per-IP + global cap |
| 9 | No Content-Security-Policy | Add CSP (report-only → enforce) |
| 10 | No rate limiting on public POSTs (`/reports`, `/check-email`) | Upstash/Vercel Firewall; reports also amplify WhatsApp notifs |
| 11 | No `not-found.tsx` / `error.tsx` / `global-error.tsx` | Add branded boundaries (Supabase outage → unstyled Next error today) |
| 12 | No error monitoring (Sentry) | Wire up before launch |
| 13 | Terms says "no order limits" but code enforces N$5,000/10-order new-store cap; general ToS `tos_accepted_at` never set | Reconcile Terms with enforced behavior |
| 14 | `whatsapp_number` has no UNIQUE constraint; OTP verify uses `.single()` with fuzzy fallback | Add unique index, enforce in signup, reject ambiguous matches |
| 15 | Prohibited-content filter is English-only keyword regex | Acceptable for MVP with manual review queue as backstop |
| 16 | README "Next.js 15" / docs from March describe a smaller app | Update docs to match Next 16 + current feature set |

---

## What's already strong (keep it)

- **`place_order` (v031) is genuinely well-built:** server-side line prices, merchant/availability/soft-delete filters, `FOR UPDATE` locks on products/variants/coupons, atomic order+items+stock+audit, DB `CHECK` constraints (qty>0, totals≥0). Suspended stores blocked at multiple layers.
- **Auth core is correct:** `@supabase/ssr` with `getUser()` (not spoofable `getSession`), service key server-only, OTP SHA-256 hashed + `timingSafeEqual` + 5-min expiry + attempt cap + cleanup cron, OAuth redirects built from request origin (no open redirect).
- **DPO does the right structural thing:** activation is server-to-server via `verifyToken`, not the browser redirect; `transToken` never exposed; XML escaped.
- **WhatsApp webhook:** HMAC `X-Hub-Signature-256` verification that fails closed; idempotency via unique `event_key`; graceful Meta-API-down fallback.
- **RLS broadly enabled & progressively hardened** (open INSERT policies removed in 019, per-command policies in 020, admin/secret tables service-role-only).
- **SEO/UX above average:** metadata/OG, `robots.ts` + dynamic `sitemap.ts`, JSON-LD, canonicals, thoughtful empty/success states, sticky mobile CTA, mostly-correct `next/image`.
- **Trust/safety foundation:** real Terms/Privacy, DB-enforced moderation trigger (auto-block + reject-unapproved-at-order), admin safety + report queues, merchant policy-acceptance gate.

---

## Remediation status (2026-05-30)

All CRITICAL (C1–C7) and HIGH (H1–H7) blockers fixed. Verified: `tsc --noEmit` ✅, `eslint` ✅ (0 errors), `next build` ✅.

| ID | Status | Key change |
|----|--------|-----------|
| C1 | Fixed | `append_order_status` checks merchant ownership; `EXECUTE` revoked from public/anon (mig 033); **+ server-side status-transition state machine so direct RPC calls can't jump to invalid statuses (mig 035)** |
| C2 | Fixed | `/api/whatsapp/send` locked to internal secret; browser sends moved to authed `/api/whatsapp/notify` + token-gated `/api/orders/announce`; cron sends server-side |
| C3 | Fixed | `BEFORE UPDATE` trigger blocks merchants from changing subscription entitlement columns (mig 033) |
| C4 | Fixed | Added `pending_tier/pending_months/pending_amount_cents/dpo_transaction_token/payment_reference` + `products.deleted_at` (mig 033 / 031); DPO create/callback reconciled |
| C5 | Fixed | Order lookup now requires a WhatsApp possession code (`/api/orders/lookup/send-code` → POST `/api/orders/lookup`) |
| C6 | Fixed | JSON-LD escapes `<`/`>`/`&` before `dangerouslySetInnerHTML` |
| C7 | Fixed | `order-proofs` SELECT scoped to owning merchant; anon INSERT removed; uploads via service role (mig 033) |
| H1 | Fixed | `place_order` v6 computes subtotal from server line totals + merchant delivery fee; `CHECK(delivery_fee_nad>=0)` (mig 034/033) |
| H2 | Fixed | DPO callback verifies paid amount/currency vs token-bound `pending_amount_cents`; tier bound to token at create; checkout no longer mutates `pending_tier` |
| H3 | Fixed | Removed manual restock loop in auto-cancel cron (relies on `trg_restock_on_cancel`) |
| H4 | Fixed | `/track` upload sends `whatsapp` field; upload errors surfaced |
| H5 | Fixed | Added `WITH CHECK` to owner UPDATE policies on orders/products/categories/coupons/merchants (mig 033); **+ BEFORE UPDATE trigger blocks ALL direct end-user order edits (`current_user IN ('authenticated','anon')`), forcing every write through `place_order`/`append_order_status` or the service role (mig 035)** |
| H6 | Fixed | `requireAdminPermission()` gates every data-bearing admin page; `/api/admin/reports` uses the role model. (Announcements page is a client form — nav-hidden for finance + its send API is permission-checked) |
| H7 | Fixed | `complete-reset` revokes all sessions via `admin_revoke_user_sessions` RPC (mig 033) |

**Migrations 033, 034 & 035 have been applied to production** (033/034 as `20260530093651_*` / `20260530093743_*`; 035 `order_write_hardening` applied by Codex). `CRON_SECRET` is set in Vercel (len 25). All 14 blockers + the H5/C1 residuals are live.

## Suggested fix sequence

1. **Data-layer security (closes the most damage, one migration):** C1, C3, H5, plus C4/schema-drift, server-side tier limits. This is where client-bypass risk concentrates.
2. **Payment integrity:** H1, H2, C4 (must verify production schema vs migrations).
3. **Public-endpoint exposure:** C2, C5, C7, reports/OTP rate limiting.
4. **XSS + correctness:** C6, broken upload (H4), double-restock (H3), check-email/analytics bugs.
5. **Admin hardening:** H6, H7.
6. **Ops:** rotate keys, CSP, error boundaries, Sentry, doc/Terms reconciliation.
