# Store Location (Region + Town) — Design Spec

**Date:** 2026-07-11
**Status:** Approved design → ready for implementation plan
**Author:** OshiCart team

## Goal

Let every seller declare **where they sell from** (a Namibian **region** + **town**) during onboarding, so customers browsing stores can see and filter by location — "I'm buying from someone in Oshakati / the Erongo region."

## Decisions (locked)

1. **Granularity:** store BOTH `region` and `town`. Region is the filter unit (14 clean options); town is the display unit (specific place on each card).
2. **Input:** two **linked dropdowns** — pick Region → the Town list narrows to that region. Each region has an **"Other / not listed"** town for villages/peri-urban areas.
3. **Requirement:** **required for new stores** at setup. Existing stores keep working (nullable) and see a dashboard nudge to add their location.
4. **No** map, GPS/geolocation, distance sorting, or town-level filtering in this iteration (out of scope).

## Architecture overview

Mirror the existing **`industry`** pattern end-to-end (it already does exactly this for categories):

```
constants (canonical list) → grouped <select> in setup/settings
   → merchants.region / merchants.town columns
   → store card + storefront header (display)
   → Browse page region filter (discovery)
```

This keeps the feature consistent with code reviewers already understand and reuses proven UI atoms.

## 1. Data model

New migration `052_store_location.sql`:

```sql
ALTER TABLE merchants
  ADD COLUMN IF NOT EXISTS region text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS town   text DEFAULT NULL;

-- Region filter on the public Browse page (active stores only)
CREATE INDEX IF NOT EXISTS idx_merchants_region
  ON merchants (region)
  WHERE is_active = true AND store_status = 'active';
```

- Both columns **nullable** — existing ~34 stores have no location yet; nothing breaks.
- Values are **stable slugs** (e.g. `region = 'khomas'`, `town = 'windhoek'`), never the display label, so labels can be reworded without a data migration.
- No CHECK constraint tying town→region in SQL (the dropdown enforces it client-side; a DB constraint would need a lookup table and is overkill for a controlled vocabulary). The app validates the pair.

## 2. Canonical data (constants)

Add to `src/lib/constants.ts`, mirroring `INDUSTRIES_NAMIBIA` / `INDUSTRY_GROUP_ORDER`:

