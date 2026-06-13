# Product Upload Reliability & Performance — Implementation Plan (Spec A)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Make product image uploads fast and reliable — real client-side compression, parallel + non-fatal uploads, progress feedback — and make the edit-path variant save atomic via a single batched upsert.

**Architecture:** Two shared client utils (`compress-image`, `upload-product-images`) used by both the product create and edit pages, replacing their divergent sequential upload loops. The edit-path variant save is replaced by one `upsert` (+ the existing single bulk delete). No DB migration.

**Tech Stack:** Next.js 16 client components, Supabase JS (browser client + storage), `browser-image-compression`, Tailwind.

**Spec:** `docs/superpowers/specs/2026-06-13-product-upload-reliability-design.md`
**Repo root:** `chatcart-na/`

## Background facts
- Constants: `src/lib/constants.ts` — `MAX_IMAGE_SIZE = 20*1024*1024`, `TARGET_IMAGE_SIZE = 300*1024`, `MAX_IMAGE_WIDTH = 1200` (last two currently unused).
- **Create page** `src/app/(dashboard)/dashboard/products/new/page.tsx`: `imageFiles` state; submit handler uploads sequentially (loop ~220-243, `supabase.storage.from("merchant-assets").upload`, throws on error at ~234) then inserts product (~255) then **batch-inserts variants** in one call (~279-299 — the good model). `userId`, `merchantId`, memoized `supabase` in scope; on success `router.push("/dashboard/products")`.
- **Edit page** `src/app/(dashboard)/dashboard/products/[id]/edit/page.tsx`: `newImageFiles`/`existingImages` state; submit uploads sequentially via `POST /api/upload` (loop ~264-282, throws at ~277); updates product (~295-317); deletes removed variants in **one** call (~325-335); then **loops N sequential update/insert per variant** (~337-373). `productId`, `product!.merchant_id`, `loadedVariantIds`, memoized `supabase` in scope.
- `/api/upload/route.ts` caps 5 MB (only the edit page uses it for product images; leave the route for other callers).
- Both pages render selected-image thumbnails (a `.map` over `imageFiles`/previews) — read the file to find it.

---

### Task 1: Dependency + shared compress & upload utils
**Files:** `package.json` (dep); Create `src/lib/compress-image.ts`, `src/lib/upload-product-images.ts`.

- [ ] **Step 1: Install the library**

Run: `npm install browser-image-compression`
Expected: added to dependencies; `package-lock.json` updated.

- [ ] **Step 2: `src/lib/compress-image.ts`**
```ts
import imageCompression from "browser-image-compression";
import { TARGET_IMAGE_SIZE, MAX_IMAGE_WIDTH } from "@/lib/constants";

/**
 * Compress/resize an image File in the browser (web worker) before upload.
 * Targets TARGET_IMAGE_SIZE and MAX_IMAGE_WIDTH; outputs JPEG. Throws on failure
 * (caller treats a throw as a single failed image).
 */
export async function compressImage(file: File): Promise<File> {
  return imageCompression(file, {
    maxSizeMB: TARGET_IMAGE_SIZE / (1024 * 1024),
    maxWidthOrHeight: MAX_IMAGE_WIDTH,
    useWebWorker: true,
    fileType: "image/jpeg",
  });
}
```

- [ ] **Step 3: `src/lib/upload-product-images.ts`**
```ts
import type { SupabaseClient } from "@supabase/supabase-js";
import { compressImage } from "@/lib/compress-image";

export type ImageUploadStatus = "uploading" | "done" | "failed";

export interface UploadProductImagesResult {
  urls: string[];
  failed: number;
}

/**
 * Compress + upload product images in PARALLEL, directly to Supabase storage.
 * Non-fatal: a file that fails to compress/upload is omitted (counted in
 * `failed`) instead of throwing. Successful URLs keep input order.
 * onStatus(index, status) lets the caller drive per-thumbnail progress UI.
 */
export async function uploadProductImages(
  files: File[],
  userId: string,
  supabase: SupabaseClient,
  onStatus?: (index: number, status: ImageUploadStatus) => void,
): Promise<UploadProductImagesResult> {
  const results = await Promise.all(
    files.map(async (file, index) => {
      onStatus?.(index, "uploading");
      try {
        const compressed = await compressImage(file);
        const filePath = `${userId}/${Date.now()}-${Math.random()
          .toString(36)
          .slice(2, 8)}-${index}.jpg`;
        const { data, error } = await supabase.storage
          .from("merchant-assets")
          .upload(filePath, compressed, { cacheControl: "31536000", upsert: false });
        if (error || !data) throw error ?? new Error("upload failed");
        const { data: urlData } = supabase.storage
          .from("merchant-assets")
          .getPublicUrl(data.path);
        onStatus?.(index, "done");
        return urlData.publicUrl;
      } catch {
        onStatus?.(index, "failed");
        return null;
      }
    }),
  );
  const urls = results.filter((u): u is string => u !== null);
  return { urls, failed: results.length - urls.length };
}
```

- [ ] **Step 4: Typecheck + commit**

