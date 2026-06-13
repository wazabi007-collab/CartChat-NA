# Merchant Help & Navigation — Implementation Plan (Spec B)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Make help/rules discoverable and fix dashboard ↔ public-site routing: auth-aware public navbar, dashboard "View store" + "Help" links, a `/help` page, and a downloadable PDF merchant guide.

**Architecture:** Client-side auth check in the public navbar; two added items in the dashboard nav (desktop + mobile); a new public `/help` route reusing the existing landing FAQ + how-it-works sections; a static PDF generated from authored HTML via the already-installed Playwright Chromium. No DB migration.

**Tech Stack:** Next.js 16, Supabase browser client, Tailwind, Playwright (PDF generation), Lucide icons.

**Spec:** `docs/superpowers/specs/2026-06-13-merchant-help-navigation-design.md`
**Repo root:** `chatcart-na/`

## Background facts
- `src/components/public-navbar.tsx`: `"use client"`. Desktop nav links (Browse Stores, Pricing, Safety, **Sign in** ~line 62-67) + a CTA "Create Free Store" → `/signup` (~71-79); mobile dropdown repeats the links incl. **Sign in** (~116-122). No auth awareness.
- `src/components/dashboard/nav.tsx`: `"use client"`, gets `merchant: { id, store_name, store_slug }`. Desktop sidebar maps `navItems` (~96-116); a bottom block has the Sign out button (~118-129). `merchant.store_slug` available.
- `src/components/dashboard/bottom-nav.tsx`: `"use client"`, props `{ pendingOrders, industry }`. The "More" sheet (~128-163) lists Coupons/Account/Settings/Sign Out. Does NOT currently receive the store slug.
- The dashboard layout renders `DashboardNav` + `BottomNav` — READ it (likely `src/app/(dashboard)/layout.tsx`) to wire a new `storeSlug` prop into `BottomNav`.
- Reusable landing sections: `src/components/landing/faq.tsx` (exports `FAQ`), `src/components/landing/how-it-works.tsx` (exports `HowItWorks`) — both render `<section>`s, no required props. Used by `src/app/page.tsx`.
- `src/components/public-navbar.tsx` + `src/components/footer.tsx` are the public chrome. Support contact (from footer): WhatsApp **+264 81 627 4823** (`https://wa.me/264816274823`), email **info@octovianexus.com**.
- Public info routes that exist: `/prohibited-products` (selling rules), `/terms`, `/privacy`.
- Playwright is installed (chromium) — used for PDF generation in Task 4.

---

### Task 1: Auth-aware public navbar
**Files:** Modify `src/components/public-navbar.tsx`.

- [ ] **Step 1.** Add imports: `import { createClient } from "@/lib/supabase/client";` and add `LayoutDashboard` to the lucide import. Add state + effect inside the component:
```tsx
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => setIsLoggedIn(!!data.user));
  }, []);
```
(Default `false` → renders logged-out first, swaps after the check to avoid a hydration flash.)

- [ ] **Step 2.** Desktop nav: replace the "Sign in" `<Link href="/login">…Sign in</Link>` (~62-67) with a conditional:
```tsx
          {isLoggedIn ? (
            <Link href="/dashboard" className="text-sm font-semibold text-walnut-2 hover:text-walnut transition-colors">
              Dashboard
            </Link>
          ) : (
            <Link href="/login" className="text-sm font-semibold text-walnut-2 hover:text-walnut transition-colors">
              Sign in
            </Link>
          )}
```

- [ ] **Step 3.** Primary CTA (~71-79): when logged in, make it a "Dashboard" button instead of "Create Free Store":
```tsx
          <Link
            href={isLoggedIn ? "/dashboard" : "/signup"}
            onClick={() => !isLoggedIn && track("landing_cta_clicked", { cta_location: "navbar" })}
            className="inline-flex items-center gap-2 text-sm px-3 sm:px-4 py-2.5 bg-terracotta text-white rounded-lg hover:bg-[#234B86] transition-colors font-bold shadow-sm shadow-terracotta/20 whitespace-nowrap"
          >
            {isLoggedIn ? <LayoutDashboard size={16} /> : <Store size={16} />}
            <span className="sm:hidden">{isLoggedIn ? "Dashboard" : "Create Store"}</span>
            <span className="hidden sm:inline">{isLoggedIn ? "Dashboard" : "Create Free Store"}</span>
          </Link>
```

- [ ] **Step 4.** Mobile dropdown: replace the mobile "Sign in" link (~116-122) with the same conditional Dashboard/Sign-in link (block style, `onClick={() => setMobileOpen(false)}`).

- [ ] **Step 5.** `npx tsc --noEmit` + `npx eslint src/components/public-navbar.tsx` clean. Commit:
```bash
git add src/components/public-navbar.tsx
git commit -m "Public navbar: show Dashboard link when a merchant is logged in"
```

---

### Task 2: Dashboard nav — "View store" + "Help"
**Files:** Modify `src/components/dashboard/nav.tsx`, `src/components/dashboard/bottom-nav.tsx`, and the dashboard layout (`src/app/(dashboard)/layout.tsx` — confirm path).

