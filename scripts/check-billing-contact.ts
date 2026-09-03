/**
 * Subscription proof of payment reaches the billing line, not sales.
 *
 * The subscription checkout hard-coded "+264816274823" — the sales/support
 * number — in its own file, so every merchant who paid was told to send their
 * proof of payment to the wrong phone. Money owed to OshiCart is reconciled
 * against the bank account by whoever watches it, which is not whoever answers
 * product questions.
 *
 * The same number is separately hard-coded in support-button.tsx and in the
 * dashboard subscription page, each with its own local constant, while
 * constants.ts already exports one. That is how the destination drifted in the
 * first place: there was no single place to change it.
 *
 * Rules:
 *  - the subscription checkout must not hard-code any Namibian number
 *  - its proof-of-payment link must resolve to BILLING_WHATSAPP_E164
 *  - the number printed on the page must be the number the button opens
 *
 *   npx tsx scripts/check-billing-contact.ts
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  BILLING_WHATSAPP,
  BILLING_WHATSAPP_E164,
  billingWhatsAppLink,
} from "../src/lib/constants";

const CHECKOUT = "src/app/pricing/checkout/page.tsx";
const src = readFileSync(join(process.cwd(), CHECKOUT), "utf8");

let failures = 0;
const fail = (m: string) => {
  console.error(`  FAIL  ${m}`);
  failures++;
};
const pass = (m: string) => console.log(`  ok    ${m}`);

// ── 1. No hard-coded Namibian number in the subscription checkout ───────
const hardCoded = src.match(/["'`]\+?264\s?\d[\d\s]{7,}["'`]/g);
if (hardCoded) {
  fail(
    `${CHECKOUT} hard-codes a phone number (${hardCoded.join(", ")}).\n` +
      `        Import it from constants, or the billing destination drifts again.`
  );
} else {
  pass("subscription checkout hard-codes no phone number");
}

// ── 2. The proof-of-payment link points at billing ──────────────────────
if (!/billingWhatsAppLink\(/.test(src)) {
  fail(
    `${CHECKOUT} no longer builds its proof-of-payment link with\n` +
      `        billingWhatsAppLink(). Proof would reach the wrong phone.`
  );
} else {
  pass("proof-of-payment link is built with billingWhatsAppLink()");
}

// ── 3. That helper resolves to the billing number, in wa.me's format ────
const link = billingWhatsAppLink("test");
const expectedDigits = BILLING_WHATSAPP_E164.replace(/\D/g, "");
if (!link.startsWith(`https://wa.me/${expectedDigits}`)) {
  fail(`billingWhatsAppLink() resolves to "${link}", not wa.me/${expectedDigits}`);
} else if (/wa\.me\/\+/.test(link)) {
  fail(`billingWhatsAppLink() emits a leading "+", which wa.me 404s on: ${link}`);
} else {
  pass(`billingWhatsAppLink() opens wa.me/${expectedDigits}`);
}

// ── 4. The number shown is the number the button opens ──────────────────
// A page that prints one number and links to another is worse than either.
if (!src.includes("BILLING_WHATSAPP")) {
  fail(
    `${CHECKOUT} does not display BILLING_WHATSAPP. The number a merchant reads\n` +
      `        must be the number the proof-of-payment button actually opens.`
  );
} else if (
  BILLING_WHATSAPP.replace(/\D/g, "") !== BILLING_WHATSAPP_E164.replace(/\D/g, "")
) {
  fail(
    `BILLING_WHATSAPP ("${BILLING_WHATSAPP}") and BILLING_WHATSAPP_E164 ` +
      `("${BILLING_WHATSAPP_E164}") are different numbers.`
  );
} else {
  pass(`the page shows ${BILLING_WHATSAPP}, which is what the button opens`);
}

console.log(
  failures === 0
    ? "\nPASS  Subscription proof of payment reaches the billing line."
    : `\nFAIL  ${failures} problem(s).`
);
process.exit(failures === 0 ? 0 : 1);
