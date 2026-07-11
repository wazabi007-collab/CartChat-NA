# Store Location (Region + Town) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let sellers declare their Namibian region + town during onboarding so customers can see each store's town and filter the Browse page by region.

**Architecture:** Mirror the existing `industry` field end-to-end — canonical list in `constants.ts` → grouped `<select>` in setup/settings → `merchants.region`/`merchants.town` columns → display on store card + storefront header → region filter on Browse. Region+town are cascading dropdowns (pick region → town list narrows). Required at setup (inline guard); optional/non-blocking in settings so existing stores keep working.

**Tech Stack:** Next.js 16 (App Router, RSC), TypeScript, Supabase (Postgres + RLS), Tailwind v4, Zod. Verification is `npm run build` (typecheck + build) + visual check — the repo has **no unit-test runner** (Playwright E2E only).

## Global Constraints

- Store **slugs, never labels**, in the DB (`region='khomas'`, `town='windhoek'`). Labels come from lookup maps so copy can change with no data migration.
- Both columns are **nullable**; existing ~34 stores have no location and must keep working.
- **Required at setup for new stores** via inline Step-1 guard (matching how `industry` is enforced) — do **NOT** add region/town as required to the shared `storeSetupSchema` (that schema is reused by Settings, where existing stores must save without a location).
- Dev runs against the **production** Supabase DB, so migration 052 must be applied (user-approved) before setup/settings can persist location.
- Brand UI atoms only: `selectBase`, `focusGreen`, `label`, `helperText` from `@/lib/ui`. Match existing Tailwind classes.
- Prod migrations require **explicit user approval** — never auto-apply.

---

## Task 1: Foundation — migration, types, constants

**Files:**
- Create: `chatcart-na/supabase/migrations/052_store_location.sql`
- Modify: `chatcart-na/src/types/database.ts` (merchants Row ~L34, Insert ~L65, Update ~L96)
- Modify: `chatcart-na/src/lib/constants.ts` (append after `INDUSTRIES_NAMIBIA` block, ~L112)

**Interfaces:**
- Produces (consumed by Tasks 2–6):
  - `NAMIBIA_REGIONS: readonly { value: string; label: string }[]`
  - `TOWNS_NAMIBIA: readonly { value: string; label: string; region: string }[]`
  - `REGION_LABELS: Record<string,string>`, `TOWN_LABELS: Record<string,string>`, `TOWN_REGION: Record<string,string>`
  - `townsForRegion(region: string): { value: string; label: string; region: string }[]`
  - `merchants.region` / `merchants.town` columns (`text`, nullable)

- [ ] **Step 1: Create migration `052_store_location.sql`**

```sql
-- Migration 052: Store location (region + town)
-- Sellers declare where they sell from so customers can see the town and
-- filter the Browse page by region. Both columns nullable (existing stores).

ALTER TABLE merchants
  ADD COLUMN IF NOT EXISTS region text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS town   text DEFAULT NULL;

-- Region filter on the public Browse page (active stores only)
CREATE INDEX IF NOT EXISTS idx_merchants_region
  ON merchants (region)
  WHERE is_active = true AND store_status = 'active';
```

- [ ] **Step 2: Add columns to `src/types/database.ts`**

In the `merchants` **Row** block, add after the `industry: string | null;` line:
```ts
          region: string | null;
          town: string | null;
```
In the **Insert** block, after `industry?: string | null;`:
```ts
          region?: string | null;
          town?: string | null;
```
In the **Update** block, after `industry?: string | null;`:
```ts
          region?: string | null;
          town?: string | null;
```

- [ ] **Step 3: Append location constants to `src/lib/constants.ts`**

