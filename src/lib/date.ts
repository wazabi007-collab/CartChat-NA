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
