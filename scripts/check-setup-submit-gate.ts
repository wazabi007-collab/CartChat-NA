/**
 * The Create Store button must never be a dead button.
 *
 * A merchant filled in all three steps and then could not submit. The button
 * carried four preconditions in its `disabled` expression — payment methods,
 * policy acceptance, and a courier pickup address — and announced none of
 * them. Two of the three were on screen but unexplained; the pickup address
 * lived back on step 2, presented there as optional, so the merchant had no
 * way to even see what was wrong. They just clicked a grey button and gave up.
 *
 * The handler already carried a perfectly good message for the policy case.
 * It was unreachable: the button was disabled on the very condition the
 * message existed to explain.
 *
 * Settings enforces the identical courier rule the right way — it lets you
 * press Save and tells you what to fix — so the rule lives in one place now
 * and both pages ask it the same question.
 *
 * Rule: the submit button gates on `loading` alone. Everything else must come
 * back as a message the merchant can act on, pointing at the step that holds
 * the field.
 *
 *   npx tsx scripts/check-setup-submit-gate.ts
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  storeSetupBlocker,
  courierNeedsPickupAddress,
} from "../src/lib/store-setup-gate";

const SETUP = "src/app/(dashboard)/dashboard/setup/page.tsx";
const SETTINGS = "src/app/(dashboard)/dashboard/settings/page.tsx";

let failures = 0;

function fail(msg: string) {
  console.error(`  FAIL  ${msg}`);
  failures++;
}

function pass(msg: string) {
  console.log(`  ok    ${msg}`);
}

// ── 1. The button itself ────────────────────────────────────────────────
const setup = readFileSync(join(process.cwd(), SETUP), "utf8");

const submitBtn = setup.match(/type="submit"[\s\S]{0,400}?disabled=\{([^}]*)\}/);
if (!submitBtn) {
  fail(`${SETUP}: could not find the submit button's disabled expression`);
} else {
  const expr = submitBtn[1].trim();
  if (expr !== "loading") {
    fail(
      `${SETUP}: Create Store gates on \`${expr}\`.\n` +
        `        Only \`loading\` may disable it. Every other precondition has to\n` +
        `        reach the merchant as a message — a grey button explains nothing.`
    );
  } else {
    pass("Create Store is disabled only while submitting");
  }
}

// ── 2. Both pages ask the same question ─────────────────────────────────
const settings = readFileSync(join(process.cwd(), SETTINGS), "utf8");
for (const [name, body] of [
  [SETUP, setup],
  [SETTINGS, settings],
] as const) {
  if (!body.includes("courierNeedsPickupAddress")) {
    fail(
      `${name}: re-implements the courier pickup rule by hand.\n` +
        `        Import courierNeedsPickupAddress so the two pages cannot drift.`
    );
  } else {
    pass(`${name} uses the shared courier pickup rule`);
  }
}

// ── 3. Every blocked state names itself ─────────────────────────────────
const ok = {
  selectedMethods: ["cod"],
  acceptedPolicy: true,
  offersDelivery: false,
  enabledProviders: ["store", "yango", "indrive"],
  town: "windhoek",
  pickupAddress: "",
};

if (storeSetupBlocker(ok)) {
  fail("a complete, valid store was blocked from submitting");
} else {
  pass("a complete store submits");
}

const blocked: [string, Partial<typeof ok>][] = [
  ["no payment method chosen", { selectedMethods: [] }],
  ["selling rules not accepted", { acceptedPolicy: false }],
  // The one that actually trapped a real merchant: Windhoek, pickup left on
  // (it is on by default), delivery ticked, courier defaults on, address blank.
  // The field they need is back on step 2 and looks optional there.
  ["courier delivery with no pickup address", { offersDelivery: true }],
];

for (const [label, patch] of blocked) {
  const blocker = storeSetupBlocker({ ...ok, ...patch });
  if (!blocker) {
    fail(`${label}: submitted silently instead of explaining what is missing`);
  } else if (!blocker.message.trim()) {
    fail(`${label}: blocked with an empty message`);
  } else if (![1, 2, 3].includes(blocker.step)) {
    fail(`${label}: pointed at step ${blocker.step}, which does not exist`);
  } else {
    pass(`${label} → step ${blocker.step}: "${blocker.message}"`);
  }
}

// The address is only demanded where the courier actually operates.
if (courierNeedsPickupAddress(["store", "yango", "indrive"], "otjiwarongo", "")) {
  fail("demanded a courier pickup address in a town no courier serves");
} else {
  pass("no pickup address demanded outside courier towns");
}

if (!courierNeedsPickupAddress(["store", "yango"], "windhoek", "   ")) {
  fail("accepted whitespace as a courier pickup address");
} else {
  pass("whitespace is not a pickup address");
}

console.log(
  failures === 0
    ? "\nPASS  Create Store always responds, and says what is missing."
    : `\nFAIL  ${failures} problem(s).`
);
process.exit(failures === 0 ? 0 : 1);
