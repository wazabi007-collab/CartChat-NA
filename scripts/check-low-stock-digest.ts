/**
 * Low-stock alerts cannot storm a merchant again.
 *
 * On 26 May 2026 one merchant received 85 low_stock_alert messages in 66
 * seconds, until Meta rate-limited the business/consumer pair (error 131056)
 * and stopped delivering to them entirely. Two independent causes:
 *
 *   1. The dedup key was `low_stock_alert:<product>:<quantity>`, so every sale
 *      that moved the count minted a fresh event -- and this cron runs every
 *      15 minutes, 96 times a day.
 *   2. The loop sent one message per low product, back to back, so a store with
 *      twenty low products got twenty messages in a row.
 *
 * Keying per store fixed the storm but made it one alert EVER, so a merchant
 * who ran low once would never be warned again. The key is now per store per
 * Namibian MONTH: loud enough to stay useful, quiet enough that it can never
 * storm. sendWhatsAppEvent enforces the same window by TIME rather than by
 * key, so a legacy product/day-keyed alert still suppresses a duplicate in the
 * month it was sent.
 *
 * Three properties are load-bearing: no quantity in the key stops (1),
 * grouping by merchant stops (2), and a MONTH -- never a day -- is what makes
 * the reset safe. This guards all three, plus the variable count, because the
 * digest has to keep fitting the already-approved Meta template.
 *
 *   npx tsx scripts/check-low-stock-digest.ts
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

const CRON = "src/app/api/cron/payment-reminders/route.ts";
const body = readFileSync(join(process.cwd(), CRON), "utf8");

let failures = 0;
const fail = (m: string) => {
  console.error(`  FAIL  ${m}`);
  failures++;
};
const pass = (m: string) => console.log(`  ok    ${m}`);

// ── 1. The quantity must not be part of the dedup key ───────────────────
const keyMatch = body.match(/eventKey:\s*`low_stock_alert:([^`]*)`/);
if (!keyMatch) {
  fail(`${CRON}: could not find the low_stock_alert event key — has it moved?`);
} else {
  const key = keyMatch[1];
  if (/qty|quantity|stock_quantity/.test(key)) {
    fail(
      `${CRON}: the low-stock key still contains the quantity (${key}).\n` +
        `        Every sale then mints a new event and the cron re-sends, 96x a day.`
    );
  } else if (!/merchant/i.test(key)) {
    fail(`${CRON}: the low-stock key (${key}) is not per-merchant, so products cannot be grouped.`);
  } else if (/today|namibianDateString|day/i.test(key)) {
    fail(
      `${CRON}: the low-stock key (${key}) resets daily.
` +
        `        A store low on stock for a week would get seven messages.`
    );
  } else if (!/month/i.test(key)) {
    fail(
      `${CRON}: the low-stock key (${key}) has no month component, so it never
` +
        `        resets — a store warned once would never be warned again.`
    );
  } else {
    pass(`low-stock dedup key is per merchant per month (${key})`);
  }
}

// ── 2. Products must be grouped, not sent one message at a time ─────────
if (!/byMerchant/.test(body)) {
  fail(
    `${CRON}: low-stock products are no longer grouped per merchant.\n` +
      `        One message per product is what produced the 85-message burst.`
  );
} else {
  pass("low-stock products are grouped into one digest per merchant");
}

// ── 3. The digest must still fit the approved 3-variable template ───────
const at = body.indexOf("templateName: \"low_stock_alert\"");
const varsMatch = at >= 0 ? body.slice(at, at + 900).match(/variables:\s*\[([\s\S]*?)\n\s*\],/) : null;
if (!varsMatch) {
  fail(`${CRON}: could not read the low-stock variables array.`);
} else {
  const count = varsMatch[1].split("\n").filter((l) => l.trim().length > 0).length;
  if (count !== 3) {
    fail(
      `${CRON}: low_stock_alert now sends ${count} variables, but the approved Meta\n` +
        `        template takes 3. A mismatch fails at send with error #132000.`
    );
  } else {
    pass("low-stock digest still sends exactly 3 template variables");
  }
}

console.log(
  failures === 0
    ? "\nPASS  Low-stock alerts are one-time per merchant."
    : `\nFAIL  ${failures} problem(s).`
);
process.exit(failures === 0 ? 0 : 1);
