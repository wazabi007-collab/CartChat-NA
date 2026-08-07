# OshiCart PWA Install — Design

**Date:** 2026-08-07
**Status:** Shipped (revised twice on the day — see Revision history)

## Goal

Two installable apps on one origin:

- **Shoppers** install **OshiCart**, which opens the store directory so they can
  browse and buy from every shop without being locked into one.
- **Merchants** install **OshiCart Dashboard**, which opens their orders.

Both carry the OshiCart icon. Ship an install guide covering iOS and Android,
surface it in the merchant dashboard, and advertise it on the marketing site.

## Current state before this work

OshiCart was **not** a PWA: `/manifest.webmanifest` 404'd, there was no service
worker, and no `apple-mobile-web-app` or `theme-color` tags. Icons existed and
were declared in `src/app/layout.tsx` (`icon-32`, `icon-192`, `icon-512`, and a
180x180 `apple-icon.png`), so iOS "Add to Home Screen" already picked up a
correct icon — but with no manifest the site opened inside Safari chrome. It
behaved as a bookmark, not an app.

## Decisions

| Decision | Choice | Why |
|---|---|---|
| Who can install | Shoppers and merchants, as two separate apps | Different start points and different jobs |
| Shopper app opens | `/stores` (the directory) | A shopper must not be locked into the one shop they happened to install from |
| Shopper app scope | `/` (whole site) | A narrower scope would eject shoppers to the browser the moment they opened a store |
| Icons | The OshiCart icon everywhere | Product decision — see Revision history |
| Shopper prompt | Subtle, dismissible, once, per app | Install rate without hurting merchants' conversion |
| Desktop | Never prompt | Explicit requirement — this is a phone product |
| Offline | Shell only, never commerce data | A cached price or stock level risks orders merchants cannot honour |
| Onboarding placement | Store readiness checklist | The setup wizard gates going live; installing an app must not block that |

### Rejected alternatives

- **One installable app per store.** Built and shipped, then withdrawn. It put
  the merchant's name and logo on the home screen, but locked the shopper into a
  single shop.
- **Native app via Capacitor.** Gains store listings, costs app-store review,
  signing, and a release process. Not warranted.

## Architecture

### 1. Shopper app

`src/app/manifest.ts`, served by Next at `/manifest.webmanifest` and linked
automatically from every route that does not override it:

- `id: "/stores"`, `name: "OshiCart"`, `short_name: "OshiCart"`
- `start_url: "/stores"`, `scope: "/"`, `display: "standalone"`
- icons: `icon-192.png`, `icon-512.png` (`any` and `maskable`)
- `theme_color: "#159947"`, `background_color: "#f8fafc"`

### 2. Merchant app

`src/app/merchant-app.webmanifest/route.ts`, linked by a `metadata` export in
`src/app/(dashboard)/layout.tsx`, which overrides the root manifest across every
dashboard route.

- `id: "/dashboard"`, `name` and `short_name`: `"OshiCart Dashboard"`
- `start_url: "/dashboard"`, `scope: "/"`

**It must not live under `/dashboard`.** The auth middleware redirects anything
matching `startsWith("/dashboard")` to `/login`, and browsers fetch manifests
*without credentials*. A manifest served from `/dashboard/manifest.webmanifest`
therefore resolved to a login page and merchants got no install prompt at all.
This was caught in testing. The manifest holds no secrets, so serving it from a
public path is safe.

It is a route handler because Next's manifest file convention only applies at the
app root, which the shopper app occupies.

### 3. Service worker

A single `public/sw.js` at root scope, covering `/dashboard` and `/s/*` alike.

Network-first with a **shell-only** cache: CSS, JS, fonts, and images. Product,
price, stock, cart, and checkout responses are never cached. Registered from
`src/components/pwa/service-worker-register.tsx`, mounted in the root layout;
registration failure is swallowed because the site works identically without it.

Included deliberately even though current Chrome may not strictly require one for
installability — it is cheap and removes any dependence on which version's
criteria apply.

### 4. Install bar

`src/components/pwa/install-bar.tsx`, rendered on `/stores` and on storefronts.

Three gates, all of which must pass:

1. **Mobile only.** `navigator.userAgentData.mobile` where available (Chromium,
   which is exactly where the install event fires), falling back to
   `matchMedia("(pointer: coarse)")` plus touch support for iOS Safari. Checked
   in that order because a Windows touchscreen laptop is otherwise
   indistinguishable from a tablet. iPad counts as mobile.
2. **Not already installed** — `display-mode: standalone`, or `navigator.standalone` on iOS.
3. **Not dismissed** — a `localStorage` key per app scope, so declining the
   dashboard app does not also decline the shopper app.

On Android it captures `beforeinstallprompt`, calls `preventDefault()` to
suppress Chrome's own mini-infobar, and shows an **Install** button. On iOS,
where no such event exists, it shows Share → *Add to Home Screen* instead.

**Known limitation:** `preventDefault()` suppresses the automatic infobar, but
Chrome's desktop address-bar install icon still appears for any valid manifest.
OshiCart never prompts on desktop; the browser's own affordance cannot be removed.

### 5. Guide, onboarding, marketing

- **`/app`** — iOS and Android steps side by side, plus separate shopper and
  merchant sections. Linked from the footer and `/help`.
- **Dashboard** — a "Get the app" row beside the **Store readiness** checklist in
  `dashboard-command-panel.tsx`. Its state is resolved **client-side**: whether a
  merchant installed the app is not knowable from the database, so it must not be
  driven by server props or it would show a completion the platform cannot
  verify. It is presentational and does not affect `setupScore`.
- **Homepage** — a fifth card in `how-it-works.tsx`.

## Error handling

| Case | Behaviour |
|---|---|
| `beforeinstallprompt` never fires | Bar stays hidden on Android; no empty shell |
| Service worker registration fails | Silently ignored; the site works normally |
| Desktop visitor | No bar, no prompt |
| Merchant not logged in | Manifest still served — it is outside the auth path |

## Verification

- `scripts/check-pwa-helpers.ts` — device rules and per-scope dismissal keys
- Both manifests return 200 `application/manifest+json`; the merchant one
  **while unauthenticated**
- Every public page links exactly one manifest, the shopper one
- Install bar visible at 375px, hidden at desktop width, hidden in standalone,
  and does not reappear after dismissal
- Existing storefront and checkout routes still return 200

## Revision history

1. **Original.** One installable app per store, each with the merchant's own name
   and a per-store icon generated from their logo via `ImageResponse`.
2. **Icon revision.** All apps use the OshiCart icon. The generated-icon route
   (`src/app/s/[slug]/app-icon/[size]/route.tsx`) was removed. It had normalised
   logos through `sharp` because `ImageResponse` silently returns a blank PNG for
   WebP sources — worth remembering if per-store artwork is ever revisited.
3. **Single shopper app.** Per-store manifests removed entirely. Shoppers install
   one OshiCart app that opens the directory, because per-store apps locked them
   into a single shop.

## Out of scope

- Push notifications
- Offline browsing of products
- App store (Play / App Store) distribution
