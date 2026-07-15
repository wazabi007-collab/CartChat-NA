"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { slugify, normalizeNamibianPhone } from "@/lib/utils";
import { BANKS_NAMIBIA, BANK_BRANCH_CODES, INDUSTRIES_NAMIBIA, INDUSTRY_GROUP_ORDER, PAYMENT_METHODS, NAMIBIA_REGIONS, townsForRegion, REFERRED_TRIAL_DAYS, STANDARD_TRIAL_DAYS } from "@/lib/constants";
import { storeSetupSchema } from "@/lib/validations";
import { SAFETY_POLICY_VERSION, safetyMessage, scanTextForProhibitedContent } from "@/lib/safety/prohibited-content";
import { track } from "@/lib/track";
import { Store, ArrowRight, Check, AlertCircle, X } from "lucide-react";
import { PhoneInput } from "@/components/phone-input";
import { PaymentMethodVisual } from "@/components/payment-method-visual";
import { EwalletProviderPicker } from "@/components/ewallet-provider-picker";
import Link from "next/link";
import {
  inputBase,
  textareaBase,
  selectBase,
  focusGreen,
  label,
  helperText,
  card,
  sectionHeading,
  btnPrimaryGreen,
  alertError,
  alertIcon,
} from "@/lib/ui";

const DRAFT_KEY = "oshicart-setup-draft";

const INITIAL_FORM = {
  store_name: "",
  description: "",
  whatsapp_number: "",
  industry: "",
  region: "",
  town: "",
  bank_name: "",
  bank_account_number: "",
  bank_account_holder: "",
  bank_branch_code: "",
  momo_number: "",
  ewallet_provider: "",
  ewallet_number: "",
  pay2cell_number: "",
  paytoday_number: "",
  pickup_address: "",
  delivery_fee_display: "",
};

export default function StoreSetupPage() {
  return (
    <Suspense>
      <StoreSetupForm />
    </Suspense>
  );
}

