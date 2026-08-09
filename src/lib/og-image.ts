import sharp from "sharp";

/**
 * Fetch a remote image and return it as a PNG data URI sized for a card.
 *
 * Exists because satori (next/og) cannot decode WebP — and the upload
 * pipeline converts every merchant logo and product photo to WebP, so
 * passing their URLs straight to <img> rendered empty tiles. Everything is
 * normalised through sharp to PNG, which satori always understands.
 *
 * Returns null on any failure; callers fall back to a letter tile, which
 * beats a broken or blank card.
 */
export async function fetchAsPngDataUri(
  url: string,
  maxDim: number
): Promise<string | null> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(4000) });
    if (!res.ok) return null;

    const source = Buffer.from(await res.arrayBuffer());
    // Guard against absurd inputs; a 25MB "logo" has no business on a card.
    if (source.length > 25_000_000) return null;

    const png = await sharp(source)
      .resize(maxDim, maxDim, { fit: "inside", withoutEnlargement: true })
      .png()
      .toBuffer();

    return `data:image/png;base64,${png.toString("base64")}`;
  } catch {
    return null;
  }
}

/**
 * Same, but cropped to cover an exact width x height — for photo heroes.
 */
export async function fetchAsCoverPngDataUri(
  url: string,
  width: number,
  height: number
): Promise<string | null> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(4000) });
    if (!res.ok) return null;

    const source = Buffer.from(await res.arrayBuffer());
    if (source.length > 25_000_000) return null;

    const png = await sharp(source)
      .resize(width, height, { fit: "cover", position: "attention" })
      .png()
      .toBuffer();

    return `data:image/png;base64,${png.toString("base64")}`;
  } catch {
    return null;
  }
}
