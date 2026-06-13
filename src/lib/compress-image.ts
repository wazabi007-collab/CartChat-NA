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
