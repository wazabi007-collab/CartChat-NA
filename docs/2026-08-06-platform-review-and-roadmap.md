# OshiCart — Platform Review & Competitive Roadmap
**Date:** 6 August 2026
**Scope:** Full codebase audit · live site UX audit (oshicart.com) · competitor scan (Africa, global, WhatsApp infrastructure)

---

## Executive summary

OshiCart's fundamentals are strong: the WhatsApp-first model is exactly right for the market, the Namibian payment localisation is genuinely differentiated, and the security posture is far better than it was at the May review (the RLS/RPC blockers were fixed).

Three things are holding it back, in order of urgency:

1. **A verified data-exposure bug** — every active merchant's bank account details are publicly readable.
2. **A pricing bug that punishes paying customers** — the N$149 plan gives *less* than the free plan.
3. **Missing the one feature every competitor has** — automated abandoned-cart / re-engagement messaging, despite already owning the WhatsApp rails to do it.

Everything else is downstream of those.

---

# PART 1 — Fix now (broken, costing money or trust)

### 1.1 🔴 SECURITY: Merchant bank details are publicly readable
**Verified directly against production.** The `anon` Postgres role holds `SELECT` on all **43 columns** of `merchants`, and the RLS policy `"Public can view active stores"` filters only *rows* (`is_active AND store_status='active'`), never columns. The anon key is public by design — it ships in the site's JavaScript.

Anyone can therefore enumerate, for every active store: `bank_account_number`, `bank_account_holder`, `bank_branch_code`, `whatsapp_number`, `momo_number`, `ewallet_number`, `paytoday_number`, `pay2cell_number`.

Checkout legitimately needs *some* of this (the buyer must see where to pay) — but it must not be bulk-enumerable.

**Fix:** revoke broad column access from `anon` and expose only public storefront columns, serving payment details through a narrow view or server-side route scoped to a single store. Also note `anon` currently holds `INSERT` and `UPDATE` on all 43 columns — audit whether any policy permits that.

### 1.2 🔴 The N$149 plan is worse than free
`src/lib/tier-limits.ts`:

| Tier | Price | Products | Orders/mo | Inventory | Coupons |
|---|---|---|---|---|---|
| Oshi-Start | Free | 20 | 50 | ✅ | ✅ |
| **Oshi-Storefront** | **N$149** | 50 | 300 | ❌ | ❌ |
| Oshi-Automate | N$399 | 200 | 1 000 | ✅ | ✅ |
| Oshi-Pro | N$799 | ∞ | ∞ | ✅ | ✅ |

A merchant who pays N$149 **loses inventory tracking and coupons** they had for free. That is a commercial own-goal and a refund request waiting to happen. Two related packaging defects:
- `branding: false` on every tier — the "No OshiCart branding" selling point does nothing.
- WhatsApp automation is sold as the Oshi-Automate differentiator but is **not tier-gated anywhere** — every tier gets it.

**Fix:** give Oshi-Storefront inventory + coupons (strictly better than free), and either implement branding-on-free or drop the claim.

### 1.3 🔴 Homepage claims don't survive one click
Homepage says **"34+ stores · 3,000+ products"**; `/stores` lists **7 stores**, and 12 of 14 region pages say "No stores yet". Worse, ~7,400 of those products are OshiCart's own parent-company supplier feed (5,427 + 1,976 under Octovia Nexus), including 202 products literally named `Yatta [Adjective] [Noun] Hamper` with raw B2B copy ("contact your Account Manager", "lead times 20–28 days") shown to retail shoppers. Real independent merchants total ~22 products.

**Fix:** make the counter dynamic and honest, or reframe to "Now onboarding Namibian sellers". Clean or hide the wholesale boilerplate.

### 1.4 🔴 Featured demo store has a fake phone number
`/s/sunrise-crumbs-bakery` — featured on the homepage under "Live Marketplace Proof" with a testimonial — has WhatsApp `+264 81 000 0000`. Anyone who clicks the core promise gets nothing.

### 1.5 🔴 Email is entirely non-functional in production
Three routes send via Resend, all from `onboarding@resend.dev` — the **sandbox sender**, which only delivers to the Resend account owner. On top of that, `/api/orders/notify` **requires an authenticated merchant** but is called from anonymous checkout → returns **401 every time**. Merchants have never received a new-order email.

**Fix:** verify a real sending domain; make the notify route service-authenticated (like `/api/orders/announce`).

### 1.6 🟠 Merchant analytics are silently wrong
`/api/analytics/sync` has the same 401 mismatch — it's called from anonymous checkout. Order/revenue rollups only land if the merchant happens to open the order the same UTC day. Day boundaries are also UTC, not Namibian time (UTC+2), so evening orders land on the wrong day.