```ts
// ─── Store location (Namibian regions + towns) ──────────────────────────
// Region order = rough commercial density so common picks sit near the top.
export const NAMIBIA_REGIONS = [
  { value: "khomas",       label: "Khomas" },
  { value: "erongo",       label: "Erongo" },
  { value: "oshana",       label: "Oshana" },
  { value: "oshikoto",     label: "Oshikoto" },
  { value: "otjozondjupa", label: "Otjozondjupa" },
  { value: "omusati",      label: "Omusati" },
  { value: "ohangwena",    label: "Ohangwena" },
  { value: "kavango_east", label: "Kavango East" },
  { value: "kavango_west", label: "Kavango West" },
  { value: "hardap",       label: "Hardap" },
  { value: "karas",        label: "ǁKaras" },
  { value: "kunene",       label: "Kunene" },
  { value: "omaheke",      label: "Omaheke" },
  { value: "zambezi",      label: "Zambezi" },
] as const;

export const TOWNS_NAMIBIA = [
  // Khomas
  { value: "windhoek",     label: "Windhoek",     region: "khomas" },
  { value: "khomas_other", label: "Other (Khomas)", region: "khomas" },
  // Erongo
  { value: "swakopmund",   label: "Swakopmund",   region: "erongo" },
  { value: "walvis_bay",   label: "Walvis Bay",   region: "erongo" },
  { value: "henties_bay",  label: "Henties Bay",  region: "erongo" },
  { value: "arandis",      label: "Arandis",      region: "erongo" },
  { value: "usakos",       label: "Usakos",       region: "erongo" },
  { value: "karibib",      label: "Karibib",      region: "erongo" },
  { value: "omaruru",      label: "Omaruru",      region: "erongo" },
  { value: "erongo_other", label: "Other (Erongo)", region: "erongo" },
  // Oshana
  { value: "oshakati",     label: "Oshakati",     region: "oshana" },
  { value: "ongwediva",    label: "Ongwediva",    region: "oshana" },
  { value: "ondangwa",     label: "Ondangwa",     region: "oshana" },
  { value: "oshana_other", label: "Other (Oshana)", region: "oshana" },
  // Oshikoto
  { value: "tsumeb",       label: "Tsumeb",       region: "oshikoto" },
  { value: "omuthiya",     label: "Omuthiya",     region: "oshikoto" },
  { value: "oniipa",       label: "Oniipa",       region: "oshikoto" },
  { value: "oshikoto_other", label: "Other (Oshikoto)", region: "oshikoto" },
  // Otjozondjupa
  { value: "otjiwarongo",  label: "Otjiwarongo",  region: "otjozondjupa" },
  { value: "okahandja",    label: "Okahandja",    region: "otjozondjupa" },
  { value: "grootfontein", label: "Grootfontein", region: "otjozondjupa" },
  { value: "otavi",        label: "Otavi",        region: "otjozondjupa" },
  { value: "okakarara",    label: "Okakarara",    region: "otjozondjupa" },
  { value: "otjozondjupa_other", label: "Other (Otjozondjupa)", region: "otjozondjupa" },
  // Omusati
  { value: "outapi",       label: "Outapi",       region: "omusati" },
  { value: "oshikuku",     label: "Oshikuku",     region: "omusati" },
  { value: "okahao",       label: "Okahao",       region: "omusati" },
  { value: "ruacana",      label: "Ruacana",      region: "omusati" },
  { value: "omusati_other", label: "Other (Omusati)", region: "omusati" },
  // Ohangwena
  { value: "eenhana",      label: "Eenhana",      region: "ohangwena" },
  { value: "helao_nafidi", label: "Helao Nafidi (Oshikango)", region: "ohangwena" },
  { value: "ohangwena_other", label: "Other (Ohangwena)", region: "ohangwena" },
  // Kavango East
  { value: "rundu",        label: "Rundu",        region: "kavango_east" },
  { value: "divundu",      label: "Divundu",      region: "kavango_east" },
  { value: "kavango_east_other", label: "Other (Kavango East)", region: "kavango_east" },
  // Kavango West
  { value: "nkurenkuru",   label: "Nkurenkuru",   region: "kavango_west" },
  { value: "kavango_west_other", label: "Other (Kavango West)", region: "kavango_west" },
  // Hardap
  { value: "mariental",    label: "Mariental",    region: "hardap" },
  { value: "rehoboth",     label: "Rehoboth",     region: "hardap" },
  { value: "aranos",       label: "Aranos",       region: "hardap" },
  { value: "maltahohe",    label: "Maltahöhe",    region: "hardap" },
  { value: "hardap_other", label: "Other (Hardap)", region: "hardap" },
  // ǁKaras
  { value: "keetmanshoop", label: "Keetmanshoop", region: "karas" },
  { value: "luderitz",     label: "Lüderitz",     region: "karas" },
  { value: "oranjemund",   label: "Oranjemund",   region: "karas" },
  { value: "karasburg",    label: "Karasburg",    region: "karas" },
  { value: "rosh_pinah",   label: "Rosh Pinah",   region: "karas" },
  { value: "karas_other",  label: "Other (ǁKaras)", region: "karas" },
  // Kunene
  { value: "opuwo",        label: "Opuwo",        region: "kunene" },
  { value: "khorixas",     label: "Khorixas",     region: "kunene" },
  { value: "outjo",        label: "Outjo",        region: "kunene" },
  { value: "kamanjab",     label: "Kamanjab",     region: "kunene" },
  { value: "kunene_other", label: "Other (Kunene)", region: "kunene" },
  // Omaheke
  { value: "gobabis",      label: "Gobabis",      region: "omaheke" },
  { value: "omaheke_other", label: "Other (Omaheke)", region: "omaheke" },
  // Zambezi
  { value: "katima_mulilo", label: "Katima Mulilo", region: "zambezi" },
  { value: "bukalo",       label: "Bukalo",       region: "zambezi" },
  { value: "zambezi_other", label: "Other (Zambezi)", region: "zambezi" },
] as const;

export const REGION_LABELS: Record<string, string> = Object.fromEntries(
  NAMIBIA_REGIONS.map((r) => [r.value, r.label])
);
export const TOWN_LABELS: Record<string, string> = Object.fromEntries(
  TOWNS_NAMIBIA.map((t) => [t.value, t.label])
);
export const TOWN_REGION: Record<string, string> = Object.fromEntries(
  TOWNS_NAMIBIA.map((t) => [t.value, t.region])
);
export function townsForRegion(region: string) {
  return TOWNS_NAMIBIA.filter((t) => t.region === region);
}
```

