# Homepage Realness Pass — Typography + Real Icons — Design

**Date:** 2026-06-11
**Scope:** chatcart-na (Next.js + Tailwind v4). Make the marketing site feel
hand-built, not AI/templated, by fixing the two things that read as generic: the
default font and the generic line-icons. Content/layout stay.

## Problem

The homepage content is genuinely Namibia-specific, but two visual layers read
as "AI template":
1. **Font is Geist** (`next/font/google` in `src/app/layout.tsx`) — Vercel's
   default typeface, the one nearly every AI-generated site ships. The single
   biggest "AI feel".
2. **Generic lucide line-icons** stand in where real brand marks exist. The
   payment trust bar draws a plain phone/bank/wallet glyph even though
   purpose-made payment SVGs (`public/payment-*.svg`), a real WhatsApp mark
   (`public/whatsapp-large.svg`), a Yango logo, and a `public/namibia-map.svg`
   already sit in the repo unused.

Decisions (made with user): font **A = Fraunces (display) + Plus Jakarta Sans
(body)**; icon swap covers **payment bar + hero badges + how-it-works**.

## 1. Typography

- **`src/app/layout.tsx`:** replace the `Geist` / `Geist_Mono` imports with:
  - `Plus_Jakarta_Sans` → CSS var `--font-plus-jakarta` (weights 400,500,600,700,800), the new body font.
  - `Fraunces` → CSS var `--font-fraunces` (weights 400,600,700; `display: "swap"`), the new heading/display font.
  - Keep `Geist_Mono` for `--font-mono` (only appears on SKUs/code, not a
    marketing tell) — out of scope to change.
  - Apply both variables on `<body>` (alongside the existing mono var).
- **`src/app/globals.css`** (Tailwind v4 `@theme inline`):
  - `--font-sans: var(--font-plus-jakarta);` (body, site-wide — replaces Geist).
  - Add `--font-display: var(--font-fraunces);` so `font-display` is a usable
    utility class.
  - The existing `body { font-family: var(--font-sans), … }` now resolves to
    Plus Jakarta Sans site-wide.
- **Apply the display font to marketing headings only** (not the dashboard,
  which stays on the clean sans). Add the `font-display` class to the main
  headings in: `hero.tsx` (h1), `how-it-works.tsx`, `storefront-gallery.tsx`,
  `feature-blocks.tsx`, `pricing.tsx`, `faq.tsx`, `cta-bar.tsx` (each section
  h2), and the `/pricing` page h1. Body text and UI stay on the sans.
- Fraunces is a variable optical-size serif; rely on its default `opsz`. No
  per-letter tuning.

## 2. Real icons

### Payment trust bar — `src/components/landing/payment-trust-bar.tsx`
Replace the row of monochrome lucide glyphs + text labels with a **logo strip**
of the real payment marks (each SVG already carries its own colour/wordmark):
`payment-paytoday.svg`, `payment-eft.svg`, `payment-pay2cell.svg` (new — see
below), `payment-ewallet.svg`, `payment-cod.svg`, rendered via `next/image` (or
`<img>`) at a consistent height (~28–32px) in a wrap-friendly flex row. Keep the
section heading ("Accept the ways Namibians already pay.") and the
"Zero OshiCart commission" badge. Because each SVG includes its own label, drop
the separate text captions to avoid double-labelling.

- **New asset `public/payment-pay2cell.svg`:** the repo has no Pay2Cell mark.
  Create one in the same hand-made style as the others — a small phone/lightning
  glyph + "Pay2Cell" wordmark in an FNB-turquoise (`#00A3AD`) — sized to the
  same 40px-tall viewBox family. (MoMo isn't shown on this bar, so no MoMo asset
  needed.)

### Hero badges — `src/components/landing/hero.tsx`
The three badge pills currently use lucide icons. Swap to real/relevant marks:
- "Made for Namibia" → `namibia-map.svg` (small, the map silhouette).
- "Automated WhatsApp updates" → the real WhatsApp mark (`whatsapp-icon.webp`
  or an inline use of `whatsapp-large.svg`).
- "Zero commission" → keep a clean lucide (no real brand exists); a `BadgePercent`
  or coin glyph, restyled to sit consistently with the two image marks.
Render image marks at a fixed ~16px box so they align with the pill text.

### How-it-works — `src/components/landing/how-it-works.tsx`
- The WhatsApp chat-preview header uses the real WhatsApp mark instead of a
  lucide bubble.
- The "get paid locally" step shows the small real payment marks (paytoday/eft/
  ewallet) inline instead of a generic banknote glyph.
- The four step icons that are pure UI concepts (create store, share link) keep
  clean lucide icons — there is no "real" brand for them, and forcing one would
  look worse. (This is intentional, not a gap.)

## Non-goals

- No copy/headline rewrites (user likes the content), no layout/section
  restructure, no new photography, no stat changes (the 34+/3,000+ numbers stay).
- Dashboard/app typography unchanged except the shared body sans.
- `--font-mono` (Geist Mono) unchanged.

## Verification

- `npx tsc --noEmit` + `npm run build` clean; fonts load (network shows
  Fraunces + Plus Jakarta Sans; Geist Sans no longer requested).
- Homepage at 1440 + 390: headlines render in Fraunces (serif), body in Plus
  Jakarta Sans; no FOUT/flash beyond normal swap.
- Payment bar shows the real coloured payment logos (incl. new Pay2Cell) as a
  recognisable "we accept" strip — not monochrome glyphs.
- Hero "Made for Namibia" shows the Namibia map; WhatsApp badge + how-it-works
  preview show the real WhatsApp mark.
- Dashboard pages still render in the clean sans (no Fraunces leakage), and the
  `/pricing` page picks up the display headings.
- Visual spot-check (screenshot) desktop + mobile before/after.
