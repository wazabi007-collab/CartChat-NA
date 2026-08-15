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

/** Inclusive day count: 20th to 22nd is 3 days. Same-day hire is 1. */
export function rentalDays(firstDay: string, lastDay: string): number {
  const start = new Date(`${firstDay}T00:00:00`);
  const end = new Date(`${lastDay}T00:00:00`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return 0;
  return Math.round((end.getTime() - start.getTime()) / 86_400_000) + 1;
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

/** "3 days · 20–22 Aug" for summaries and order lines. */
export function formatRentalRange(firstDay: string, lastDay: string): string {
  const days = rentalDays(firstDay, lastDay);
  const fmt = (iso: string) =>
    new Date(`${iso}T12:00:00`).toLocaleDateString("en-NA", {
      day: "numeric",
      month: "short",
    });
  const span = firstDay === lastDay ? fmt(firstDay) : `${fmt(firstDay)} – ${fmt(lastDay)}`;
  return `${days} day${days === 1 ? "" : "s"} · ${span}`;
}
