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