Run: `npx tsc --noEmit` (expect clean).
```bash
git add package.json package-lock.json src/lib/compress-image.ts src/lib/upload-product-images.ts
git commit -m "Add image compression + parallel non-fatal product-image upload util"
```

---

### Task 2: Create page — use the helper, non-fatal, progress
**Files:** Modify `src/app/(dashboard)/dashboard/products/new/page.tsx`.

- [ ] **Step 1: state + import.** Add import `import { uploadProductImages, type ImageUploadStatus } from "@/lib/upload-product-images";`. Add state near the other `useState`s:
```tsx
  const [imageStatus, setImageStatus] = useState<Record<number, ImageUploadStatus>>({});
  const [uploadingImages, setUploadingImages] = useState(false);
```

- [ ] **Step 2: replace the sequential upload loop** (~220-243). Replace the whole `const imageUrls: string[] = []; for (const file of imageFiles) { ... }` block with:
```tsx
      // Compress + upload images in parallel (non-fatal: a failed image is skipped)
      setUploadingImages(true);
      setImageStatus({});
      const { urls: imageUrls, failed: failedImages } = await uploadProductImages(
        imageFiles,
        userId,
        supabase,
        (i, s) => setImageStatus((prev) => ({ ...prev, [i]: s })),
      );
      setUploadingImages(false);
```
(`imageUrls` is still used by the product insert at ~268 — unchanged. The throw-on-failure is gone.)

- [ ] **Step 3: non-fatal redirect.** Change the success navigation (~302) from `router.push("/dashboard/products")` to:
```tsx
      router.push(failedImages > 0 ? "/dashboard/products?img_notice=1" : "/dashboard/products");
      router.refresh();
```

- [ ] **Step 4: progress on the submit button.** Find the submit button label (the `{loading ? "Saving..." : "Add Product"}` around line ~717). Replace with a phase-aware label:
```tsx
                {uploadingImages ? "Optimising & uploading photos…" : loading ? "Saving…" : "Add Product"}
```

- [ ] **Step 5: per-thumbnail status (progress).** Find the selected-image thumbnail `.map` (the preview grid over `imageFiles`/object URLs). On each thumbnail wrapper, overlay a status badge driven by `imageStatus[index]`:
```tsx
                {imageStatus[index] === "uploading" && (
                  <span className="absolute inset-0 flex items-center justify-center bg-black/40 text-white text-xs rounded-lg">Uploading…</span>
                )}
                {imageStatus[index] === "failed" && (
                  <span className="absolute inset-0 flex items-center justify-center bg-red-600/70 text-white text-xs rounded-lg">Failed</span>
                )}
```
(Ensure the thumbnail wrapper is `relative`. Read the existing map to integrate; keep existing remove-button etc.)

- [ ] **Step 6: typecheck, lint, commit.**

Run: `npx tsc --noEmit` and `npx eslint "src/app/(dashboard)/dashboard/products/new/page.tsx"`.
```bash
git add "src/app/(dashboard)/dashboard/products/new/page.tsx"
git commit -m "Create product: parallel non-fatal image upload + progress"
```

---

### Task 3: Edit page — helper + non-fatal + batched variant upsert
**Files:** Modify `src/app/(dashboard)/dashboard/products/[id]/edit/page.tsx`.

- [ ] **Step 1: state + import.** Add `import { uploadProductImages, type ImageUploadStatus } from "@/lib/upload-product-images";`. Add state:
```tsx
  const [imageStatus, setImageStatus] = useState<Record<number, ImageUploadStatus>>({});
  const [uploadingImages, setUploadingImages] = useState(false);
  const [warning, setWarning] = useState("");
```

- [ ] **Step 2: replace the `/api/upload` loop** (~263-282). Replace the `const newImageUrls: string[] = []; for (const file of newImageFiles) { ...fetch("/api/upload")... }` block with:
```tsx
      // Compress + upload new images in parallel (non-fatal)
      setUploadingImages(true);
      setImageStatus({});
      const { urls: newImageUrls, failed: failedImages } = await uploadProductImages(
        newImageFiles,
        user.id,
        supabase,
        (i, s) => setImageStatus((prev) => ({ ...prev, [i]: s })),
      );
      setUploadingImages(false);
```
(`newImageUrls` still feeds `const allImages = [...existingImages, ...newImageUrls];` at ~284.)

