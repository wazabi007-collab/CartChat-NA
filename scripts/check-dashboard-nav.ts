/**
 * Every dashboard page must be reachable from the navigation.
 *
 * The sidebar is hidden below 768px, so a page added to it and forgotten in the
 * mobile menu becomes unreachable on a phone. That happened to five sections at
 * once — Share store, Customers, Broadcast, Reviews and Statements — including
 * the page the merchant welcome message tells people to open.
 *
 * Sharing one definition stops the two surfaces disagreeing. This goes further
 * and fails when a route exists on disk with no entry at all, which is the
 * mistake that started it.
 *
 *   npx tsx scripts/check-dashboard-nav.ts
 */
import { readdirSync, existsSync, statSync } from "node:fs";
import { join } from "node:path";
import {
  DASHBOARD_NAV,
  sidebarItems,
  primaryItems,
  overflowItems,
} from "../src/lib/dashboard-nav";

const DASHBOARD_DIR = "src/app/(dashboard)/dashboard";

/** Routes that intentionally have no nav entry, with the reason. */
const NOT_IN_NAV: Record<string, string> = {
  setup: "one-time wizard, redirected to until the store exists",
};

let failures = 0;

function fail(message: string) {
  failures++;
  console.log(`FAIL ${message}`);
}

function ok(message: string) {
  console.log(`ok   ${message}`);
}

// --- Every route on disk has a nav entry --------------------------------

const routes = readdirSync(DASHBOARD_DIR).filter((entry) => {
  const full = join(DASHBOARD_DIR, entry);
  return (
    statSync(full).isDirectory() &&
    existsSync(join(full, "page.tsx")) &&
    !entry.startsWith("[") // dynamic detail pages are reached from their list
  );
});

const navHrefs = new Set(DASHBOARD_NAV.map((item) => item.href));

for (const route of routes) {
  if (NOT_IN_NAV[route]) {
    ok(`/${route} skipped — ${NOT_IN_NAV[route]}`);
    continue;
  }
  const href = `/dashboard/${route}`;
  if (navHrefs.has(href)) {
    ok(`${href} is in the navigation`);
  } else {
    fail(`${href} exists but has no navigation entry — unreachable on mobile`);
  }
}

// The dashboard index itself.
if (navHrefs.has("/dashboard")) ok("/dashboard is in the navigation");
else fail("/dashboard has no navigation entry");

// --- Both surfaces cover the same sections ------------------------------

const sidebar = sidebarItems().map((i) => i.href).sort();
const mobile = [...primaryItems(), ...overflowItems()].map((i) => i.href).sort();

if (JSON.stringify(sidebar) === JSON.stringify(mobile)) {
  ok(`sidebar and mobile cover the same ${sidebar.length} sections`);
} else {
  const missing = sidebar.filter((h) => !mobile.includes(h));
  fail(`mobile is missing: ${missing.join(", ") || "(ordering differs)"}`);
}

// --- The bar stays tappable ---------------------------------------------

const primaryCount = primaryItems().length;
if (primaryCount <= 4) {
  ok(`${primaryCount} primary items, plus More — fits at 375px`);
} else {
  fail(`${primaryCount} primary items; more than 4 makes the bar cramped at 375px`);
}

// Nothing may be both in the bar and the overflow sheet.
const duplicated = primaryItems()
  .map((i) => i.href)
  .filter((href) => overflowItems().some((o) => o.href === href));
if (duplicated.length === 0) ok("no section appears twice on mobile");
else fail(`listed twice on mobile: ${duplicated.join(", ")}`);

console.log(failures === 0 ? "\nALL PASS" : `\n${failures} FAILURE(S)`);
process.exit(failures === 0 ? 0 : 1);
