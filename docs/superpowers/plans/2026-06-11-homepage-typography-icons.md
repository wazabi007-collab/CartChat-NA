# Homepage Realness — Typography + Real Icons Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the AI-default Geist font with Fraunces + Plus Jakarta Sans, and swap generic lucide glyphs for the real brand marks already in the repo, so the marketing site feels hand-built.

**Architecture:** Body font (Plus Jakarta Sans) goes site-wide via `--font-sans`; a new `--font-display` (Fraunces) is applied as a `font-display` utility on marketing headings only (dashboard stays sans). The payment bar becomes a real "we accept" logo strip; hero badges and the how-it-works WhatsApp preview use real marks. No content, layout, or stat changes.

**Tech Stack:** Next.js 16 (`next/font/google`), Tailwind v4 (`@theme inline`), React server components, public SVG assets.

**Spec:** `docs/superpowers/specs/2026-06-11-homepage-typography-icons-design.md`

**Repo root for all paths/commands:** `chatcart-na/`

---

## Background facts (read before starting)

- `src/app/layout.tsx`: imports `Geist`, `Geist_Mono` (lines 2,7-15); body
  className is `` `${geistSans.variable} ${geistMono.variable} antialiased` ``
  (line 83).
- `src/app/globals.css`: `@theme inline` block (lines 21-39) sets
  `--font-sans: var(--font-geist-sans)` (line 24) and
  `--font-mono: var(--font-geist-mono)` (line 25); `body { font-family:
  var(--font-sans), … }` (line 44).
- `src/components/landing/payment-trust-bar.tsx`: a server component;
  `METHODS` array (lines 3-9) pairs names with lucide icons; renders icon+label
  pills (lines 24-40).
- `src/components/landing/hero.tsx`: badge pills (lines 47-58) use `BadgeCheck`
  ("Made for Namibia"), `ShieldCheck` ("Zero commission"), `MessageCircle`
  ("Automated WhatsApp updates"); h1 at line 61 (uses `font-black`).
- `src/components/landing/how-it-works.tsx`: WhatsApp-preview card header at
  lines 119-131 ("WhatsApp preview" label + "Auto" badge, no icon today).
- Real assets in `public/`: `payment-paytoday.svg`, `payment-eft.svg`,
  `payment-ewallet.svg`, `payment-cod.svg` (40px-tall coloured logo lockups),
  `whatsapp-icon.webp`, `whatsapp-large.svg`, `namibia-map.svg` (200×160 outline).
  No Pay2Cell or MoMo mark exists.
- Marketing section headings to receive `font-display`: `hero.tsx` h1;
  `payment-trust-bar.tsx` h2; `how-it-works.tsx` h2; `storefront-gallery.tsx`
  h2; `feature-blocks.tsx` h2; `pricing.tsx` h2; `faq.tsx` h2; `cta-bar.tsx`
  (both h2s); `src/app/pricing/page.tsx` h1.
- **No migration, no DB, no content changes.**

---

### Task 1: Swap the fonts (Geist → Fraunces + Plus Jakarta Sans)

**Files:**
- Modify: `src/app/layout.tsx`
- Modify: `src/app/globals.css`

- [ ] **Step 1: Replace the font imports in layout.tsx**

Replace the import line (line 2) and the two font declarations (lines 7-15):
```tsx
import { Fraunces, Plus_Jakarta_Sans, Geist_Mono } from "next/font/google";
```
```tsx
const jakarta = Plus_Jakarta_Sans({
  variable: "--font-plus-jakarta",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  weight: ["400", "600", "700", "900"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});
```

- [ ] **Step 2: Apply the variables on `<body>`**

Replace the body className (line 83):
```tsx
        className={`${jakarta.variable} ${fraunces.variable} ${geistMono.variable} antialiased`}
```

- [ ] **Step 3: Point the theme tokens at the new fonts**

In `src/app/globals.css`, in the `@theme inline` block, replace line 24 and add
a display token:
```css
  --font-sans: var(--font-plus-jakarta);
  --font-display: var(--font-fraunces);
  --font-mono: var(--font-geist-mono);
```
(Leave the `body { font-family: var(--font-sans), … }` rule as-is — it now
resolves to Plus Jakarta Sans.)

- [ ] **Step 4: Typecheck + build (fonts must resolve)**

Run: `npx tsc --noEmit`
Expected: no errors.
Run: `npm run build`
Expected: build succeeds (next/font fetches Fraunces + Plus Jakarta Sans at
build time).

- [ ] **Step 5: Commit**

```bash
git add src/app/layout.tsx src/app/globals.css
git commit -m "Replace Geist with Fraunces display + Plus Jakarta Sans body"
```

---

### Task 2: Apply the display font to marketing headings