- [ ] **Step 3: batch the variant save.** Replace the per-variant `for` loop (~337-373, the `if (variant.id) update else insert` block) with a single upsert. Keep the removed-variant delete (~325-335) as-is. New block in place of the loop:
```tsx
      const variantPayloads = variantsToSave.map((variant, index) => ({
        ...(variant.id ? { id: variant.id } : {}),
        product_id: productId,
        source: variant.source || "manual",
        source_variation_id:
          variant.sourceVariationId || (variant.id ? variant.id : `manual-${Date.now()}-${index + 1}`),
        sku: variant.sku.trim() || `${validation.data.name.slice(0, 16).replace(/[^a-z0-9]+/gi, "-")}-${index + 1}`,
        price_nad: variant.priceDisplay ? toCents(parseFloat(variant.priceDisplay) || 0) : validation.data.price_nad,
        images: variant.imageUrl.trim() ? [variant.imageUrl.trim()] : [],
        attributes: parseVariantOptions(variant.optionText),
        is_available: variant.isAvailable,
        track_inventory: hasInventory ? variant.trackInventory : false,
        stock_quantity: hasInventory && variant.trackInventory ? variant.stockQuantity : 0,
        allow_backorder: hasInventory ? variant.allowBackorder : false,
        stock_status: variant.isAvailable ? "instock" : "outofstock",
        sort_order: index,
      }));
      if (variantPayloads.length > 0) {
        const { error: variantSaveError } = await supabase
          .from("product_variants")
          .upsert(variantPayloads, { onConflict: "id" });
        if (variantSaveError) {
          throw new Error(`Save variations: ${variantSaveError.message}`);
        }
      }
```
(Existing rows include `id` → updated; new rows omit `id` → inserted with a generated id. One call replaces N.)

- [ ] **Step 4: non-fatal navigation.** Change the success navigation (~375) from always pushing to:
```tsx
      if (failedImages > 0) {
        setWarning(`Saved, but ${failedImages} photo${failedImages > 1 ? "s" : ""} couldn't upload. Add ${failedImages > 1 ? "them" : "it"} again below.`);
        setLoading(false);
        router.refresh();
        return;
      }
      router.push("/dashboard/products");
      router.refresh();
```

- [ ] **Step 5: progress + warning UI.** (a) Submit button label (~768 `{loading ? "Saving..." : "Save Changes"}`) → `{uploadingImages ? "Optimising & uploading photos…" : loading ? "Saving…" : "Save Changes"}`. (b) Per-thumbnail status overlay as in Task 2 Step 5, on the new-image preview map (driven by `imageStatus[index]`). (c) Render the warning banner near the top of the form when `warning` is set:
```tsx
              {warning && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">{warning}</div>
              )}
```

- [ ] **Step 6: typecheck, lint, commit.**

Run: `npx tsc --noEmit` and `npx eslint "src/app/(dashboard)/dashboard/products/[id]/edit/page.tsx"`.
```bash
git add "src/app/(dashboard)/dashboard/products/[id]/edit/page.tsx"
git commit -m "Edit product: parallel non-fatal upload + single batched variant upsert"
```

---

### Task 4: Products list — image-failure notice banner
**Files:** Modify `src/app/(dashboard)/dashboard/products/page.tsx`.

- [ ] **Step 1.** Read the file. It is a server component receiving `searchParams` (or add `searchParams` to its props per Next 16: `searchParams: Promise<{ img_notice?: string }>`, awaited). When `img_notice` is truthy, render a dismissible amber banner above the product list:
```tsx
      {imgNotice && (
        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          Your product was saved, but one or more photos didn&apos;t upload. Open the product to add them.
        </div>
      )}
```
Derive `imgNotice` from the awaited searchParams. (If the page already reads searchParams for filters, follow that pattern; a non-dismissible inline banner is acceptable — keep it minimal.)

- [ ] **Step 2: typecheck, lint, commit.**

Run: `npx tsc --noEmit` and `npx eslint "src/app/(dashboard)/dashboard/products/page.tsx"`.
```bash
git add "src/app/(dashboard)/dashboard/products/page.tsx"
git commit -m "Products list: notice when a product saved with a failed image"
```

---

### Task 5: Build + QA
- [ ] **Step 1: build.** `npm run build` — clean, 0 type errors.
- [ ] **Step 2: QA (orchestrator, logged-in QA merchant, temp active).**
  - Add a product with one large (>2 MB) photo. After save, query the new product's `images[0]` object in storage (or check via the storefront) — confirm it's small (≈≤300 KB) and ≤1200 px. Confirm the product saved.
  - Add a product with 3 photos — confirm thumbnails show "Uploading…" and the save completes (parallel; not 3× slow).
  - Edit a product's variants: add one, edit one, remove one, Save → query `product_variants` for that product and confirm rows match exactly (no duplicate, removed one gone, edited one updated).
  - Non-fatal: select a deliberately-bad image (e.g. a renamed .txt as .jpg, or block the bucket) → confirm the product still saves with the good images and the warning/notice shows.
  - Reset QA product/merchant state afterward; delete temp specs/screenshots.
- [ ] **Step 3:** Update `.remember/remember.md`; whether pushed.

## Self-review notes
- Spec coverage: compression util (T1), parallel non-fatal upload helper used by both pages (T1-T3), progress feedback (T2/T3 button + thumbnail status), non-fatal handling (T2 redirect-with-notice + T4 banner; T3 stay-with-warning), batched edit-variant upsert (T3), limits aligned (edit no longer uses the 5 MB `/api/upload`; create already direct). No migration.
- Backward-compat: `/api/upload` untouched for other callers; create-path variant insert unchanged; product/variant schemas unchanged; upsert conflict target = existing PK `id`.
- No placeholders; full util + upsert code given. Thumbnail-overlay JSX is example markup to integrate into the existing preview map (the only read-and-adapt step).