### 1.7 🟠 Other confirmed breakages
| Issue | Effect |
|---|---|
| `store-list.ts` selects `products.image_url` (column doesn't exist; real one is `images[]`) | Store-card thumbnails on `/stores` are permanently blank |
| `/api/admin/stores` doesn't exist but report-actions POSTs to it | "Suspend store from report" silently does nothing |
| React hydration error #418 site-wide | Full client re-render on every page — worst on low-end Android |
| Auto-cancel of unpaid orders is inside the `WHATSAPP_ENABLED` guard | Turning WhatsApp off silently stops order expiry |
| Client accepts 20 MB images, server rejects >5 MB | Uploads in the 5–20 MB band fail; POP failures are non-fatal so buyers only see a warning |
| Coupons page has no tier check (only the nav is hidden) | Any tier can use coupons via direct URL |
| `products.sku` searched but never existed | Dead search dimension |
| `vat_inclusive` hardcoded false, no UI can set it | VAT-inclusive pricing impossible |
| Invoices readable by raw order UUID, no auth | Order PII exposed to UUID guessing |

---

# PART 2 — What competitors have that you don't

Researched: **Africa** (Bumpa, Catlog, Selar, Paystack Storefront, Flutterwave Store, Shopstar, Yoco, Kapu, Wasoko, Chpter/Pluto) · **Global** (Dukaan, Instamojo, Shiprocket, Ecwid, Shopify Starter, Wix, Square, Beacons, Stan, Gumroad) · **WhatsApp infra** (Wati, Zoko, Charles, Yalo, Interakt, DoubleTick, Limechat).

### Table stakes you're missing

| Feature | Who has it | Why it matters here |
|---|---|---|
| **Abandoned-cart recovery via WhatsApp** | Zoko, Interakt, Limechat, Catlog | Universal. You already have approved templates + the messaging rails. Highest ROI feature available to you. |
| **Broadcast to *customers*** | Nearly all | Your merchants can't message their own buyers. Your admin broadcast only reaches merchants. |
| **Customer database / CRM** | Bumpa, Catlog | You have **no `customers` table** — orders store name+phone strings. Merchants can't see repeat buyers or LTV. |
| **Reorder / repeat purchase** | Most | Your "Re-order" button is a plain link to the store home. |
| **Bulk product import (CSV)** | Most | Biggest onboarding blocker for merchants with existing catalogues. `api/v1/products/` is an empty folder. |
| **Reviews / ratings** | Most | None exist. `StoreHeaderCard` even accepts a `rating` prop that's always `null`. |
| **Staff / multi-user accounts** | Bumpa (tier-gated), Wati, DoubleTick | `UNIQUE(user_id)` means one login = one store. Bumpa monetises this well. |
| **Annual billing discount** | Bumpa, Catlog, Shopstar, Wix, Ecwid | Everyone offers 5–20% off annual. Improves cash flow and retention. You're monthly-only. |

### Genuine white space (nobody is doing this well)
- **Low-data / offline mode.** Not one of the 20+ competitors mentions bandwidth-conscious design. For Namibia this is a credible, ownable differentiator.
- **Local-language UI** (Afrikaans, Oshiwambo). Multi-language is a paid-tier afterthought everywhere else.
- **Loyalty / points.** Only Kapu had one across the whole African set.
- **Bookkeeping** (cost price, margin, expenses). Only Catlog bundles it — and informal traders need it badly.

### Strategic positioning notes
1. **Your subscription-only model is the minority.** Most African rivals (Paystack, Flutterwave, Yoco, Shopstar Go) are free-platform + transaction fees. Since you don't process payments, you *can't* do that — so lean hard on the flip side: **"we never take a cut of your sales."** That's a real, defensible message against Dukaan (4.99% on free tier), Square (3.3%+), Beacons (9%).
2. **WhatsApp Pay is unavailable in Africa** and no competitor has it. Your "merchant collects payment directly" model is the category norm, not a gap. Stop treating it as a weakness.
3. **Meta's WhatsApp Catalog + Flows are free and native** — you could push products into a real WhatsApp catalog so merchants get cart-in-chat, without paying a BSP.
4. **Closest true analogues:** **Catlog** (Nigeria — WhatsApp-native + Chowbot AI ordering + expense tracking) and **Chpter/Pluto** (Kenya/SA — AI conversational commerce). Worth watching monthly.

---

# PART 3 — Recommended roadmap

### Sprint 1 — Stop the bleeding (days)
1. Lock down `merchants` column access (**security**)
2. Fix the N$149 tier to include inventory + coupons
3. Fix homepage stats + the fake demo phone number
4. Fix Resend sender domain + the two 401 routes (order email, analytics)
5. Fix directory thumbnails (`image_url` → `images[]`)
6. Fix the hydration error
7. Decouple auto-cancel from `WHATSAPP_ENABLED`

### Sprint 2 — Revenue & retention (2–4 weeks)
8. **Abandoned-cart WhatsApp recovery** — highest-ROI item on this list
9. **Customer table + merchant CRM view** (unlocks 10, 11, and loyalty later)
10. **Customer broadcast** for merchants (tier-gated → real Oshi-Automate differentiator)
11. **One-tap reorder**
12. **Annual billing** at ~15% discount
13. Make WhatsApp automation genuinely tier-gated (it's already sold as paid)

### Sprint 3 — Growth & moat (1–2 months)
14. CSV bulk import/export
15. Reviews & ratings
16. Staff accounts (paid tiers)
17. WhatsApp Catalog sync via Meta Cloud API
18. Low-data mode + Afrikaans/Oshiwambo UI ← the differentiators nobody else has
19. Basic bookkeeping (cost price → margin)

### Also worth doing
- Pagination on dashboard products/orders and admin merchants (currently loads everything)
- Fix the N+1 store-count query on `/stores`
- Move admin broadcast to a queue (currently serial, in-request)
- Generate QR codes locally instead of via `api.qrserver.com` (external dependency + leaks every store slug)
- Add MFA to admin login; remove or restrict the `ADMIN_EMAILS` env super-admin fallback (it writes null-attributed audit rows shown as "System")
- Add unit/integration tests (currently only 6 Playwright specs)

---

## What's genuinely good (don't break these)
- Sharp, locally-grounded positioning; real Namibian payment logos on the fold
- Server-authoritative `place_order` RPC — client totals are ignored and recomputed
- Solid WhatsApp infrastructure: 22 approved templates, idempotency keys, delivery webhooks
- Sensible security on send endpoints (`timingSafeEqual`, recipient constraints)
- Good SEO foundation: JSON-LD, dynamic sitemap, 14 region pages
- Guest checkout with zero friction; genuinely good empty states and 404s
- Industry-driven storefront theming (6 archetypes, 6 layouts) is a nice touch