```ts
export const NAMIBIA_REGIONS = [
  { value: "khomas",        label: "Khomas" },
  { value: "erongo",        label: "Erongo" },
  { value: "oshana",        label: "Oshana" },
  { value: "oshikoto",      label: "Oshikoto" },
  { value: "otjozondjupa",  label: "Otjozondjupa" },
  { value: "omusati",       label: "Omusati" },
  { value: "ohangwena",     label: "Ohangwena" },
  { value: "kavango_east",  label: "Kavango East" },
  { value: "kavango_west",  label: "Kavango West" },
  { value: "hardap",        label: "Hardap" },
  { value: "karas",         label: "ǁKaras" },
  { value: "kunene",        label: "Kunene" },
  { value: "omaheke",       label: "Omaheke" },
  { value: "zambezi",       label: "Zambezi" },
] as const;

// Each region ends with an "<region>_other" catch-all.
export const TOWNS_NAMIBIA = [
  // Khomas
  { value: "windhoek",   label: "Windhoek",   region: "khomas" },
  { value: "khomas_other", label: "Other (Khomas)", region: "khomas" },
  // Erongo
  { value: "swakopmund", label: "Swakopmund", region: "erongo" },
  { value: "walvis_bay", label: "Walvis Bay", region: "erongo" },
  { value: "henties_bay",label: "Henties Bay",region: "erongo" },
  { value: "arandis",    label: "Arandis",    region: "erongo" },
  { value: "usakos",     label: "Usakos",     region: "erongo" },
  { value: "karibib",    label: "Karibib",    region: "erongo" },
  { value: "omaruru",    label: "Omaruru",    region: "erongo" },
  { value: "erongo_other", label: "Other (Erongo)", region: "erongo" },
  // Oshana
  { value: "oshakati",   label: "Oshakati",   region: "oshana" },
  { value: "ongwediva",  label: "Ongwediva",  region: "oshana" },
  { value: "ondangwa",   label: "Ondangwa",   region: "oshana" },
  { value: "oshana_other", label: "Other (Oshana)", region: "oshana" },
  // Oshikoto
  { value: "tsumeb",     label: "Tsumeb",     region: "oshikoto" },
  { value: "omuthiya",   label: "Omuthiya",   region: "oshikoto" },
  { value: "oniipa",     label: "Oniipa",     region: "oshikoto" },
  { value: "oshikoto_other", label: "Other (Oshikoto)", region: "oshikoto" },
  // Otjozondjupa
  { value: "otjiwarongo",label: "Otjiwarongo",region: "otjozondjupa" },
  { value: "okahandja",  label: "Okahandja",  region: "otjozondjupa" },
  { value: "grootfontein",label:"Grootfontein",region: "otjozondjupa" },
  { value: "otavi",      label: "Otavi",      region: "otjozondjupa" },
  { value: "okakarara",  label: "Okakarara",  region: "otjozondjupa" },
  { value: "otjozondjupa_other", label: "Other (Otjozondjupa)", region: "otjozondjupa" },
  // Omusati
  { value: "outapi",     label: "Outapi",     region: "omusati" },
  { value: "oshikuku",   label: "Oshikuku",   region: "omusati" },
  { value: "okahao",     label: "Okahao",     region: "omusati" },
  { value: "ruacana",    label: "Ruacana",    region: "omusati" },
  { value: "omusati_other", label: "Other (Omusati)", region: "omusati" },
  // Ohangwena
  { value: "eenhana",    label: "Eenhana",    region: "ohangwena" },
  { value: "helao_nafidi",label:"Helao Nafidi (Oshikango)",region: "ohangwena" },
  { value: "ohangwena_other", label: "Other (Ohangwena)", region: "ohangwena" },
  // Kavango East
  { value: "rundu",      label: "Rundu",      region: "kavango_east" },
  { value: "divundu",    label: "Divundu",    region: "kavango_east" },
  { value: "kavango_east_other", label: "Other (Kavango East)", region: "kavango_east" },
  // Kavango West
  { value: "nkurenkuru", label: "Nkurenkuru", region: "kavango_west" },
  { value: "kavango_west_other", label: "Other (Kavango West)", region: "kavango_west" },
  // Hardap
  { value: "mariental",  label: "Mariental",  region: "hardap" },
  { value: "rehoboth",   label: "Rehoboth",   region: "hardap" },
  { value: "aranos",     label: "Aranos",     region: "hardap" },
  { value: "maltahohe",  label: "Maltahöhe",  region: "hardap" },
  { value: "hardap_other", label: "Other (Hardap)", region: "hardap" },
  // ǁKaras
  { value: "keetmanshoop",label:"Keetmanshoop",region: "karas" },
  { value: "luderitz",   label: "Lüderitz",   region: "karas" },
  { value: "oranjemund", label: "Oranjemund", region: "karas" },
  { value: "karasburg",  label: "Karasburg",  region: "karas" },
  { value: "rosh_pinah", label: "Rosh Pinah", region: "karas" },
  { value: "karas_other", label: "Other (ǁKaras)", region: "karas" },
  // Kunene
  { value: "opuwo",      label: "Opuwo",      region: "kunene" },
  { value: "khorixas",   label: "Khorixas",   region: "kunene" },
  { value: "outjo",      label: "Outjo",      region: "kunene" },
  { value: "kamanjab",   label: "Kamanjab",   region: "kunene" },
  { value: "kunene_other", label: "Other (Kunene)", region: "kunene" },
  // Omaheke
  { value: "gobabis",    label: "Gobabis",    region: "omaheke" },
  { value: "omaheke_other", label: "Other (Omaheke)", region: "omaheke" },
  // Zambezi
  { value: "katima_mulilo",label:"Katima Mulilo",region: "zambezi" },
  { value: "bukalo",     label: "Bukalo",     region: "zambezi" },
  { value: "zambezi_other", label: "Other (Zambezi)", region: "zambezi" },
] as const;

// Fast lookups for display / validation
export const REGION_LABELS: Record<string,string> =
  Object.fromEntries(NAMIBIA_REGIONS.map(r => [r.value, r.label]));
export const TOWN_LABELS: Record<string,string> =
  Object.fromEntries(TOWNS_NAMIBIA.map(t => [t.value, t.label]));
export const TOWN_REGION: Record<string,string> =
  Object.fromEntries(TOWNS_NAMIBIA.map(t => [t.value, t.region]));
```

