/**
 * Where a service happens, and what that means for checkout.
 *
 * Services were previously forced through the goods flow: deliver it or come
 * and fetch it. That fits a bakery, not a web designer (nothing to deliver), a
 * hairdresser (client comes in), or a plumber (merchant travels).
 *
 * Set per service rather than per merchant, so a salon can sell in-salon cuts
 * and online consultations side by side — which means a single cart can mix
 * modes, and something has to decide what checkout asks for. That is this file.
 */

export type ServiceMode = "at_store" | "at_client" | "online";

export const SERVICE_MODES: { value: ServiceMode; label: string; hint: string }[] = [
  {
    value: "at_store",
    label: "At my place",
    hint: "The customer comes to you — a salon chair, a workshop, a studio.",
  },
  {
    value: "at_client",
    label: "I travel to the customer",
    hint: "You go to them. Checkout asks for an address and adds your call-out fee.",
  },
  {
    value: "online",
    label: "Online",
    hint: "Delivered remotely — a call, a design, a lesson. No address needed.",
  },
];

export function isServiceMode(value: unknown): value is ServiceMode {
  return value === "at_store" || value === "at_client" || value === "online";
}

export function serviceModeLabel(mode: ServiceMode): string {
  return SERVICE_MODES.find((m) => m.value === mode)?.label ?? mode;
}

/** Only the shape checkout needs; the cart carries more than this. */
export interface FulfilmentItem {
  serviceMode?: ServiceMode | null;
}

export interface CartFulfilment {
  /** At least one ordinary product is in the cart. */
  hasGoods: boolean;
  /** At least one service is in the cart. */
  hasServices: boolean;
  /** Distinct service modes present, strongest first. */
  modes: ServiceMode[];
  /**
   * The mode that drives the wording. at_client outranks at_store, which
   * outranks online — the most demanding requirement wins, so a cart mixing an
   * online consult with an on-site visit still collects an address.
   */
  primaryMode: ServiceMode | null;
  /** A booked service needs the merchant to travel, so an address is required. */
  serviceNeedsAddress: boolean;
  /** Any service at all means the customer must pick a date and time. */
  needsSchedule: boolean;
  /** Charged once per order, however many at_client services are booked. */
  chargesCallout: boolean;
}

/** Strongest first: whoever appears earliest wins the wording. */
const MODE_PRECEDENCE: ServiceMode[] = ["at_client", "at_store", "online"];

export function summariseFulfilment(items: FulfilmentItem[]): CartFulfilment {
  const present = new Set<ServiceMode>();
  let hasGoods = false;

  for (const item of items) {
    if (isServiceMode(item.serviceMode)) {
      present.add(item.serviceMode);
    } else {
      hasGoods = true;
    }
  }

  const modes = MODE_PRECEDENCE.filter((mode) => present.has(mode));
  const hasServices = modes.length > 0;

  return {
    hasGoods,
    hasServices,
    modes,
    primaryMode: modes[0] ?? null,
    serviceNeedsAddress: present.has("at_client"),
    needsSchedule: hasServices,
    // Once per order. Booking three on-site jobs is still one trip out.
    chargesCallout: present.has("at_client"),
  };
}

/** What the customer is told will happen, in their words. */
export function fulfilmentSummary(fulfilment: CartFulfilment): string | null {
  if (!fulfilment.hasServices) return null;

  switch (fulfilment.primaryMode) {
    case "at_client":
      return "We come to you. Tell us where and when below.";
    case "at_store":
      return "Please come to us at the time you choose below.";
    case "online":
      return "This happens online — no address needed. Just pick a time.";
    default:
      return null;
  }
}
