import { namibianDateString } from "@/lib/date";

/**
 * Ready-made coupons a merchant can start from.
 *
 * These only seed the create form — nothing reaches the database until the
 * merchant saves, so applying one costs nothing if they change their mind.
 *
 * Everything here is expressible with the existing `discount_type` enum
 * (`percentage` | `fixed`) plus a minimum order. There is deliberately no
 * free-delivery template: the schema cannot express one, and faking it would
 * mean quietly discounting the wrong amount.
 */

export interface CouponTemplate {
  id: string;
  name: string;
  description: string;
  code: string;
  discount_type: "percentage" | "fixed";
  /** Percent for `percentage`, cents for `fixed`. */
  discount_value: number;
  /** Cents. 0 means no minimum. */
  min_order_cents: number;
  /** 0 means unlimited. */
  max_uses: number;
  expires_in_days: number;
}

/** The form shape used by the coupons dashboard page. */
export interface CouponFormValues {
  code: string;
  discount_type: "percentage" | "fixed";
  discount_value_display: string;
  min_order_display: string;
  max_uses_display: string;
  is_active: boolean;
  starts_at: string;
  expires_at: string;
}

export const COUPON_TEMPLATES: CouponTemplate[] = [
  {
    id: "welcome",
    name: "Welcome offer",
    description: "10% off with no minimum — good for first-time customers.",
    code: "WELCOME10",
    discount_type: "percentage",
    discount_value: 10,
    min_order_cents: 0,
    max_uses: 0,
    expires_in_days: 30,
  },
  {
    id: "spend-save",
    name: "Spend and save",
    description: "N$20 off orders over N$200 — pushes basket size up.",
    code: "SAVE20",
    discount_type: "fixed",
    discount_value: 2000,
    min_order_cents: 20000,
    max_uses: 0,
    expires_in_days: 30,
  },
  {
    id: "launch",
    name: "Launch promo",
    description: "20% off for the first 50 customers, for two weeks.",
    code: "LAUNCH20",
    discount_type: "percentage",
    discount_value: 20,
    min_order_cents: 0,
    max_uses: 50,
    expires_in_days: 14,
  },
  {
    id: "delivery",
    name: "Delivery on us",
    description: "N$30 off orders over N$250 — covers a typical delivery fee.",
    code: "DELIVERY30",
    discount_type: "fixed",
    discount_value: 3000,
    min_order_cents: 25000,
    max_uses: 0,
    expires_in_days: 30,
  },
];

/** Cents to the NAD string the form expects, e.g. 2000 -> "20.00". */
function centsToDisplay(cents: number): string {
  return (cents / 100).toFixed(2);
}

/**
 * A code the merchant is not already using.
 *
 * Applying the same template twice is a normal thing to do — a merchant might
 * run the welcome offer again next month. Without suffixing, the second attempt
 * fails on the unique code constraint with nothing explaining why.
 */
function uniqueCode(base: string, usedCodes: string[]): string {
  const taken = new Set(usedCodes.map((c) => c.trim().toUpperCase()));
  if (!taken.has(base)) return base;

  for (let n = 2; n <= 99; n++) {
    const candidate = `${base}-${n}`;
    if (!taken.has(candidate)) return candidate;
  }

  // Vanishingly unlikely; the form's own validation reports the duplicate.
  return base;
}

/**
 * Turn a template into form values.
 *
 * Expiry is computed with namibianDateString rather than `new Date()`, which on
 * Vercel resolves to UTC — a template applied after 22:00 local would otherwise
 * expire a day early.
 */
export function templateToForm(
  template: CouponTemplate,
  usedCodes: string[],
  today: Date = new Date()
): CouponFormValues {
  const expiry = new Date(
    today.getTime() + template.expires_in_days * 24 * 60 * 60 * 1000
  );

  return {
    code: uniqueCode(template.code, usedCodes),
    discount_type: template.discount_type,
    discount_value_display:
      template.discount_type === "fixed"
        ? centsToDisplay(template.discount_value)
        : String(template.discount_value),
    min_order_display:
      template.min_order_cents > 0 ? centsToDisplay(template.min_order_cents) : "",
    max_uses_display: template.max_uses > 0 ? String(template.max_uses) : "",
    is_active: true,
    // Empty means "starts immediately", which is what a merchant expects when
    // they apply a template.
    starts_at: "",
    expires_at: namibianDateString(expiry),
  };
}

/** Human-readable summary for the template card, e.g. "10% off". */
export function templateSummary(template: CouponTemplate): string {
  const value =
    template.discount_type === "percentage"
      ? `${template.discount_value}% off`
      : `N$${centsToDisplay(template.discount_value)} off`;

  const min =
    template.min_order_cents > 0
      ? ` over N$${centsToDisplay(template.min_order_cents)}`
      : "";

  return `${value}${min}`;
}