/** Visual step progress bar */
function StepProgress({ current, total }: { current: number; total: number }) {
  const steps = [
    { num: 1, label: "Store Info" },
    { num: 2, label: "Delivery" },
    { num: 3, label: "Payments" },
  ];
  return (
    <div className="flex items-center justify-between mb-6 max-w-xs mx-auto">
      {steps.slice(0, total).map((s, i) => (
        <div key={s.num} className="flex items-center">
          <div className="flex flex-col items-center">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                s.num < current
                  ? "bg-green-600 text-white"
                  : s.num === current
                  ? "bg-green-600 text-white ring-4 ring-green-100"
                  : "bg-gray-200 text-gray-500"
              }`}
            >
              {s.num < current ? <Check size={14} /> : s.num}
            </div>
            <span className={`text-xs mt-1 ${s.num <= current ? "text-green-700 font-medium" : "text-gray-400"}`}>
              {s.label}
            </span>
          </div>
          {i < steps.length - 1 && (
            <div
              className={`w-12 h-0.5 mx-1 mt-[-14px] ${
                s.num < current ? "bg-green-600" : "bg-gray-200"
              }`}
            />
          )}
        </div>
      ))}
    </div>
  );
}

function StoreSetupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tierParam = searchParams.get("tier");
  const refParam = searchParams.get("ref");
  const supabase = createClient();

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [referralCode, setReferralCode] = useState<string | null>(null);
  const [referrerName, setReferrerName] = useState<string | null>(null);

  const [form, setForm] = useState({ ...INITIAL_FORM });
  const [selectedMethods, setSelectedMethods] = useState<string[]>(["cod"]);
  const [enabledProviders, setEnabledProviders] = useState<string[]>(["store", "yango", "indrive"]);
  const [offersPickup, setOffersPickup] = useState(true);
  const [offersDelivery, setOffersDelivery] = useState(false);
  const [whatsappStatus, setWhatsappStatus] = useState<"idle" | "checking" | "blocked" | "warning" | "clear">("idle");
  const [acceptedPolicy, setAcceptedPolicy] = useState(false);
  const [draftRestored, setDraftRestored] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  // Restore a saved draft on mount. localStorage is browser-only, so this
  // can't be a lazy useState initializer (it would mismatch the SSR HTML).
  // The one-time post-hydration setState is intentional.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (raw) {
        const draft = JSON.parse(raw);
        if (draft && typeof draft === "object") {
          if (draft.form && typeof draft.form === "object") {
            setForm((prev) => ({ ...prev, ...draft.form }));
          }
          if (typeof draft.step === "number" && draft.step >= 1 && draft.step <= 3) setStep(draft.step);
          if (Array.isArray(draft.selectedMethods)) setSelectedMethods(draft.selectedMethods);
          if (Array.isArray(draft.enabledProviders)) setEnabledProviders(draft.enabledProviders);
          if (typeof draft.offersPickup === "boolean") setOffersPickup(draft.offersPickup);
          if (typeof draft.offersDelivery === "boolean") setOffersDelivery(draft.offersDelivery);
          setDraftRestored(true);
        }
      }
    } catch {
      // Corrupt draft or storage unavailable — start fresh
    }
    setHydrated(true);
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  // Debounce-save the draft whenever the form changes
  useEffect(() => {
    if (!hydrated) return;
    const hasContent =
      step > 1 || form.store_name || form.description || form.whatsapp_number || form.industry;
    if (!hasContent) return;
    const timer = setTimeout(() => {
      try {
        localStorage.setItem(
          DRAFT_KEY,
          JSON.stringify({ step, form, selectedMethods, enabledProviders, offersPickup, offersDelivery })
        );
      } catch {
        // Storage unavailable (private mode / quota) — skip saving
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [hydrated, step, form, selectedMethods, enabledProviders, offersPickup, offersDelivery]);

  // Validate a referral code (from the ?ref= param or a stashed localStorage
  // value) on mount so we can show the trial-extension banner. Final
  // attribution is re-checked with the phone number at submit time.
  useEffect(() => {
    let code = refParam;
    if (!code) {
      try { code = localStorage.getItem("oshicart_ref"); } catch { code = null; }
    }
    if (!code) return;
    fetch("/api/referral/validate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code }),
    })
      .then((r) => r.json())
      .then((v) => {
        if (v?.valid) {
          setReferralCode(code);
          setReferrerName(v.referrerName ?? null);
        }
      })
      .catch(() => { /* ignore — no attribution */ });
  }, [refParam]);

  function clearDraft() {
    try {
      localStorage.removeItem(DRAFT_KEY);
    } catch {
      // Storage unavailable — nothing to clear
    }
  }

  function startOver() {
    clearDraft();
    setForm({ ...INITIAL_FORM });
    setStep(1);
    setSelectedMethods(["cod"]);
    setOffersPickup(true);
    setOffersDelivery(false);
    setAcceptedPolicy(false);
    setWhatsappStatus("idle");
    setError("");
    setDraftRestored(false);
  }

  function update(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function checkWhatsapp(phone: string) {
    if (!phone || phone.length < 7) {
      setWhatsappStatus("idle");
      return;
    }
    setWhatsappStatus("checking");
    try {
      const res = await fetch("/api/check-whatsapp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      });
      const data = await res.json();
      if (data.blocked) {
        setWhatsappStatus("blocked");
      } else if (data.exists) {
        setWhatsappStatus("warning");
      } else {
        setWhatsappStatus("clear");
      }
    } catch {
      setWhatsappStatus("idle");
    }
  }

  function goToStep(next: number) {
    setError("");
    track("onboarding_step_completed", { step_index: step, step_label: step === 1 ? "store_info" : step === 2 ? "delivery" : "payments" });
    setStep(next);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const result = storeSetupSchema.safeParse(form);
    if (!result.success) {
      setError(result.error.issues[0].message);
      setLoading(false);
      return;
    }

    const safetyScan = scanTextForProhibitedContent([form.store_name, form.description, form.industry]);
    if (safetyScan.severity === "block") {
      setError(safetyMessage(safetyScan));
      setLoading(false);
      return;
    }

    if (!acceptedPolicy) {
      setError("Please accept the OshiCart selling rules before creating your store.");
      setLoading(false);
      return;
    }

    if (!form.region || !form.town) {
      setError("Please choose your region and town");
      setStep(1);
      setLoading(false);
      return;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setError("Not authenticated");
      setLoading(false);
      return;
    }

    const slug = slugify(form.store_name);

    // Check slug uniqueness
    const { data: existing } = await supabase
      .from("merchants")
      .select("id")
      .eq("store_slug", slug)
      .single();

    const finalSlug = existing
      ? `${slug}-${Date.now().toString(36)}`
      : slug;

    // Server-side WhatsApp duplicate check (safety net)
    const waCheck = await fetch("/api/check-whatsapp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone: form.whatsapp_number }),
    }).then((r) => r.json()).catch(() => ({ blocked: false }));

    if (waCheck.blocked) {
      setError("This WhatsApp number is already linked to a store. Please subscribe to continue.");
      setLoading(false);
      return;
    }

    // Re-validate the referral code with the phone number to catch
    // self-referral (a referrer signing up their own store with their code).
    let validReferral: string | null = null;
    if (referralCode) {
      const rv = await fetch("/api/referral/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: referralCode, phone: form.whatsapp_number }),
      }).then((r) => r.json()).catch(() => ({ valid: false }));
      if (rv?.valid) validReferral = referralCode;
    }

    const { data: newMerchant, error: insertError } = await supabase
      .from("merchants")
      .insert({
        user_id: user.id,
        store_name: form.store_name,
        store_slug: finalSlug,
        description: form.description || null,
        whatsapp_number: normalizeNamibianPhone(form.whatsapp_number),
        industry: form.industry || "other",
        region: form.region || null,
        town: form.town || null,
        referred_by_code: validReferral,
        bank_name: form.bank_name || null,
        bank_account_number: form.bank_account_number || null,
        bank_account_holder: form.bank_account_holder || null,
        bank_branch_code: form.bank_branch_code || null,
        accepted_payment_methods: selectedMethods,
        momo_number: form.momo_number || null,
        ewallet_provider: form.ewallet_provider || null,
        ewallet_number: form.ewallet_number || null,
        pay2cell_number: form.pay2cell_number || null,
        paytoday_number: form.paytoday_number || null,
        enabled_delivery_providers: enabledProviders,
        pickup_address: form.pickup_address.trim() || null,
        delivery_fee_nad: offersDelivery ? Math.round((parseFloat(form.delivery_fee_display) || 0) * 100) : 0,
        store_status: "active",
        prohibited_policy_accepted_at: new Date().toISOString(),
        prohibited_policy_version: SAFETY_POLICY_VERSION,
      })
      .select("id")
      .single();

    if (insertError || !newMerchant) {
      setError(insertError?.message || "Failed to create store");
      setLoading(false);
      return;
    }

    // Create trial subscription (30-day, or 45-day for referred merchants)
    const trialDays = validReferral ? REFERRED_TRIAL_DAYS : STANDARD_TRIAL_DAYS;
    const trialEnds = new Date();
    trialEnds.setDate(trialEnds.getDate() + trialDays);

    await supabase.from("subscriptions").insert({
      merchant_id: newMerchant.id,
      tier: "oshi_start",
      status: "trial",
      trial_ends_at: trialEnds.toISOString(),
    });

    try { localStorage.removeItem("oshicart_ref"); } catch { /* ignore */ }

    // WhatsApp Business API: welcome message (to the merchant's own number)
    fetch("/api/whatsapp/notify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        merchant_id: newMerchant.id,
        template_name: "welcome_merchant",
        recipient_phone: form.whatsapp_number,
        variables: [
          form.store_name,
          `https://oshicart.com/s/${finalSlug}`,
        ],
      }),
    }).catch(() => {});

    fetch("/api/notifications/merchant-signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ merchant_id: newMerchant.id }),
    }).catch(() => {});

    track("onboarding_completed", { industry: form.industry, payment_methods: selectedMethods.join(",") });

    clearDraft();

    if (tierParam) {
      router.push(`/pricing/checkout?tier=${tierParam}`);
    } else {
      router.push("/dashboard?welcome=true");
    }
    router.refresh();
  }

  const whatsappStatusNode = (() => {
    if (whatsappStatus === "checking") return <p className="text-xs text-gray-400">Checking number...</p>;
    if (whatsappStatus === "blocked") return (
      <div>
        <p className="text-xs text-red-600">
          This WhatsApp number is already linked to a store. Please subscribe to continue.
        </p>
        <a href="/pricing" className="text-xs text-[#2B5EA7] hover:underline font-medium">
          View Plans →
        </a>
      </div>
    );
    if (whatsappStatus === "warning") return <p className="text-xs text-amber-600">This number is already linked to another store.</p>;
    return undefined;
  })();

  return (
    <div className="md:ml-56 max-w-lg mx-auto">
      <div className="text-center mb-6">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-green-100 mb-3">
          <Store className="text-green-600" size={24} />
        </div>
        <h1 className="text-2xl font-bold text-gray-900">Set up your store</h1>
        <p className="text-gray-500 text-sm mt-1">
          Takes under 2 minutes
        </p>
      </div>

      {draftRestored && (
        <div className="flex items-center justify-between gap-3 mb-4 rounded-lg border border-green-200 bg-green-50 px-3 py-2.5 text-sm text-green-800">
          <p>Welcome back — we restored your progress.</p>
          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={startOver}
              className="font-medium underline hover:text-green-900"
            >
              Start over
            </button>
            <button
              type="button"
              onClick={() => setDraftRestored(false)}
              aria-label="Dismiss"
              className="text-green-600 hover:text-green-800 transition-colors"
            >
              <X size={14} />
            </button>
          </div>
        </div>
      )}

      {referralCode && (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
          <span>🎉</span>
          <p>
            {referrerName ? `Referred by ${referrerName} — ` : "Referred by a friend — "}
            you get a <b>45-day free trial</b> instead of 30.
          </p>
        </div>
      )}

      <StepProgress current={step} total={3} />

      <form onSubmit={handleSubmit}>
        <div className={`${card} space-y-4`}>
          {step === 1 && (
            <>
              <h2 className={sectionHeading}>Store Details</h2>
              <div>
                <label className={label}>
                  Store Name<span className="text-red-500 ml-0.5">*</span>
                </label>
                <input
                  type="text"
                  value={form.store_name}
                  onChange={(e) => update("store_name", e.target.value)}
                  placeholder="e.g. Mama's Kitchen"
                  required
                  className={`${inputBase} ${focusGreen}`}
                />
                {form.store_name && (
                  <p className={helperText}>
                    Your store link: oshicart.com/s/
                    {slugify(form.store_name) || "..."}
                  </p>
                )}
              </div>
              <div>
                <label className={label}>
                  Description
                </label>
                <textarea
                  value={form.description}
                  onChange={(e) => update("description", e.target.value)}
                  placeholder="What do you sell?"
                  rows={2}
                  className={`${textareaBase} ${focusGreen}`}
                />
              </div>
              <PhoneInput
                id="setup-whatsapp"
                value={form.whatsapp_number}
                onChange={(val) => {
                  update("whatsapp_number", val);
                  if (whatsappStatus !== "idle") setWhatsappStatus("idle");
                }}
                onBlur={checkWhatsapp}
                required
                variant="green"
                hint="Customers will contact you on this number"
                status={whatsappStatusNode}
              />
              <div>
                <label className={label}>
                  Industry<span className="text-red-500 ml-0.5">*</span>
                </label>
                <select
                  value={form.industry}
                  onChange={(e) => update("industry", e.target.value)}
                  required
                  className={`${selectBase} ${focusGreen}`}
                >
                  <option value="">What do you sell?</option>
                  {INDUSTRY_GROUP_ORDER.map((group) => (
                    <optgroup key={group} label={group}>
                      {INDUSTRIES_NAMIBIA.filter((ind) => ind.group === group).map((ind) => (
                        <option key={ind.value} value={ind.value}>
                          {ind.label}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
                <p className={helperText}>
                  Helps us personalise your store experience
                </p>
              </div>
              <div>
                <label className={label}>
                  Region<span className="text-red-500 ml-0.5">*</span>
                </label>
                <select
                  value={form.region}
                  onChange={(e) => {
                    // Region change invalidates the chosen town
                    setForm((prev) => ({ ...prev, region: e.target.value, town: "" }));
                  }}
                  required
                  className={`${selectBase} ${focusGreen}`}
                >
                  <option value="">Where do you sell from?</option>
                  {NAMIBIA_REGIONS.map((r) => (
                    <option key={r.value} value={r.value}>{r.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={label}>
                  Town<span className="text-red-500 ml-0.5">*</span>
                </label>
                <select
                  value={form.town}
                  onChange={(e) => update("town", e.target.value)}
                  required
                  disabled={!form.region}
                  className={`${selectBase} ${focusGreen} disabled:opacity-50`}
                >
                  <option value="">{form.region ? "Select your town" : "Choose a region first"}</option>
                  {townsForRegion(form.region).map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
                <p className={helperText}>Customers will see this on your store</p>
              </div>

              {error && (
                <div className={alertError}>
                  <AlertCircle className={alertIcon} />
                  <p>{error}</p>
                </div>
              )}

              <button
                type="button"
                onClick={() => {
                  if (!form.store_name || !form.whatsapp_number) {
                    setError("Store name and WhatsApp number are required");
                    return;
                  }
                  if (!form.industry) {
                    setError("Please select your industry");
                    return;
                  }
                  if (!form.region || !form.town) {
                    setError("Please choose your region and town");
                    return;
                  }
                  if (whatsappStatus === "blocked") {
                    setError("This WhatsApp number is already linked to a store. Please subscribe to continue.");
                    return;
                  }
                  goToStep(2);
                }}
                className={`${btnPrimaryGreen} flex items-center justify-center gap-2`}
              >
                Next: Delivery Options <ArrowRight size={16} />
              </button>
            </>
          )}

          {step === 2 && (
            <>
              <h2 className={sectionHeading}>Delivery & Pickup</h2>
              <p className={helperText + " !mt-0"}>
                How will customers receive their orders?
              </p>

              <div className="space-y-3">
                <label
                  className={`flex items-center gap-3 border rounded-lg p-3 cursor-pointer transition-colors ${
                    offersPickup ? "border-green-600 bg-green-50" : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={offersPickup}
                    onChange={(e) => setOffersPickup(e.target.checked)}
                    className="w-4 h-4 text-green-600 rounded focus:ring-green-500"
                  />
                  <div>
                    <span className="text-sm font-medium text-gray-900">Pickup</span>
                    <p className="text-xs text-gray-500">Customers collect from your location</p>
                  </div>
                </label>

                {offersPickup && (
                  <div className="ml-7">
                    <label className={label}>Pickup Address</label>
                    <textarea
                      value={form.pickup_address}
                      onChange={(e) => update("pickup_address", e.target.value)}
                      placeholder="e.g. Shop 5, Wernhil Park, Windhoek"
                      rows={2}
                      className={`${textareaBase} ${focusGreen}`}
                    />
                  </div>
                )}

                <label
                  className={`flex items-center gap-3 border rounded-lg p-3 cursor-pointer transition-colors ${
                    offersDelivery ? "border-green-600 bg-green-50" : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={offersDelivery}
                    onChange={(e) => setOffersDelivery(e.target.checked)}
                    className="w-4 h-4 text-green-600 rounded focus:ring-green-500"
                  />
                  <div>
                    <span className="text-sm font-medium text-gray-900">Delivery</span>
                    <p className="text-xs text-gray-500">You deliver to the customer</p>
                  </div>
                </label>

                {offersDelivery && (
                  <div className="ml-7">
                    <label className={label}>Delivery Fee (NAD)</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">N$</span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={form.delivery_fee_display}
                        onChange={(e) => update("delivery_fee_display", e.target.value)}
                        placeholder="0.00"
                        className={`${inputBase} ${focusGreen} pl-9`}
                      />
                    </div>
                    <p className={helperText}>Set to 0 for free delivery</p>

                    <div className="mt-4">
                      <p className="mb-2 text-sm font-medium text-slate-700">Delivery options shown at checkout</p>
                      <div className="space-y-2">
                        {[
                          { value: "store", label: "Store delivery" },
                          { value: "yango", label: "Yango" },
                          { value: "indrive", label: "inDrive" },
                        ].map((opt) => (
                          <label key={opt.value} className="flex items-center gap-3 cursor-pointer text-sm text-slate-700">
                            <input
                              type="checkbox"
                              checked={enabledProviders.includes(opt.value)}
                              onChange={(e) =>
                                setEnabledProviders((prev) =>
                                  e.target.checked
                                    ? [...prev, opt.value]
                                    : prev.filter((v) => v !== opt.value)
                                )
                              }
                            />
                            {opt.label}
                          </label>
                        ))}
                      </div>
                      <p className="mt-1 text-xs text-slate-500">Yango and inDrive are buyer-booked.</p>
                    </div>

                    {!offersPickup && (enabledProviders.includes("yango") || enabledProviders.includes("indrive")) && (
                      <div className="mt-4">
                        <label className={label}>Pickup address</label>
                        <textarea
                          value={form.pickup_address}
                          onChange={(e) => update("pickup_address", e.target.value)}
                          rows={2}
                          placeholder="e.g. Shop 4, Maerua Mall, Windhoek"
                          className={`${textareaBase} ${focusGreen}`}
                        />
                        <p className={helperText}>Where Yango/inDrive couriers collect orders.</p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {!offersPickup && !offersDelivery && (
                <p className="text-red-500 text-xs">Please select at least one option</p>
              )}

              {error && (
                <div className={alertError}>
                  <AlertCircle className={alertIcon} />
                  <p>{error}</p>
                </div>
              )}

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => { setError(""); setStep(1); }}
                  className="flex-1 py-2.5 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 font-medium transition-colors"
                >
                  Back
                </button>
                <button
                  type="button"
                  disabled={!offersPickup && !offersDelivery}
                  onClick={() => {
                    if (!offersPickup && !offersDelivery) return;
                    goToStep(3);
                  }}
                  className={`flex-1 ${btnPrimaryGreen} flex items-center justify-center gap-2`}
                >
                  Next: Payment Methods <ArrowRight size={16} />
                </button>
              </div>
            </>
          )}

          {step === 3 && (
            <>
              <h2 className={sectionHeading}>How would you like to get paid?</h2>
              <p className={helperText + " !mt-0"}>
                Select the payment methods your customers can use. You can change these later in Settings.
              </p>

              {/* Payment method checkboxes */}
              <div className="grid grid-cols-2 gap-2">
                {PAYMENT_METHODS.map((method) => (
                  <label
                    key={method.value}
                    className={`flex items-center gap-2 border rounded-lg p-3 cursor-pointer transition-colors ${
                      selectedMethods.includes(method.value)
                        ? "border-green-600 bg-green-50"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedMethods.includes(method.value)}
                      onChange={(e) => {
                        setSelectedMethods((prev) =>
                          e.target.checked
                            ? [...prev, method.value]
                            : prev.filter((m) => m !== method.value)
                        );
                      }}
                      className="w-4 h-4 text-green-600 rounded focus:ring-green-500"
                    />
                    <PaymentMethodVisual value={method.value} logo={method.logo} label={method.label} />
                    <span className="text-sm font-medium text-gray-700">{method.label}</span>
                  </label>
                ))}
              </div>

              {/* EFT bank details — shown if EFT selected */}
              {selectedMethods.includes("eft") && (
                <div className="space-y-3 border-t pt-3">
                  <p className="text-sm font-medium text-gray-700">Bank Details for EFT</p>
                  <select
                    value={form.bank_name}
                    onChange={(e) => {
                      update("bank_name", e.target.value);
                      const branchCode = BANK_BRANCH_CODES[e.target.value];
                      if (branchCode) update("bank_branch_code", branchCode);
                    }}
                    className={`${selectBase} ${focusGreen}`}
                  >
                    <option value="">Select bank...</option>
                    {BANKS_NAMIBIA.map((bank) => (
                      <option key={bank} value={bank}>{bank}</option>
                    ))}
                  </select>
                  <input
                    type="text"
                    value={form.bank_account_holder}
                    onChange={(e) => update("bank_account_holder", e.target.value)}
                    placeholder="Account holder name"
                    className={`${inputBase} ${focusGreen}`}
                  />
                  <input
                    type="text"
                    value={form.bank_account_number}
                    onChange={(e) => update("bank_account_number", e.target.value)}
                    placeholder="Account number"
                    className={`${inputBase} ${focusGreen}`}
                  />
                  <input
                    type="text"
                    value={form.bank_branch_code}
                    onChange={(e) => update("bank_branch_code", e.target.value)}
                    placeholder="Branch code"
                    className={`${inputBase} ${focusGreen}`}
                  />
                </div>
              )}

              {/* MTC Maris number — shown if MTC Maris selected */}
              {selectedMethods.includes("momo") && (
                <div className="border-t pt-3">
                  <PhoneInput
                    id="momo-number"
                    labelText="MTC Maris Number"
                    value={form.momo_number}
                    onChange={(val) => update("momo_number", val)}
                    variant="green"
                  />
                </div>
              )}

              {/* eWallet bank + number — shown if eWallet selected */}
              {selectedMethods.includes("ewallet") && (
                <div className="border-t pt-3 space-y-2">
                  <label className={label}>Which bank eWallet?</label>
                  <EwalletProviderPicker
                    value={form.ewallet_provider}
                    onChange={(v) => update("ewallet_provider", v)}
                  />
                  <PhoneInput
                    id="ewallet-number"
                    labelText="eWallet Number"
                    value={form.ewallet_number}
                    onChange={(val) => update("ewallet_number", val)}
                    variant="green"
                    hint="Customers send eWallet payment to this number"
                  />
                </div>
              )}

              {/* Pay2Cell number — shown if Pay2Cell selected */}
              {selectedMethods.includes("pay2cell") && (
                <div className="border-t pt-3">
                  <PhoneInput
                    id="pay2cell-number"
                    labelText="FNB Pay2Cell Number"
                    value={form.pay2cell_number}
                    onChange={(val) => update("pay2cell_number", val)}
                    variant="green"
                  />
                </div>
              )}

              {/* PayToday number — shown if PayToday selected */}
              {selectedMethods.includes("paytoday") && (
                <div className="border-t pt-3">
                  <PhoneInput
                    id="paytoday-number"
                    labelText="PayToday Number"
                    value={form.paytoday_number}
                    onChange={(val) => update("paytoday_number", val)}
                    variant="green"
                  />
                </div>
              )}

              <label className="flex items-start gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={acceptedPolicy}
                  onChange={(e) => setAcceptedPolicy(e.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-slate-300 text-green-600 focus:ring-green-500"
                />
                <span>
                  I accept the OshiCart selling rules and confirm this store will not sell adult content,
                  sexual services, illegal drugs, counterfeit goods, fraud, or restricted dangerous items.
                  <Link href="/prohibited-products" target="_blank" className="ml-1 font-semibold text-[#2B5EA7] hover:underline">
                    View policy
                  </Link>
                </span>
              </label>

              {error && (
                <div className={alertError}>
                  <AlertCircle className={alertIcon} />
                  <p>{error}</p>
                </div>
              )}

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => { setError(""); setStep(2); }}
                  className="flex-1 py-2.5 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 font-medium transition-colors"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={loading || selectedMethods.length === 0 || !acceptedPolicy || (offersDelivery && (enabledProviders.includes("yango") || enabledProviders.includes("indrive")) && !form.pickup_address.trim())}
                  className={`flex-1 ${btnPrimaryGreen} flex items-center justify-center gap-2`}
                >
                  {loading ? (
                    "Creating..."
                  ) : (
                    <>
                      <Check size={16} /> Create Store
                    </>
                  )}
                </button>
              </div>
            </>
          )}
        </div>
      </form>
    </div>
  );
}
