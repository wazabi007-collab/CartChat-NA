/**
 * A customer's phone number is stored in exactly one shape, everywhere.
 *
 * abandoned_checkouts has always normalised the number to E.164 on write.
 * The checkout stored it raw, exactly as the buyer typed it -- so 31 of 45
 * orders held "0853484423" or "818555667" while the matching cart row held
 * "+264853484423". The close-out in /api/orders/announce compares the two with
 * string equality:
 *
 *     .eq("customer_whatsapp", order.customer_whatsapp)
 *
 * so it never matched, no cart was ever marked recovered, and the reminder cron
 * kept chasing buyers who had already paid. Three real customers -- Nathan
 * twice, Vladimir once -- were told they had left items in their cart roughly
 * an hour after paying for them, 7 to 19 seconds after the cart was captured.
 *
 * Sending was never affected: sendWhatsAppTemplate normalises at the boundary.
 * That is exactly why this hid for months -- the messages went out fine, only
 * the joins were broken, and a join that matches nothing looks like a feature
 * that nobody uses.
 *
 * The rule: normalise on the way IN, so every consumer can use plain equality.
 *
 *   npx tsx scripts/check-phone-canonical-form.ts
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { normalizeNamibianPhone } from "../src/lib/utils";

let failures = 0;
const fail = (m: string) => {
  console.error(`  FAIL  ${m}`);
  failures++;
};
const pass = (m: string) => console.log(`  ok    ${m}`);

// ── 1. Both writers of a customer phone must normalise ──────────────────
const WRITERS: { file: string; what: string; pattern: RegExp }[] = [
  {
    file: "src/app/checkout/[slug]/checkout-form.tsx",
    what: "orders.customer_whatsapp (via place_order)",
    pattern: /p_customer_whatsapp:\s*normalizeNamibianPhone\(/,
  },
  {
    file: "src/app/api/checkout/capture/route.ts",
    what: "abandoned_checkouts.customer_whatsapp",
    pattern: /normalizeNamibianPhone\(/,
  },
];

for (const w of WRITERS) {
  const src = readFileSync(join(process.cwd(), w.file), "utf8");
  if (!w.pattern.test(src)) {
    fail(
      `${w.file} writes ${w.what} without normalizeNamibianPhone().\n` +
        `        Two shapes of the same number cannot be joined, and the failure\n` +
        `        is silent: a join that matches nothing looks like an unused feature.`
    );
  } else {
    pass(`${w.what} is normalised on write`);
  }
}

// ── 2. The normaliser is genuinely idempotent ───────────────────────────
// Everything above depends on normalise(normalise(x)) === normalise(x); if it
// were not, a backfilled row would drift again on the next write.
const SAMPLES = [
  "0853484423",
  "853484423",
  "+264853484423",
  "264853484423",
  "081 234 5678",
  "+264 81 234 5678",
];
for (const raw of SAMPLES) {
  const once = normalizeNamibianPhone(raw);
  const twice = normalizeNamibianPhone(once);
  if (once !== twice) {
    fail(`normalizeNamibianPhone is not idempotent: "${raw}" -> "${once}" -> "${twice}"`);
  }
}
if (failures === 0) pass(`normalizeNamibianPhone is idempotent across ${SAMPLES.length} shapes`);

// ── 3. The shapes that actually collided in production now agree ────────
const COLLIDED: [string, string][] = [
  ["0853484423", "+264853484423"], // Vladimir, order #16
  ["818555667", "+264818555667"], // Nathan, orders #13 and #18
];
for (const [asTyped, asStored] of COLLIDED) {
  if (normalizeNamibianPhone(asTyped) !== normalizeNamibianPhone(asStored)) {
    fail(
      `"${asTyped}" and "${asStored}" still normalise differently ` +
        `(${normalizeNamibianPhone(asTyped)} vs ${normalizeNamibianPhone(asStored)})`
    );
  }
}
if (failures === 0) pass("the number shapes that broke recovery now compare equal");

// ── 4. Lookups must compare in the SAME form the column is stored in ────
// Normalising the column was only half the job. /api/orders/upload-pop looked
// the order up with `whatsapp.replace(/\D/g,"")`, which strips the "+". That
// matched while orders held the number raw ("0853484423"), and broke the
// moment the column became E.164: "264853484423" never equals "+264853484423",
// so every proof-of-payment upload returned "Order not found". A canonical
// column is worthless if a reader canonicalises differently.
const LOOKUPS = [
  { file: "src/app/api/orders/upload-pop/route.ts", column: "orders.customer_whatsapp" },
];
for (const l of LOOKUPS) {
  const src = readFileSync(join(process.cwd(), l.file), "utf8");
  // A phone variable reduced to bare digits and then used in an equality filter.
  const stripsThePlus = /(?:whatsapp|phone)[A-Za-z]*\.replace\(\s*\/\\D\/g\s*,\s*""\s*\)/.test(src);
  if (stripsThePlus) {
    fail(
      `${l.file} strips a phone to bare digits before matching ${l.column}.\n` +
        `        The column is E.164, so "264…" never equals "+264…" and the lookup\n` +
        `        silently finds nothing. Use normalizeNamibianPhone() on both sides.`
    );
  } else {
    pass(`${l.file} looks up ${l.column} in its canonical form`);
  }
}

// ── 5. Customer-facing wa.me links must go through whatsappLink() ───────
// Hand-rolling `wa.me/${number.replace(/\D/g,"")}` drops the country code for a
// number stored as "0816884820", producing a link WhatsApp cannot resolve.
// Krotoa Leather Goods — a store featured on the homepage — shipped exactly
// that: its "Message on WhatsApp" button was dead for every visitor.
// whatsappLink() normalises first, so it is correct whatever shape is stored.
const LINK_SITES = [
  "src/app/checkout/[slug]/page.tsx",
  "src/app/track/[token]/tracker-client.tsx",
  "src/components/storefront/store-header-card.tsx",
];
for (const file of LINK_SITES) {
  const src = readFileSync(join(process.cwd(), file), "utf8");
  // A merchant/store number interpolated straight into a wa.me URL.
  const handRolled = /wa\.me\/\$\{[^}]*(?:merchant|store)[^}]*\}/i.test(src);
  if (handRolled) {
    fail(
      `${file} builds a wa.me link from a merchant number by hand.\n` +
        `        Use whatsappLink(), or a locally-stored "081..." number loses its\n` +
        `        country code and the link silently fails to open.`
    );
  } else {
    pass(`${file} builds its WhatsApp link through the helper`);
  }
}

console.log(
  failures === 0
    ? "\nPASS  Customer phone numbers have one canonical form."
    : `\nFAIL  ${failures} problem(s).`
);
process.exit(failures === 0 ? 0 : 1);
