# PWA Install Implementation Plan

> **For agentic workers:** Execute this plan **inline** with
> superpowers:executing-plans. Do NOT use subagent-driven-development — this
> project's configuration forbids spawning agents unless explicitly requested.
> Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the OshiCart dashboard installable as an app for merchants, and
make each storefront installable as that merchant's own branded app for shoppers,
with an install guide and a mobile-only install prompt.

**Architecture:** A root manifest covers the merchant app. Each storefront gets a
dynamic manifest route plus on-demand generated 192/512 PNG icons (Chrome refuses
to install without both, and merchant logos are arbitrary sizes). A minimal
service worker caches only static shell assets — never prices or stock. A client
install bar appears on storefronts on mobile only.

**Tech Stack:** Next.js 16 App Router, TypeScript, Tailwind v4, `ImageResponse`
from `next/og`, Supabase.

## Global Constraints

- **Mobile only.** No OshiCart-initiated install path on desktop. `beforeinstallprompt`
  must always be `preventDefault()`ed so Chrome's mini-infobar never self-shows.
- **Never cache commerce data.** The service worker caches only
  `.css .js .woff .woff2 .png .jpg .jpeg .svg .webp .ico`. Never HTML, never API
  responses. A stale price or stock level risks orders merchants cannot honour.
- **Brand colours (exact):** `--acacia: #159947` (theme), `--sand: #f8fafc`
  (background), `--terracotta: #2b5ea7`, `--walnut: #0b1220`.
- **Icon routes must never 500.** A merchant with no logo, or an unreachable
  logo, still gets a valid PNG.
- **Store visibility rules** match the storefront: `is_active = true` AND
  `store_status = 'active'`, else 404.
- **No unit test runner exists** in this repo (only Playwright e2e). Verification
  is by runnable `npx tsx` scripts for pure logic and `curl` against the dev
  server for routes. Do not invent a vitest/jest setup.
- Dashboard pages must keep the `md:ml-56` sidebar offset convention.

---

## File Structure

| File | Responsibility |
|---|---|
| `src/lib/pwa.ts` | Pure, testable device + standalone + dismissal helpers |
| `src/app/manifest.ts` | Root manifest — the merchant app |
| `public/sw.js` | Minimal shell-only service worker |
| `src/components/pwa/service-worker-register.tsx` | Registers the SW |
| `src/app/s/[slug]/app-icon/[size]/route.tsx` | Generated 192/512 store icons |
| `src/app/s/[slug]/manifest.webmanifest/route.ts` | Per-store manifest |
| `src/components/pwa/install-bar.tsx` | Mobile-only install prompt |
| `src/app/app/page.tsx` | iOS + Android install guide |
| `src/components/pwa/get-the-app-row.tsx` | Dashboard "Get the app" row |

---

### Task 1: Pure PWA helpers

**Files:**
- Create: `src/lib/pwa.ts`
- Test: `scripts/check-pwa-helpers.ts`

**Interfaces:**
- Produces: `DeviceHints` interface; `isMobileDevice(h: DeviceHints): boolean`;
  `installDismissKey(scope: string): string`

- [ ] **Step 1: Write the failing test**

Create `scripts/check-pwa-helpers.ts`:

```ts
/**
 * Device-detection checks for the PWA install bar.
 *
 * The bar must never appear on a PC. Run after touching src/lib/pwa.ts:
 *   npx tsx scripts/check-pwa-helpers.ts
 */
import { isMobileDevice, installDismissKey } from "../src/lib/pwa";

let failures = 0;
function check(name: string, actual: unknown, expected: unknown) {
  if (actual === expected) {
    console.log(`ok   ${name}`);
    return;
  }
  failures++;
  console.log(`FAIL ${name}\n  got      ${actual}\n  expected ${expected}`);
}

// Chromium reports mobile directly via User-Agent Client Hints — trust it.
check("android chrome", isMobileDevice({ uaDataMobile: true, coarsePointer: true, maxTouchPoints: 5 }), true);
check("desktop chrome", isMobileDevice({ uaDataMobile: false, coarsePointer: false, maxTouchPoints: 0 }), false);

// A Windows touchscreen laptop has a coarse pointer AND touch points. UA-CH
// says desktop, and it must win — this is the case that would wrongly prompt.
check("touchscreen laptop", isMobileDevice({ uaDataMobile: false, coarsePointer: true, maxTouchPoints: 10 }), false);

// iOS/iPadOS Safari has no userAgentData at all — fall back to pointer + touch.
check("iphone safari", isMobileDevice({ coarsePointer: true, maxTouchPoints: 5 }), true);
check("ipad safari", isMobileDevice({ coarsePointer: true, maxTouchPoints: 5 }), true);
check("desktop safari", isMobileDevice({ coarsePointer: false, maxTouchPoints: 0 }), false);

check("dismiss key", installDismissKey("sunrise-crumbs-bakery"), "oshicart:install-dismissed:sunrise-crumbs-bakery");

console.log(failures === 0 ? "\nALL PASS" : `\n${failures} FAILURE(S)`);
process.exit(failures === 0 ? 0 : 1);
```

- [ ] **Step 2: Run it to verify it fails**

```bash
npx tsx scripts/check-pwa-helpers.ts
```

Expected: FAIL — `Cannot find module '../src/lib/pwa'`.

- [ ] **Step 3: Write the implementation**

Create `src/lib/pwa.ts`:

```ts
/**
 * Helpers for the install prompt.
 *
 * Kept free of `window` and `navigator` so the device rules can actually be
 * tested — see scripts/check-pwa-helpers.ts. The components read the browser
 * and pass the values in.
 */

export interface DeviceHints {
  /** navigator.userAgentData?.mobile — Chromium only, undefined elsewhere. */
  uaDataMobile?: boolean;
  /** matchMedia("(pointer: coarse)").matches */
  coarsePointer: boolean;
  /** navigator.maxTouchPoints */
  maxTouchPoints: number;
}

/**
 * True for phones and tablets, false for PCs.
 *
 * User-Agent Client Hints is authoritative where it exists, which is exactly
 * Chromium — the only place the install event fires. It is checked first
 * because a Windows touchscreen laptop otherwise looks identical to a tablet
 * (coarse pointer, many touch points) and would wrongly be prompted.
 *
 * iOS and iPadOS Safari expose no userAgentData, so they fall through to the
 * pointer + touch test. iPad counts as mobile: an installed storefront is a
 * perfectly good tablet experience.
 */
export function isMobileDevice(hints: DeviceHints): boolean {
  if (typeof hints.uaDataMobile === "boolean") return hints.uaDataMobile;
  return hints.coarsePointer && hints.maxTouchPoints > 0;
}

/** localStorage key recording that the visitor dismissed the bar for one store. */
export function installDismissKey(scope: string): string {
  return `oshicart:install-dismissed:${scope}`;
}
```

- [ ] **Step 4: Run it to verify it passes**

```bash
npx tsx scripts/check-pwa-helpers.ts
```

Expected: `ALL PASS`.

- [ ] **Step 5: Commit**

```bash
git add src/lib/pwa.ts scripts/check-pwa-helpers.ts
git commit -m "Add PWA device-detection helpers"
```

---

### Task 2: Root manifest, Apple metadata, service worker

**Files:**
- Create: `src/app/manifest.ts`
- Create: `public/sw.js`
- Create: `src/components/pwa/service-worker-register.tsx`
- Modify: `src/app/layout.tsx`

**Interfaces:**
- Produces: `/manifest.webmanifest` (served by Next from `manifest.ts`);
  `<ServiceWorkerRegister />` component with no props

- [ ] **Step 1: Write the root manifest**

Create `src/app/manifest.ts`:

```ts
import type { MetadataRoute } from "next";

/**
 * The merchant-facing app. Shoppers get a per-store manifest instead
 * (src/app/s/[slug]/manifest.webmanifest), so their home screen shows the
 * merchant's shop rather than "OshiCart".
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/dashboard",
    name: "OshiCart — manage your store",
    short_name: "OshiCart",
    description:
      "Manage your OshiCart store, orders, and products from your phone.",
    start_url: "/dashboard",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#f8fafc",
    theme_color: "#159947",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
```

