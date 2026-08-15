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
  itemType?: string | null;
  rentalUnit?: string | null;
}

export interface CartFulfilment {
  /**
   * At least one thing physically moves — a product, or a day-unit hire like
   * a tent, which really is collected and brought back.
   */
  hasGoods: boolean;
  /** At least one service is in the cart. */
  hasServices: boolean;
  /**
   * A night-unit rental: a room. The guest travels to the property, so there
   * is nothing to deliver or collect and the goods questions must not appear.
   */
  hasStay: boolean;
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
  let hasStay = false;

  for (const item of items) {
    if (isServiceMode(item.serviceMode)) {
      present.add(item.serviceMode);
    } else if (item.itemType === "rental" && item.rentalUnit === "night") {
      hasStay = true;
    } else {
      hasGoods = true;
    }
  }

  const modes = MODE_PRECEDENCE.filter((mode) => present.has(mode));
  const hasServices = modes.length > 0;

  return {
    hasGoods,
    hasServices,
    hasStay,
    modes,
    primaryMode: modes[0] ?? null,
    serviceNeedsAddress: present.has("at_client"),
    needsSchedule: hasServices,
    // Once per order. Booking three on-site jobs is still one trip out.
    chargesCallout: present.has("at_client"),
  };
}

/**
 * What the customer is told will happen, in their words.
 *
 * `schedulingOffered` is whether the merchant actually publishes time slots.
 * Without it the copy promised "pick a time" to customers of merchants who
 * offer none — most digital sellers, whose work is a project rather than an
 * appointment. In that case the honest line is that the merchant will be in
 * touch, which is what really happens.
 */
export function fulfilmentSummary(
  fulfilment: CartFulfilment,
  schedulingOffered = true
): string | null {
  if (!fulfilment.hasServices) return null;

  switch (fulfilment.primaryMode) {
    case "at_client":
      return schedulingOffered
        ? "We come to you. Tell us where and when below."
        : "We come to you. Tell us where below and we will agree a time on WhatsApp.";
    case "at_store":
      return schedulingOffered
        ? "Please come to us at the time you choose below."
        : "Please come to us — we will agree a time with you on WhatsApp.";
    case "online":
      return schedulingOffered
        ? "This happens online — nothing to deliver or collect. Just pick a time."
        : "This happens online — nothing to deliver or collect. We will contact you on WhatsApp to get started.";
    default:
      return null;
  }
}

/**
 * What to call paying cash, given what is actually happening.
 *
 * "Cash on Delivery" is the only cash label the platform had, and it was shown
 * for collections, salon appointments and online design work alike — nothing
 * is delivered in any of those. The label a customer reads has to match the
 * transaction in front of them.
 */
export function cashMethodLabel(
  fulfilment: CartFulfilment,
  deliveryMethod: string
): string {
  // Goods in the basket keep the goods wording — they really do move.
  if (fulfilment.hasGoods) {
    return deliveryMethod === "delivery" ? "Cash on Delivery" : "Cash on Collection";
  }
  if (fulfilment.hasStay && !fulfilment.hasServices) return "Cash at check-in";
  if (!fulfilment.hasServices) {
    return deliveryMethod === "delivery" ? "Cash on Delivery" : "Cash on Collection";
  }

  switch (fulfilment.primaryMode) {
    case "at_client":
      return "Cash on the day";
    case "at_store":
      return "Cash at your appointment";
    case "online":
      return "Cash";
    default:
      return "Cash";
  }
}

/** The line under the payment choice, matched to the same reality. */
export function cashInstruction(
  fulfilment: CartFulfilment,
  deliveryMethod: string
): string {
  if (fulfilment.hasStay && !fulfilment.hasGoods && !fulfilment.hasServices) {
    return "Please have cash ready when you check in.";
  }
  if (fulfilment.hasGoods || !fulfilment.hasServices) {
    return deliveryMethod === "delivery"
      ? "Please have cash ready for the order amount. Any buyer-arranged courier fee is paid separately."
      : "Please pay when collecting your order.";
  }

  switch (fulfilment.primaryMode) {
    case "at_client":
      return "Please have cash ready when we arrive.";
    case "at_store":
      return "Please pay at your appointment.";
    case "online":
      return "The merchant will arrange payment with you on WhatsApp.";
    default:
      return "The merchant will arrange payment with you on WhatsApp.";
  }
}

/**
 * What the fulfilment row on a record should say — the one line that told an
 * online-design customer their work was "Collection" and a guest that their
 * room was "Pickup". Records outlive the checkout screen, so they need the
 * same vocabulary, derived from what was actually ordered.
 */
export function fulfilmentNoun(
  fulfilment: CartFulfilment,
  deliveryMethod: string
): string {
  if (fulfilment.hasGoods) {
    return deliveryMethod === "delivery" ? "Delivery" : "Collection";
  }
  if (fulfilment.hasStay && !fulfilment.hasServices) return "Stay at the property";

  switch (fulfilment.primaryMode) {
    case "at_client":
      return "The merchant comes to you";
    case "at_store":
      return "At the merchant";
    case "online":
      return "Online — nothing to collect";
    default:
      return deliveryMethod === "delivery" ? "Delivery" : "Collection";
  }
}
