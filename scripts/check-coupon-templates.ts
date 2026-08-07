/**
 * Checks for the starter coupon templates.
 *
 * These produce real discounts a merchant will publish, so the values and the
 * code-collision handling are worth pinning down. Run after touching
 * src/lib/coupon-templates.ts:
 *
 *   npx tsx scripts/check-coupon-templates.ts
 */
import {
  COUPON_TEMPLATES,
  templateToForm,
  type CouponTemplate,
} from "../src/lib/coupon-templates";

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

function byId(id: string): CouponTemplate {
  const t = COUPON_TEMPLATES.find((x) => x.id === id);
  if (!t) throw new Error(`no template ${id}`);
  return t;
}

// A fixed "today" so expiry arithmetic is deterministic.
const TODAY = new Date("2026-08-07T09:00:00+02:00");

check("four templates ship", COUPON_TEMPLATES.length, 4);
check(
  "every template has a valid discount type",
  COUPON_TEMPLATES.every((t) => ["percentage", "fixed"].includes(t.discount_type)),
  true
);

// Percentage values are raw numbers; fixed values are NAD with two decimals,
// matching how the coupons page renders an existing coupon for editing.
const welcome = templateToForm(byId("welcome"), [], TODAY);
check("welcome code", welcome.code, "WELCOME10");
check("welcome type", welcome.discount_type, "percentage");
check("welcome value", welcome.discount_value_display, "10");
check("welcome no minimum", welcome.min_order_display, "");
check("welcome no use cap", welcome.max_uses_display, "");
check("welcome expires in 30 days", welcome.expires_at, "2026-09-06");
check("welcome is active", welcome.is_active, true);

const save = templateToForm(byId("spend-save"), [], TODAY);
check("spend-save type", save.discount_type, "fixed");
check("spend-save value in NAD", save.discount_value_display, "20.00");
check("spend-save minimum in NAD", save.min_order_display, "200.00");

const launch = templateToForm(byId("launch"), [], TODAY);
check("launch use cap", launch.max_uses_display, "50");
check("launch expires in 14 days", launch.expires_at, "2026-08-21");

const delivery = templateToForm(byId("delivery"), [], TODAY);
check("delivery value", delivery.discount_value_display, "30.00");
check("delivery minimum", delivery.min_order_display, "250.00");

// Applying the same template twice must not collide with the existing code.
check(
  "second use suffixes the code",
  templateToForm(byId("welcome"), ["WELCOME10"], TODAY).code,
  "WELCOME10-2"
);
check(
  "third use increments again",
  templateToForm(byId("welcome"), ["WELCOME10", "WELCOME10-2"], TODAY).code,
  "WELCOME10-3"
);
check(
  "collision check ignores case",
  templateToForm(byId("welcome"), ["welcome10"], TODAY).code,
  "WELCOME10-2"
);
check(
  "unrelated codes do not collide",
  templateToForm(byId("welcome"), ["SAVE20", "XMAS"], TODAY).code,
  "WELCOME10"
);

// Month and year rollover in the expiry maths.
check(
  "expiry rolls into the next year",
  templateToForm(byId("welcome"), [], new Date("2026-12-20T09:00:00+02:00")).expires_at,
  "2027-01-19"
);

console.log(failures === 0 ? "\nALL PASS" : `\n${failures} FAILURE(S)`);
process.exit(failures === 0 ? 0 : 1);
