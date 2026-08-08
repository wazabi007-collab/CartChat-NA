/**
 * Checks for service fulfilment rules.
 *
 * A single cart can mix an online consultation, an in-salon appointment and an
 * on-site visit, and those ask for different things at checkout. The precedence
 * rules are pinned here. Run after touching src/lib/service-mode.ts:
 *
 *   npx tsx scripts/check-service-mode.ts
 */
import {
  summariseFulfilment,
  fulfilmentSummary,
  isServiceMode,
  type FulfilmentItem,
} from "../src/lib/service-mode";

let failures = 0;

function check(name: string, actual: unknown, expected: unknown) {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a === e) {
    console.log(`ok   ${name}`);
    return;
  }
  failures++;
  console.log(`FAIL ${name}\n  got      ${a}\n  expected ${e}`);
}

const goods: FulfilmentItem = {};
const atStore: FulfilmentItem = { serviceMode: "at_store" };
const atClient: FulfilmentItem = { serviceMode: "at_client" };
const online: FulfilmentItem = { serviceMode: "online" };

// --- Guard ---------------------------------------------------------------

check("valid mode", isServiceMode("at_client"), true);
check("null is not a mode", isServiceMode(null), false);
check("stray value rejected", isServiceMode("delivery"), false);

// --- Single-mode carts ---------------------------------------------------

const onlyGoods = summariseFulfilment([goods, goods]);
check("goods need no schedule", onlyGoods.needsSchedule, false);
check("goods charge no call-out", onlyGoods.chargesCallout, false);
check("goods have no primary mode", onlyGoods.primaryMode, null);

const salon = summariseFulfilment([atStore]);
check("in-store booking needs a time", salon.needsSchedule, true);
// The customer travels, not the merchant, so no address and nothing to charge.
check("in-store booking needs no address", salon.serviceNeedsAddress, false);
check("in-store booking charges no call-out", salon.chargesCallout, false);

const plumber = summariseFulfilment([atClient]);
check("on-site booking needs an address", plumber.serviceNeedsAddress, true);
check("on-site booking charges call-out", plumber.chargesCallout, true);

const consult = summariseFulfilment([online]);
check("online needs a time", consult.needsSchedule, true);
// The whole point of the online mode: stop demanding an address for a video call.
check("online needs no address", consult.serviceNeedsAddress, false);
check("online charges no call-out", consult.chargesCallout, false);

// --- Mixed carts ---------------------------------------------------------

// The most demanding requirement wins, so an address is still collected.
const mixedServices = summariseFulfilment([online, atClient, atStore]);
check("strongest mode wins", mixedServices.primaryMode, "at_client");
check("mixed modes listed strongest first", mixedServices.modes, [
  "at_client",
  "at_store",
  "online",
]);
check("mixed services need an address", mixedServices.serviceNeedsAddress, true);

// Online plus in-store must NOT start demanding an address.
const noTravel = summariseFulfilment([online, atStore]);
check("online plus in-store needs no address", noTravel.serviceNeedsAddress, false);
check("online plus in-store primary is at_store", noTravel.primaryMode, "at_store");

// Booking three on-site jobs is still one trip out, so one call-out fee.
const manyVisits = summariseFulfilment([atClient, atClient, atClient]);
check("call-out charged once", manyVisits.chargesCallout, true);
check("repeated mode not duplicated", manyVisits.modes, ["at_client"]);

// A salon selling shampoo alongside a haircut: goods and a service together.
const shampooAndCut = summariseFulfilment([goods, atStore]);
check("goods and service both flagged", [shampooAndCut.hasGoods, shampooAndCut.hasServices], [true, true]);
check("goods plus service still needs a time", shampooAndCut.needsSchedule, true);

check("empty cart", summariseFulfilment([]).needsSchedule, false);

// --- Wording -------------------------------------------------------------

check("no summary for a goods cart", fulfilmentSummary(onlyGoods), null);
check("on-site wording", fulfilmentSummary(plumber), "We come to you. Tell us where and when below.");
check("online wording", fulfilmentSummary(consult), "This happens online — no address needed. Just pick a time.");

console.log(failures === 0 ? "\nALL PASS" : `\n${failures} FAILURE(S)`);
process.exit(failures === 0 ? 0 : 1);