- [ ] **Step 2: Write the service worker**

Create `public/sw.js`:

```js
/*
 * Shell-only service worker.
 *
 * Deliberately does NOT cache HTML or any API response. OshiCart shows live
 * prices and stock; serving those from cache risks orders a merchant cannot
 * honour. Static assets are cached so repeat visits cost less mobile data.
 */
const SHELL_CACHE = "oshicart-shell-v1";
const CACHEABLE = /\.(css|js|woff2?|png|jpe?g|svg|webp|ico)$/i;

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== SHELL_CACHE).map((k) => caches.delete(k)))
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (!CACHEABLE.test(url.pathname)) return;

  event.respondWith(
    fetch(request)
      .then((response) => {
        const copy = response.clone();
        caches.open(SHELL_CACHE).then((cache) => cache.put(request, copy));
        return response;
      })
      .catch(() => caches.match(request))
  );
});
```

- [ ] **Step 3: Write the registration component**

Create `src/components/pwa/service-worker-register.tsx`:

```tsx
"use client";

import { useEffect } from "react";

/**
 * Registers the shell service worker. Failure is non-fatal — the site works
 * exactly the same without it, so errors are swallowed rather than surfaced.
 */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  }, []);

  return null;
}
```

- [ ] **Step 4: Wire it into the root layout**

In `src/app/layout.tsx`, add the import alongside the existing imports:

```tsx
import { ServiceWorkerRegister } from "@/components/pwa/service-worker-register";
```

Add these two fields to the exported `metadata` object, after `icons`:

```tsx
  appleWebApp: {
    capable: true,
    title: "OshiCart",
    statusBarStyle: "default",
  },
```

Add to the same file a viewport export (Next requires `themeColor` here, not in
`metadata`):

```tsx
export const viewport = {
  themeColor: "#159947",
};
```

Render `<ServiceWorkerRegister />` as the last child inside `<body>`.

- [ ] **Step 5: Verify the manifest and worker are served**

```bash
npm run build && npm run dev
```

Then in a second shell:

```bash
curl -s -o /dev/null -w "manifest %{http_code} %{content_type}\n" http://localhost:3000/manifest.webmanifest
```

Expected: `manifest 200 application/manifest+json`.

```bash
curl -s -o /dev/null -w "sw %{http_code}\n" http://localhost:3000/sw.js
```

Expected: `sw 200`.

- [ ] **Step 6: Verify exactly ONE manifest link on a page**

```bash
curl -s http://localhost:3000/ | grep -o 'rel="manifest"' | wc -l
```

Expected: `1`.

If this ever returns `2` on a storefront after Task 4, delete `src/app/manifest.ts`
and instead serve the root manifest from a route handler at
`src/app/manifest.webmanifest/route.ts`, setting `manifest: "/manifest.webmanifest"`
in the root layout's `metadata` so per-route metadata can override it cleanly.

- [ ] **Step 7: Commit**

```bash
git add src/app/manifest.ts public/sw.js src/components/pwa/service-worker-register.tsx src/app/layout.tsx
git commit -m "Add root manifest, Apple web app metadata, and shell service worker"
```

---

### Task 3: Generated per-store icons

**Files:**
- Create: `src/app/s/[slug]/app-icon/[size]/route.tsx`

**Interfaces:**
- Produces: `GET /s/{slug}/app-icon/{192|512}` → PNG of exactly that size

Chrome will not offer installation unless the manifest supplies a 192px and a
512px icon. Merchant logos are arbitrary sizes on Supabase storage, so they are
re-rendered at exact dimensions here. One route handles both sizes rather than
duplicating a file per size.

- [ ] **Step 1: Write the route**

Create `src/app/s/[slug]/app-icon/[size]/route.tsx`:

