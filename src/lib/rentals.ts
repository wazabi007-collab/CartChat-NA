/**
 * Day-based rentals, phase 1 (docs/design/rentals.md).
 *
 * The customer speaks inclusive dates — "first day" and "last day" — because
 * that is how hire is negotiated at a counter. Storage and overlap maths are
 * end-exclusive ([first, last+1)) so ranges that touch never clash; the
 * translation happens exactly once, in place_order. These helpers are the
 * CLIENT'S mirror of the server rules, for previews and friendly errors —
 * place_order remains the enforcement, and recomputes everything.
 */

export type RentalUnit = "day" | "night";

/**
 * Unit-aware count. 'day' is inclusive: 20th to 22nd is 3 days. 'night'
 * treats the second date as CHECK-OUT: 15th to 18th is 3 nights, and the
 * room is free again on the 18th. The night-vs-day trap is the one that
 * either loses a merchant income or double-books a room.
 */
export function rentalDays(
  firstDay: string,
  lastDay: string,
  unit: RentalUnit = "day"
): number {
  const start = new Date(`${firstDay}T00:00:00`);
  const end = new Date(`${lastDay}T00:00:00`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return 0;
  const diff = Math.round((end.getTime() - start.getTime()) / 86_400_000);
  return unit === "night" ? diff : diff + 1;
}

/** Line price in cents: rate x days x quantity, mirroring the server. */
export function rentalLineTotal(
  ratePerDayCents: number,
  days: number,
  quantity: number
): number {
  return ratePerDayCents * days * quantity;
}

/**
 * The friendly version of place_order's validations, so the customer hears
 * about a problem before submitting rather than from a thrown error.
 */
export function validateRentalRange(
  firstDay: string,
  lastDay: string,
  minDays: number,
  maxDays: number,
  today: string
): string | null {
  if (!firstDay || !lastDay) return "Choose the first and last day of your hire.";
  if (firstDay < today) return "The hire cannot start in the past.";
  if (lastDay < firstDay) return "The last day is before the first day.";
  const days = rentalDays(firstDay, lastDay);
  if (days < minDays) return `Minimum hire is ${minDays} day${minDays === 1 ? "" : "s"}.`;
  if (days > maxDays) return `Maximum hire is ${maxDays} day${maxDays === 1 ? "" : "s"}.`;
  return null;
}

/**
 * Days late, from the stored end-exclusive bound. A 'day' hire is due back
 * on its last inclusive day (endExclusive - 1): returning ON endExclusive is
 * already 1 day late. A 'night' guest checks out ON endExclusive: that day
 * is on time, the day after is 1 late. Mirrors the unit rules exactly —
 * getting this wrong charges an on-time customer or forgives a late one.
 */
export function rentalLateDays(
  endExclusive: string,
  returnedAt: string,
  unit: RentalUnit = "day"
): number {
  const end = new Date(`${endExclusive}T00:00:00`);
  const ret = new Date(`${returnedAt}T00:00:00`);
  if (Number.isNaN(end.getTime()) || Number.isNaN(ret.getTime())) return 0;
  const diff = Math.round((ret.getTime() - end.getTime()) / 86_400_000);
  return Math.max(0, unit === "day" ? diff + 1 : diff);
}

/** "3 days · 20–22 Aug" (or nights) for summaries and order lines. */
export function formatRentalRange(
  firstDay: string,
  lastDay: string,
  unit: RentalUnit = "day"
): string {
  const days = rentalDays(firstDay, lastDay, unit);
  const fmt = (iso: string) =>
    new Date(`${iso}T12:00:00`).toLocaleDateString("en-NA", {
      day: "numeric",
      month: "short",
    });
  const span = firstDay === lastDay ? fmt(firstDay) : `${fmt(firstDay)} – ${fmt(lastDay)}`;
  const word = unit === "night" ? "night" : "day";
  return `${days} ${word}${days === 1 ? "" : "s"} · ${span}`;
}
