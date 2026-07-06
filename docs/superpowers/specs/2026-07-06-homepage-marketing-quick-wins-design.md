# Homepage Marketing Quick Wins — Design

**Date:** 2026-07-06
**Scope:** chatcart-na landing page. Five visual quick wins approved by the user
after a side-by-side comparison with competitor take.app, to prepare the site
for Facebook/Instagram/TikTok ad traffic. No migration, no dashboard changes.

## Context (from the take.app comparison)
OshiCart's content is genuinely local and real, but the page is denser and more
text-driven than take.app's: busy hero (3 badges + 3 CTAs + 8 tags + 3 stats +
photo collage), no human/testimonial element, generic payment icons instead of
recognizable brand marks, feature blocks with no product screenshots.

## The five wins

### 1. Simplified hero (`src/components/landing/hero.tsx`)
- Clean light background (no `/hero-industries.webp` collage, no gradient overlay).
- One headline (keep: "Your Namibian business, online in minutes."), one
  subline, **one primary CTA** (Create Free Store) + one secondary text link
  (Browse stores). Drop the Watch Demo button and the 8 seller-type tag pills.
- Right side: a CSS phone frame showing **`/landing/phone-storefront.png`** — a
  real screenshot of the live Octovia Nexus storefront (390px mobile capture,
  shows store header, WhatsApp button, live "Pay with" strip, real categories).
  A small floating WhatsApp-notification chip overlays the frame ("New order
  #104 · N$337.32") to communicate the WhatsApp loop.
- Keep the stats row (34+ stores / 3,000+ products / Auto updates) but compress
  to one quiet line.

### 2. Credibility strip (replaces the 3 hero badge pills)
One quiet single-line strip directly under the hero content:
"Made in Namibia · Zero commission · N$ local payments · Automated WhatsApp updates".

### 3. Real payment brand logos (`src/components/landing/payment-trust-bar.tsx`)
Replace the lucide-icon pills with the **actual brand marks**, downloaded from
official sources into `public/payment-logos/`:
paytoday, mtc-maris, fnb-ewallet, paypulse (Standard Bank), easywallet
(Bank Windhoek), nedbank-money — plus a text pill for "EFT & Cash on Delivery"
(no brand exists). White pill per brand: logo image (~24px) + name. Keep the
section heading and the "Zero OshiCart commission" badge. Nominative
"we accept" usage.

### 4. Product screenshots in feature blocks (`src/components/landing/feature-blocks.tsx`)
Wire the existing unused assets `public/landing/feature-orders.png`,
`feature-stock.png`, `feature-invoice.png`, `feature-domain.png` into the
feature cards (take.app-style: the UI does the talking). Cards without a
matching screenshot keep their current icon-only layout.

### 5. Testimonial per featured-store card (`src/components/landing/storefront-gallery.tsx`)
Each of the 3 featured store cards (Octovia Nexus, Apatchy Beard Company,
Krotoa Leather Goods) gets a one-line quote (italic, quotation marks) under the
description. **Quotes are DRAFTS pending the user's confirmation with the real
merchants before push** — flagged at review.

## Non-goals
- No font change (the Fraunces revamp stays reverted).
- No copy rewrites beyond what the simplification removes.
- No new sections; no pricing/FAQ/how-it-works changes.

## Verification
- Build clean; desktop 1440 + mobile 390 screenshots reviewed.
- Payment logos visually verified as the correct real brands (each image
  inspected).
- User approves hero + testimonial quotes before push.
