/**
 * orders.proof_of_payment_url historically held either a storage path
 * ("merchantId/file.ext") or a full 7-day signed URL. Normalize both to the
 * storage path so callers can mint fresh signed URLs.
 */
export function resolveProofPath(value: string | null): string | null {
  if (!value) return null;
  if (!value.startsWith("http")) return value;
  const match = value.match(/\/object\/sign\/order-proofs\/([^?]+)/);
  if (!match) return null;
  try {
    return decodeURIComponent(match[1]);
  } catch {
    return null;
  }
}

export function isPdfProof(path: string): boolean {
  return path.toLowerCase().endsWith(".pdf");
}
