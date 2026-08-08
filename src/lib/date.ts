/**
 * Namibia observes UTC+2 year-round (no DST since 2017).
 *
 * Analytics buckets are calendar days in Namibian local time. Using
 * `toISOString().split("T")[0]` (UTC) pushed every order placed after 22:00
 * local into the following day's figures.
 */
export const NAMIBIA_UTC_OFFSET_MINUTES = 120;

/** Today's date in Namibia as `YYYY-MM-DD`. */
export function namibianDateString(date: Date = new Date()): string {
  const shifted = new Date(date.getTime() + NAMIBIA_UTC_OFFSET_MINUTES * 60_000);
  return shifted.toISOString().split("T")[0];
}

/**
 * Start of the current calendar month in Namibian local time, as an ISO string
 * with an explicit +02:00 offset.
 *
 * Monthly order quotas previously used `new Date(); setDate(1); setHours(0,0,0,0)`,
 * which on Vercel resolves to midnight UTC — i.e. 02:00 in Namibia. Orders
 * placed between midnight and 02:00 on the 1st were therefore billed to the
 * previous month's quota.
 */
export function namibianMonthStartISO(date: Date = new Date()): string {
  const shifted = new Date(date.getTime() + NAMIBIA_UTC_OFFSET_MINUTES * 60_000);
  const year = shifted.getUTCFullYear();
  const month = String(shifted.getUTCMonth() + 1).padStart(2, "0");
  return `${year}-${month}-01T00:00:00+02:00`;
}

/**
 * Format a timestamp as a Namibian calendar date, e.g. "25 September".
 *
 * Must be used for any date rendered from a billing period. Those boundaries
 * are midnight +02:00, which is 22:00 the PREVIOUS day in UTC — so formatting
 * them on a Vercel server without pinning the timezone shows the wrong day.
 */
export function formatNamibianDate(
  value: string | Date,
  options: Intl.DateTimeFormatOptions = { day: "numeric", month: "long" }
): string {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-GB", {
    ...options,
    timeZone: "Africa/Windhoek",
  });
}

/**
 * The Namibian calendar month containing `date`, as `YYYY-MM`.
 *
 * Statements are selected by month, so the boundary has to be local: an order
 * placed at 00:30 on the 1st belongs to the new month, even though it is still
 * the previous month in UTC.
 */
export function namibianMonthKey(date: Date = new Date()): string {
  const shifted = new Date(date.getTime() + NAMIBIA_UTC_OFFSET_MINUTES * 60_000);
  const month = String(shifted.getUTCMonth() + 1).padStart(2, "0");
  return `${shifted.getUTCFullYear()}-${month}`;
}

/**
 * Half-open range covering a `YYYY-MM` month in Namibian time, as ISO strings
 * with an explicit +02:00 offset. End is exclusive.
 */
export function namibianMonthRange(monthKey: string): { startISO: string; endISO: string } {
  const [year, month] = monthKey.split("-").map(Number);
  const nextYear = month === 12 ? year + 1 : year;
  const nextMonth = month === 12 ? 1 : month + 1;

  return {
    startISO: `${year}-${String(month).padStart(2, "0")}-01T00:00:00+02:00`,
    endISO: `${nextYear}-${String(nextMonth).padStart(2, "0")}-01T00:00:00+02:00`,
  };
}

/**
 * A range covering `count` whole Namibian months ending with `endMonthKey`.
 *
 * Used for the twelve-month statement, so the year-end document lines up
 * exactly with the twelve monthly ones a merchant may already have filed.
 */
export function namibianTrailingMonthsRange(
  count: number,
  endMonthKey: string
): { startISO: string; endISO: string } {
  const [year, month] = endMonthKey.split("-").map(Number);

  let startYear = year;
  let startMonth = month - (count - 1);
  while (startMonth <= 0) {
    startMonth += 12;
    startYear -= 1;
  }

  return {
    startISO: namibianMonthRange(`${startYear}-${String(startMonth).padStart(2, "0")}`).startISO,
    endISO: namibianMonthRange(endMonthKey).endISO,
  };
}

/** The last `count` Namibian months, newest first, as `YYYY-MM` keys. */
export function recentNamibianMonths(count: number, from: Date = new Date()): string[] {
  const shifted = new Date(from.getTime() + NAMIBIA_UTC_OFFSET_MINUTES * 60_000);
  let year = shifted.getUTCFullYear();
  let month = shifted.getUTCMonth() + 1;

  const keys: string[] = [];
  for (let i = 0; i < count; i++) {
    keys.push(`${year}-${String(month).padStart(2, "0")}`);
    month -= 1;
    if (month === 0) {
      month = 12;
      year -= 1;
    }
  }
  return keys;
}

/** Number of days in a 1-indexed month. Day 0 of month+1 is the last day of month. */
function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/** Midnight Namibian time on a given calendar day, as an ISO string. */
function namibianMidnightISO(year: number, month: number, day: number): string {
  const mm = String(month).padStart(2, "0");
  const dd = String(day).padStart(2, "0");
  return `${year}-${mm}-${dd}T00:00:00+02:00`;
}

export interface BillingPeriod {
  /** Inclusive start of the current cycle. */
  startISO: string;
  /** Exclusive end — the moment the allowance resets. */
  endISO: string;
}

/**
 * The current monthly cycle anchored on a merchant's billing day.
 *
 * `anchor` is the subscription's billing date (`current_period_start`, or the
 * signup date for merchants who have never paid). The cycle runs from that day
 * of the month to the same day of the next month, so a merchant who subscribes
 * on the 25th gets a full month before their allowance resets — rather than a
 * few days, which is what a calendar-month reset gave them.
 *
 * Two rules worth knowing:
 *
 *  - Anchor days that don't exist in a short month are clamped to the last day
 *    (the 31st becomes the 28th in February), the standard billing convention.
 *    Cycles therefore vary between 28 and 31 days.
 *
 *  - Boundaries are midnight NAMIBIAN time, not the anchor's time of day. A
 *    merchant who paid at 14:00 on the 5th resets at 00:00 on the 5th, which is
 *    both easier to explain and slightly in the merchant's favour.
 */
export function namibianBillingPeriod(
  anchor: Date,
  now: Date = new Date()
): BillingPeriod {
  const shift = NAMIBIA_UTC_OFFSET_MINUTES * 60_000;
  const anchorLocal = new Date(anchor.getTime() + shift);
  const nowLocal = new Date(now.getTime() + shift);

  const anchorDay = anchorLocal.getUTCDate();

  let year = nowLocal.getUTCFullYear();
  let month = nowLocal.getUTCMonth() + 1;

  // If this month's reset day hasn't arrived yet, we're still inside the cycle
  // that opened last month.
  if (nowLocal.getUTCDate() < Math.min(anchorDay, daysInMonth(year, month))) {
    month -= 1;
    if (month === 0) {
      month = 12;
      year -= 1;
    }
  }

  let endYear = year;
  let endMonth = month + 1;
  if (endMonth === 13) {
    endMonth = 1;
    endYear += 1;
  }

  return {
    startISO: namibianMidnightISO(
      year,
      month,
      Math.min(anchorDay, daysInMonth(year, month))
    ),
    endISO: namibianMidnightISO(
      endYear,
      endMonth,
      Math.min(anchorDay, daysInMonth(endYear, endMonth))
    ),
  };
}
