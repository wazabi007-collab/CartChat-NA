# Oshicart Visual Revamp — Design Spec

**Date:** 2026-05-02
**Status:** Draft (pending user review)
**Author:** Brainstormed with Claude
**Scope of change:** Visual + layout only. No backend, schema, or routing changes.

---

## 1. Goal

Revamp the Oshicart marketing landing page (`/`) and public storefronts (`/s/[slug]`) so they look clean, feel proudly Namibian, and convert visitors at parity with Take.app — currently Oshicart's closest WhatsApp-commerce competitor.

The revamp must hit three marks:

1. **Visible product proof.** Visitors must see the actual UI (storefronts, dashboard, WhatsApp order flow) above the fold and throughout — not stock photos of shopkeepers.
2. **Local identity.** The site looks made-in-Namibia, not "global SaaS available in Namibia." This is Oshicart's defensible positioning.
3. **Conversion completeness.** Pricing, payment trust, FAQ, and CTAs are present on the landing — visitors don't have to dig.

## 2. Out of scope

- Dashboard (`/dashboard/*`), admin (`/admin/*`), auth (`/auth/*`), checkout (`/checkout`), invoices (`/invoice`)
- Backend / API / schema changes
- New product features (cover-image upload for stores, etc.) — these may be added in a later phase
- Customer testimonials section — revisit when 5+ signed merchant quotes exist
- Animations and scroll-jacking effects beyond tasteful CSS transitions

## 3. Visual identity — Warm Local

| Token | Hex | Use |
|---|---|---|
| `--sand` | `#fdf6ec` | Page backgrounds, hero gradient base, soft surfaces |
| `--sand-2` | `#f7ead2` | Hero gradient end, subtle section dividers |
| `--terracotta` | `#b45309` | Primary CTA, links, brand wordmark accent, primary highlight |
| `--terracotta-soft` | `#fef3e2` | Tag pills, hover surfaces |
| `--acacia` | `#15803d` | WhatsApp-related actions, success states, country accent in headline |
| `--walnut` | `#1c1408` | Body text, dark CTA bar background, footer (replaces current navy) |
| `--walnut-2` | `#5b4630` | Secondary text |
| `--cream` | `#ffffff` | Cards, surfaces, hero-text container |
| `--border-warm` | `#e7dcc7` | Card borders, dividers |

**Typography**: keep current Tailwind defaults. Headline weight bumps to `font-bold` / `font-extrabold` with `tracking-tight`. Body stays at current sizes.

**Industry archetype theming on storefronts**: existing system in `src/lib/industry.ts` is preserved. The new cover-band gradient and accent shift per archetype:

- `retail` / `general` — terracotta → acacia (default Warm Local)
- `food` — terracotta → warm gold
- `beauty` — slate-rose (existing slate palette retained)
- `services` — acacia → cool teal

## 4. Landing page (`/`)

### Section list (10)

1. **Navbar** — sticky on scroll. Adds new **Pricing** link.
2. **Hero** — split layout (text left, phone mockup right).
3. **Payment trust bar** — payment-method chips.
4. **How it works** — 3 steps with real UI screenshots.
5. **Storefront gallery** — 4–6 live Oshicart stores.
6. **Feature blocks** — 4 features × mini UI screenshot.
7. **Pricing** — Free / Pro / Business.
8. **FAQ** — 6–8 entries.
9. **Big dark CTA bar** — walnut background.
10. **Footer** — keep current structure; navy → walnut.

### Section details

#### 1. Navbar

- **Layout**: Logo (left) · Browse Stores · Pricing *(new)* · Sign in · **Open Free Store** CTA pill (right).
- **Sticky** with subtle backdrop blur and `--border-warm` bottom border once scrolled past 60px.
- **Mobile**: collapses to hamburger; CTA pill remains visible.

#### 2. Hero (split — variant A)

- Two-column desktop grid (`grid-cols-1 lg:grid-cols-[1.2fr_1fr]`), single-column on mobile with phone below text.
- **Above headline**: two pill tags — `★ MADE IN NAMIBIA` (terracotta tint) and `FREE TO START` (sand).
- **Headline (h1)**: *"Sell on WhatsApp. Built for **Namibia**."* — "Namibia" rendered in `--acacia`, period in walnut. `text-4xl lg:text-6xl font-extrabold tracking-tight`.
- **Subhead**: "Open your digital store, take orders on WhatsApp, and accept PayToday, EFT, eWallet & Cash on Delivery. No commission. No setup fees."
- **Dual CTA**:
  - Primary: **Open my free store →** (terracotta fill, white text)
  - Secondary: **▶ Watch demo** (outline walnut)
- **Trust line below CTAs**: "● 34 Namibian stores live · 3,000+ products listed" (acacia dot, walnut-2 text). Numbers pull from existing public stats; if not available, hardcode current values and surface as a TODO.
- **Right column phone mock**: WhatsApp-themed device frame containing a styled fake conversation:
  - Header: store name "Maria's Beauty · Oshicart" on green band
  - Customer bubble: "Hi! I'd like to order 👇"
  - Two product line items with thumbnail
  - Outgoing bubble: "Total: N$570 · Pay via PayToday"
  - Final acacia bubble: "✓ Payment confirmed"
