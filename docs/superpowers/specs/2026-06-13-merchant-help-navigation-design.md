# Merchant Help & Navigation — Design (Spec B)

**Date:** 2026-06-13
**Scope:** chatcart-na. Make help/rules discoverable from the dashboard, fix
cross-surface routing (dashboard ↔ public site), and add a downloadable merchant
guide. **No DB migration.**

## Problem (from audit)
- The useful FAQ + "How it works" content lives only as landing sections on `/`,
  with **no link from inside the dashboard**; no Help/Support/Rules entry point
  in the dashboard nav.
- The **public navbar is not auth-aware** (`public-navbar.tsx` always shows
  "Sign in / Create Free Store") → a logged-in merchant on the public site has
  no way into the dashboard.
- No persistent **"View my store"** in the dashboard nav (only on the home body).
- No PDF/guide exists.

## Design

### 1. Auth-aware public navbar — `src/components/public-navbar.tsx`
It is already a client component. On mount, check the session
(`supabase.auth.getUser()`); if logged in, show a **"Dashboard"** button →
`/dashboard` (and keep/relabel the rest). To avoid a hydration flash, render the
logged-out state first and swap in "Dashboard" after the auth check resolves.
(Footer unchanged.)

### 2. Dashboard nav — persistent "View store" + "Help"
- `src/components/dashboard/nav.tsx` (desktop sidebar) and
  `src/components/dashboard/bottom-nav.tsx` (mobile "More" sheet): add two items:
  - **View store** → opens `/s/[slug]` in a new tab (needs the merchant slug;
    the nav already has merchant context — pass/Read `store_slug`). Use an
    external-link icon.
  - **Help** → `/help` (internal link).
- Place them sensibly (e.g. above Sign out).

### 3. `/help` page — `src/app/help/page.tsx`
A real route (public, also linkable from the footer) that consolidates guidance:
- Reuse the landing **FAQ** (`components/landing/faq.tsx`) and **How-it-works**
  (`components/landing/how-it-works.tsx`) sections.
- A **"Set-up guide"** card with the PDF download (see §4).
- **Selling rules** link (`/prohibited-products`), **Terms** (`/terms`),
  **Privacy** (`/privacy`).
- **Support contact**: WhatsApp `+264 81 627 4823` (wa.me link) and email
  `info@octovianexus.com` (from `footer.tsx`).
- Render with `PublicNavbar` + `Footer` for consistent chrome.
- Link to `/help` from the dashboard nav (§2) and the public `Footer`.

### 4. Downloadable PDF merchant guide
- Author a concise, practical guide and commit it as
  `public/oshicart-merchant-guide.pdf`. Outline: welcome → 1) create your store
  (the 2-min wizard) → 2) add products + good-photo tips (lighting, the app now
  auto-compresses) → 3) payment methods (EFT, MTC Maris, FNB Pay2Cell, eWallet,
  PayToday, Cash on Delivery + proof of payment) → 4) delivery (Store / Yango /
  inDrive + pickup address) → 5) share your store (WhatsApp, QR, social) → 6)
  selling rules (prohibited items) → 7) getting paid safely → 8) support.
- Linked as a download from `/help` and surfaced on the dashboard (a small
  "Read the setup guide" link near the getting-started checklist).
- **Generation:** produce the static PDF from the authored content during
  implementation. If a generated binary proves impractical in-environment, the
  fallback is a print-optimised `/help` (or `/guide`) page with a "Print / Save
  as PDF" action — but the target deliverable is the committed `.pdf`.

## Non-goals
- No change to sign-out routing (stays `/login`).
- No redesign of the dashboard nav beyond the two new items.
- No new auth/session infrastructure — reuse the existing Supabase client.

## Verification
- `npx tsc --noEmit` + `npm run build` clean.
- Logged-in merchant: public navbar shows "Dashboard"; logged-out shows
  "Sign in / Create Free Store".
- Dashboard nav (desktop + mobile) shows "View store" (opens the live store in a
  new tab) and "Help" (→ /help).
- `/help` renders FAQ + how-it-works + rules/terms/privacy links + support
  contact + the guide download; the PDF downloads and reads correctly.
- Footer links to /help.