- [ ] **Step 1: desktop sidebar (`nav.tsx`).** Add `ExternalLink, HelpCircle` to the lucide import. In the desktop `<nav>` AFTER the `{navItems.map(...)}` block (after line ~116, still inside the nav), add two non-active-tracked links:
```tsx
            {merchant && (
              <a
                href={`/s/${merchant.store_slug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 px-3.5 py-3 rounded-xl text-sm text-slate-600 hover:bg-slate-50 hover:text-slate-950 transition-colors"
              >
                <ExternalLink size={18} strokeWidth={2} />
                <span className="truncate">View store</span>
              </a>
            )}
            <Link
              href="/help"
              className="flex items-center gap-3 px-3.5 py-3 rounded-xl text-sm text-slate-600 hover:bg-slate-50 hover:text-slate-950 transition-colors"
            >
              <HelpCircle size={18} strokeWidth={2} />
              <span className="truncate">Help</span>
            </Link>
```

- [ ] **Step 2: mobile "More" sheet (`bottom-nav.tsx`).** Add `storeSlug?: string | null` to `BottomNavProps` and destructure it. Add `ExternalLink, HelpCircle` to the lucide import. In the "More" sheet list (after Settings, before Sign Out, ~155), add:
```tsx
              {storeSlug && (
                <a
                  href={`/s/${storeSlug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setMoreOpen(false)}
                  className="flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-gray-50"
                >
                  <ExternalLink size={20} className="text-gray-500" />
                  <span className="text-sm font-medium">View store</span>
                </a>
              )}
              <Link
                href="/help"
                onClick={() => setMoreOpen(false)}
                className="flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-gray-50"
              >
                <HelpCircle size={20} className="text-gray-500" />
                <span className="text-sm font-medium">Help</span>
              </Link>
```

- [ ] **Step 3: wire `storeSlug` into BottomNav.** In the dashboard layout, find the `<BottomNav ... />` render and pass `storeSlug={merchant?.store_slug ?? null}` (the layout already has `merchant` since it passes it to `DashboardNav`). READ the layout to use the exact variable name.

- [ ] **Step 4.** `npx tsc --noEmit` + `npx eslint` on the three files, clean. Commit:
```bash
git add src/components/dashboard/nav.tsx src/components/dashboard/bottom-nav.tsx "src/app/(dashboard)/layout.tsx"
git commit -m "Dashboard nav: persistent View store + Help links"
```

---

### Task 3: `/help` page
**Files:** Create `src/app/help/page.tsx`. Modify `src/components/footer.tsx` (add a Help link).

- [ ] **Step 1: the page.** Create `src/app/help/page.tsx` — a server component rendering the public chrome + consolidated help:
```tsx
import type { Metadata } from "next";
import Link from "next/link";
import { PublicNavbar } from "@/components/public-navbar";
import { Footer } from "@/components/footer";
import { HowItWorks } from "@/components/landing/how-it-works";
import { FAQ } from "@/components/landing/faq";

export const metadata: Metadata = {
  title: "Help & Setup Guide",
  description: "How to set up and sell on OshiCart — FAQs, selling rules, and support.",
};

export default function HelpPage() {
  return (
    <div className="min-h-screen bg-white">
      <PublicNavbar />
      <main className="mx-auto max-w-4xl px-4 sm:px-6 py-10">
        <h1 className="font-black text-3xl tracking-tight text-walnut">Help &amp; setup guide</h1>
        <p className="mt-2 text-walnut-2">Everything you need to set up your store, get paid, and sell on OshiCart.</p>

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <a href="/oshicart-merchant-guide.pdf" target="_blank" rel="noopener noreferrer"
             className="rounded-xl border border-border-warm bg-sand p-4 hover:border-acacia transition-colors">
            <p className="font-black text-walnut">Download the setup guide (PDF)</p>
            <p className="mt-1 text-sm text-walnut-2">A step-by-step guide to setting up and selling.</p>
          </a>
          <a href="https://wa.me/264816274823" target="_blank" rel="noopener noreferrer"
             className="rounded-xl border border-border-warm bg-sand p-4 hover:border-acacia transition-colors">
            <p className="font-black text-walnut">Chat to support on WhatsApp</p>
            <p className="mt-1 text-sm text-walnut-2">+264 81 627 4823 · info@octovianexus.com</p>
          </a>
        </div>

        <div className="mt-4 flex flex-wrap gap-4 text-sm font-semibold text-terracotta">
          <Link href="/prohibited-products" className="hover:underline">Selling rules</Link>
          <Link href="/terms" className="hover:underline">Terms of Service</Link>
          <Link href="/privacy" className="hover:underline">Privacy Policy</Link>
        </div>
      </main>

      <HowItWorks />
      <FAQ />
      <Footer />
    </div>
  );
}
```
(Confirm the exact named exports/paths of `HowItWorks`, `FAQ`, `Footer`, `PublicNavbar` and adjust imports if they differ. If `Footer` is a default export, import accordingly.)

- [ ] **Step 2: footer link.** In `src/components/footer.tsx`, add a `Help` link (→ `/help`) alongside the existing footer links (Browse Stores / Terms / Privacy / Prohibited Products). Match the existing link markup.

- [ ] **Step 3.** `npx tsc --noEmit` + `npx eslint "src/app/help/page.tsx" src/components/footer.tsx` clean. Commit:
```bash
git add "src/app/help/page.tsx" src/components/footer.tsx
git commit -m "Add /help page and footer link"
```

---

### Task 4: Downloadable PDF merchant guide
**Files:** Create `scripts/merchant-guide.html`, `scripts/generate-guide-pdf.mjs`; generate `public/oshicart-merchant-guide.pdf`. Modify the dashboard home to link it.

- [ ] **Step 1: author `scripts/merchant-guide.html`** — a self-contained, print-A4 HTML doc (inline `<style>`, OshiCart green/terracotta accents, a cover heading "OshiCart — Merchant Setup Guide"). Cover these sections with real, concise, practical copy (2–5 short sentences each):
  1. Welcome / what OshiCart is.
  2. Create your store (the 2-minute setup wizard: store name, WhatsApp number, industry).
  3. Add products + great photos (good lighting; the app auto-compresses; up to 3 photos; use variations for size/colour).
  4. Payment methods you can offer (EFT, MTC Maris, FNB Pay2Cell, eWallet, PayToday, Cash on Delivery) + proof of payment (verify your bank balance — screenshots can be faked).
  5. Delivery options (Store delivery with a fee; Yango / inDrive where the buyer books & pays the courier — set your pickup address).
  6. Share your store (WhatsApp Status, the QR code, Facebook/Instagram/TikTok).
  7. Getting paid safely + the selling rules (no prohibited items; link to prohibited-products).
  8. Support: WhatsApp +264 81 627 4823 · info@octovianexus.com.
  Keep it ~3–5 A4 pages. Use semantic headings and short bullet lists.

- [ ] **Step 2: generation script `scripts/generate-guide-pdf.mjs`:**
```js
import { chromium } from "playwright";
import { readFileSync } from "node:fs";

const html = readFileSync(new URL("./merchant-guide.html", import.meta.url), "utf8");
const browser = await chromium.launch();
const page = await browser.newPage();
await page.setContent(html, { waitUntil: "networkidle" });
await page.pdf({
  path: "public/oshicart-merchant-guide.pdf",
  format: "A4",
  printBackground: true,
  margin: { top: "16mm", bottom: "16mm", left: "14mm", right: "14mm" },
});
await browser.close();
console.log("Wrote public/oshicart-merchant-guide.pdf");
```

- [ ] **Step 3: generate the PDF.** Run: `node scripts/generate-guide-pdf.mjs` (from repo root). Confirm `public/oshicart-merchant-guide.pdf` exists and is a valid multi-page PDF (e.g. check size > 10 KB; open/verify page count). If chromium isn't available to `playwright` directly, use `npx playwright install chromium` first.

- [ ] **Step 4: link from the dashboard home.** In `src/app/(dashboard)/dashboard/page.tsx`, near the getting-started checklist (the `<GettingStarted .../>` render, ~line 201-213), add a small link: `<a href="/oshicart-merchant-guide.pdf" target="_blank" rel="noopener noreferrer" className="...">Read the setup guide (PDF)</a>` (match nearby styling; keep it subtle). READ the file to place it sensibly.

- [ ] **Step 5.** `npx tsc --noEmit` + `npm run build` should still pass (the PDF is a static asset). Commit:
```bash
git add scripts/merchant-guide.html scripts/generate-guide-pdf.mjs public/oshicart-merchant-guide.pdf "src/app/(dashboard)/dashboard/page.tsx"
git commit -m "Add downloadable merchant setup guide (PDF) and dashboard link"
```

---

### Task 5: Build + QA
- [ ] **Step 1: build.** `npm run build` — clean.
- [ ] **Step 2: QA (orchestrator, dev server).**
  - Logged OUT (no QA login): visit `/` → public navbar shows "Sign in" + "Create Free Store".
  - Logged IN (QA merchant, temp active not needed — dashboard works while suspended): visit `/` → navbar shows "Dashboard"; dashboard sidebar shows "View store" (opens `/s/oshi-qa-8956093` new tab) + "Help" (→ `/help`); mobile More sheet shows both.
  - `/help` renders: guide-download card, WhatsApp/email card, rules/terms/privacy links, the How-it-works + FAQ sections, footer (with the new Help link).
  - The PDF at `/oshicart-merchant-guide.pdf` opens and reads correctly (spot-check content).
  - Reset any temp state; delete temp specs/screenshots.
- [ ] **Step 3:** Update `.remember/remember.md`. (Pushing is a separate user-approved step.)

## Self-review notes
- Spec coverage: auth-aware navbar (T1), dashboard View-store + Help (T2), /help page + footer link (T3), PDF guide + dashboard link (T4), build/QA (T5). No migration.
- Backward-compat: navbar default state = logged-out (no flash to wrong state for anonymous users); new nav items are additive; /help is a new route; PDF is a static asset.
- The PDF source HTML + script are committed so the guide is regenerable; the binary is committed for serving.