**Files:**
- Modify: `src/components/landing/hero.tsx`
- Modify: `src/components/landing/payment-trust-bar.tsx`
- Modify: `src/components/landing/how-it-works.tsx`
- Modify: `src/components/landing/storefront-gallery.tsx`
- Modify: `src/components/landing/feature-blocks.tsx`
- Modify: `src/components/landing/pricing.tsx`
- Modify: `src/components/landing/faq.tsx`
- Modify: `src/components/landing/cta-bar.tsx`
- Modify: `src/app/pricing/page.tsx`

- [ ] **Step 1: Add `font-display` to each section's main heading**

In each file above, find the primary marketing heading (the large `<h1>`/`<h2>`
with `font-black`/`font-extrabold tracking-tight` — e.g. hero.tsx line 61
`<h1 className="text-[2.15rem] font-black ...">`, payment-trust-bar.tsx line 20
`<h2 className="mt-2 text-2xl font-black ...">`) and add `font-display` to its
className. Example for the hero:
```tsx
          <h1 className="font-display text-[2.15rem] font-black leading-[1.03] tracking-tight sm:text-5xl lg:text-7xl">
            Your Namibian business, online in minutes.
          </h1>
```
Do the same for the section `<h2>` in payment-trust-bar, how-it-works,
storefront-gallery, feature-blocks, pricing, faq, and BOTH headline `<h2>`s in
cta-bar, plus the `<h1>` on `src/app/pricing/page.tsx`. Only the top section
heading per component — not sub-labels, card titles, or body text.

(`font-display` is the Tailwind utility generated from `--font-display` in
Task 1; it sets `font-family` only, composing with the existing `font-black`.)

- [ ] **Step 2: Typecheck + lint**

Run: `npx tsc --noEmit`
Expected: no errors.
Run: `npx eslint src/components/landing/ "src/app/pricing/page.tsx"`
Expected: clean.

- [ ] **Step 3: Commit**

```bash
git add src/components/landing/ "src/app/pricing/page.tsx"
git commit -m "Use Fraunces display font on marketing headings"
```

---

### Task 3: Real payment logo strip (+ Pay2Cell asset)

**Files:**
- Create: `public/payment-pay2cell.svg`
- Modify: `src/components/landing/payment-trust-bar.tsx`

- [ ] **Step 1: Create the Pay2Cell mark**

`public/payment-pay2cell.svg` (matching the hand-made style of the other
payment SVGs — a phone glyph + "Pay2Cell" wordmark in FNB turquoise):
```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 40" width="120" height="40">
  <rect x="8" y="8" width="14" height="24" rx="3" fill="#009CA6"/>
  <rect x="10.5" y="11" width="9" height="15" rx="1" fill="#ffffff"/>
  <circle cx="15" cy="29" r="1.4" fill="#ffffff"/>
  <text x="28" y="27" font-family="Arial, Helvetica, sans-serif" font-size="14" font-weight="800" fill="#009CA6" letter-spacing="0.3">Pay2Cell</text>
</svg>
```

- [ ] **Step 2: Rewrite the payment bar as a logo strip**

Replace the whole of `src/components/landing/payment-trust-bar.tsx` with (drops
lucide; renders the real coloured logo SVGs; keeps the heading + commission
badge; the `font-display` from Task 2 is preserved on the h2):
```tsx
import { BadgeCheck } from "lucide-react";

const METHODS = [
  { name: "PayToday", src: "/payment-paytoday.svg" },
  { name: "EFT", src: "/payment-eft.svg" },
  { name: "Pay2Cell", src: "/payment-pay2cell.svg" },
  { name: "eWallet", src: "/payment-ewallet.svg" },
  { name: "Cash on Delivery", src: "/payment-cod.svg" },
];

export function PaymentTrustBar() {
  return (
    <section className="border-y border-border-warm bg-sand py-8">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr] lg:items-center">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-terracotta">
              Local payment confidence
            </p>
            <h2 className="font-display mt-2 text-2xl font-black tracking-tight text-walnut">
              Accept the ways Namibians already pay.
            </h2>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {METHODS.map((method) => (
              <span
                key={method.name}
                className="inline-flex items-center rounded-lg border border-border-warm bg-white px-4 py-2.5 shadow-sm"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={method.src} alt={method.name} className="h-6 w-auto" />
              </span>
            ))}
            <span className="inline-flex items-center gap-2 rounded-lg bg-acacia-soft px-4 py-3 text-sm font-extrabold text-acacia">
              <BadgeCheck size={17} />
              Zero OshiCart commission
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 3: Typecheck + lint**

Run: `npx tsc --noEmit`
Expected: no errors.
Run: `npx eslint "src/components/landing/payment-trust-bar.tsx"`
Expected: clean (the `<img>` has the eslint-disable comment).

- [ ] **Step 4: Commit**

```bash
git add public/payment-pay2cell.svg "src/components/landing/payment-trust-bar.tsx"
git commit -m "Show real payment logos in the trust bar"
```

---

### Task 4: Real marks on hero badges + how-it-works preview

**Files:**
- Modify: `src/components/landing/hero.tsx`
- Modify: `src/components/landing/how-it-works.tsx`

- [ ] **Step 1: Hero badges — real Namibia + WhatsApp marks**

In `hero.tsx`, replace the icon in the "Made for Namibia" pill (currently
`<BadgeCheck size={14} className="text-acacia" />`, line 48) with the Namibia
map image, and the icon in the "Automated WhatsApp updates" pill (currently
`<MessageCircle size={14} className="text-acacia" />`, line 56) with the real
WhatsApp mark. Keep the "Zero commission" pill's `ShieldCheck` as-is.
```tsx
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/namibia-map.svg" alt="" aria-hidden="true" className="h-3.5 w-3.5 object-contain" />
            Made for Namibia
