# OshiCart PWA Install — Design

**Date:** 2026-08-07
**Status:** Approved

## Goal

Let merchants install the OshiCart dashboard as an app, and let shoppers install
an individual storefront as **that merchant's own** branded app — so a customer
ends up with "Sunrise Crumbs Bakery" on their home screen, not "OshiCart".

Ship an install guide covering iOS and Android, surface it in the merchant
dashboard, and advertise it on the marketing site.

## Current state

OshiCart is **not** a PWA today:

- `/manifest.webmanifest` and `/manifest.json` both return 404
- no service worker
- no `apple-mobile-web-app` or `theme-color` tags

Icons already exist and are declared in `src/app/layout.tsx`: `icon-32.png`,
`icon-192.png`, `icon-512.png`, and a 180x180 `apple-icon.png`. So "Add to Home
Screen" on iOS already picks up a correct icon — but with no manifest the site
opens inside Safari chrome, i.e. it behaves as a bookmark, not an app.

## Decisions

| Decision | Choice | Why |
|---|---|---|
| Who can install | Both merchants and shoppers | Per-store apps are the differentiator; the merchant app is nearly free once the plumbing exists |
| Store app identity | Merchant's store name + logo | An icon called "OshiCart" on a customer's phone buries the merchant's brand |
| Shopper prompt | Subtle, dismissible, once | Install rate without hurting merchants' conversion |
| Desktop | Never prompt | Explicit user requirement — this is a phone product |
| Offline | Shell only, never commerce data | A cached price or stock level risks orders merchants cannot honour |
| Onboarding placement | Store readiness checklist | The setup wizard gates going live; installing an app must not block that |

### Rejected alternatives

- **Single site-wide manifest.** Simplest, but every customer gets an icon named
  "OshiCart". Defeats the purpose.
- **Native app via Capacitor.** Gains store listings, costs app-store review,
  signing, and a release process. Not warranted yet.

## Architecture

### 1. Merchant app (root manifest)

`src/app/manifest.ts` using Next's manifest convention:

- `name: "OshiCart"`, `short_name: "OshiCart"`
- `start_url: "/dashboard"`, `scope: "/"`, `display: "standalone"`
- icons: existing `icon-192.png` and `icon-512.png`, both `purpose: "any"`
- `theme_color` / `background_color` from the existing brand palette

`appleWebApp` metadata added to the root layout so iOS opens it chrome-free.

### 2. Per-store apps

**Manifest:** route handler at
`src/app/s/[slug]/manifest.webmanifest/route.ts` returning
`application/manifest+json` with:

- `name` / `short_name`: the merchant's store name
- `start_url` and `scope`: `/s/[slug]`
- `display: "standalone"`
- icons pointing at the generated icon routes below

Returns 404 for slugs that are missing, inactive, or not `store_status=active`,
matching the storefront's own visibility rules.

**Icons — the trap.** Chrome refuses to install without both a 192px and a 512px
icon. Merchant logos are arbitrary sizes on Supabase storage, so linking them
directly would make install silently fail for most stores. Icons are therefore
generated on demand:

- `src/app/s/[slug]/icon-192.png/route.tsx`
- `src/app/s/[slug]/icon-512.png/route.tsx`

Both use `ImageResponse` from `next/og` (already a Next dependency), drawing the
merchant logo when present and falling back to a branded tile with the store's
initial when absent. Cached with a long `Cache-Control` since logos change rarely.

**Linking:** the storefront's `generateMetadata` sets `manifest` to the per-store
URL and fills in `appleWebApp.title` with the store name.

### 3. Service worker

A single `public/sw.js` at root scope, covering both `/dashboard` and `/s/*`.

Network-first with a **shell-only** cache: CSS, fonts, logo, and the offline
fallback page. Product, price, stock, cart, and checkout responses are never
cached. Registered from a small client component mounted in the root layout.

Included deliberately even though current Chrome may not strictly require one for
installability — it is cheap and removes any dependence on which version's
criteria apply.

### 4. Install bar

Client component rendered on storefronts.

- **Gate 1 — mobile only.** `navigator.userAgentData.mobile` when available
  (Chromium, which is exactly where the install event fires), falling back to
  `matchMedia("(pointer: coarse)")` plus touch support for iOS Safari. iPad
  counts as mobile.
- **Gate 2 — not already installed.** Hidden when
  `matchMedia("(display-mode: standalone)")` matches, or on iOS when
  `navigator.standalone` is true.
- **Gate 3 — not dismissed.** A `localStorage` key, per store slug.

On Android it captures `beforeinstallprompt`, calls `preventDefault()` to
suppress Chrome's own mini-infobar, and shows an **Install** button that calls
`prompt()`. On iOS, where no such event exists, it shows the Share → *Add to
Home Screen* instructions instead.

**Known limitation:** `preventDefault()` suppresses the automatic infobar, but
Chrome's desktop address-bar install icon still appears for any valid manifest.
We can guarantee OshiCart never prompts on desktop; we cannot remove the
browser's own affordance.

### 5. Guide, onboarding, marketing

- **`/app` page** — iOS and Android steps side by side, with a note that the
  steps differ by browser. Linked from the footer and `/help`.
- **Dashboard** — a "Get the app" row alongside the existing **Store readiness**
  checklist in `dashboard-command-panel.tsx`, linking to `/app`. Not a
  setup-wizard step, because the wizard gates going live.

  Its state is resolved **client-side**, not server-side: whether a merchant has
  installed the app is not knowable from the database, so the row must not be
  driven by server props. It renders "Installed" when
  `display-mode: standalone` matches and "Get the app" otherwise. The existing
  four readiness rows keep their server-computed state and their
  `setupScore` denominator is unchanged, so this row is presentational and never
  reports a completion the platform cannot verify.
- **Homepage** — a short section: *your customers get your shop as an app on
  their home screen*.

## Error handling

| Case | Behaviour |
|---|---|
| Merchant has no logo | Icon route renders a branded initial tile |
| Logo fails to fetch | Same fallback; icon route must never 500 |
| Unknown / inactive store slug | Manifest and icon routes return 404 |
| `beforeinstallprompt` never fires | Bar stays hidden on Android; no empty shell |
| Service worker registration fails | Silently ignored; the site works normally |
| Desktop visitor | No bar, no prompt |

## Verification

- Manifest route returns 200 with `application/manifest+json`; icon routes return
  200 PNGs at exactly 192x192 and 512x512, including for a merchant with no logo
- Inactive slug returns 404 for manifest and icons
- Chrome DevTools **Application → Manifest** reports a real storefront as
  installable
- Install bar visible at 375px, hidden at desktop width, hidden in standalone
- iOS wording checked against Safari's actual menu labels
- Existing storefront and checkout routes still return 200

## Out of scope

- Push notifications
- Offline browsing of products
- App store (Play / App Store) distribution
- Installing individual stores from the `/stores` browse page