Region order = rough commercial density (Khomas/Erongo/northern towns first) so common picks are near the top.

## 3. Validation (`src/lib/validations.ts`)

Extend `storeSetupSchema` (and the settings schema if separate):

- `region`: must be a value in `NAMIBIA_REGIONS`.
- `town`: must be a value in `TOWNS_NAMIBIA` **whose `region` matches the chosen region** (guards a stale town after a region change).
- Both **required** in the setup schema. Message: "Please choose your region" / "Please choose your town."

## 4. Types (`src/types/database.ts`)

Add `region: string | null` and `town: string | null` to the `merchants` Row/Insert/Update types.

## 5. Setup wizard — Step 1 (`dashboard/setup/page.tsx`)

- Add `region: ""` and `town: ""` to `INITIAL_FORM` (so drafts persist them via the existing localStorage draft logic).
- Under the Industry select, add two selects:
  - **Region** (`NAMIBIA_REGIONS`).
  - **Town** — options = `TOWNS_NAMIBIA.filter(t => t.region === form.region)`, **disabled until a region is chosen**. Changing region resets `town` to "".
- Include both in the Step-1 "Next" guard and in the `merchants.insert({...})` payload (`region: form.region, town: form.town`).
- Draft restore already spreads `form`, so no extra work there.

## 6. Settings (`dashboard/settings/**`)

Add the same Region + Town pair to the store-info section so existing and new merchants can edit it. Save through the existing settings update path.

## 7. Browse page (`src/app/stores/page.tsx`)

- Add `region, town` to the merchants `.select(...)`.
- Add a `region` search param. When present, filter in the query: `.eq("region", region)` (cleaner than the post-fetch category filter, since region is a stored slug).
- Render a **Region filter** row above/below the category pills: "All regions" + the 14 `NAMIBIA_REGIONS` (pills, matching the existing category-pill style; combinable with `q` and `category`).
- On each **store card**, add a location line: `📍 {TOWN_LABELS[town]}` (omit entirely when `town` is null). Sits next to / under the existing `industry · N products` line.

## 8. Storefront header (`src/app/s/[slug]/page.tsx` / store cover)

Show `📍 {TOWN_LABELS[town]}, {REGION_LABELS[region]}` in the store header when set (omit when null).

## 9. Existing-store nudge

For a logged-in merchant whose `region`/`town` is null, show a dismissible dashboard banner: "Add your town so customers know where you sell from → Settings." (Reuse the existing dashboard notice/banner pattern; link to Settings.) Non-blocking.

## Edge cases

- **Null location (old stores):** cards/headers simply omit the pin; excluded from region-filtered results (documented behaviour, resolved once they add it).
- **Region changed after town chosen:** town resets to "" on region change; validation also rejects a town whose region ≠ selected region.
- **"Other (region)" town:** valid, stored like any town; card shows e.g. "Other (Kunene)". Region filter still works because region is stored.
- **No free text:** both fields are controlled dropdowns, so no prohibited-content scan needed (unlike store name/description).
- **Label edits:** because we store slugs, relabelling a town/region later needs no data change.

## Out of scope (future)

Map picker, GPS auto-detect, "stores near me" distance sorting, town-level filtering, multi-branch locations.

## Verification

- Migration applies; `region`/`town` present and nullable; index created.
- New store: Region required → Town required → town list matches region; saved values visible on card + storefront + Browse region filter.
- Existing store: still loads; nudge appears; adding location in Settings reflects everywhere.
- Region filter + search + category filter combine correctly in URL params.
- `npm run build` + typecheck clean.