```
```tsx
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/whatsapp-icon.webp" alt="" aria-hidden="true" className="h-3.5 w-3.5 object-contain" />
            Automated WhatsApp updates
```
Remove `BadgeCheck` and `MessageCircle` from the lucide import on lines 3-10 if
they're now unused (keep `ShieldCheck`, `ArrowRight`, `Play`, `Store`, and any
others still referenced — check before deleting).

- [ ] **Step 2: How-it-works — WhatsApp mark on the preview header**

In `how-it-works.tsx`, in the WhatsApp-preview card header (lines 119-127), add
the real WhatsApp mark next to the "WhatsApp preview" label. Change the inner
`<div>` holding the label so it reads:
```tsx
                <div className="flex items-center gap-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/whatsapp-icon.webp" alt="" aria-hidden="true" className="h-5 w-5 object-contain" />
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.14em] text-acacia">
                      WhatsApp preview
                    </p>
                    <h3 className="mt-1 text-lg font-black text-walnut">
                      Automated responses customers understand
                    </h3>
                  </div>
                </div>
```
(The four step-flow icons stay as lucide — they are pure UI concepts with no
real brand mark; forcing logos into the small coloured circles would look worse.
This is a deliberate trim from the spec's broader "how-it-works" wording.)

- [ ] **Step 3: Typecheck + lint**

Run: `npx tsc --noEmit`
Expected: no errors.
Run: `npx eslint "src/components/landing/hero.tsx" "src/components/landing/how-it-works.tsx"`
Expected: clean.

- [ ] **Step 4: Commit**

```bash
git add "src/components/landing/hero.tsx" "src/components/landing/how-it-works.tsx"
git commit -m "Use real Namibia and WhatsApp marks on hero and how-it-works"
```

---

### Task 5: Build + visual verification

- [ ] **Step 1: Full build**

Run: `npm run build`
Expected: build succeeds, 0 type errors.

- [ ] **Step 2: Visual pass (orchestrator, local dev — no login needed)**

Start `npm run dev`; load `http://localhost:3000` and screenshot at 1440 and
390 wide. Confirm:
1. Headlines render in **Fraunces** (serif), body/pills in **Plus Jakarta
   Sans**; no Geist. (DevTools/network shows Fraunces + Plus Jakarta requests,
   no Geist Sans.)
2. Payment bar shows the **real coloured payment logos** (PayToday wordmark,
   EFT, the new Pay2Cell, eWallet, COD) as a strip — not monochrome glyphs.
3. Hero "Made for Namibia" shows the **Namibia map**; the WhatsApp badge + the
   how-it-works preview header show the **real WhatsApp mark**.
4. A dashboard page (e.g. `/login` or, if logged in, `/dashboard`) renders in
   the **clean sans** — no Fraunces serif leakage into app UI.
5. Mobile (390) headlines/pills still look right; payment strip wraps cleanly.

- [ ] **Step 3: Final commit (if fixups) + update handoff**

```bash
git add -A && git commit -m "Homepage realness verification fixups"
```

Update `.remember/remember.md`: homepage typography + icons done; whether
pushed; no migration.

---

## Self-review notes

- **Spec coverage:** font swap (T1) + display on marketing headings (T2);
  payment logo strip + Pay2Cell asset (T3); hero Namibia/WhatsApp marks +
  how-it-works WhatsApp mark (T4); build + visual (T5). Geist mono intentionally
  kept (spec non-goal). One spec trim: how-it-works payment-marks-at-paid-step
  dropped (would look worse in the small step circles) — noted in T4 Step 2.
- **No placeholders;** full code/SVG in every step.
- **Consistency:** `--font-display` defined in T1, used as `font-display`
  utility in T2/T3; `--font-plus-jakarta` / `--font-fraunces` variable names
  match between layout.tsx and globals.css; payment SVG paths in T3 match the
  real files + the new Pay2Cell asset.
- **No dashboard regression:** Fraunces applied only via explicit `font-display`
  on marketing headings; body sans (Plus Jakarta) is a safe global swap.
- **`<img>` not `next/image`** for the local brand SVGs (avoids the SVG
  optimization/config friction); eslint-disable comments included.