```tsx
import { ImageResponse } from "next/og";
import { createClient } from "@/lib/supabase/server";

const ALLOWED_SIZES = new Set([192, 512]);

interface Props {
  params: Promise<{ slug: string; size: string }>;
}

/**
 * The store's app icon, rendered at exactly the size Chrome demands.
 *
 * Merchant logos live on Supabase storage at whatever dimensions they were
 * uploaded, so pointing the manifest straight at them makes installation fail
 * silently for most stores. Merchants with no logo get a branded initial tile,
 * so this route never fails to produce an icon.
 */
export async function GET(_request: Request, { params }: Props) {
  const { slug, size: rawSize } = await params;
  const size = Number(rawSize);

  if (!ALLOWED_SIZES.has(size)) {
    return new Response("Not found", { status: 404 });
  }

  const supabase = await createClient();
  const { data: merchant } = await supabase
    .from("merchants")
    .select("store_name, logo_url")
    .eq("store_slug", slug)
    .eq("is_active", true)
    .eq("store_status", "active")
    .single();

  if (!merchant) {
    return new Response("Not found", { status: 404 });
  }

  const initial = (merchant.store_name || "?").charAt(0).toUpperCase();

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#f8fafc",
        }}
      >
        {merchant.logo_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={merchant.logo_url}
            alt=""
            width={size}
            height={size}
            style={{ width: "100%", height: "100%", objectFit: "contain" }}
          />
        ) : (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: "100%",
              height: "100%",
              background: "#159947",
              color: "#ffffff",
              fontSize: size * 0.5,
              fontWeight: 700,
            }}
          >
            {initial}
          </div>
        )}
      </div>
    ),
    {
      width: size,
      height: size,
      headers: {
        "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
      },
    }
  );
}
```

- [ ] **Step 2: Verify both sizes render**

With the dev server running:

```bash
curl -s -o /dev/null -w "192: %{http_code} %{content_type}\n" "http://localhost:3000/s/sunrise-crumbs-bakery/app-icon/192"
curl -s -o /dev/null -w "512: %{http_code} %{content_type}\n" "http://localhost:3000/s/sunrise-crumbs-bakery/app-icon/512"
```

Expected: both `200 image/png`.

- [ ] **Step 3: Verify the actual pixel dimensions**

```bash
curl -s "http://localhost:3000/s/sunrise-crumbs-bakery/app-icon/512" -o /tmp/icon512.png && node -e "const b=require('fs').readFileSync('/tmp/icon512.png');console.log('w',b.readUInt32BE(16),'h',b.readUInt32BE(20))"
```

