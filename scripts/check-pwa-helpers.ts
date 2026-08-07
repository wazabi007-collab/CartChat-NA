/**
 * Device-detection checks for the PWA install bar.
 *
 * The bar must never appear on a PC. Run after touching src/lib/pwa.ts:
 *   npx tsx scripts/check-pwa-helpers.ts
 */
import { isMobileDevice, installDismissKey, storeShortName } from "../src/lib/pwa";

let failures = 0;

function check(name: string, actual: unknown, expected: unknown) {
  if (actual === expected) {
    console.log(`ok   ${name}`);
    return;
  }
  failures++;
  console.log(`FAIL ${name}\n  got      ${actual}\n  expected ${expected}`);
}

// Chromium reports mobile directly via User-Agent Client Hints — trust it.
check("android chrome", isMobileDevice({ uaDataMobile: true, coarsePointer: true, maxTouchPoints: 5 }), true);
check("desktop chrome", isMobileDevice({ uaDataMobile: false, coarsePointer: false, maxTouchPoints: 0 }), false);

// A Windows touchscreen laptop has a coarse pointer AND touch points. UA-CH
// says desktop, and it must win — this is the case that would wrongly prompt.
check("touchscreen laptop", isMobileDevice({ uaDataMobile: false, coarsePointer: true, maxTouchPoints: 10 }), false);

// iOS/iPadOS Safari has no userAgentData at all — fall back to pointer + touch.
check("iphone safari", isMobileDevice({ coarsePointer: true, maxTouchPoints: 5 }), true);
check("ipad safari", isMobileDevice({ coarsePointer: true, maxTouchPoints: 5 }), true);
check("desktop safari", isMobileDevice({ coarsePointer: false, maxTouchPoints: 0 }), false);

// A desktop with no touch and no UA-CH must stay off, not fall through to true.
check("desktop firefox", isMobileDevice({ coarsePointer: false, maxTouchPoints: 0 }), false);

check(
  "dismiss key",
  installDismissKey("sunrise-crumbs-bakery"),
  "oshicart:install-dismissed:sunrise-crumbs-bakery"
);

// Home-screen labels must break on a word, not mid-syllable.
check("short name: real store", storeShortName("Octovia Nexus Home & Lifestyle"), "Octovia");
check("short name: two words", storeShortName("Sunrise Crumbs Bakery"), "Sunrise");
check("short name: fits already", storeShortName("Mother"), "Mother");
check("short name: exactly 12", storeShortName("Namvacz Sol"), "Namvacz Sol");
check("short name: initialism", storeShortName("W.J.V Computers"), "W.J.V");
check("short name: one long word", storeShortName("Supercalifragilistic"), "Supercalifra");
check("short name: trims spaces", storeShortName("  Apatchy Beard Company  "), "Apatchy");

console.log(failures === 0 ? "\nALL PASS" : `\n${failures} FAILURE(S)`);
process.exit(failures === 0 ? 0 : 1);