- [ ] **Step 4: Sanity-check the constants (no test runner — optional quick check)**

Run: `cd chatcart-na && npx tsx -e "import {townsForRegion,TOWN_REGION,NAMIBIA_REGIONS} from './src/lib/constants'; if(townsForRegion('khomas').length<2) throw new Error('khomas towns'); if(TOWN_REGION['walvis_bay']!=='erongo') throw new Error('town-region map'); if(NAMIBIA_REGIONS.length!==14) throw new Error('region count'); console.log('constants OK');"`
Expected: `constants OK`
(If `tsx` is not installed, skip this step — Step 5's `npm run build` fully typechecks the constants.)

- [ ] **Step 5: Typecheck + build**

Run: `cd chatcart-na && npm run build`
Expected: `✓ Compiled successfully` with no type errors.

- [ ] **Step 6: CHECKPOINT — apply migration 052 to prod (USER APPROVAL REQUIRED)**

Dev hits the prod DB, so the columns must exist before Tasks 2–3 can persist. Ask the user to approve applying `052_store_location.sql` via the Supabase MCP `apply_migration` tool (project `pcseqiaqeiiaiqxqtfmw`). Do not apply without explicit approval. After apply, verify: `select column_name from information_schema.columns where table_name='merchants' and column_name in ('region','town');` returns both rows.

- [ ] **Step 7: Commit**

```bash
git add chatcart-na/supabase/migrations/052_store_location.sql chatcart-na/src/types/database.ts chatcart-na/src/lib/constants.ts
git commit -m "feat(location): migration 052 + types + Namibia region/town constants"
```

---

## Task 2: Setup wizard — Region + Town (required for new stores)

**Files:**
- Modify: `chatcart-na/src/app/(dashboard)/dashboard/setup/page.tsx`

**Interfaces:**
- Consumes: `NAMIBIA_REGIONS`, `TOWNS_NAMIBIA`, `townsForRegion` (Task 1); `selectBase`, `focusGreen`, `label`, `helperText` (existing).
- Produces: writes `region`, `town` on the `merchants` insert.

- [ ] **Step 1: Import constants**

In the constants import (currently `import { BANKS_NAMIBIA, BANK_BRANCH_CODES, INDUSTRIES_NAMIBIA, INDUSTRY_GROUP_ORDER, PAYMENT_METHODS } from "@/lib/constants";`) add `NAMIBIA_REGIONS`, `townsForRegion`:
```ts
import { BANKS_NAMIBIA, BANK_BRANCH_CODES, INDUSTRIES_NAMIBIA, INDUSTRY_GROUP_ORDER, PAYMENT_METHODS, NAMIBIA_REGIONS, townsForRegion } from "@/lib/constants";
```

- [ ] **Step 2: Add fields to `INITIAL_FORM`**

In `INITIAL_FORM`, after `industry: "",` add:
```ts
  region: "",
  town: "",
```

- [ ] **Step 3: Add cascading selects under the Industry block (Step 1 JSX)**

Immediately after the Industry `<div>` block (the one closing just before the `{error && (` alert in step 1), insert:
```tsx
              <div>
                <label className={label}>
                  Region<span className="text-red-500 ml-0.5">*</span>
                </label>
                <select
                  value={form.region}
                  onChange={(e) => {
                    // Region change invalidates the chosen town
                    setForm((prev) => ({ ...prev, region: e.target.value, town: "" }));
                  }}
                  required
                  className={`${selectBase} ${focusGreen}`}
                >
                  <option value="">Where do you sell from?</option>
                  {NAMIBIA_REGIONS.map((r) => (
                    <option key={r.value} value={r.value}>{r.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={label}>
                  Town<span className="text-red-500 ml-0.5">*</span>
                </label>
                <select
                  value={form.town}
                  onChange={(e) => update("town", e.target.value)}
                  required
                  disabled={!form.region}
                  className={`${selectBase} ${focusGreen} disabled:opacity-50`}
                >
                  <option value="">{form.region ? "Select your town" : "Choose a region first"}</option>
                  {townsForRegion(form.region).map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
                <p className={helperText}>Customers will see this on your store</p>
              </div>
```

- [ ] **Step 4: Require region + town in the Step-1 "Next" guard**

In the Step-1 next button `onClick`, after the existing `if (!form.industry) { setError("Please select your industry"); return; }` add:
```tsx
                  if (!form.region || !form.town) {
                    setError("Please choose your region and town");
                    return;
                  }
```

- [ ] **Step 5: Persist region + town on insert**

In the `.from("merchants").insert({ ... })` object, after `industry: form.industry || "other",` add:
```ts
        region: form.region || null,
        town: form.town || null,
```

- [ ] **Step 6: Build + visual verify**

Run: `cd chatcart-na && npm run build` → expect `✓ Compiled successfully`.
Visual (`npm run dev`, open `/dashboard/setup` while logged in as a test user): Region dropdown lists 14 regions; Town is disabled until a region is picked, then shows only that region's towns; changing region clears the town; pressing Next with either empty shows "Please choose your region and town". (Full save is verified in Task 7 after migration is applied.)

- [ ] **Step 7: Commit**

```bash
git add chatcart-na/src/app/\(dashboard\)/dashboard/setup/page.tsx
git commit -m "feat(location): region + town selects required in store setup"
```

---

## Task 3: Settings — Region + Town (editable, non-blocking)

**Files:**
- Modify: `chatcart-na/src/app/(dashboard)/dashboard/settings/page.tsx`

**Interfaces:**
- Consumes: `NAMIBIA_REGIONS`, `townsForRegion` (Task 1).
- Produces: reads/writes `merchants.region`, `merchants.town`.

- [ ] **Step 1: Import constants**

Add `NAMIBIA_REGIONS, townsForRegion` to the existing `@/lib/constants` import in this file.

- [ ] **Step 2: Add to form state**

In the `useState({...})` form object, after `store_name: "",` add:
```ts
    region: "",
    town: "",
```

- [ ] **Step 3: Map from loaded merchant**

In the `setForm({ ... })` inside `load()`, after `store_name: merchant.store_name,` add:
```ts
          region: merchant.region || "",
          town: merchant.town || "",
```

- [ ] **Step 4: Include in the update payload**

In the `.from("merchants").update({ ... })` object, after `store_name: form.store_name,` add:
```ts
        region: form.region || null,
        town: form.town || null,
```

- [ ] **Step 5: Add the selects to the Store-Info card**

In the Store-Info card, immediately after the WhatsApp Number `<div>` (the one with the "Customers will contact you on this number" helper) and before that card's closing `</div>`, insert:
```tsx
          <div>
            <label className={label}>Region</label>
            <select
              value={form.region}
              onChange={(e) => setForm((p) => ({ ...p, region: e.target.value, town: "" }))}
              className={`${selectBase} ${focusGreen}`}
            >
              <option value="">Not set</option>
              {NAMIBIA_REGIONS.map((r) => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={label}>Town</label>
            <select
              value={form.town}
              onChange={(e) => setForm((p) => ({ ...p, town: e.target.value }))}
              disabled={!form.region}
              className={`${selectBase} ${focusGreen} disabled:opacity-50`}
            >
              <option value="">{form.region ? "Select your town" : "Choose a region first"}</option>
              {townsForRegion(form.region).map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
            <p className={helperText}>Shown to customers on your store and the Browse page</p>
          </div>
```

- [ ] **Step 6: Build + visual verify**

Run: `cd chatcart-na && npm run build` → `✓ Compiled successfully`.
Visual: `/dashboard/settings` loads with existing (empty) location = "Not set"; picking a region enables the town list; Save persists without requiring location (non-blocking for existing stores).

- [ ] **Step 7: Commit**

```bash
git add chatcart-na/src/app/\(dashboard\)/dashboard/settings/page.tsx
git commit -m "feat(location): editable region + town in store settings"
```

---

## Task 4: Browse page — region filter + town on cards

**Files:**
- Modify: `chatcart-na/src/app/stores/page.tsx`

**Interfaces:**
- Consumes: `NAMIBIA_REGIONS`, `TOWN_LABELS` (Task 1); reads `merchants.region`, `merchants.town`.
- Produces: `?region=<slug>` URL param filter; `📍 town` on cards.

- [ ] **Step 1: Import constants**

Add to the `@/lib/constants` import: `NAMIBIA_REGIONS`, `TOWN_LABELS`.

- [ ] **Step 2: Accept the `region` search param**

Change the `searchParams` type and destructure:
```ts
  searchParams: Promise<{ q?: string; category?: string; region?: string }>;
```
```ts
  const { q, category, region } = await searchParams;
```

- [ ] **Step 3: Select the new columns + filter by region in the query**

In the merchants `.select(...)`, add `region, town`:
```ts
    .select("id, store_name, store_slug, description, logo_url, whatsapp_number, industry, region, town, created_at")
```
Immediately after the `if (q && q.trim()) { ... }` block, add:
```ts
  if (region && region !== "all") {
    query = query.eq("region", region);
  }
```

- [ ] **Step 4: Render the region filter row**

Directly below the existing category-filter `<div className="flex flex-wrap gap-2 justify-center mb-8">...</div>`, add a region row. It preserves `q` and `category` in the href:
```tsx
        {/* Region filters */}
        <div className="flex flex-wrap gap-2 justify-center mb-8">
          {[{ value: "all", label: "All regions" }, ...NAMIBIA_REGIONS].map((r) => {
            const isActive = r.value === "all" ? !region : region === r.value;
            const params = new URLSearchParams();
            if (q) params.set("q", q);
            if (category && category !== "All") params.set("category", category);
            if (r.value !== "all") params.set("region", r.value);
            const href = `/stores${params.toString() ? `?${params.toString()}` : ""}`;
            return (
              <Link
                key={r.value}
                href={href}
                className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                  isActive
                    ? "bg-terracotta text-white border-terracotta"
                    : "bg-white text-walnut-2 border-border-warm hover:bg-sand-2"
                }`}
              >
                {r.label}
              </Link>
            );
          })}
        </div>
