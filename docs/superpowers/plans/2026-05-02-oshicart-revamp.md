# Oshicart Visual Revamp Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild Oshicart's marketing landing page (`/`) and public storefronts (`/s/[slug]`) with the Warm Local visual identity, real product proof, full pricing/FAQ on landing, and a richer per-store header — without touching backend, schema, or auth.

**Architecture:** Pure presentation work in Next.js 16 App Router with Tailwind CSS v4. Palette tokens live in `src/app/globals.css` under `@theme inline`. New landing components go under `src/components/landing/`. Storefront reuses existing `src/components/storefront/` structure with new header/cover pieces added. Industry archetype theming (`src/lib/industry.ts`) drives storefront cover gradients.

**Tech Stack:** Next.js 16.1.6, React 19, TypeScript, Tailwind CSS v4, Supabase (read-only for this scope).

**Spec:** [`docs/superpowers/specs/2026-05-02-oshicart-revamp-design.md`](../specs/2026-05-02-oshicart-revamp-design.md)

---

## File Structure

### New files

```
src/components/landing/
  hero.tsx                  # Split hero with phone mockup
  whatsapp-phone-mock.tsx   # Reusable phone-frame mock used by hero & how-it-works
  payment-trust-bar.tsx     # Horizontal payment-method chip row
  how-it-works.tsx          # 3-step grid with real UI screenshots
  storefront-gallery.tsx    # 4–6 live store thumbnails
  feature-blocks.tsx        # 4 feature cards with mini UI
  pricing.tsx               # Free / Pro / Business table
  faq.tsx                   # Accordion of 6 entries
  cta-bar.tsx               # Big walnut full-bleed CTA
  testimonial-strip.tsx     # NOT BUILT — listed for clarity (testimonials cut)

src/components/storefront/
  store-cover.tsx           # Gradient cover band per archetype
  store-header-card.tsx     # Logo + name + tagline + meta chips + actions
  store-payment-strip.tsx   # "Pay with: …" sand strip below header
  store-category-grid.tsx   # New richer category tiles
  share-actions.tsx         # Share + QR icon buttons (extracts existing logic)

public/landing/
  hiw-1-create.png          # 3 How-it-works screenshots (placeholder PNGs initially)
  hiw-2-share.png
  hiw-3-paid.png
  feature-orders.png        # 4 feature-block UI crops
  feature-stock.png
  feature-domain.png
  feature-invoice.png
  store-thumb-*.png         # Storefront gallery thumbnails (4–6)
```

### Modified files

```
src/app/globals.css                              # Add Warm Local palette tokens
src/app/page.tsx                                 # Compose new landing sections
src/app/s/[slug]/page.tsx                        # Mount new storefront header pieces
src/app/stores/page.tsx                          # Palette refresh + mini-grid card thumbs
src/components/public-navbar.tsx                 # Add Pricing link + sticky-on-scroll behavior
src/components/storefront/layouts/*.tsx          # Adopt new palette tokens (light touch)
src/lib/industry.ts                              # Add cover-gradient mapping per archetype
```

### Deleted files

None. Existing components stay; revamp is additive + restyling.

---

## Phase 0 — Foundation

### Task 1: Add Warm Local palette tokens

**Files:**
- Modify: `src/app/globals.css`

- [ ] **Step 1: Update `src/app/globals.css` with new tokens**

Replace the contents of `src/app/globals.css` with:

```css
@import "tailwindcss";

:root {
  --background: #ffffff;
  --foreground: #171717;

  /* Warm Local palette */
  --sand: #fdf6ec;
  --sand-2: #f7ead2;
  --terracotta: #b45309;
  --terracotta-soft: #fef3e2;
  --acacia: #15803d;
  --acacia-soft: #dcfce7;
  --walnut: #1c1408;
  --walnut-2: #5b4630;
  --border-warm: #e7dcc7;
}

@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --font-sans: var(--font-geist-sans);
  --font-mono: var(--font-geist-mono);

  /* Warm Local colors exposed to Tailwind */
  --color-sand: var(--sand);
  --color-sand-2: var(--sand-2);
  --color-terracotta: var(--terracotta);
  --color-terracotta-soft: var(--terracotta-soft);
  --color-acacia: var(--acacia);
  --color-acacia-soft: var(--acacia-soft);
  --color-walnut: var(--walnut);
  --color-walnut-2: var(--walnut-2);
  --color-border-warm: var(--border-warm);
}

body {
  background: var(--background);
  color: var(--foreground);
  font-family: var(--font-sans), Arial, Helvetica, sans-serif;
}
```

- [ ] **Step 2: Verify dev build still compiles**

Run: `npm run dev`
Expected: server starts; no Tailwind errors. Visit http://localhost:3000 — page should render unchanged (tokens added, not yet used).
Stop the server (Ctrl+C) once verified.

- [ ] **Step 3: Commit**

```bash
git add src/app/globals.css
git commit -m "feat(theme): add Warm Local palette tokens (sand/terracotta/acacia/walnut)"
```

---

### Task 2: Add Pricing link + sticky behavior to public navbar

**Files:**
- Modify: `src/components/public-navbar.tsx`

- [ ] **Step 1: Read current navbar**

Run: `cat src/components/public-navbar.tsx`
Goal: understand existing structure so the diff stays minimal.

- [ ] **Step 2: Add `Pricing` link and sticky-on-scroll backdrop**

Inside `src/components/public-navbar.tsx`, find the link list (the section currently rendering `Browse Stores` and `Sign in`). Add a `Pricing` link between them that points to `/#pricing`. Wrap the outer `<nav>` (or `<header>`) in:

```tsx
<header
  className="sticky top-0 z-40 backdrop-blur supports-[backdrop-filter]:bg-white/70 bg-white border-b border-transparent data-[scrolled=true]:border-border-warm transition-colors"
  data-scrolled={scrolled ? "true" : "false"}
>
  {/* existing nav contents */}
</header>
```

Add at the top of the component:

```tsx
"use client";
import { useEffect, useState } from "react";

// inside component body:
const [scrolled, setScrolled] = useState(false);
useEffect(() => {
  const onScroll = () => setScrolled(window.scrollY > 60);
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });
  return () => window.removeEventListener("scroll", onScroll);
}, []);
```

Add the Pricing link:

```tsx
<Link href="/#pricing" className="text-sm text-walnut-2 hover:text-walnut">
  Pricing
</Link>
```

- [ ] **Step 3: Verify in browser**

Run: `npm run dev`
Open http://localhost:3000 — navbar shows `Browse Stores · Pricing · Sign in · Open Free Store`. Scroll past 60px and confirm a faint warm border appears under the navbar. Stop server.

- [ ] **Step 4: Commit**

```bash
git add src/components/public-navbar.tsx
git commit -m "feat(nav): add Pricing link and sticky scroll border"
```

---

## Phase 1 — Landing page

### Task 3: WhatsApp phone mock (reusable)

**Files:**
- Create: `src/components/landing/whatsapp-phone-mock.tsx`

This component is used by both the hero and How-it-works step 3. Building it once first.

- [ ] **Step 1: Create the component**

