import { PAYMENT_METHODS } from "@/lib/constants";

/**
 * Which payment methods a merchant can actually receive money through.
 *
 * A merchant can tick "eWallet" in settings and never enter the number. The
 * storefront then offered it, the buyer selected it, and the order and invoice
 * carried "Send to —". Observed across 9 of 12 live stores, including one
 * accepting only EFT with an empty account number — every order it took was
 * unpayable.
 *
 * So the accepted list is treated as an intent, not a guarantee: a method is
 * only offered once the details needed to pay it exist.
 */

/** The merchant fields a method needs before it can be offered. */
export interface MerchantPaymentDetails {
  bank_name?: string | null;
  bank_account_number?: string | null;
  momo_number?: string | null;
  ewallet_number?: string | null;
  pay2cell_number?: string | null;
  paytoday_number?: string | null;
  wayame_number?: string | null;
}

function filled(value: string | null | undefined): boolean {
  return typeof value === "string" && value.trim().length > 0;
}

/**
 * Methods announced but not yet switched on.
 *
 * WayaMe is built end to end and shown in the dashboard so merchants know it
 * is coming, but the banks have not enabled consumer payments yet. Treating it
 * as unusable here is the safety net: usablePaymentMethods() already filters
 * the buyer's options, so a coming-soon method can never be offered at
 * checkout, never be saved as a working method, and never reach an invoice --
 * even if it somehow ends up in a merchant's accepted list.
 */
export function isComingSoon(method: string): boolean {
  const entry = PAYMENT_METHODS.find((m) => m.value === method);
  return !!entry && "comingSoon" in entry && entry.comingSoon === true;
}

/**
 * True when a merchant has everything needed to be paid by this method.
 *
 * Unknown values are never usable. Production carries at least one store with a
 * stale `dpo` entry, which rendered to the generic label "Payment" and did
 * nothing.
 */
export function isPaymentMethodUsable(
  method: string,
  details: MerchantPaymentDetails
): boolean {
  // Announced but not switched on: never offer it, whatever the merchant saved.
  if (isComingSoon(method)) return false;

  switch (method) {
    // Cash needs no setup, so it is always usable.
    case "cod":
      return true;
    case "eft":
      return filled(details.bank_name) && filled(details.bank_account_number);
    case "momo":
      return filled(details.momo_number);
    case "ewallet":
      return filled(details.ewallet_number);
    case "pay2cell":
      return filled(details.pay2cell_number);
    case "paytoday":
      return filled(details.paytoday_number);
    case "wayame":
      return filled(details.wayame_number);
    default:
      return false;
  }
}

/**
 * The methods to actually show a buyer.
 *
 * A merchant who has never chosen (null or empty list) is offered everything
 * they have configured, rather than being defaulted into EFT — the old default
 * offered bank transfer to merchants with no bank details at all.
 */
export function usablePaymentMethods(
  accepted: string[] | null | undefined,
  details: MerchantPaymentDetails
): string[] {
  const intended =
    accepted && accepted.length > 0
      ? accepted
      : PAYMENT_METHODS.map((m) => m.value as string);

  return intended.filter((method) => isPaymentMethodUsable(method, details));
}

/**
 * Methods the merchant switched on but cannot be paid through — what the
 * dashboard warns them about.
 */
export function misconfiguredPaymentMethods(
  accepted: string[] | null | undefined,
  details: MerchantPaymentDetails
): string[] {
  if (!accepted || accepted.length === 0) return [];
  // A coming-soon method is not misconfigured -- it is not available yet.
  // Warning "you cannot be paid by WayaMe" would read as the merchant's
  // mistake when it is simply not switched on.
  return accepted.filter(
    (method) => !isComingSoon(method) && !isPaymentMethodUsable(method, details)
  );
}