- Background: subtle sand-to-sand-2 vertical gradient.

#### 3. Payment trust bar

- Single horizontal row, centered, on cream surface card with sand background outside.
- Label: "**Accept every payment method Namibians actually use**" (small kicker).
- Chip row: PayToday · EFT · eWallet · Bank Transfer · Cash on Delivery — each chip is a soft warm pill with the partner name. (Use real partner logos when SVG assets are available; otherwise styled wordmarks.)

#### 4. How it works (real UI screenshots)

- Three-step grid (`grid-cols-1 md:grid-cols-3 gap-6`).
- Each step contains:
  - Step number + verb headline (`1. CREATE.`, `2. SHARE.`, `3. GET PAID.`)
  - One-sentence body
  - **Real screenshot** (PNG/WebP, ~600×800) inside a soft device frame:
    - Step 1 — dashboard product-add screen
    - Step 2 — storefront on a phone with share-to-WhatsApp sheet
    - Step 3 — WhatsApp message with PayToday confirmation bubble
- Replaces the current stock-photo carousel of the same shopkeeper.

#### 5. Storefront gallery — "See real stores already on Oshicart"

- `grid-cols-2 md:grid-cols-4 gap-4`.
- Each tile = live storefront thumbnail (top half) + store name + archetype label (bottom half).
- Tile is a real link to `/s/[slug]`. Hover lifts.
- Initial pick: Octovia Nexus + 3 strongest visual stores (curated by merchant team).
- Implementation: tile screenshots can be pre-rendered static assets initially; future iteration may pull live OG images.

#### 6. Feature blocks

- `grid-cols-1 md:grid-cols-2 gap-8` — 4 cards.
- Each card: 60% text (heading + 2-line body), 40% small UI screenshot or animated cropped UI region.
- Features:
  - **Manage orders from anywhere** — dashboard order list screenshot
  - **Track stock automatically** — low-stock badge UI
  - **Use your own domain** — domain settings panel
  - **VAT invoices, automatic** — invoice PDF preview

#### 7. Pricing — Free / Pro / Business

Three-tier pricing card grid (`grid-cols-1 md:grid-cols-3 gap-6`). Pro is highlighted as "Most popular" with a terracotta border.

| Tier | Price | Includes |
|---|---|---|
| **Free** | N$0 / month | Up to **10 products**, Oshicart subdomain (`oshicart.com/s/your-store`), WhatsApp orders, PayToday + EFT + eWallet + Cash on Delivery, mobile-first storefront |
| **Pro** ⭐ | **N$149.95 / month** | **50 products**, everything in Free |
| **Business** | **N$399.95 / month** | **200+ products**, multi-staff accounts, advanced analytics, everything in Pro |

> The Free product limit (10) is a placeholder; user to confirm before launch. Pro and Business tier lists are intentionally lean per user direction — fill in additional perks (custom domain, VAT invoices, priority support, etc.) before public launch.

#### 8. FAQ

Accordion list (`details/summary` semantics). Suggested 6 entries:

1. Do you charge commission on sales? — *No. You keep 100% of every order. We charge a flat monthly subscription on Pro/Business; Free has no fees.*
2. Can I cancel anytime? — *Yes, cancel from your dashboard. No lock-in.*
3. Which payment methods do my customers see? — *PayToday, EFT, eWallet, and Cash on Delivery. All Namibian — no international gateways needed.*
4. How fast do I get paid? — *Customers pay you directly via PayToday/EFT — Oshicart never holds your money.*
5. Can I use my own domain? — *Yes — connect a domain you already own (Pro and above).*
6. Do you handle VAT? — *Yes. Inclusive or exclusive VAT, Namibia 15% rate, automatic invoice generation.*

#### 9. Big dark CTA bar

- Full-bleed band, walnut background (`--walnut`), sand text.
- Left-aligned headline (lg+) / centered (mobile): *"Open your shop today. Free forever to start."*
- Single CTA button: **Open my free store →** (terracotta fill).

#### 10. Footer

- Keep current four-column structure (Brand · About Us · Stores · Contact).
- Background: navy (`#0a0e2e`-ish) → walnut (`--walnut`).
- "Made in Namibia" line and Octovia Nexus credit retained.

## 5. Storefront (`/s/[slug]`) — Full reimagine

### Layout (top to bottom)

1. **Slim navbar** — `← OshiCart` left, `Browse Stores` right (existing).
2. **Cover band** — 120–160px gradient strip per archetype. No content overlay; logo punches into bottom edge.
3. **Store header card** (full width, padded):
   - 64px rounded-square logo (cream background, terracotta letter for stores without uploaded logo)
   - Store name (h1, walnut, bold)
   - Tagline + opening hours line ("Promo Items · Open today 8am–6pm" — hours optional, hidden if not set)
