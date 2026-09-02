/**
 * Checks for payment-method availability.
 *
 * These decide whether a buyer is shown a way to pay that actually works, so
 * the cases below are drawn from real production data. Run after touching
 * src/lib/payment-methods.ts:
 *
 *   npx tsx scripts/check-payment-methods.ts
 */
import {
  isComingSoon,
  isPaymentMethodUsable,
  usablePaymentMethods,
  misconfiguredPaymentMethods,
} from "../src/lib/payment-methods";

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

const NOTHING = {};

// Cash needs no setup.
check("cod always usable", isPaymentMethodUsable("cod", NOTHING), true);

// EFT needs BOTH a bank and an account number. This is the Octovia Nexus
// Home & Lifestyle case: a bank name saved, the account number blank.
check("eft needs both fields", isPaymentMethodUsable("eft", { bank_name: "Nedbank Namibia" }), false);
check("eft with empty account", isPaymentMethodUsable("eft", { bank_name: "Nedbank Namibia", bank_account_number: "" }), false);
check("eft with whitespace account", isPaymentMethodUsable("eft", { bank_name: "Nedbank Namibia", bank_account_number: "   " }), false);
check("eft fully configured", isPaymentMethodUsable("eft", { bank_name: "Nedbank Namibia", bank_account_number: "11000107877" }), true);
check("eft without a bank", isPaymentMethodUsable("eft", { bank_account_number: "11000107877" }), false);

check("ewallet empty", isPaymentMethodUsable("ewallet", { ewallet_number: "" }), false);
check("ewallet set", isPaymentMethodUsable("ewallet", { ewallet_number: "0812384424" }), true);
check("momo unset", isPaymentMethodUsable("momo", NOTHING), false);
check("pay2cell set", isPaymentMethodUsable("pay2cell", { pay2cell_number: "0811234567" }), true);
check("paytoday set", isPaymentMethodUsable("paytoday", { paytoday_number: "0811234567" }), true);

// Stale value carried by a live store; it rendered as the generic "Payment".
check("unknown method rejected", isPaymentMethodUsable("dpo", NOTHING), false);

// --- Real store shapes ----------------------------------------------------

// Octovia Nexus Home & Lifestyle: EFT only, account number blank -> nothing.
check(
  "octovia home: nothing usable",
  usablePaymentMethods(["eft"], { bank_name: "Nedbank Namibia", bank_account_number: "" }),
  []
);

// Octovia Nexus Promo: eft + cod + stale dpo, no bank details -> cash only.
check(
  "octovia promo: cash only",
  usablePaymentMethods(["eft", "cod", "dpo"], NOTHING),
  ["cod"]
);

// Sunrise Crumbs: cod + ewallet, ewallet blank -> cash only.
check(
  "sunrise crumbs: cash only",
  usablePaymentMethods(["cod", "ewallet"], { ewallet_number: "" }),
  ["cod"]
);

// A properly configured store keeps its own order.
check(
  "fully configured store",
  usablePaymentMethods(["cod", "ewallet", "eft"], {
    ewallet_number: "0812384424",
    bank_name: "Bank Windhoek",
    bank_account_number: "8003421",
  }),
  ["cod", "ewallet", "eft"]
);

// Never chosen: offer what they can actually receive, rather than defaulting
// to EFT — the old fallback offered bank transfer with no bank details.
check(
  "no selection falls back to configured",
  usablePaymentMethods(null, { ewallet_number: "0812384424" }),
  ["cod", "ewallet"]
);
check("no selection, nothing configured", usablePaymentMethods([], NOTHING), ["cod"]);

// --- Merchant-facing warning ---------------------------------------------

check(
  "warns about the blank ewallet",
  misconfiguredPaymentMethods(["cod", "ewallet"], { ewallet_number: "" }),
  ["ewallet"]
);
check(
  "warns about eft and stale dpo",
  misconfiguredPaymentMethods(["eft", "cod", "dpo"], NOTHING),
  ["eft", "dpo"]
);
check(
  "nothing to warn about",
  misconfiguredPaymentMethods(["cod"], NOTHING),
  []
);


// WayaMe: the Bank of Namibia instant payment system. Same shape as every
// other method here -- the merchant publishes an alias and the buyer sends to
// it -- so the same rule applies: never offer it without the number, or the
// buyer picks it and the order carries "Send to --".
// WayaMe is built and shipped but marked coming soon until the banks switch
// consumer payments on. The merchant dashboard shows it greyed out; nothing
// else may treat it as live. When it goes live, delete `comingSoon` from the
// PAYMENT_METHODS entry and flip the three expectations below.
check("wayame is marked coming soon", isComingSoon("wayame"), true);
check("a live method is not coming soon", isComingSoon("eft"), false);
check(
  "coming-soon is NOT usable even with a number configured",
  isPaymentMethodUsable("wayame", { wayame_number: "+264811234567" }),
  false
);
check(
  "coming-soon is never offered to a buyer",
  usablePaymentMethods(["wayame", "cod"], { wayame_number: "+264811234567" }),
  ["cod"]
);
check(
  "coming-soon is not reported as merchant misconfiguration",
  misconfiguredPaymentMethods(["wayame", "cod"], { wayame_number: null }),
  []
);

console.log(failures === 0 ? "\nALL PASS" : `\n${failures} FAILURE(S)`);
process.exit(failures === 0 ? 0 : 1);
