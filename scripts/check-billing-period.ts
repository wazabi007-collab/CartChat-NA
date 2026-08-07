/**
 * Edge-case checks for the billing-anchored quota window.
 *
 * Order allowances reset on each merchant's billing date rather than the 1st of
 * the month, which means month-length clamping, year rollovers and the Namibian
 * +02:00 offset all have to be right. This is pure logic with no database, so
 * run it after touching namibianBillingPeriod():
 *
 *   npx tsx scripts/check-billing-period.ts
 */
import { namibianBillingPeriod } from "../src/lib/date";

let failures = 0;

function check(
  name: string,
  anchor: string,
  now: string,
  start: string,
  end: string
) {
  const p = namibianBillingPeriod(new Date(anchor), new Date(now));
  if (p.startISO === start && p.endISO === end) {
    console.log(`ok   ${name}  ${p.startISO} -> ${p.endISO}`);
    return;
  }
  failures++;
  console.log(
    `FAIL ${name}\n  anchor=${anchor} now=${now}\n` +
      `  got      ${p.startISO} -> ${p.endISO}\n` +
      `  expected ${start} -> ${end}`
  );
}

// Now past the reset day: the cycle opened this month.
check("after reset day", "2026-03-25T12:00:00+02:00", "2026-08-28T10:00:00+02:00",
  "2026-08-25T00:00:00+02:00", "2026-09-25T00:00:00+02:00");

// Now before the reset day: still inside the cycle that opened last month.
check("before reset day", "2026-03-25T12:00:00+02:00", "2026-08-10T10:00:00+02:00",
  "2026-07-25T00:00:00+02:00", "2026-08-25T00:00:00+02:00");

check("year rollover back", "2025-06-20T08:00:00+02:00", "2026-01-05T10:00:00+02:00",
  "2025-12-20T00:00:00+02:00", "2026-01-20T00:00:00+02:00");

check("december cycle ends in january", "2025-06-20T08:00:00+02:00", "2025-12-25T10:00:00+02:00",
  "2025-12-20T00:00:00+02:00", "2026-01-20T00:00:00+02:00");

// A 31st anchor has no 31st in February — clamp to the last day.
check("31st clamped in february", "2026-01-31T09:00:00+02:00", "2026-02-28T10:00:00+02:00",
  "2026-02-28T00:00:00+02:00", "2026-03-31T00:00:00+02:00");

check("31st anchor, 30 march", "2026-01-31T09:00:00+02:00", "2026-03-30T10:00:00+02:00",
  "2026-02-28T00:00:00+02:00", "2026-03-31T00:00:00+02:00");

check("leap february", "2024-01-31T09:00:00+02:00", "2024-02-29T10:00:00+02:00",
  "2024-02-29T00:00:00+02:00", "2024-03-31T00:00:00+02:00");

check("30th clamped in february", "2026-04-30T09:00:00+02:00", "2026-02-27T10:00:00+02:00",
  "2026-01-30T00:00:00+02:00", "2026-02-28T00:00:00+02:00");

// A 1st anchor must reproduce the old calendar-month behaviour exactly.
check("1st anchor == calendar month", "2026-08-01T00:00:00+02:00", "2026-08-17T10:00:00+02:00",
  "2026-08-01T00:00:00+02:00", "2026-09-01T00:00:00+02:00");

// The timezone cases. 00:30 Namibian on the reset day is 22:30 UTC the day
// before, so a UTC-based implementation puts it in the previous cycle.
check("00:30 namibian on reset day", "2026-03-25T12:00:00+02:00", "2026-08-25T00:30:00+02:00",
  "2026-08-25T00:00:00+02:00", "2026-09-25T00:00:00+02:00");

check("23:30 namibian before reset day", "2026-03-25T12:00:00+02:00", "2026-08-24T23:30:00+02:00",
  "2026-07-25T00:00:00+02:00", "2026-08-25T00:00:00+02:00");

console.log(failures === 0 ? "\nALL PASS" : `\n${failures} FAILURE(S)`);
process.exit(failures === 0 ? 0 : 1);
