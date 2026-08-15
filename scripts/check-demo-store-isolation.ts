/**
 * Practice stores must never message anyone, and must never look like shops.
 *
 * `is_demo` existed for months but only did two things: hide a store from the
 * homepage counter and show a badge in the admin console. It did not isolate
 * anything, which meant a practice store behaved exactly like a business:
 *
 *   - the reminder cron chased its "customers" — numbers an agent typed to
 *     see what would happen — with real "please pay" WhatsApps at 6h and 24h,
 *     then auto-cancelled the order and messaged them again
 *   - the engagement cron nudged agents to "add your first product" and sent
 *     win-back messages about a store nobody was trying to run
 *   - Browse Stores listed it, so shoppers could order from a shop that does
 *     not exist
 *
 * Every cron query that reaches a merchant, and the public store listing, must
 * therefore exclude demo stores. This check fails if one stops doing so.
 *
 *   npx tsx scripts/check-demo-store-isolation.ts
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

/** Files that must never act on a demo store, and how many exclusions each needs. */
const REQUIRED: { file: string; min: number; what: string }[] = [
  {
    file: "src/app/api/cron/payment-reminders/route.ts",
    min: 5,
    what: "reminders, stale-order alerts, low stock, auto-cancel, cart recovery",
  },
  {
    file: "src/app/api/cron/engagement/route.ts",
    min: 2,
    what: "activation nudges and win-back",
  },
  {
    file: "src/lib/storefront/store-list.ts",
    min: 1,
    what: "the public Browse Stores listing",
  },
];

let failures = 0;

for (const { file, min, what } of REQUIRED) {
  const body = readFileSync(join(process.cwd(), file), "utf8");

  // Either form is valid: a direct column filter on merchants, or a filter
  // through an embedded join.
  const direct = body.match(/\.eq\("is_demo",\s*false\)/g) ?? [];
  const joined = body.match(/\.eq\("merchants\.is_demo",\s*false\)/g) ?? [];
  const total = direct.length + joined.length;

  if (total < min) {
    failures++;
    console.log(
      `FAIL ${file}\n` +
      `  ${total} demo exclusion(s), expected at least ${min}.\n` +
      `  Covers: ${what}.\n` +
      `  A query here without one will message a practice store's invented\n` +
      `  customers, or list a store that is not a business.`
    );
  } else {
    console.log(`ok   ${file} — ${total} exclusion(s)`);
  }
}

// The purge is what keeps practice stores from filling up forever, and for
// hires it is also what releases dates the practice order was holding.
const reminders = readFileSync(
  join(process.cwd(), "src/app/api/cron/payment-reminders/route.ts"),
  "utf8"
);
if (!reminders.includes("practiceOrdersPurged")) {
  failures++;
  console.log(
    "FAIL src/app/api/cron/payment-reminders/route.ts\n" +
    "  no practice-order purge — practice orders accumulate forever and a\n" +
    "  practice hire holds its rental dates against availability indefinitely."
  );
} else {
  console.log("ok   practice-order purge present");
}

console.log(failures === 0 ? "\nALL PASS" : `\n${failures} FAILURE(S)`);
process.exit(failures === 0 ? 0 : 1);
