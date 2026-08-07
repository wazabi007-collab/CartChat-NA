/**
 * Helpers for the install prompt.
 *
 * Kept free of `window` and `navigator` so the device rules can actually be
 * tested — see scripts/check-pwa-helpers.ts. The components read the browser
 * and pass the values in.
 */

export interface DeviceHints {
  /** navigator.userAgentData?.mobile — Chromium only, undefined elsewhere. */
  uaDataMobile?: boolean;
  /** matchMedia("(pointer: coarse)").matches */
  coarsePointer: boolean;
  /** navigator.maxTouchPoints */
  maxTouchPoints: number;
}

/**
 * True for phones and tablets, false for PCs.
 *
 * User-Agent Client Hints is authoritative where it exists, which is exactly
 * Chromium — the only place the install event fires. It is checked first
 * because a Windows touchscreen laptop otherwise looks identical to a tablet
 * (coarse pointer, many touch points) and would wrongly be prompted.
 *
 * iOS and iPadOS Safari expose no userAgentData, so they fall through to the
 * pointer + touch test. iPad counts as mobile: an installed storefront is a
 * perfectly good tablet experience.
 */
export function isMobileDevice(hints: DeviceHints): boolean {
  if (typeof hints.uaDataMobile === "boolean") return hints.uaDataMobile;
  return hints.coarsePointer && hints.maxTouchPoints > 0;
}

/** localStorage key recording that the visitor dismissed the bar for one store. */
export function installDismissKey(scope: string): string {
  return `oshicart:install-dismissed:${scope}`;
}

/** Home screens show about 12 characters before they truncate. */
const SHORT_NAME_LIMIT = 12;

/**
 * The label that sits under the icon on a home screen.
 *
 * Cutting at exactly 12 characters leaves things like "Octovia Nexu", which
 * reads as broken rather than abbreviated. Falling back to the last whole word
 * gives "Octovia". A single word longer than the limit is still cut, since
 * there is no better break available.
 */
export function storeShortName(storeName: string): string {
  const name = storeName.trim();
  if (name.length <= SHORT_NAME_LIMIT) return name;

  const cut = name.slice(0, SHORT_NAME_LIMIT);
  const lastSpace = cut.lastIndexOf(" ");
  return (lastSpace > 0 ? cut.slice(0, lastSpace) : cut).trim();
}
