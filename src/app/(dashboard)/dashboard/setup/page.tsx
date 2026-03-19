"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { slugify, normalizeNamibianPhone } from "@/lib/utils";
import { BANKS_NAMIBIA, BANK_BRANCH_CODES, INDUSTRIES_NAMIBIA, PAYMENT_METHODS } from "@/lib/constants";
import { storeSetupSchema } from "@/lib/validations";
import { track } from "@/lib/track";
import { Store, ArrowRight, Check, AlertCircle } from "lucide-react";
import { PhoneInput } from "@/components/phone-input";
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
  const supabase = createClient();

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    store_name: "",
    description: "",
    whatsapp_number: "",
    industry: "",
    bank_name: "",
    bank_account_number: "",
    bank_account_holder: "",
    bank_branch_code: "",
    momo_number: "",
    pay2cell_number: "",
    pickup_address: "",
    delivery_fee_display: "",
  });
  const [selectedMethods, setSelectedMethods] = useState<string[]>(["cod"]);
  const [offersPickup, setOffersPickup] = useState(true);
  const [offersDelivery, setOffersDelivery] = useState(false);
  const [whatsappStatus, setWhatsappStatus] = useState<"idle" | "checking" | "blocked" | "warning" | "clear">("idle");

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

    const { data: newMerchant, error: insertError } = await supabase
      .from("merchants")
      .insert({
        user_id: user.id,
        store_name: form.store_name,
        store_slug: finalSlug,
        description: form.description || null,
        whatsapp_number: normalizeNamibianPhone(form.whatsapp_number),
        industry: form.industry || "other",
        bank_name: form.bank_name || null,
        bank_account_number: form.bank_account_number || null,
        bank_account_holder: form.bank_account_holder || null,
        bank_branch_code: form.bank_branch_code || null,
        accepted_payment_methods: selectedMethods,
        momo_number: form.momo_number || null,
        pay2cell_number: form.pay2cell_number || null,
        pickup_address: form.pickup_address || null,
        delivery_fee_nad: offersDelivery ? Math.round((parseFloat(form.delivery_fee_display) || 0) * 100) : 0,
        store_status: "active",
      })
      .select("id")
      .single();

    if (insertError || !newMerchant) {
      setError(insertError?.message || "Failed to create store");
      setLoading(false);
      return;
    }

    // Create trial subscription (30-day Oshi-Start)
    const trialEnds = new Date();
    trialEnds.setDate(trialEnds.getDate() + 30);

    await supabase.from("subscriptions").insert({
      merchant_id: newMerchant.id,
      tier: "oshi_start",
      status: "trial",
      trial_ends_at: trialEnds.toISOString(),
    });

    // WhatsApp Business API: welcome message
    fetch("/api/whatsapp/send", {
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

    track("onboarding_completed", { industry: form.industry, payment_methods: selectedMethods.join(",") });

    if (tierParam) {
      router.push(`/pricing/checkout?tier=${tierParam}`);
    } else {
      router.push("/dashboard");
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
                  {INDUSTRIES_NAMIBIA.map((ind) => (
                    <option key={ind.value} value={ind.value}>
                      {ind.label}
                    </option>
                  ))}
                </select>
                <p className={helperText}>
                  Helps us personalise your store experience
                </p>
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
                    <span className="text-lg">{method.icon}</span>
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

              {/* MoMo number — shown if MoMo selected */}
              {selectedMethods.includes("momo") && (
                <div className="border-t pt-3">
                  <PhoneInput
                    id="momo-number"
                    labelText="MoMo Number"
                    value={form.momo_number}
                    onChange={(val) => update("momo_number", val)}
                    variant="green"
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
                  disabled={loading || selectedMethods.length === 0}
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