Expected: `w 512 h 512`. (Bytes 16–23 of a PNG's IHDR chunk are width and height.)

- [ ] **Step 4: Verify rejected sizes and unknown stores 404**

```bash
curl -s -o /dev/null -w "size 256: %{http_code}\n" "http://localhost:3000/s/sunrise-crumbs-bakery/app-icon/256"
curl -s -o /dev/null -w "bad slug: %{http_code}\n" "http://localhost:3000/s/no-such-store-xyz/app-icon/192"
```

Expected: both `404`.

- [ ] **Step 5: Commit**

```bash
git add "src/app/s/[slug]/app-icon/[size]/route.tsx"
git commit -m "Generate per-store app icons at the sizes Chrome requires"
```

---

### Task 4: Per-store manifest and storefront metadata

**Files:**
- Create: `src/app/s/[slug]/manifest.webmanifest/route.ts`
- Modify: `src/app/s/[slug]/page.tsx` (the `generateMetadata` function)

**Interfaces:**
- Consumes: `GET /s/{slug}/app-icon/{size}` from Task 3
- Produces: `GET /s/{slug}/manifest.webmanifest` → `application/manifest+json`

- [ ] **Step 1: Write the manifest route**

Create `src/app/s/[slug]/manifest.webmanifest/route.ts`:

```ts
import { createClient } from "@/lib/supabase/server";

interface Props {
  params: Promise<{ slug: string }>;
}

/**
 * One installable app per store.
 *
 * `scope` and `start_url` are pinned to /s/[slug] so the installed app opens
 * that shop and treats the rest of OshiCart as external. The result on a
 * customer's home screen is the merchant's shop, not "OshiCart".
 */
export async function GET(_request: Request, { params }: Props) {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: merchant } = await supabase
    .from("merchants")
    .select("store_name, description")
    .eq("store_slug", slug)
    .eq("is_active", true)
    .eq("store_status", "active")
    .single();

  if (!merchant) {
    return new Response("Not found", { status: 404 });
  }

  const manifest = {
    id: `/s/${slug}`,
    name: merchant.store_name,
    short_name: merchant.store_name.slice(0, 12),
    description:
      merchant.description || `Order from ${merchant.store_name} on OshiCart.`,
    start_url: `/s/${slug}`,
    scope: `/s/${slug}`,
    display: "standalone",
    orientation: "portrait",
    background_color: "#f8fafc",
    theme_color: "#159947",
    icons: [
      {
        src: `/s/${slug}/app-icon/192`,
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: `/s/${slug}/app-icon/512`,
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
    ],
  };

  return Response.json(manifest, {
    headers: {
      "Content-Type": "application/manifest+json",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
```

- [ ] **Step 2: Link it from the storefront**

In `src/app/s/[slug]/page.tsx`, inside `generateMetadata`, add these two fields to
the returned object, after `alternates`:

```tsx
    manifest: `/s/${slug}/manifest.webmanifest`,
    appleWebApp: {
      capable: true,
      title: merchant.store_name,
      statusBarStyle: "default",
    },
```

- [ ] **Step 3: Verify the manifest serves and 404s correctly**

```bash
curl -s "http://localhost:3000/s/sunrise-crumbs-bakery/manifest.webmanifest" | head -c 400; echo
curl -s -o /dev/null -w "\nbad slug: %{http_code}\n" "http://localhost:3000/s/no-such-store-xyz/manifest.webmanifest"
```

Expected: JSON containing `"name":"Sunrise Crumbs Bakery"`, `"start_url":"/s/sunrise-crumbs-bakery"`,
and both icon entries; then `bad slug: 404`.

- [ ] **Step 4: Verify the storefront links exactly one manifest — its own**

```bash
curl -s http://localhost:3000/s/sunrise-crumbs-bakery | grep -o 'rel="manifest" href="[^"]*"'
```

Expected: exactly one line, pointing at `/s/sunrise-crumbs-bakery/manifest.webmanifest`.
If two lines appear, apply the fallback described in Task 2 Step 6.

- [ ] **Step 5: Commit**

```bash
git add "src/app/s/[slug]/manifest.webmanifest/route.ts" "src/app/s/[slug]/page.tsx"
git commit -m "Give each storefront its own installable manifest"
```

---

### Task 5: Mobile-only install bar

**Files:**
- Create: `src/components/pwa/install-bar.tsx`
- Modify: `src/app/s/[slug]/page.tsx` (render the bar)

**Interfaces:**
- Consumes: `isMobileDevice`, `installDismissKey` from `src/lib/pwa` (Task 1)
- Produces: `<InstallBar storeName={string} scope={string} />`

- [ ] **Step 1: Write the component**

Create `src/components/pwa/install-bar.tsx`:

```tsx
"use client";

import { useEffect, useState } from "react";
import { Share, X } from "lucide-react";
import { isMobileDevice, installDismissKey } from "@/lib/pwa";

/** The slice of beforeinstallprompt we use. Not in TypeScript's DOM lib. */
interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

interface Props {
  storeName: string;
  /** Store slug — dismissal is remembered per store. */
  scope: string;
}

export function InstallBar({ storeName, scope }: Props) {
  const [prompt, setPrompt] = useState<InstallPromptEvent | null>(null);
  const [showIosHint, setShowIosHint] = useState(false);
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    const nav = navigator as Navigator & { standalone?: boolean };

    // Already installed — nothing to offer.
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      nav.standalone === true;
    if (standalone) return;

    const mobile = isMobileDevice({
      uaDataMobile: (navigator as Navigator & {
        userAgentData?: { mobile?: boolean };
      }).userAgentData?.mobile,
      coarsePointer: window.matchMedia("(pointer: coarse)").matches,
      maxTouchPoints: navigator.maxTouchPoints,
    });
    if (!mobile) return;

    if (localStorage.getItem(installDismissKey(scope))) return;

    setDismissed(false);

    // iOS fires no install event, so Safari gets written instructions instead.
    const isIos =
      /iphone|ipad|ipod/i.test(navigator.userAgent) ||
      (navigator.maxTouchPoints > 1 && /macintosh/i.test(navigator.userAgent));
    const isSafari =
      /safari/i.test(navigator.userAgent) && !/chrome|crios|fxios/i.test(navigator.userAgent);
    if (isIos && isSafari) setShowIosHint(true);

    const onBeforeInstall = (event: Event) => {
      // Always suppress Chrome's own mini-infobar; we control when to ask.
      event.preventDefault();
      setPrompt(event as InstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    return () => window.removeEventListener("beforeinstallprompt", onBeforeInstall);
  }, [scope]);

  const close = () => {
    localStorage.setItem(installDismissKey(scope), "1");
    setDismissed(true);
  };

  const install = async () => {
    if (!prompt) return;
    await prompt.prompt();
    await prompt.userChoice;
    setPrompt(null);
    close();
  };

  // Nothing to say on this device yet.
  if (dismissed || (!prompt && !showIosHint)) return null;

  return (
    <div className="mb-4 flex items-start gap-3 rounded-xl border border-acacia/20 bg-acacia-soft p-3">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold text-walnut">
          Add {storeName} to your home screen
        </p>
        {showIosHint ? (
          <p className="mt-1 flex flex-wrap items-center gap-1 text-xs font-semibold text-walnut-2">
            Tap <Share size={13} className="inline" /> Share, then
            <span className="font-black">Add to Home Screen</span>
          </p>
        ) : (
          <p className="mt-1 text-xs font-semibold text-walnut-2">
            Open this shop like an app, straight from your phone.
          </p>
        )}
      </div>

      {prompt && (
        <button
          onClick={install}
          className="shrink-0 rounded-lg bg-acacia px-3 py-2 text-xs font-black text-white"
        >
          Install
        </button>
      )}

      <button
        onClick={close}
        aria-label="Dismiss"
        className="shrink-0 rounded-lg p-2 text-walnut-2 hover:bg-white"
      >
        <X size={16} />
      </button>
    </div>
  );
}
```

- [ ] **Step 2: Render it on the storefront**

In `src/app/s/[slug]/page.tsx`, add the import:

```tsx
import { InstallBar } from "@/components/pwa/install-bar";
```

Render it immediately before `<StorefrontTabs`:

```tsx
<InstallBar storeName={merchant.store_name} scope={slug} />
```

- [ ] **Step 3: Verify it is hidden on desktop**

```bash
curl -s http://localhost:3000/s/sunrise-crumbs-bakery | grep -c "Add to your home screen" || echo "0 (correct — client-rendered only)"
```

Then in the in-app browser at desktop width (1280x800), load the storefront and run:

```js
document.body.innerText.includes("home screen")
```

Expected: `false`.

- [ ] **Step 4: Verify it appears on mobile**

Resize the browser to the `mobile` preset (375x812), reload so the device
emulation applies, and run the same check.

Expected: `true`, and the bar shows the iOS Share wording or an Install button.

- [ ] **Step 5: Commit**

```bash
git add src/components/pwa/install-bar.tsx "src/app/s/[slug]/page.tsx"
git commit -m "Add mobile-only storefront install bar"
```

---

### Task 6: Install guide page and links

**Files:**
- Create: `src/app/app/page.tsx`
- Modify: `src/components/footer.tsx:95` (after the Help list item)
- Modify: `src/app/help/page.tsx`

**Interfaces:**
- Produces: route `/app`

- [ ] **Step 1: Write the guide page**

Create `src/app/app/page.tsx`:

```tsx
import type { Metadata } from "next";
import { Footer } from "@/components/footer";

export const metadata: Metadata = {
  title: "Install OshiCart as an app",
  description:
    "Add OshiCart or any OshiCart store to your phone's home screen on iPhone and Android.",
  alternates: { canonical: "/app" },
};

const ANDROID_STEPS = [
  "Open your store link in Chrome.",
  "Tap the ⋮ menu in the top-right corner.",
  "Tap Install app (or Add to Home screen).",
  "Tap Install to confirm.",
];

const IOS_STEPS = [
  "Open your store link in Safari. This does not work in Chrome on iPhone.",
  "Tap the Share button at the bottom of the screen.",
  "Scroll down and tap Add to Home Screen.",
  "Tap Add in the top-right corner.",
];

export default function AppInstallPage() {
  return (
    <>
      <main className="mx-auto max-w-3xl px-4 py-12">
        <h1 className="text-3xl font-black tracking-tight text-walnut sm:text-4xl">
          Use OshiCart like an app
        </h1>
        <p className="mt-3 text-base leading-7 text-walnut-2">
          You do not need the Play Store or the App Store. Add OshiCart — or any
          OshiCart shop — straight to your phone&apos;s home screen. It opens
          full screen with its own icon, just like an installed app.
        </p>

        <div className="mt-8 grid gap-6 sm:grid-cols-2">
          <Steps title="Android" steps={ANDROID_STEPS} />
          <Steps title="iPhone &amp; iPad" steps={IOS_STEPS} />
        </div>

        <div className="mt-8 rounded-2xl border border-border-warm bg-sand p-5">
          <h2 className="text-lg font-black text-walnut">
            Merchants: install your dashboard
          </h2>
          <p className="mt-2 text-sm leading-6 text-walnut-2">
            Follow the same steps on{" "}
            <span className="font-black">oshicart.com/dashboard</span> to manage
            orders from your home screen.
          </p>
          <h2 className="mt-5 text-lg font-black text-walnut">
            Customers: install a shop
          </h2>
          <p className="mt-2 text-sm leading-6 text-walnut-2">
            Follow the steps on any store link. The icon carries that
            shop&apos;s own name and logo.
          </p>
        </div>
      </main>
      <Footer />
    </>
  );
}

function Steps({ title, steps }: { title: string; steps: string[] }) {
  return (
    <div className="rounded-2xl border border-border-warm bg-white p-5 shadow-sm">
      <h2 className="text-lg font-black text-walnut">{title}</h2>
      <ol className="mt-4 space-y-3">
        {steps.map((step, i) => (
          <li key={step} className="flex gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-acacia text-xs font-black text-white">
              {i + 1}
            </span>
            <span className="text-sm leading-6 text-walnut-2">{step}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}
```

- [ ] **Step 2: Add the footer link**

In `src/components/footer.tsx`, after the `</li>` closing the Help link (line 95),
insert:

```tsx
              <li>
                <Link href="/app" className="hover:text-white transition-colors">
                  Install as app
                </Link>
              </li>
```

- [ ] **Step 3: Add a link from /help**

Open `src/app/help/page.tsx`, find the list of help links, and add an entry
pointing to `/app` with the label `Install OshiCart as an app`, matching the
markup of the surrounding entries exactly.

- [ ] **Step 4: Verify**

```bash
curl -s -o /dev/null -w "/app: %{http_code}\n" http://localhost:3000/app
curl -s http://localhost:3000/ | grep -c 'href="/app"'
```

Expected: `/app: 200` and a count of at least `1`.

- [ ] **Step 5: Commit**

```bash
git add src/app/app/page.tsx src/components/footer.tsx src/app/help/page.tsx
git commit -m "Add install guide page and links"
```

---

### Task 7: Dashboard row, homepage mention, deploy

**Files:**
- Create: `src/components/pwa/get-the-app-row.tsx`
- Modify: `src/components/dashboard/dashboard-command-panel.tsx:198-202`
- Modify: `src/components/landing/how-it-works.tsx`

**Interfaces:**
- Consumes: `<InstallBar>` conventions from Task 5
- Produces: `<GetTheAppRow />`, no props

- [ ] **Step 1: Write the dashboard row**

Whether a merchant installed the app is not knowable from the database, so this
row resolves its own state in the browser and never reports a completion the
platform cannot verify.

Create `src/components/pwa/get-the-app-row.tsx`:

```tsx
"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { CheckCircle2, Smartphone } from "lucide-react";

/**
 * "Get the app" row for the dashboard readiness card.
 *
 * Client-side on purpose: installation leaves no server-side trace, so this
 * must not be driven by server props or it would show a checkmark it cannot
 * back up. It is presentational and does not count toward the setup score.
 */
export function GetTheAppRow() {
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    const nav = navigator as Navigator & { standalone?: boolean };
    setInstalled(
      window.matchMedia("(display-mode: standalone)").matches ||
        nav.standalone === true
    );
  }, []);

  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <span className="font-semibold text-slate-700">Store app on your phone</span>
      {installed ? (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-black text-acacia">
          <CheckCircle2 size={13} />
          Installed
        </span>
      ) : (
        <Link
          href="/app"
          className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-black text-slate-500 hover:bg-slate-200"
        >
          <Smartphone size={13} />
          Get the app
        </Link>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Add it to the readiness card**

In `src/components/dashboard/dashboard-command-panel.tsx`, add the import:

```tsx
import { GetTheAppRow } from "@/components/pwa/get-the-app-row";
```

Then, immediately after the `<ReadinessRow label="Setup flow healthy" ... />`
line inside the "Store readiness" block, add:

```tsx
                <GetTheAppRow />
```

Do not change `setupScore` or its `/4` denominator — this row is informational.

- [ ] **Step 3: Add the homepage mention**

In `src/components/landing/how-it-works.tsx`, add a fifth entry to the `STEPS`
array, and add `Smartphone` to the existing `lucide-react` import:

```tsx
  {
    icon: Smartphone,
    title: "Your shop, as an app",
    body: "Customers add your store to their home screen and reopen it with one tap — no Play Store, no App Store.",
  },
```

Change the grid class on the STEPS container from `md:grid-cols-4` to
`md:grid-cols-2 lg:grid-cols-5` so five cards lay out cleanly.

- [ ] **Step 4: Full verification**

```bash
npm run build
```

Expected: `Compiled successfully`, and the route list includes `/app`,
`/s/[slug]/manifest.webmanifest`, and `/s/[slug]/app-icon/[size]`.

```bash
npx tsx scripts/check-pwa-helpers.ts
```

Expected: `ALL PASS`.

In the in-app browser at 375x812, load a storefront and confirm the install bar
appears; at 1280x800 confirm it does not.

- [ ] **Step 5: Commit and deploy**

```bash
git add src/components/pwa/get-the-app-row.tsx src/components/dashboard/dashboard-command-panel.tsx src/components/landing/how-it-works.tsx
git commit -m "Surface the app in dashboard readiness and on the homepage"
git push origin master
```

- [ ] **Step 6: Verify production**

```bash
for u in / /app /s/sunrise-crumbs-bakery /s/sunrise-crumbs-bakery/manifest.webmanifest /s/sunrise-crumbs-bakery/app-icon/512; do printf "%-52s %s\n" "$u" "$(curl -s -o /dev/null -w '%{http_code}' https://oshicart.com$u)"; done
```

Expected: all `200`.

---

## Self-Review

**Spec coverage:** Root manifest → Task 2. Apple metadata → Tasks 2 and 4.
Service worker → Task 2. Per-store manifest → Task 4. Generated 192/512 icons →
Task 3. Install bar with three gates → Tasks 1 and 5. Desktop suppression →
Tasks 1 and 5. Guide page → Task 6. Footer and help links → Task 6. Dashboard
row → Task 7. Homepage mention → Task 7. Error-handling table → Task 3 (logo
fallback, 404s), Task 2 (silent SW failure), Task 5 (no event → no bar).
No gaps.

**Naming consistency:** `isMobileDevice` and `installDismissKey` are defined in
Task 1 and used with those exact names in Tasks 5 and 7. `DeviceHints` fields
(`uaDataMobile`, `coarsePointer`, `maxTouchPoints`) match between the helper, the
check script, and the install bar. Icon route path `/s/{slug}/app-icon/{size}` is
identical in Tasks 3 and 4.

**Known risk:** Next may emit its own `<link rel="manifest">` from
`src/app/manifest.ts` on every route, competing with the per-store manifest.
Task 2 Step 6 and Task 4 Step 4 both assert the tag count, with a concrete
fallback rather than an assumption.