4. **Meta chip row**:
   - 📍 Location (city) — required
   - 📞 Phone — optional
   - ★ Rating + order count — optional, hidden if no orders yet
5. **Action row**:
   - Primary: **💬 Message on WhatsApp** (acacia fill, full width on mobile, flex-1 on desktop)
   - Secondary square buttons: ⤴ Share, ⊞ QR (existing QR feature, surfaced inline)
6. **Payment trust strip** — "**Pay with:** PayToday · EFT · eWallet · Cash on Delivery" — sand surface band, full width.
7. **Tabs** — Products · Track Order (existing). Active tab gets terracotta underline.
8. **Category tiles** (when 3+ categories and 20+ products — existing logic preserved):
   - Richer card: small icon + category title + product count
   - 3-column grid on desktop, 2-column on mobile
9. **Product grid** — current layout retained; styling refresh only (card border, hover lift, price color).
10. **Sticky cart FAB** — keep existing. Color shifts to terracotta.

### Industry archetype theming

- Existing `src/lib/industry.ts` archetypes (retail, food, beauty, services, general) drive the cover-band gradient and primary accent.
- Default fallback (no archetype): warm-local terracotta-to-acacia.
- Beauty archetype's existing slate palette is preserved (do not regress).

## 6. Stores directory (`/stores`)

- Apply Warm Local palette (page background, card borders, CTA).
- Each store card replaces the current initial-letter avatar with a **2×2 mini grid of product thumbnails** when the store has 4+ products. Stores with fewer products fall back to the current avatar.
- Filter chips and search bar styling refreshed to match palette; functionality unchanged.

## 7. Files affected (estimated)

> Implementation plan will produce the authoritative list. This is a forecast.

**New / heavily modified:**

- `src/app/page.tsx` — landing page (heavy rewrite)
- `src/app/s/[slug]/page.tsx` — storefront (heavy rewrite)
- `src/app/stores/page.tsx` — stores directory (medium refresh)
- `src/components/storefront/layouts/*` — storefront component pieces
- `src/components/public-navbar.tsx` — add Pricing link, sticky behavior
- `src/app/globals.css` — add Warm Local palette tokens
- `tailwind.config.ts` (if present) — extend theme with palette tokens
- New: `src/components/landing/*` — Hero, PaymentTrustBar, HowItWorks, StorefrontGallery, FeatureBlocks, Pricing, FAQ, CtaBar

**Static assets needed:**

- 3× How-it-works UI screenshots (dashboard, storefront-on-phone, WhatsApp+PayToday)
- 4–6× live storefront thumbnails for landing gallery
- 4× feature-block UI screenshot crops
- Payment partner logos (PayToday, EFT, eWallet) as SVG if available; otherwise styled wordmarks

## 8. Acceptance criteria

- [ ] Lighthouse scores stay ≥ existing baseline (performance, a11y, SEO) on `/`, `/stores`, and `/s/[slug]`.
- [ ] Landing renders correctly at 360px (smallest target), 768px, 1024px, 1440px.
- [ ] Hero phone mockup is visible above the fold at 1440×900.
- [ ] All four payment methods present on landing trust bar and storefront trust strip.
- [ ] Pricing table shows Free / Pro N$149.95 / Business N$399.95 with stated tier inclusions.
- [ ] FAQ entries render with accessible disclosure semantics.
- [ ] Storefront cover band, header card, meta chips, action row, and payment trust strip all present on `/s/octovia-nexus`.
- [ ] Industry archetype theming still differentiates beauty vs. retail vs. food vs. services on the cover band.
- [ ] No regressions to: cart FAB, category-folder logic, pagination, QR sharing, Track Order tab.
- [ ] No backend, schema, or auth changes.

## 9. Open questions / TODOs

- **Free tier product limit** — assumed 10; user to confirm before launch.
- **Pro / Business additional inclusions** — current spec lists only what user explicitly stated. Confirm whether to add custom domain, VAT invoices, priority support, etc., to differentiate tiers more strongly.
- **Storefront cover image upload** — not in this spec. Recommend a follow-up phase (`storefront-cover-upload`) once this revamp ships.
- **Live storefront thumbnails on landing gallery** — initial implementation = pre-rendered static assets. Live OG-image rendering is a follow-up.
- **Payment partner logo licensing** — confirm permission to use PayToday/EFT/eWallet marks before launch; fall back to styled wordmarks otherwise.

## 10. Risks

| Risk | Impact | Mitigation |
|---|---|---|
| Tailwind v4 oxide-binary failure on Windows dev | Local builds break | Continue current pattern of validating builds via Vercel preview deployments |
| Existing Playwright/UI tests reference old DOM | CI fails after merge | Implementation plan to schedule a test-update task per affected page |
| Real screenshots reveal dashboard rough edges | Marketing oversells what dashboard looks like | Curate screenshots from polished mobile-first dashboard work already shipped |
| Pricing tier inclusions feel sparse | Visitors don't see value to upgrade | User to flesh out Pro/Business perks before public launch |

---

**Next step after spec approval:** invoke the `superpowers:writing-plans` skill to produce a phased implementation plan.
