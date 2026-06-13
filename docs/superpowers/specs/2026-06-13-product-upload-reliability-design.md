# Product Upload Reliability & Performance — Design (Spec A)

**Date:** 2026-06-13
**Scope:** chatcart-na. Fix the merchant product add/edit upload flow: real image
compression, parallel uploads, progress feedback, non-fatal image failures, and
a batched/atomic edit-path variant save. **No DB migration.**

## Problem (from audit)
- The form says "Images will be compressed automatically" but **no compression
  happens** — full-size 3–12 MB phone photos upload raw. Main lag source.
- Images upload **sequentially** (await-in-loop) — 3× slower than needed.
- **No progress feedback** beyond a "Saving…" button → looks frozen.
- **One failed image aborts the whole save** (`new/page.tsx:234` throws),
  orphaning already-uploaded files and losing the merchant's typed data.
- **Edit-path variant save** does N sequential writes with no transaction
  (`edit/page.tsx:337-373`) → partial-save corruption. The **create path already
  batches** in one insert (`new/page.tsx:295`) — the model to copy.
- **Inconsistent limits:** `/api/upload/route.ts:25` caps 5 MB while the client
  allows 20 MB → "works when adding, fails when editing" (the edit page uses
  `/api/upload`; the create page uploads directly via the Supabase client).

## Decisions (with user)
- **Compression:** the `browser-image-compression` npm library (web-worker, EXIF
  orientation, max-size + max-width). 
- **Failed-image policy:** non-fatal — save the product with the images that
  uploaded; warn the merchant which one(s) failed.

## Design

### 1. Shared image-compression util — `src/lib/compress-image.ts`
```
compressImage(file: File): Promise<File>
```
Wraps `imageCompression` with options derived from the existing constants:
`maxSizeMB: 0.3` (TARGET_IMAGE_SIZE = 300 KB), `maxWidthOrHeight: 1200`
(MAX_IMAGE_WIDTH), `useWebWorker: true`, `fileType: "image/jpeg"`. On failure it
rejects (caller treats as a failed image). This finally wires in
`TARGET_IMAGE_SIZE` / `MAX_IMAGE_WIDTH` (currently dead constants).

### 2. Shared upload util — `src/lib/upload-product-images.ts`
```
uploadProductImages(files: File[], merchantId: string, supabase): Promise<{ urls: string[]; failed: number }>
```
- For each file, in **parallel** (`Promise.all`): `compressImage(file)` →
  `supabase.storage.from("merchant-assets").upload(path, compressed)` → public URL.
- Per-file **try/catch**: a failure increments `failed` and is omitted from
  `urls` (non-fatal). Order of successful `urls` preserved.
- **Both** the create and edit pages use this one helper (unifies the two
  divergent paths and removes the `/api/upload` 5 MB cap from the product flow;
  `/api/upload` stays for other callers like proof-of-payment, unchanged).
- Pre-compression guard: reject only truly huge inputs (keep `MAX_IMAGE_SIZE`
  20 MB as the *input* ceiling; compression shrinks to ~300 KB after).

### 3. Wire into create + edit pages
- `(dashboard)/dashboard/products/new/page.tsx`: replace the sequential upload
  loop (~221-243) with `uploadProductImages(...)`; if `failed > 0`, proceed with
  the successful URLs and surface a non-blocking warning ("1 image couldn't
  upload — saved without it"). Remove the throw-on-upload-failure.
- `(dashboard)/dashboard/products/[id]/edit/page.tsx`: same replacement for its
  `/api/upload` loop (~265-282); same non-fatal handling.

### 4. Progress feedback
While compressing+uploading, show a distinct status (not just "Saving…"):
- A status line / button label phase: "Optimising & uploading images…" → then
  "Saving…". 
- Each selected thumbnail shows an **uploading spinner**, then a **check** (done)
  or a small **error badge** (failed, non-fatal). Implemented with a per-file
  status map in page state. (No per-byte percentage — the storage client doesn't
  expose it; status-per-image is enough to stop the "frozen" feel.)

### 5. Batch the edit-path variant save (atomic-ish)
Replace the N-sequential writes (`edit/page.tsx:337-373`) with at most two
calls:
- Delete removed variants in one call: `.delete().in("id", removedIds)`.
- `upsert` all current variants in one call (insert new rows + update existing by
  `id`). Conflict target = `product_variants.id` (PK).
This mirrors the create path's single-batch intent and removes the partial-save
window. No migration (uses existing PK upsert).

### 6. Honesty + HEIC
- The "compressed automatically" copy is now TRUE — keep it.
- HEIC: iOS typically converts HEIC→JPEG on web file-select, so most never reach
  us. If a true HEIC arrives, `browser-image-compression` may fail that file →
  the non-fatal policy warns and saves the rest. (No bespoke HEIC decoder — out
  of scope.)

## Non-goals
- No change to proof-of-payment uploads / `/api/upload` (other callers).
- No new DB table/column/migration.
- No move to background/on-select upload (kept on-submit; only adds status).
- The admin WooCommerce/SMD `sharp` sync route (separate, has its own timeout
  risk) is out of scope.

## Verification
- `npm install browser-image-compression`; `npx tsc --noEmit` + `npm run build`
  clean.
- QA (logged-in QA merchant, temp active): add a product with a large (>2 MB)
  photo → confirm the stored object is small (~≤300 KB) and ≤1200 px, product
  saves; add 3 images → they upload in parallel; thumbnails show progress.
- Edit a product's variants (add one, edit one, remove one) → confirm the DB
  `product_variants` rows match exactly (no duplicates, no stragglers).
- Simulate one image failing (e.g. oversized/blocked) → product still saves with
  the others + a warning shown. Reset QA product state after.