```

- [ ] **Step 5: Show 📍 town on each store card**

In the store card, replace the industry/product-count `<p>` (the one rendering `INDUSTRY_LABELS[...] · N products`) so a town line appears when present. Keep the existing line and add above it:
```tsx
                        {merchant.town && (
                          <p className="flex items-center gap-1 text-xs font-semibold text-acacia">
                            <MapPin size={12} /> {TOWN_LABELS[merchant.town] ?? ""}
                          </p>
                        )}
                        <p className="text-xs font-semibold text-walnut-2/70">
                          {INDUSTRY_LABELS[merchant.industry || "other"] || "General"} &middot; {productCount} product{productCount !== 1 ? "s" : ""}
                        </p>
```
Add `MapPin` to the `lucide-react` import at the top of the file.

- [ ] **Step 6: Build + visual verify**

Run: `cd chatcart-na && npm run build` → `✓ Compiled successfully`.
Visual: `/stores` shows the region row; clicking a region adds `?region=` and narrows results; combining with a category keeps both params; cards with a town show the pin, cards without show none.

- [ ] **Step 7: Commit**

```bash
git add chatcart-na/src/app/stores/page.tsx
git commit -m "feat(location): region filter + town on Browse store cards"
```

---

## Task 5: Storefront header — show location

**Files:**
- Modify: `chatcart-na/src/app/s/[slug]/page.tsx`

**Interfaces:**
- Consumes: `TOWN_LABELS`, `REGION_LABELS` (Task 1). The main merchant fetch uses `.select("*")`, so `region`/`town` are already present. `StoreHeaderCard` already accepts `location?: string | null` and renders it with a `MapPin`.

- [ ] **Step 1: Import label maps**

Add `TOWN_LABELS, REGION_LABELS` to the `@/lib/constants` import in this file (it already imports `SITE_NAME`, `SITE_URL` from constants — extend that import).

- [ ] **Step 2: Compute the location label and pass it to the header**

Just before the `return (` of the page component (near where `theme`/other derived values are set), add:
```ts
  const locationLabel = merchant.town
    ? [TOWN_LABELS[merchant.town], merchant.region ? REGION_LABELS[merchant.region] : null]
        .filter(Boolean)
        .join(", ")
    : null;
```
In the `StoreHeaderCard` `store={{ ... }}` prop, replace `location: null,` with:
```ts
            location: locationLabel,
```

- [ ] **Step 3: Build + visual verify**

Run: `cd chatcart-na && npm run build` → `✓ Compiled successfully`.
Visual: a storefront whose merchant has a town set shows "📍 Town, Region" in the header; a store without location shows no pin (unchanged).

- [ ] **Step 4: Commit**

```bash
git add chatcart-na/src/app/s/\[slug\]/page.tsx
git commit -m "feat(location): show town + region on storefront header"
```

---

## Task 6: Dashboard nudge for stores missing a location

**Files:**
- Create: `chatcart-na/src/components/dashboard/location-nudge.tsx`
- Modify: `chatcart-na/src/app/(dashboard)/dashboard/page.tsx`

**Interfaces:**
- Produces: `<LocationNudge />` — self-contained client banner, localStorage-dismissible.

- [ ] **Step 1: Create the nudge component**

```tsx
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { MapPin, X } from "lucide-react";

const DISMISS_KEY = "oshicart-location-nudge-dismissed";

export function LocationNudge() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    try {
      if (!localStorage.getItem(DISMISS_KEY)) setShow(true);
    } catch {
      // storage unavailable — leave hidden
    }
  }, []);

  if (!show) return null;

  return (
    <div className="mb-4 flex items-center justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
      <div className="flex items-center gap-2">
        <MapPin size={16} className="shrink-0" />
        <p>
          Add your town so customers know where you sell from.{" "}
          <Link href="/dashboard/settings" className="font-semibold underline hover:text-amber-900">
            Add location →
          </Link>
        </p>
      </div>
      <button
        type="button"
        onClick={() => {
          try {
            localStorage.setItem(DISMISS_KEY, "1");
          } catch {
            // ignore
          }
          setShow(false);
        }}
        aria-label="Dismiss"
        className="shrink-0 text-amber-600 hover:text-amber-800"
      >
        <X size={16} />
      </button>
    </div>
  );
}
```

- [ ] **Step 2: Render it on the dashboard when location is missing**

In `src/app/(dashboard)/dashboard/page.tsx`:
1. Ensure the merchant fetch exposes `region`/`town`. Find the `.from("merchants").select(...)`. If it uses `.select("*")`, no change. If it lists columns, add `region, town`.
2. Import: `import { LocationNudge } from "@/components/dashboard/location-nudge";`
3. At the top of the returned dashboard JSX (immediately above the `<GettingStarted ... />` render, or above the first content block if none), add:
```tsx
      {(!merchant.region || !merchant.town) && <LocationNudge />}
