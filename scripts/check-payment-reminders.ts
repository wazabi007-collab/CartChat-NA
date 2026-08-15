/**
 * A customer who has paid must never be chased, and never auto-cancelled.
 *
 * The reminder cron keyed only on `status = 'pending'`. It never looked at
 * order_payments or proof_of_payment_url, so a customer who paid by EFT — and
 * whose merchant dutifully recorded the payment — kept receiving "please pay"
 * messages, and at 49 hours their order was CANCELLED and the stock returned,
 * with the money already in the merchant's bank.
 *
 * That is the worst class of bug in this system: it punishes the people who
 * did everything right, and nobody finds out until a customer complains.
 *
 * This asserts the source still contains both guards. It is a source check
 * rather than a behavioural one because the cron needs live Supabase and a
 * WhatsApp key; the guards are one-line conditions that are easy to delete by
 * accident during a refactor, which is exactly what needs catching.
 *
 *   npx tsx scripts/check-payment-reminders.ts
 */
import { readFileSync } from "fs";
import { join } from "path";

const SRC = join(process.cwd(), "src/app/api/cron/payment-reminders/route.ts");
const body = readFileSync(SRC, "utf8");

let failures = 0;

function check(name: string, actual: unknown, expected: unknown) {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a === e) {
    console.log(`ok   ${name}`);
    return;
  }
  failures++;
  console.log(`FAIL ${name}\n  got      ${a}\n  expected ${e}`);
}

// The settled set must be built from live (non-voided) payments.
check(
  "reads order_payments",
  body.includes('.from("order_payments")'),
  true
);
check(
  "ignores voided payments when deciding who has paid",
  /from\("order_payments"\)[\s\S]{0,160}is\("voided_at", null\)/.test(body),
  true
);

// Both loops must consult it.
const guards = body.match(/settledOrderIds\.has\(order\.id\)/g) ?? [];
check("both the reminder loop and the auto-cancel loop check it", guards.length >= 2, true);

// Proof of payment counts too, in both places.
const proofGuards = body.match(/order\.proof_of_payment_url/g) ?? [];
check("an uploaded proof-of-payment also stops both", proofGuards.length >= 2, true);

// The auto-cancel query must select the proof column, or the guard reads
// undefined and silently passes — the subtle way this regresses.
check(
  "auto-cancel query selects proof_of_payment_url",
  /merchant_id, reminder_count, proof_of_payment_url/.test(body),
  true
);

// --- Cadence, and the coupling that makes it safe -------------------------
// The auto-cancel gate must never be a hard-coded number. It read `>= 3` while
// three reminders were sent; cutting to two would have meant reminder_count
// never reached 3, so no unpaid order would EVER be cancelled and its stock
// would stay locked forever — silent, and only visible weeks later as
// mysteriously unavailable inventory.
check(
  "reminder tiers are declared in one place",
  /const REMINDER_TIERS = \[[\d, ]+\] as const;/.test(body),
  true
);
check(
  "two reminders, at 6 and 24 hours",
  (body.match(/const REMINDER_TIERS = \[([\d, ]+)\]/) ?? [])[1]?.replace(/\s/g, ""),
  "6,24"
);
check(
  "the send decision is driven by the tier list, not hard-coded hours",
  /ageHours >= REMINDER_TIERS\[reminderCount\]/.test(body),
  true
);
check(
  "auto-cancel waits for every reminder, derived from the tiers",
  /gte\("reminder_count", REMINDER_TIERS\.length\)/.test(body),
  true
);
check(
  "auto-cancel gate is NOT a hard-coded number",
  /gte\("reminder_count", \d+\)/.test(body),
  false
);

// And the reminder query must select it too.
check(
  "reminder query selects proof_of_payment_url",
  /vat_inclusive, payment_method, proof_of_payment_url/.test(body),
  true
);

console.log(failures === 0 ? "\nALL PASS" : `\n${failures} FAILURE(S)`);
process.exit(failures === 0 ? 0 : 1);
