/**
 * What stops a store from being saved — always as a message, never as a
 * greyed-out button.
 *
 * The setup wizard used to encode these rules in the submit button's
 * `disabled` expression. A merchant who missed the selling-rules tickbox, or
 * left the courier pickup address blank back on step 2, arrived at a button
 * that simply did not respond and gave no reason. At least one real merchant
 * signed up, filled in all three steps, and never got a store.
 *
 * So every rule returns the sentence the merchant reads and the step holding
 * the field they need to change.
 */
import { isCourierAvailable } from "./constants";

export interface StoreSetupState {
  /** Payment methods ticked on step 3. */
  selectedMethods: string[];
  /** The prohibited-goods tickbox on step 3. */
  acceptedPolicy: boolean;
  /** Whether the merchant offers delivery at all (step 2). */
  offersDelivery: boolean;
  /** Delivery providers ticked on step 2, before town filtering. */
  enabledProviders: string[];
  /** Store town — decides which couriers actually operate. */
  town: string | null | undefined;
  /** Step 2's pickup address, shared by the pickup and courier fields. */
  pickupAddress: string;
}

export interface SetupBlocker {
  /** Shown to the merchant verbatim. */
  message: string;
  /** The wizard step holding the field they need to change. */
  step: 1 | 2 | 3;
}

/**
 * True when a buyer-booked courier is switched on and has nowhere to collect
 * from. Yango and inDrive only run in some towns, so a courier the merchant's
 * town isn't served by is dropped before the question is asked — otherwise a
 * shop in Otjiwarongo would be nagged for an address no driver will ever use.
 *
 * Both the setup wizard and Settings call this. They enforced it separately
 * before, and drifted: Settings explained the problem, setup just went grey.
 */
export const COURIER_PICKUP_MESSAGE =
  "Add a pickup address so Yango/inDrive couriers know where to collect.";

export function courierNeedsPickupAddress(
  providers: string[],
  town: string | null | undefined,
  pickupAddress: string
): boolean {
  const live = providers.filter((p) => isCourierAvailable(p, town));
  const offersCourier = live.includes("yango") || live.includes("indrive");
  return offersCourier && !pickupAddress.trim();
}

/**
 * The first thing standing between this merchant and a store, or null if
 * nothing is. Ordered so the merchant fixes what is in front of them on step 3
 * before being sent back a step.
 */
export function storeSetupBlocker(s: StoreSetupState): SetupBlocker | null {
  if (s.selectedMethods.length === 0) {
    return {
      message: "Choose at least one way customers can pay you.",
      step: 3,
    };
  }

  if (!s.acceptedPolicy) {
    return {
      message:
        "Please accept the OshiCart selling rules before creating your store.",
      step: 3,
    };
  }

  if (
    s.offersDelivery &&
    courierNeedsPickupAddress(s.enabledProviders, s.town, s.pickupAddress)
  ) {
    return { message: COURIER_PICKUP_MESSAGE, step: 2 };
  }

  return null;
}
