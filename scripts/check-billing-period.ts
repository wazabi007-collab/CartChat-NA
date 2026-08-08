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
import {
  namibianBillingPeriod,
  formatNamibianDate,
  namibianMonthKey,
  namibianMonthRange,
  recentNamibianMonths,
  namibianTrailingMonthsRange,
} from "../src/lib/date";

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

// ---------------------------------------------------------------------------
// Invoice dates. The invoice previously rendered created_at with getUTCDate /
// getUTCMonth / getUTCFullYear, so anything placed between midnight and 02:00
// Namibian time printed the previous day on a document treated as the date of
// supply. The year case is the worst of them: a New Year order would have been
// dated into the previous tax year.
// ---------------------------------------------------------------------------
const LONG_DATE: Intl.DateTimeFormatOptions = {
  day: "numeric",
  month: "long",
  year: "numeric",
};

function checkDate(name: string, iso: string, expected: string) {
  const actual = formatNamibianDate(iso, LONG_DATE);
  if (actual === expected) {
    console.log(`ok   ${name}  ${actual}`);
    return;
  }
  failures++;
  console.log(`FAIL ${name}\n  got      ${actual}\n  expected ${expected}`);
}

// 23:30 Namibian — same day in both zones.
checkDate("late evening", "2026-08-07T21:30:00Z", "7 August 2026");
// 00:30 Namibian on the 8th is 22:30 UTC on the 7th. This is the broken case.
checkDate("just after midnight", "2026-08-07T22:30:00Z", "8 August 2026");
checkDate("01:30 namibian", "2026-08-07T23:30:00Z", "8 August 2026");
// Month rollover.
checkDate("first of the month", "2026-07-31T22:30:00Z", "1 August 2026");
// Year rollover — the old code would have dated this 31 December 2025.
checkDate("new year", "2025-12-31T22:30:00Z", "1 January 2026");
checkDate("midday is unaffected", "2026-03-15T10:00:00Z", "15 March 2026");

// ---------------------------------------------------------------------------
// Statement periods. Selected by Namibian calendar month, so an order placed at
// 00:30 on the 1st has to fall in the new month even though UTC still says the
// previous one — otherwise a month's takings land on the wrong VAT return.
// ---------------------------------------------------------------------------
function checkValue(name: string, actual: unknown, expected: unknown) {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a === e) {
    console.log(`ok   ${name}  ${a}`);
    return;
  }
  failures++;
  console.log(`FAIL ${name}\n  got      ${a}\n  expected ${e}`);
}

checkValue("month key midday", namibianMonthKey(new Date("2026-08-07T10:00:00Z")), "2026-08");
// 22:30 UTC on 31 July is 00:30 on 1 August in Windhoek.
checkValue("month key rolls at local midnight", namibianMonthKey(new Date("2026-07-31T22:30:00Z")), "2026-08");
checkValue("month key year rollover", namibianMonthKey(new Date("2025-12-31T22:30:00Z")), "2026-01");

checkValue("month range", namibianMonthRange("2026-08"), {
  startISO: "2026-08-01T00:00:00+02:00",
  endISO: "2026-09-01T00:00:00+02:00",
});
checkValue("december range wraps the year", namibianMonthRange("2026-12"), {
  startISO: "2026-12-01T00:00:00+02:00",
  endISO: "2027-01-01T00:00:00+02:00",
});

checkValue("recent months walk back over new year", recentNamibianMonths(3, new Date("2026-01-15T10:00:00Z")), [
  "2026-01",
  "2025-12",
  "2025-11",
]);

// The twelve-month statement must cover whole months and line up with the
// twelve monthly ones, or a year-end total will not equal the months it
// summarises.
checkValue("twelve months ending August", namibianTrailingMonthsRange(12, "2026-08"), {
  startISO: "2025-09-01T00:00:00+02:00",
  endISO: "2026-09-01T00:00:00+02:00",
});
checkValue("twelve months ending January", namibianTrailingMonthsRange(12, "2026-01"), {
  startISO: "2025-02-01T00:00:00+02:00",
  endISO: "2026-02-01T00:00:00+02:00",
});
checkValue("three months ending February", namibianTrailingMonthsRange(3, "2026-02"), {
  startISO: "2025-12-01T00:00:00+02:00",
  endISO: "2026-03-01T00:00:00+02:00",
});
// One month must be identical to the plain month range.
checkValue("one month equals the month range", namibianTrailingMonthsRange(1, "2026-08"), {
  startISO: "2026-08-01T00:00:00+02:00",
  endISO: "2026-09-01T00:00:00+02:00",
});

console.log(failures === 0 ? "\nALL PASS" : `\n${failures} FAILURE(S)`);
process.exit(failures === 0 ? 0 : 1);
