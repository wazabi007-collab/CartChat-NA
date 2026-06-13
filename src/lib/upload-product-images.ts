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