```

- [ ] **Step 3: Build + visual verify**

Run: `cd chatcart-na && npm run build` → `✓ Compiled successfully`.
Visual: a merchant without a location sees the amber banner on `/dashboard`; the X dismisses it and it stays gone on reload (localStorage); a merchant with a location does not see it.

- [ ] **Step 4: Commit**

```bash
git add chatcart-na/src/components/dashboard/location-nudge.tsx chatcart-na/src/app/\(dashboard\)/dashboard/page.tsx
git commit -m "feat(location): dashboard nudge to add store location"
```

---

## Task 7: Full verification + deploy

**Files:** none (verification + deploy).

- [ ] **Step 1: Full build + lint**

Run: `cd chatcart-na && npm run build && npm run lint`
Expected: build succeeds; lint clean (fix any warnings introduced).

- [ ] **Step 2: End-to-end manual verification (dev against prod DB, migration already applied in Task 1)**

With `npm run dev`:
1. Create a new store via `/dashboard/setup` (test account) → must require region+town → completes and saves.
2. Confirm the store card at `/stores` shows `📍 <town>` and the region filter includes it.
3. Open the storefront `/s/<slug>` → header shows "📍 Town, Region".
4. Edit location in `/dashboard/settings` → change reflects on card + storefront.
5. An existing store with no location: dashboard nudge shows; cards omit the pin; it still appears under "All regions".

- [ ] **Step 3: CHECKPOINT — deploy (USER GO-AHEAD)**

Confirm with the user, then:
```bash
git push origin master
```
(Vercel auto-deploys `master` to oshicart.com.) Verify the live site after deploy: `/stores` region filter and a storefront header show location.

---

## Notes for the implementer

- **Do not** add `region`/`town` to `storeSetupSchema` — Settings reuses it and existing stores must save without a location. Required-at-setup is enforced only by the inline Step-1 guard (Task 2, Step 4).
- Town options are always derived from the selected region via `townsForRegion`, and region changes reset `town` to `""` — so an inconsistent region/town pair cannot be produced through the UI (no extra DB constraint needed).
- Everything stores slugs; display uses `REGION_LABELS` / `TOWN_LABELS`. Never store the label.