Create `src/components/landing/whatsapp-phone-mock.tsx`:

```tsx
type PhoneLine =
  | { kind: "in"; text: string }
  | { kind: "out"; text: string }
  | { kind: "success"; text: string }
  | { kind: "product"; name: string; price: string };

export function WhatsAppPhoneMock({
  storeName = "Maria's Beauty · Oshicart",
  lines,
  className = "",
}: {
  storeName?: string;
  lines: PhoneLine[];
  className?: string;
}) {
  return (
    <div
      className={`relative mx-auto w-[260px] aspect-[9/19] rounded-[36px] bg-walnut p-2 shadow-2xl ${className}`}
      aria-hidden="true"
    >
      <div className="h-full w-full rounded-[28px] bg-acacia-soft overflow-hidden flex flex-col">
        <div className="bg-acacia text-white text-[11px] font-semibold px-3 py-2">
          {storeName}
        </div>
        <div className="flex-1 px-3 py-3 space-y-2 overflow-hidden">
          {lines.map((line, i) => {
            if (line.kind === "product") {
              return (
                <div
                  key={i}
                  className="bg-white rounded-md px-2 py-1.5 text-[10px] flex items-center gap-2 shadow-sm"
                >
                  <span className="w-6 h-6 rounded bg-sand-2 shrink-0" />
                  <span className="flex-1 truncate text-walnut">{line.name}</span>
                  <span className="text-terracotta font-semibold">{line.price}</span>
                </div>
              );
            }
            const base = "rounded-lg px-2.5 py-1.5 text-[11px] max-w-[85%]";
            if (line.kind === "in") {
              return (
                <div key={i} className={`${base} bg-white text-walnut shadow-sm`}>
                  {line.text}
                </div>
              );
            }
            if (line.kind === "out") {
              return (
                <div
                  key={i}
                  className={`${base} bg-[#dcf8c6] text-walnut ml-auto`}
                >
                  {line.text}
                </div>
              );
            }
            return (
              <div
                key={i}
                className={`${base} bg-acacia text-white ml-auto font-semibold`}
              >
                {line.text}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Smoke-render in a temporary page**

Create `src/app/_phone-test/page.tsx` *(temporary — deleted in step 4)*:

```tsx
import { WhatsAppPhoneMock } from "@/components/landing/whatsapp-phone-mock";

export default function PhoneTest() {
  return (
    <div className="p-10 bg-sand min-h-screen">
      <WhatsAppPhoneMock
        lines={[
          { kind: "in", text: "Hi! I'd like to order 👇" },
          { kind: "product", name: "Brazilian Hair", price: "N$450" },
          { kind: "product", name: "Lash Kit", price: "N$120" },
          { kind: "out", text: "Total: N$570 · Pay via PayToday" },
          { kind: "success", text: "✓ Payment confirmed" },
        ]}
      />
    </div>
  );
}
```

- [ ] **Step 3: Verify**

Run: `npm run dev`. Open http://localhost:3000/_phone-test. Phone should render with all 5 lines correctly styled (incoming white, outgoing green-tint, success green, product cards with thumb). Stop server.

- [ ] **Step 4: Delete the temp page**

Run: `rm -r src/app/_phone-test`

- [ ] **Step 5: Commit**

```bash
git add src/components/landing/whatsapp-phone-mock.tsx
git commit -m "feat(landing): reusable WhatsApp phone mock"
```

---

### Task 4: Hero (split layout)

**Files:**
- Create: `src/components/landing/hero.tsx`

- [ ] **Step 1: Create the hero component**

Create `src/components/landing/hero.tsx`:

```tsx
import Link from "next/link";
import { WhatsAppPhoneMock } from "./whatsapp-phone-mock";

export function Hero({
  liveStoreCount = 34,
  liveProductCount = 3000,
}: {
  liveStoreCount?: number;
  liveProductCount?: number;
}) {
  return (
    <section
      className="relative overflow-hidden"
      style={{
        background:
          "linear-gradient(180deg, var(--sand) 0%, var(--sand-2) 100%)",
      }}
    >
      <div className="mx-auto max-w-6xl px-6 py-16 lg:py-24 grid grid-cols-1 lg:grid-cols-[1.2fr_1fr] gap-12 items-center">
        <div>
          <div className="flex flex-wrap gap-2 mb-6">
            <span className="text-[10px] tracking-[0.12em] font-bold px-2.5 py-1 rounded-full bg-terracotta-soft text-terracotta">
              ★ MADE IN NAMIBIA
            </span>
            <span className="text-[10px] tracking-[0.12em] font-bold px-2.5 py-1 rounded-full bg-white border border-border-warm text-walnut-2">
              FREE TO START
            </span>
          </div>
          <h1 className="text-4xl lg:text-6xl font-extrabold tracking-tight text-walnut leading-[1.05]">
            Sell on WhatsApp.
            <br />
            Built for <span className="text-acacia">Namibia.</span>
          </h1>
          <p className="mt-5 text-base lg:text-lg text-walnut-2 max-w-xl leading-relaxed">
            Open your digital store, take orders on WhatsApp, and accept
            PayToday, EFT, eWallet & Cash on Delivery. No commission. No setup
            fees.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link
              href="/auth/signup"
              className="inline-flex items-center gap-2 px-5 py-3 rounded-lg bg-terracotta text-white font-semibold text-sm hover:opacity-90 transition"
            >
              Open my free store →
            </Link>
            <a
              href="#how-it-works"
              className="inline-flex items-center gap-2 px-5 py-3 rounded-lg border border-walnut text-walnut font-semibold text-sm hover:bg-walnut hover:text-sand transition"
            >
              ▶ Watch demo
            </a>
          </div>
          <p className="mt-5 text-sm text-walnut-2 flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-acacia" />
            {liveStoreCount} Namibian stores live ·{" "}
            {liveProductCount.toLocaleString()}+ products listed
          </p>
        </div>
        <div className="lg:justify-self-end">
          <WhatsAppPhoneMock
            lines={[
              { kind: "in", text: "Hi! I'd like to order 👇" },
              { kind: "product", name: "Brazilian Hair", price: "N$450" },
              { kind: "product", name: "Lash Kit", price: "N$120" },
              { kind: "out", text: "Total: N$570 · PayToday" },
              { kind: "success", text: "✓ Payment confirmed" },
            ]}
          />
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Mount in landing page (temporary preview)**

Open `src/app/page.tsx` and at the very top of whatever the page returns, add `<Hero />` and import it. (Leave the rest of the page untouched — we are previewing.)

```tsx
import { Hero } from "@/components/landing/hero";
// inside the JSX, before any existing content:
<Hero />
```

- [ ] **Step 3: Verify visually**

Run: `npm run dev`. Open http://localhost:3000. Confirm:
- Hero on a sand gradient background
- Two pill tags above headline
- Headline reads "Sell on WhatsApp." / "Built for Namibia." with "Namibia" in green
- Phone mock to the right at lg breakpoint, below text on mobile
- Trust line "34 Namibian stores live · 3,000+ products listed"
- Both CTAs hover correctly

Stop server.

- [ ] **Step 4: Commit**

```bash
git add src/components/landing/hero.tsx src/app/page.tsx
git commit -m "feat(landing): warm-local split hero"
```

---

### Task 5: Payment trust bar

**Files:**
- Create: `src/components/landing/payment-trust-bar.tsx`

- [ ] **Step 1: Create component**

Create `src/components/landing/payment-trust-bar.tsx`:

```tsx
const METHODS = ["PayToday", "EFT", "eWallet", "Bank Transfer", "Cash on Delivery"];

export function PaymentTrustBar() {
  return (
    <section className="bg-sand py-12 border-y border-border-warm">
      <div className="mx-auto max-w-5xl px-6 text-center">
        <p className="text-[11px] tracking-[0.12em] font-bold text-terracotta mb-4">
          ACCEPT EVERY PAYMENT METHOD NAMIBIANS ACTUALLY USE
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          {METHODS.map((m) => (
            <span
              key={m}
              className="inline-flex items-center px-4 py-2 rounded-md bg-white border border-border-warm text-sm font-semibold text-walnut shadow-sm"
            >
              {m}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Mount in landing**

In `src/app/page.tsx`, add `<PaymentTrustBar />` after `<Hero />` and import it.

- [ ] **Step 3: Verify in browser, then commit**

Run dev server, confirm bar renders cleanly under hero. Stop server.

```bash
git add src/components/landing/payment-trust-bar.tsx src/app/page.tsx
git commit -m "feat(landing): payment trust bar"
```

---

### Task 6: Placeholder asset PNGs for screenshots

**Files:**
- Create: `public/landing/hiw-1-create.png`, `hiw-2-share.png`, `hiw-3-paid.png`, `feature-orders.png`, `feature-stock.png`, `feature-domain.png`, `feature-invoice.png`, `store-thumb-1.png`..`store-thumb-4.png`

We need image files at the right paths so components don't 404. Initial drop = neutral 600×800 placeholders to be replaced with real screenshots before launch.

- [ ] **Step 1: Create placeholder PNGs**

Run (PowerShell-friendly Node one-liner):

```bash
node -e "
const fs = require('fs');
const path = 'public/landing';
fs.mkdirSync(path, { recursive: true });
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=', 'base64');
['hiw-1-create','hiw-2-share','hiw-3-paid','feature-orders','feature-stock','feature-domain','feature-invoice','store-thumb-1','store-thumb-2','store-thumb-3','store-thumb-4'].forEach(n => fs.writeFileSync(path + '/' + n + '.png', png));
console.log('placeholders written');
"
```

- [ ] **Step 2: Add a TODO note for asset replacement**

Create `public/landing/README.md`:

```md
# Landing assets

These are 1×1 placeholder PNGs. Replace before public launch with real screenshots:

- `hiw-1-create.png` — dashboard product-add screen (target ~600×800)
- `hiw-2-share.png` — storefront on a phone with share-to-WhatsApp sheet
- `hiw-3-paid.png` — WhatsApp message with PayToday confirmation
- `feature-orders.png` — dashboard order list
- `feature-stock.png` — low-stock badge UI
- `feature-domain.png` — domain settings panel
- `feature-invoice.png` — invoice PDF preview
- `store-thumb-{1..4}.png` — live storefront thumbnails for landing gallery
```

- [ ] **Step 3: Commit**

```bash
git add public/landing/
git commit -m "chore(landing): placeholder assets for screenshots"
```

---

### Task 7: How-it-works section

**Files:**
- Create: `src/components/landing/how-it-works.tsx`

- [ ] **Step 1: Create component**

```tsx
import Image from "next/image";

const STEPS = [
  {
    n: 1,
    title: "Create your catalog.",
    body: "Add products, prices, and photos in minutes from your phone.",
    img: "/landing/hiw-1-create.png",
    alt: "Adding a product in the Oshicart dashboard",
  },
  {
    n: 2,
    title: "Share your link.",
    body: "Drop your store link on WhatsApp Status, Instagram, or your bio.",
    img: "/landing/hiw-2-share.png",
    alt: "Storefront on a phone with WhatsApp share sheet open",
  },
  {
    n: 3,
    title: "Get paid.",
    body: "Customers chat, you confirm, they pay via PayToday/EFT/eWallet/Cash.",
    img: "/landing/hiw-3-paid.png",
    alt: "WhatsApp message with PayToday payment confirmation",
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="py-20 bg-white">
      <div className="mx-auto max-w-6xl px-6">
        <div className="text-center mb-12">
          <p className="text-[11px] tracking-[0.12em] font-bold text-terracotta mb-2">
            HOW IT WORKS
          </p>
          <h2 className="text-3xl lg:text-4xl font-extrabold tracking-tight text-walnut">
            Three steps to start selling online in Namibia.
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {STEPS.map((s) => (
            <div
              key={s.n}
              className="bg-sand rounded-2xl p-6 border border-border-warm flex flex-col"
            >
              <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-terracotta text-white font-bold text-sm mb-4">
                {s.n}
              </span>
              <h3 className="text-lg font-bold text-walnut mb-1">{s.title}</h3>
              <p className="text-sm text-walnut-2 mb-6">{s.body}</p>
              <div className="mt-auto rounded-xl overflow-hidden bg-white border border-border-warm aspect-[3/4] relative">
                <Image
                  src={s.img}
                  alt={s.alt}
                  fill
                  sizes="(min-width:768px) 30vw, 90vw"
                  className="object-cover"
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Mount in landing**

Add `<HowItWorks />` after `<PaymentTrustBar />` in `src/app/page.tsx` and import it.

- [ ] **Step 3: Verify and commit**

Run dev server. Confirm three step cards in a 3-column grid (1-column on mobile), each with numbered badge, headline, body, and a 3:4 image area showing the placeholder PNG. Stop server.

```bash
git add src/components/landing/how-it-works.tsx src/app/page.tsx
git commit -m "feat(landing): how-it-works section with screenshot placeholders"
```

---

### Task 8: Storefront gallery

**Files:**
- Create: `src/components/landing/storefront-gallery.tsx`

- [ ] **Step 1: Create component**

```tsx
import Image from "next/image";
import Link from "next/link";

type Store = { slug: string; name: string; archetype: string; thumb: string };

const STORES: Store[] = [
  { slug: "octovia-nexus", name: "Octovia Nexus", archetype: "Retail", thumb: "/landing/store-thumb-1.png" },
  { slug: "apatchy-beard-company", name: "Apatchy Beard Company", archetype: "Beauty", thumb: "/landing/store-thumb-2.png" },
  { slug: "krotoa-leather-goods", name: "Krotoa Leather Goods", archetype: "Retail", thumb: "/landing/store-thumb-3.png" },
  { slug: "diekapey-takeaways", name: "DieKapey Takeaways", archetype: "Food", thumb: "/landing/store-thumb-4.png" },
];

export function StorefrontGallery() {
  return (
    <section className="py-20 bg-sand">
      <div className="mx-auto max-w-6xl px-6">
        <div className="text-center mb-12">
          <p className="text-[11px] tracking-[0.12em] font-bold text-terracotta mb-2">
            REAL STORES, LIVE NOW
          </p>
          <h2 className="text-3xl lg:text-4xl font-extrabold tracking-tight text-walnut">
            See what Namibian merchants are building.
          </h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {STORES.map((s) => (
            <Link
              key={s.slug}
              href={`/s/${s.slug}`}
              className="group rounded-xl overflow-hidden bg-white border border-border-warm hover:shadow-lg hover:-translate-y-0.5 transition"
            >
              <div className="aspect-[3/4] bg-sand-2 relative">
                <Image
                  src={s.thumb}
                  alt={`${s.name} storefront`}
                  fill
                  sizes="(min-width:768px) 22vw, 45vw"
                  className="object-cover"
                />
              </div>
              <div className="p-3">
                <p className="text-sm font-bold text-walnut truncate">{s.name}</p>
                <p className="text-[11px] text-walnut-2">{s.archetype}</p>
              </div>
            </Link>
          ))}
        </div>
        <div className="text-center mt-10">
          <Link
            href="/stores"
            className="text-sm font-semibold text-terracotta hover:underline"
          >
            Browse all stores →
          </Link>
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Mount, verify, commit**

Add `<StorefrontGallery />` after `<HowItWorks />` in `src/app/page.tsx`. Run dev, confirm 4 store cards, each linking to `/s/<slug>`. Stop server.

```bash
git add src/components/landing/storefront-gallery.tsx src/app/page.tsx
git commit -m "feat(landing): live storefront gallery"
```

---

### Task 9: Feature blocks

**Files:**
- Create: `src/components/landing/feature-blocks.tsx`

- [ ] **Step 1: Create component**

```tsx
import Image from "next/image";

const FEATURES = [
  {
    title: "Manage orders from anywhere",
    body: "One-tap order confirmation, ready, completed. Run your shop from your phone.",
    img: "/landing/feature-orders.png",
  },
  {
    title: "Track stock automatically",
    body: "Real-time inventory updates, low-stock alerts, and out-of-stock badges.",
    img: "/landing/feature-stock.png",
  },
  {
    title: "Use your own domain",
    body: "Connect a domain you already own or stick with your free oshicart.com link.",
    img: "/landing/feature-domain.png",
  },
  {
    title: "VAT invoices, automatic",
    body: "Inclusive or exclusive VAT, Namibia's 15% rate, generated for every order.",
    img: "/landing/feature-invoice.png",
  },
];

export function FeatureBlocks() {
  return (
    <section className="py-20 bg-white">
      <div className="mx-auto max-w-6xl px-6">
        <div className="text-center mb-12">
          <p className="text-[11px] tracking-[0.12em] font-bold text-terracotta mb-2">
            EVERYTHING YOU NEED TO RUN A SHOP
          </p>
          <h2 className="text-3xl lg:text-4xl font-extrabold tracking-tight text-walnut">
            Built for Namibian businesses.
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="bg-sand rounded-2xl border border-border-warm p-6 grid grid-cols-[1fr_auto] gap-6 items-center"
            >
              <div>
                <h3 className="text-lg font-bold text-walnut mb-2">{f.title}</h3>
                <p className="text-sm text-walnut-2 leading-relaxed">{f.body}</p>
              </div>
              <div className="w-32 h-32 rounded-lg bg-white border border-border-warm overflow-hidden relative shrink-0">
                <Image
                  src={f.img}
                  alt=""
                  fill
                  sizes="128px"
                  className="object-cover"
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Mount, verify, commit**

Add `<FeatureBlocks />` after `<StorefrontGallery />` in `src/app/page.tsx`. Run dev, confirm 4 feature cards in a 2×2 grid (1-col on mobile). Stop server.

```bash
git add src/components/landing/feature-blocks.tsx src/app/page.tsx
git commit -m "feat(landing): four feature blocks with mini UI"
```

---

### Task 10: Pricing section

**Files:**
- Create: `src/components/landing/pricing.tsx`

- [ ] **Step 1: Create component**

```tsx
import Link from "next/link";

const TIERS = [
  {
    name: "Free",
    price: "N$0",
    cadence: "/ month",
    highlighted: false,
    cta: "Open free store",
    features: [
      "Up to 10 products",
      "Oshicart subdomain (oshicart.com/s/your-store)",
      "WhatsApp orders",
      "PayToday + EFT + eWallet + Cash on Delivery",
      "Mobile-first storefront",
    ],
  },
  {
    name: "Pro",
    price: "N$149.95",
    cadence: "/ month",
    highlighted: true,
    cta: "Start Pro",
    features: [
      "Up to 50 products",
      "Everything in Free",
    ],
  },
  {
    name: "Business",
    price: "N$399.95",
    cadence: "/ month",
    highlighted: false,
    cta: "Start Business",
    features: [
      "200+ products",
      "Multi-staff accounts",
      "Advanced analytics",
      "Everything in Pro",
    ],
  },
];

export function Pricing() {
  return (
    <section id="pricing" className="py-20 bg-sand">
      <div className="mx-auto max-w-6xl px-6">
        <div className="text-center mb-12">
          <p className="text-[11px] tracking-[0.12em] font-bold text-terracotta mb-2">
            PRICING
          </p>
          <h2 className="text-3xl lg:text-4xl font-extrabold tracking-tight text-walnut">
            Start free. Upgrade when you grow.
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {TIERS.map((t) => (
            <div
              key={t.name}
              className={`rounded-2xl bg-white p-7 flex flex-col ${
                t.highlighted
                  ? "border-2 border-terracotta shadow-lg relative"
                  : "border border-border-warm"
              }`}
            >
              {t.highlighted && (
                <span className="absolute -top-3 left-7 inline-block bg-terracotta text-white text-[10px] tracking-[0.1em] font-bold px-2.5 py-1 rounded-full">
                  MOST POPULAR
                </span>
              )}
              <h3 className="text-xl font-bold text-walnut">{t.name}</h3>
              <p className="mt-2 text-3xl font-extrabold text-walnut">
                {t.price}
                <span className="text-sm font-normal text-walnut-2 ml-1">
                  {t.cadence}
                </span>
              </p>
              <ul className="mt-6 mb-8 space-y-2 text-sm text-walnut-2">
                {t.features.map((f) => (
                  <li key={f} className="flex gap-2">
                    <span className="text-acacia font-bold mt-0.5">✓</span>
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <Link
                href="/auth/signup"
                className={`mt-auto inline-flex items-center justify-center px-4 py-2.5 rounded-lg font-semibold text-sm transition ${
                  t.highlighted
                    ? "bg-terracotta text-white hover:opacity-90"
                    : "bg-walnut text-sand hover:opacity-90"
                }`}
              >
                {t.cta}
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Mount, verify, commit**

Add `<Pricing />` after `<FeatureBlocks />` in `src/app/page.tsx`. Run dev, confirm 3 tier cards, Pro has terracotta border + "MOST POPULAR" badge. Stop server.

```bash
git add src/components/landing/pricing.tsx src/app/page.tsx
git commit -m "feat(landing): three-tier pricing (Free/Pro/Business)"
```

---

### Task 11: FAQ section

**Files:**
- Create: `src/components/landing/faq.tsx`

- [ ] **Step 1: Create component**

```tsx
const FAQS = [
  {
    q: "Do you charge commission on sales?",
    a: "No. You keep 100% of every order. We charge a flat monthly subscription on Pro/Business; Free has no fees.",
  },
  {
    q: "Can I cancel anytime?",
    a: "Yes — cancel from your dashboard. No lock-in, no cancellation fees.",
  },
  {
    q: "Which payment methods do my customers see?",
    a: "PayToday, EFT, eWallet, and Cash on Delivery. All Namibian — no international gateways or forex charges needed.",
  },
  {
    q: "How fast do I get paid?",
    a: "Customers pay you directly via PayToday/EFT/eWallet — Oshicart never holds your money. You see funds in your bank as fast as the payment method allows.",
  },
  {
    q: "Can I use my own domain?",
    a: "Yes — connect a domain you already own (Pro and above), or stick with your free oshicart.com/s/your-store link.",
  },
  {
    q: "Do you handle VAT?",
    a: "Yes. Inclusive or exclusive VAT, Namibia's 15% rate, automatic invoice generation per order.",
  },
];

export function FAQ() {
  return (
    <section className="py-20 bg-white">
      <div className="mx-auto max-w-3xl px-6">
        <div className="text-center mb-10">
          <p className="text-[11px] tracking-[0.12em] font-bold text-terracotta mb-2">
            FAQ
          </p>
          <h2 className="text-3xl lg:text-4xl font-extrabold tracking-tight text-walnut">
            Questions, answered.
          </h2>
        </div>
        <div className="divide-y divide-border-warm border-y border-border-warm">
          {FAQS.map((f) => (
            <details key={f.q} className="group py-4">
              <summary className="cursor-pointer list-none flex items-center justify-between gap-4 text-walnut font-semibold">
                <span>{f.q}</span>
                <span className="text-terracotta text-xl group-open:rotate-45 transition-transform">
                  +
                </span>
              </summary>
              <p className="mt-3 text-sm text-walnut-2 leading-relaxed">{f.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Mount, verify, commit**

Add `<FAQ />` after `<Pricing />` in `src/app/page.tsx`. Run dev, confirm clicking a question expands it; the `+` rotates to `×`. Stop server.

```bash
git add src/components/landing/faq.tsx src/app/page.tsx
git commit -m "feat(landing): FAQ with native disclosure semantics"
```

---

### Task 12: Big CTA bar

**Files:**
- Create: `src/components/landing/cta-bar.tsx`

- [ ] **Step 1: Create component**

```tsx
import Link from "next/link";

export function CtaBar() {
  return (
    <section className="bg-walnut text-sand">
      <div className="mx-auto max-w-5xl px-6 py-16 text-center">
        <h2 className="text-3xl lg:text-4xl font-extrabold tracking-tight">
          Open your shop today. Free forever to start.
        </h2>
        <p className="mt-3 text-walnut/0 text-base text-[color:#d4c2a0]">
          Join 34 Namibian merchants already selling on Oshicart.
        </p>
        <Link
          href="/auth/signup"
          className="mt-8 inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-terracotta text-white font-semibold text-sm hover:opacity-90 transition"
        >
          Open my free store →
        </Link>
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Mount, verify, commit**

Add `<CtaBar />` after `<FAQ />` in `src/app/page.tsx`. Run dev, confirm full-bleed walnut band with terracotta button. Stop server.

```bash
git add src/components/landing/cta-bar.tsx src/app/page.tsx
git commit -m "feat(landing): walnut CTA bar before footer"
```

---

### Task 13: Clean up landing page composition + remove old sections

**Files:**
- Modify: `src/app/page.tsx`

- [ ] **Step 1: Replace `src/app/page.tsx` with the final composition**

```tsx
import { Hero } from "@/components/landing/hero";
import { PaymentTrustBar } from "@/components/landing/payment-trust-bar";
import { HowItWorks } from "@/components/landing/how-it-works";
import { StorefrontGallery } from "@/components/landing/storefront-gallery";
import { FeatureBlocks } from "@/components/landing/feature-blocks";
import { Pricing } from "@/components/landing/pricing";
import { FAQ } from "@/components/landing/faq";
import { CtaBar } from "@/components/landing/cta-bar";
import { PublicNavbar } from "@/components/public-navbar";

export default function Home() {
  return (
    <>
      <PublicNavbar />
      <main>
        <Hero />
        <PaymentTrustBar />
        <HowItWorks />
        <StorefrontGallery />
        <FeatureBlocks />
        <Pricing />
        <FAQ />
        <CtaBar />
      </main>
      {/* Footer renders from layout.tsx — no changes here */}
    </>
  );
}
```

> If `PublicNavbar` is currently rendered from `src/app/layout.tsx`, leave it there and remove the import here.

- [ ] **Step 2: Verify the full landing scrolls top-to-bottom**

Run dev. Scroll through the entire page. Verify:
- Hero → Payment trust → How it works → Storefront gallery → Feature blocks → Pricing → FAQ → CTA bar → Footer
- No old "Built for Namibian businesses" or "Key Solutions" sections leaking through
- Anchor `/#pricing` (click navbar Pricing link) jumps to the pricing section

Stop server.

- [ ] **Step 3: Commit**

```bash
git add src/app/page.tsx
git commit -m "refactor(landing): compose final section order, drop old layout"
```

---

### Task 14: Footer palette refresh

**Files:**
- Modify: footer component (find via `grep -r "Made in Namibia" src/`)

- [ ] **Step 1: Locate footer component**

Run: `grep -rln "Made in Namibia" src/`
Open the returned file.

- [ ] **Step 2: Replace navy background with walnut**

Find the outer footer container's `className` or inline `style` that sets the dark background. Change the background color to `bg-walnut` and ensure text uses `text-sand` / `text-[color:#d4c2a0]`.

- [ ] **Step 3: Verify, commit**

Run dev, scroll to footer — should be deep brown (walnut) instead of navy, text legible. Stop server.

```bash
git add <footer-file>
git commit -m "feat(footer): switch navy to walnut to match palette"
```

---

## Phase 2 — Storefront reimagine

### Task 15: Add cover-gradient mapping per archetype

**Files:**
- Modify: `src/lib/industry.ts`

- [ ] **Step 1: Read current file**

Run: `cat src/lib/industry.ts`
Identify how archetypes are defined.

- [ ] **Step 2: Add `coverGradient` to each archetype's theme config**

For each archetype, add a `coverGradient` field to its theme object. Use these gradients:

```ts
// retail / general (default Warm Local)
coverGradient: "linear-gradient(135deg, #b45309 0%, #15803d 100%)",
// food
coverGradient: "linear-gradient(135deg, #b45309 0%, #d97706 60%, #fcd34d 100%)",
// beauty (preserve existing slate; reuse rose-slate)
coverGradient: "linear-gradient(135deg, #475569 0%, #be185d 100%)",
// services
coverGradient: "linear-gradient(135deg, #15803d 0%, #0f766e 100%)",
```

If any archetype lacks an explicit theme entry, add one inheriting the retail default.

- [ ] **Step 3: Export a helper**

At the bottom of `src/lib/industry.ts` add:

```ts
export function getCoverGradient(archetype: string | null | undefined): string {
  const theme = getArchetypeTheme(archetype); // existing function
  return theme.coverGradient ?? "linear-gradient(135deg, #b45309 0%, #15803d 100%)";
}
```

> If an existing function with a different name returns the theme, substitute its real name in the call.

- [ ] **Step 4: Commit**

```bash
git add src/lib/industry.ts
git commit -m "feat(industry): add cover gradients per archetype"
```

---

### Task 16: Store cover band component

**Files:**
- Create: `src/components/storefront/store-cover.tsx`

- [ ] **Step 1: Create component**

```tsx
import { getCoverGradient } from "@/lib/industry";

export function StoreCover({ archetype }: { archetype: string | null | undefined }) {
  return (
    <div
      className="h-32 md:h-40 w-full"
      style={{ background: getCoverGradient(archetype) }}
      aria-hidden="true"
    />
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/storefront/store-cover.tsx
git commit -m "feat(storefront): per-archetype cover band"
```

---

### Task 17: Share + QR action buttons

**Files:**
- Create: `src/components/storefront/share-actions.tsx`

- [ ] **Step 1: Identify existing share/QR logic**

Run: `grep -rln "QR\|qrcode\|navigator.share" src/components/storefront/ src/app/s/`
Note any existing handler — reuse it.

- [ ] **Step 2: Create component**

```tsx
"use client";
import { useState } from "react";

export function ShareActions({ storeUrl, qrUrl }: { storeUrl: string; qrUrl: string }) {
  const [copied, setCopied] = useState(false);
  const [showQR, setShowQR] = useState(false);

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ url: storeUrl, title: "Check out this store" });
        return;
      } catch {
        // fallthrough to copy
      }
    }
    await navigator.clipboard.writeText(storeUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <>
      <button
        onClick={handleShare}
        className="px-3 py-2.5 rounded-lg border border-walnut text-walnut hover:bg-walnut hover:text-sand transition text-sm font-semibold"
        aria-label="Share store"
      >
        {copied ? "✓" : "⤴"}
      </button>
      <button
        onClick={() => setShowQR(true)}
        className="px-3 py-2.5 rounded-lg border border-walnut text-walnut hover:bg-walnut hover:text-sand transition text-sm font-semibold"
        aria-label="Show QR code"
      >
        ⊞ QR
      </button>
      {showQR && (
        <div
          className="fixed inset-0 bg-walnut/60 flex items-center justify-center z-50 p-6"
          onClick={() => setShowQR(false)}
        >
          <div
            className="bg-white rounded-2xl p-6 max-w-xs w-full text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <img src={qrUrl} alt="Store QR code" className="w-full" />
            <p className="mt-3 text-xs text-walnut-2 break-all">{storeUrl}</p>
            <button
              onClick={() => setShowQR(false)}
              className="mt-4 w-full py-2 rounded-lg bg-walnut text-sand font-semibold text-sm"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/storefront/share-actions.tsx
git commit -m "feat(storefront): share + QR action buttons"
```

---

### Task 18: Store header card

**Files:**
- Create: `src/components/storefront/store-header-card.tsx`

- [ ] **Step 1: Create component**

```tsx
import { ShareActions } from "./share-actions";

type Props = {
  store: {
    name: string;
    tagline?: string | null;
    logoUrl?: string | null;
    location?: string | null;
    phone?: string | null;
    whatsappNumber: string;
    openingHours?: string | null;
    rating?: number | null;
    orderCount?: number | null;
    slug: string;
  };
  storeUrl: string;
  qrUrl: string;
};

export function StoreHeaderCard({ store, storeUrl, qrUrl }: Props) {
  const initial = store.name.charAt(0).toUpperCase();
  const waLink = `https://wa.me/${store.whatsappNumber.replace(/\D/g, "")}`;

  return (
    <div className="bg-white">
      <div className="mx-auto max-w-4xl px-4 -mt-12 md:-mt-14 relative">
        <div className="flex items-end gap-4">
          <div className="w-16 h-16 md:w-20 md:h-20 rounded-2xl bg-white border-[3px] border-white shadow-lg overflow-hidden flex items-center justify-center bg-sand-2">
            {store.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={store.logoUrl}
                alt={`${store.name} logo`}
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-2xl font-extrabold text-terracotta">{initial}</span>
            )}
          </div>
          <div className="pb-2">
            <h1 className="text-xl md:text-2xl font-extrabold text-walnut leading-tight">
              {store.name}
            </h1>
            <p className="text-sm text-walnut-2">
              {store.tagline ?? "Open for orders"}
              {store.openingHours ? ` · ${store.openingHours}` : ""}
            </p>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {store.location && (
            <span className="text-xs px-3 py-1 rounded-full bg-sand border border-border-warm text-walnut-2">
              📍 {store.location}
            </span>
          )}
          {store.phone && (
            <a
              href={`tel:${store.phone}`}
              className="text-xs px-3 py-1 rounded-full bg-sand border border-border-warm text-walnut-2 hover:bg-sand-2"
            >
              📞 {store.phone}
            </a>
          )}
          {store.rating != null && store.orderCount != null && store.orderCount > 0 && (
            <span className="text-xs px-3 py-1 rounded-full bg-sand border border-border-warm text-walnut-2">
              <b className="text-acacia">★ {store.rating.toFixed(1)}</b> ·{" "}
              {store.orderCount} order{store.orderCount === 1 ? "" : "s"}
            </span>
          )}
        </div>

        <div className="mt-4 flex gap-2">
          <a
            href={waLink}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-acacia text-white font-semibold text-sm hover:opacity-90 transition"
          >
            💬 Message on WhatsApp
          </a>
          <ShareActions storeUrl={storeUrl} qrUrl={qrUrl} />
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/storefront/store-header-card.tsx
git commit -m "feat(storefront): store header card with logo, meta chips, actions"
```

---

### Task 19: Payment trust strip

**Files:**
- Create: `src/components/storefront/store-payment-strip.tsx`

- [ ] **Step 1: Create component**

```tsx
const METHODS = ["PayToday", "EFT", "eWallet", "Cash on Delivery"];

export function StorePaymentStrip() {
  return (
    <div className="bg-sand border-y border-border-warm">
      <div className="mx-auto max-w-4xl px-4 py-3 flex flex-wrap items-center gap-2">
        <span className="text-[10px] tracking-[0.12em] font-bold text-walnut-2 mr-2">
          PAY WITH
        </span>
        {METHODS.map((m) => (
          <span
            key={m}
            className="text-xs px-2.5 py-1 rounded bg-white border border-border-warm text-walnut"
          >
            {m}
          </span>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/storefront/store-payment-strip.tsx
git commit -m "feat(storefront): payment trust strip below header"
```

---

### Task 20: Wire new storefront pieces into `/s/[slug]`

**Files:**
- Modify: `src/app/s/[slug]/page.tsx`

- [ ] **Step 1: Read the current page**

Run: `cat src/app/s/[slug]/page.tsx`
Identify where the existing slim header (with logo/name/tagline/WhatsApp button) is rendered.

- [ ] **Step 2: Replace the existing slim header block**

Above the existing storefront tabs (Products / Track Order), the current page renders a header. Replace that block with:

```tsx
import { StoreCover } from "@/components/storefront/store-cover";
import { StoreHeaderCard } from "@/components/storefront/store-header-card";
import { StorePaymentStrip } from "@/components/storefront/store-payment-strip";

// inside the page, before tabs:
<StoreCover archetype={store.industryArchetype} />
<StoreHeaderCard
  store={{
    name: store.name,
    tagline: store.tagline,
    logoUrl: store.logoUrl,
    location: store.location,
    phone: store.phone,
    whatsappNumber: store.whatsappNumber,
    openingHours: store.openingHours,
    rating: store.rating,
    orderCount: store.orderCount,
    slug: store.slug,
  }}
  storeUrl={`https://oshicart.com/s/${store.slug}`}
  qrUrl={store.qrUrl /* existing field, or generate via existing helper */}
/>
<StorePaymentStrip />
```

> If field names on the `store` object differ from the spec (e.g. `whatsapp_number` vs `whatsappNumber`), match the actual schema. Pass `null`/`undefined` for fields that aren't present yet — the header card handles missing meta chips gracefully.

- [ ] **Step 3: Verify visually**

Run dev. Visit `http://localhost:3000/s/octovia-nexus` (or any seeded slug). Confirm:
- Cover band gradient at top (~128–160px tall)
- Logo punches into bottom edge of cover
- Store name + tagline beside logo
- Meta chips: location · phone · rating (if applicable)
- WhatsApp button + share + QR icons in a row
- Payment trust strip directly below
- Tabs (Products / Track Order) render after that

Stop server.

- [ ] **Step 4: Commit**

```bash
git add src/app/s/[slug]/page.tsx
git commit -m "feat(storefront): mount cover, header card, and payment strip"
```

---

### Task 21: Refresh storefront category tiles

**Files:**
- Create: `src/components/storefront/store-category-grid.tsx`
- Modify: existing category-grid usage in `src/components/storefront/storefront-products.tsx` (or wherever categories render)

- [ ] **Step 1: Find current category-grid render**

Run: `grep -rln "Browse by Category\|category" src/components/storefront/ src/app/s/`

- [ ] **Step 2: Create new tile component**

```tsx
import Link from "next/link";

type Cat = { slug: string; name: string; icon?: string; productCount: number };

export function StoreCategoryGrid({
  storeSlug,
  categories,
}: {
  storeSlug: string;
  categories: Cat[];
}) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
      {categories.map((c) => (
        <Link
          key={c.slug}
          href={`/s/${storeSlug}?category=${c.slug}`}
          className="rounded-xl p-4 flex flex-col justify-between gap-3 border border-border-warm hover:shadow-md hover:-translate-y-0.5 transition"
          style={{
            background: "linear-gradient(180deg, var(--sand-2), var(--sand))",
          }}
        >
          <div className="w-8 h-8 rounded-md bg-terracotta" />
          <div>
            <p className="text-sm font-bold text-walnut leading-tight">{c.name}</p>
            <p className="text-[11px] text-walnut-2 mt-0.5">
              {c.productCount} product{c.productCount === 1 ? "" : "s"}
            </p>
          </div>
        </Link>
      ))}
    </div>
  );
}
```

- [ ] **Step 3: Replace the previous category render with `<StoreCategoryGrid />`**

In the file from Step 1, replace the JSX that renders the old "Browse by Category" tiles with `<StoreCategoryGrid storeSlug={...} categories={...} />`. Map the existing category data shape into the `Cat[]` type.

- [ ] **Step 4: Verify visually**

Run dev. On a store with 3+ categories and 20+ products (Octovia Nexus qualifies), confirm new tiles render with icon block + name + product count. Stop server.

- [ ] **Step 5: Commit**

```bash
git add src/components/storefront/store-category-grid.tsx <modified-file>
git commit -m "feat(storefront): richer category tiles with icon + product count"
```

---

### Task 22: Storefront product card + cart FAB palette refresh

**Files:**
- Modify: `src/components/storefront/product-card.tsx`
- Modify: `src/components/storefront/cart-drawer.tsx`

- [ ] **Step 1: Refresh product-card colors**

In `src/components/storefront/product-card.tsx`, replace any blue/indigo accent (price color, "Add to Cart" button) with `text-terracotta` / `bg-terracotta`. Replace card border with `border-border-warm`. Hover should lift `-translate-y-0.5` and add `shadow-md`.

- [ ] **Step 2: Refresh cart-drawer + FAB**

In `src/components/storefront/cart-drawer.tsx`, replace the blue FAB with terracotta:

```tsx
className="fixed bottom-4 right-4 w-14 h-14 rounded-full bg-terracotta text-white shadow-2xl flex items-center justify-center"
```

Replace any blue accents inside the drawer (totals, checkout button) with terracotta.

- [ ] **Step 3: Verify**

Run dev. Open any storefront. Confirm: cards have warm borders, prices in terracotta, FAB is terracotta. Stop server.

- [ ] **Step 4: Commit**

```bash
git add src/components/storefront/product-card.tsx src/components/storefront/cart-drawer.tsx
git commit -m "feat(storefront): warm-local palette on product cards and cart FAB"
```

---

## Phase 3 — Stores directory

### Task 23: Mini-grid store thumbnail component

**Files:**
- Create: `src/components/storefront/store-thumb-grid.tsx`

- [ ] **Step 1: Create component**

```tsx
type Props = { productImages: string[]; fallbackInitial: string };

export function StoreThumbGrid({ productImages, fallbackInitial }: Props) {
  if (productImages.length < 4) {
    return (
      <div className="w-12 h-12 rounded-lg bg-sand-2 flex items-center justify-center text-terracotta font-bold">
        {fallbackInitial}
      </div>
    );
  }
  const four = productImages.slice(0, 4);
  return (
    <div className="grid grid-cols-2 grid-rows-2 gap-px w-12 h-12 rounded-lg overflow-hidden border border-border-warm">
      {four.map((src, i) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img key={i} src={src} alt="" className="w-full h-full object-cover" />
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/storefront/store-thumb-grid.tsx
git commit -m "feat(stores): mini 2x2 product thumbnail grid"
```

---

### Task 24: Apply mini-grid + palette to `/stores`

**Files:**
- Modify: `src/app/stores/page.tsx`

- [ ] **Step 1: Read current page**

Run: `cat src/app/stores/page.tsx`

- [ ] **Step 2: Refresh palette and inject thumb grid**

In the store-card render block:

1. Replace the initial-letter avatar with `<StoreThumbGrid productImages={store.previewProductImages ?? []} fallbackInitial={store.name.charAt(0).toUpperCase()} />`.
2. The query that fetches stores must select up to 4 product image URLs per store. Add a sub-select (Supabase `.select("…, products(image_url, count: 4, order: created_at.desc)")` — adjust to match the actual schema). If a sub-select isn't trivial, pre-fetch in a separate query and merge in JS.
3. Replace card outer container classes:

```tsx
className="bg-white border border-border-warm rounded-xl p-4 hover:shadow-md hover:-translate-y-0.5 transition"
```

4. Replace category badge color from blue to terracotta-soft pill.
5. Replace top-level page background with `bg-sand` and headline color with `text-walnut`.
6. Replace the bottom "Own a business in Namibia?" CTA card border with `border-border-warm`, background with white, button with `bg-terracotta`.

- [ ] **Step 3: Verify**

Run dev. Open `/stores`. Confirm:
- Sand background page
- Each card with warm border
- Stores with 4+ products show a 2×2 thumbnail; others show their initial
- "Create Free Store" CTA is terracotta

Stop server.

- [ ] **Step 4: Commit**

```bash
git add src/app/stores/page.tsx
git commit -m "feat(stores): warm-local palette + mini thumbnail grid per store"
```

---

## Phase 4 — Verify & polish

### Task 25: Responsive smoke test (manual)

**Files:** none

- [ ] **Step 1: Start dev server**

Run: `npm run dev`

- [ ] **Step 2: Verify each breakpoint with browser DevTools**

For each page below, in Chrome DevTools, toggle device emulation and verify at **360 × 800**, **768 × 1024**, **1024 × 768**, **1440 × 900**:

- `/` — landing
- `/stores` — directory
- `/s/octovia-nexus` — storefront

Check on each:

- No horizontal scroll
- Hero phone visible at all sizes (above-fold on lg+, below-fold on mobile is OK)
- Pricing cards stack 1-col on mobile, 3-col on md+
- Storefront cover band visible
- Cart FAB doesn't overlap critical content

If a regression appears, fix it in the responsible component, then re-verify.

- [ ] **Step 3: Stop dev server, commit any fixes**

If fixes were needed:

```bash
git add -A
git commit -m "fix(responsive): <what you fixed>"
```

---

### Task 26: Lighthouse parity check

**Files:** none

- [ ] **Step 1: Run dev build (or preview build)**

```bash
npm run build && npm run start
```

- [ ] **Step 2: Run Lighthouse on each affected route**

In Chrome DevTools → Lighthouse, run audits for:

- `http://localhost:3000/`
- `http://localhost:3000/stores`
- `http://localhost:3000/s/octovia-nexus`

Capture scores. Compare against the current production baseline (https://oshicart.com same routes).

- [ ] **Step 3: Address any regression > 5 points**

For each metric that drops more than 5 points vs baseline, identify the cause (likely image weight from placeholder PNGs being too small or layout-shift from late-loading sections) and fix:

- Add `priority` to the hero phone mock if LCP regressed
- Add explicit `width`/`height` to all `<Image>` to fix CLS
- Convert any `next/image` `fill` containers without `sizes` to use one

Re-run Lighthouse. Repeat until parity.

- [ ] **Step 4: Commit perf fixes**

```bash
git add -A
git commit -m "perf(landing): restore Lighthouse parity"
```

---

### Task 27: Update or skip Playwright tests

**Files:**
- Modify: any test under `tests/` or `e2e/` that asserts old DOM (locate via `grep -r "Built for Namibian businesses\|Key Solutions for Namibian" tests/ e2e/ 2>/dev/null`)

- [ ] **Step 1: Locate broken assertions**

Run: `grep -rln "Built for Namibian businesses\|Key Solutions\|Browse Stores card" tests/ e2e/ 2>/dev/null || echo "no matching tests"`

- [ ] **Step 2: For each match, update the assertion**

Open the file. Replace string assertions tied to removed copy with assertions on the new copy:

- "Built for Namibian businesses" → "Built for Namibian businesses." inside FeatureBlocks (or remove if redundant)
- "Key Solutions for Namibian Merchants" → assertions targeting Pricing or FeatureBlocks instead

If a test only existed to assert the old hero text, rewrite it to assert:

```ts
await expect(page.getByRole("heading", { name: /Sell on WhatsApp/i })).toBeVisible();
await expect(page.getByText(/Built for/i)).toBeVisible();
await expect(page.getByText(/Namibia/i)).toBeVisible();
```

- [ ] **Step 3: Run tests**

```bash
npm test  # or whatever the suite command is
```

Expected: all pass. If any fail, fix the test or the component to match the spec.

- [ ] **Step 4: Commit**

```bash
git add tests/ e2e/
git commit -m "test: update assertions for revamped landing + storefront"
```

---

### Task 28: Final spec acceptance pass

**Files:** none

- [ ] **Step 1: Re-read the spec**

Open `docs/superpowers/specs/2026-05-02-oshicart-revamp-design.md` and walk through Section 8 ("Acceptance criteria") line by line.

- [ ] **Step 2: Tick or flag each criterion**

For each acceptance criterion, verify in the running app and add a note in this PR/branch (or a comment in the spec) marking ✓ done or ⚠ outstanding.

If any criterion is outstanding, file a follow-up task or fix it before declaring the plan complete.

- [ ] **Step 3: Final commit (if any tweaks)**

```bash
git add -A
git commit -m "chore: final spec acceptance pass"
```

---

## Self-Review

**Spec coverage check:**

- §1 Goal — covered by Phase 1 + Phase 2 sections.
- §2 Out of scope — no tasks touch dashboard, admin, auth, checkout. ✓
- §3 Visual identity — Task 1 adds palette tokens; Tasks 2–22 consume them. ✓
- §4 Landing sections — Tasks 4–13 cover Hero, Trust bar, How it works, Storefront gallery, Feature blocks, Pricing, FAQ, CTA bar, navbar Pricing link, footer palette. ✓
- §5 Storefront reimagine — Tasks 15–22 cover cover band, header card, payment strip, category tiles, palette refresh on product card + cart FAB. ✓
- §6 Stores directory — Tasks 23–24. ✓
- §7 Files affected — file paths in plan match spec section 7. ✓
- §8 Acceptance criteria — Task 28 walks the list. ✓
- §9 Open questions — Task 6 README captures asset replacement; pricing tier limits are placed in code with the values the user gave. ✓
- §10 Risks — Task 26 covers Lighthouse, Task 27 covers Playwright. Tailwind v4 oxide-binary risk is mitigated by validating via Vercel preview deploys (operational note, not a task).

**Placeholder scan:** No "TBD", "TODO: implement later", or "add appropriate error handling" found in tasks. The two `> If field names differ…` notes (Tasks 14 footer, 20 storefront wiring) are intentional adapter hints because the schema isn't visible from this plan; the engineer must read the actual schema.

**Type/name consistency:**
- `getCoverGradient` — defined in Task 15, used in Task 16. ✓
- `WhatsAppPhoneMock` props (`storeName`, `lines`, `className`) — defined Task 3, used in Task 4 with the same shape. ✓
- `Cat` type in `StoreCategoryGrid` — defined and used only in Task 21. ✓
- Pricing tier values: Free / Pro N$149.95 / Business N$399.95 — match spec section 4.7. ✓

Plan complete.

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-05-02-oshicart-revamp.md`. Two execution options:

1. **Subagent-Driven (recommended)** — I dispatch a fresh subagent per task, review between tasks, fast iteration.
2. **Inline Execution** — Execute tasks in this session using `executing-plans`, batch execution with checkpoints.

Which approach?
