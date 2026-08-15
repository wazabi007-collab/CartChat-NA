/**
 * Rental maths, client side. place_order recomputes everything — these
 * helpers exist for previews and friendly errors, and they must agree with
 * the server exactly or the price a customer sees is not the price charged.
 *
 * Verified against production behaviour on 9 Aug 2026: a 20th–22nd hire is 3
 * days and N$450 at N$150/day, ranges store end-exclusive, and touching
 * ranges never clash.
 *
 *   npx tsx scripts/check-rentals.ts
 */
import {
  rentalDays,
  rentalLateDays,
  rentalLineTotal,
  validateRentalRange,
  formatRentalRange,
} from "../src/lib/rentals";

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

// Inclusive day counting — the convention spoken at a hire counter.
check("20th to 22nd is 3 days", rentalDays("2026-08-20", "2026-08-22"), 3);
check("same day is 1 day", rentalDays("2026-08-20", "2026-08-20"), 1);
check("month boundary", rentalDays("2026-08-30", "2026-09-02"), 4);
check("year boundary", rentalDays("2026-12-30", "2027-01-02"), 4);
check("garbage dates are 0 days", rentalDays("nope", "2026-08-20"), 0);

// Nightly counting — the second date is CHECK-OUT, not a charged day.
// Verified against production place_order on 15 Aug 2026: 15th→18th stored
// [15,18), charged 3 nights (N$900 at N$300), and a guest checking in on the
// 18th was accepted (touching stays never clash).
check("15th to 18th is 3 nights", rentalDays("2026-08-15", "2026-08-18", "night"), 3);
check("one night", rentalDays("2026-08-15", "2026-08-16", "night"), 1);
check("same-day night range is 0", rentalDays("2026-08-15", "2026-08-15", "night"), 0);
check("night month boundary", rentalDays("2026-08-30", "2026-09-02", "night"), 3);

// Price mirrors the server: rate x days x quantity.
check("3 days x N$150", rentalLineTotal(15000, 3, 1), 45000);
check("40 chairs x 3 days x N$8", rentalLineTotal(800, 3, 40), 96000);

// Validation speaks before place_order throws.
const T = "2026-08-10";
check("missing dates", validateRentalRange("", "", 1, 30, T),
  "Choose the first and last day of your hire.");
check("past start", validateRentalRange("2026-08-01", "2026-08-12", 1, 30, T),
  "The hire cannot start in the past.");
check("inverted range", validateRentalRange("2026-08-15", "2026-08-12", 1, 30, T),
  "The last day is before the first day.");
check("under minimum", validateRentalRange("2026-08-15", "2026-08-15", 2, 30, T),
  "Minimum hire is 2 days.");
check("over maximum", validateRentalRange("2026-08-15", "2026-09-30", 1, 14, T),
  "Maximum hire is 14 days.");
check("valid range passes", validateRentalRange("2026-08-15", "2026-08-18", 1, 30, T), null);
check("today is allowed", validateRentalRange(T, T, 1, 30, T), null);

// Labels.
check("range label", formatRentalRange("2026-08-20", "2026-08-22"), "3 days · 20 Aug – 22 Aug");
check("single day label", formatRentalRange("2026-08-20", "2026-08-20"), "1 day · 20 Aug");
check("night label", formatRentalRange("2026-08-15", "2026-08-18", "night"),
  "3 nights · 15 Aug – 18 Aug");
check("single night label", formatRentalRange("2026-08-15", "2026-08-16", "night"),
  "1 night · 15 Aug – 16 Aug");

// Late returns. A day hire [20, 23) is due back on the 22nd (its last
// inclusive day); a night stay checks out ON the exclusive bound.
check("day: back on last day is on time", rentalLateDays("2026-08-23", "2026-08-22", "day"), 0);
check("day: back the morning after is 1 late", rentalLateDays("2026-08-23", "2026-08-23", "day"), 1);
check("day: three days after is 3 late", rentalLateDays("2026-08-23", "2026-08-25", "day"), 3);
check("night: checkout day is on time", rentalLateDays("2026-08-18", "2026-08-18", "night"), 0);
check("night: next day is 1 late", rentalLateDays("2026-08-18", "2026-08-19", "night"), 1);
check("early return is never negative", rentalLateDays("2026-08-23", "2026-08-20", "day"), 0);
check("garbage return date is 0", rentalLateDays("2026-08-23", "nope", "day"), 0);

console.log(failures === 0 ? "\nALL PASS" : `\n${failures} FAILURE(S)`);
process.exit(failures === 0 ? 0 : 1);
