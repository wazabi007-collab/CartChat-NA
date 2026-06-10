# Mobile Navbar CTA Overflow Fix — Design

**Date:** 2026-06-10
**Component:** `src/components/public-navbar.tsx`

## Problem

On mobile viewports (≤390px), the "Create Free Store" navbar CTA wraps to two
lines (127×60px inside an 85px header) and sits flush against the 170px
fixed-width logo, visually overlapping the cart icon in the wordmark. Verified
live on https://oshicart.com at 390×844.

Root cause: the logo `Image` is hard-coded to 170px with `flex-shrink-0`, and
the CTA label has no `whitespace-nowrap`, so when flex space runs out the text
wraps instead of the row overflowing.

## Design (Approach A — responsive label)

All changes in `public-navbar.tsx`; no other files touched.

1. **Responsive CTA label:** replace the static "Create Free Store" text with
   `<span className="sm:hidden">Create Store</span>` and
   `<span className="hidden sm:inline">Create Free Store</span>`. The `Store`
   icon remains in both cases.
2. **Wrap guard:** add `whitespace-nowrap` to the CTA link classes so the label
   can never wrap, regardless of future copy edits.
3. **Responsive logo:** render the logo at 130px below `sm:` and 170px from
   `sm:` up, using Tailwind width classes (`w-[130px] sm:w-[170px] h-auto`)
   instead of the inline `style`. `flex-shrink-0` stays.
4. **Compact CTA padding on mobile:** `px-3 sm:px-4` on the CTA link. Combined
   with the 130px logo this yields an 8px logo↔CTA gap at 360px (140px logo
   left them touching).

Mobile label is "Create Store" (keeps the verb; "Free" is already echoed by the
hero button immediately below the header).

## Non-goals / unchanged behavior

- Tracking event (`landing_cta_clicked`), link targets, mobile dropdown menu,
  scroll-shadow behavior, and desktop layout are untouched.
- Desktop (≥640px) renders pixel-identical to today.

## Verification

Local dev server, viewports 360×800, 390×844, and 1440×900:
- CTA renders on one line with no overlap against the logo.
- Header height returns to a single compact row.
- Desktop appearance unchanged.
