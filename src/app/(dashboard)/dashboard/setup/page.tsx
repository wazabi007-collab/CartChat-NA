"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { slugify } from "@/lib/utils";
import { BANKS_NAMIBIA, INDUSTRIES_NAMIBIA, PAYMENT_METHODS } from "@/lib/constants";
import { storeSetupSchema } from "@/lib/validations";
import { Store, ArrowRight, Check } from "lucide-react";

export default function StoreSetupPage() {
  return (
    <Suspense>
      <StoreSetupForm />
    </Suspense>
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

  function update(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
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

    const { data: newMerchant, error: insertError } = await supabase
      .from("merchants")
      .insert({
        user_id: user.id,
        store_name: form.store_name,
        store_slug: finalSlug,
        description: form.description || null,
        whatsapp_number: form.whatsapp_number,
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

    if (tierParam) {
      router.push(`/pricing/checkout?tier=${tierParam}`);
    } else {
      router.push("/dashboard");
    }
    router.refresh();
  }

  return (
    <div className="md:ml-56 max-w-lg mx-auto">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-green-100 mb-3">
          <Store className="text-green-600" size={24} />
        </div>
        <h1 className="text-2xl font-bold text-gray-900">Set up your store</h1>
        <p className="text-gray-500 text-sm mt-1">
          Step {step} of 3 — takes under 2 minutes
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="bg-white rounded-lg border shadow-sm p-6 space-y-4">
          {step === 1 && (
            <>
              <h2 className="font-medium text-gray-900">Store Details</h2>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Store Name *
                </label>
                <input
                  type="text"
                  value={form.store_name}
                  onChange={(e) => update("store_name", e.target.value)}
                  placeholder="e.g. Mama's Kitchen"
                  required
                  className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                />
                {form.store_name && (
                  <p className="text-xs text-gray-400 mt-1">
                    Your store link: oshicart.com/s/
                    {slugify(form.store_name) || "..."}
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={form.description}
                  onChange={(e) => update("description", e.target.value)}
                  placeholder="What do you sell?"
                  rows={2}
                  className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  WhatsApp Number *
                </label>
                <input
                  type="tel"
                  value={form.whatsapp_number}
                  onChange={(e) => update("whatsapp_number", e.target.value)}
                  placeholder="+264811234567"
                  required
                  className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Industry *
                </label>
                <select
                  value={form.industry}
                  onChange={(e) => update("industry", e.target.value)}
                  required
                  className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  <option value="">What do you sell?</option>
                  {INDUSTRIES_NAMIBIA.map((ind) => (
                    <option key={ind.value} value={ind.value}>
                      {ind.label}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-400 mt-1">
                  Helps us personalise your store experience
                </p>
              </div>
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
                  setError("");
                  setStep(2);
                }}
                className="w-full py-2 bg-green-600 text-white rounded-md hover:bg-green-700 font-medium flex items-center justify-center gap-2"
              >
                Next: Delivery Options <ArrowRight size={16} />
              </button>
            </>
          )}

          {step === 2 && (
            <>
              <h2 className="font-medium text-gray-900">
                Delivery & Pickup
              </h2>
              <p className="text-xs text-gray-400 -mt-2">
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
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Pickup Address
                    </label>
                    <textarea
                      value={form.pickup_address}
                      onChange={(e) => update("pickup_address", e.target.value)}
                      placeholder="e.g. Shop 5, Wernhil Park, Windhoek"
                      rows={2}
                      className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 text-sm resize-none"
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
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Delivery Fee (NAD)
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">N$</span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={form.delivery_fee_display}
                        onChange={(e) => update("delivery_fee_display", e.target.value)}
                        placeholder="0.00"
                        className="w-full pl-9 pr-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
                      />
                    </div>
                    <p className="text-xs text-gray-400 mt-1">Set to 0 for free delivery</p>
                  </div>
                )}
              </div>

              {!offersPickup && !offersDelivery && (
                <p className="text-red-500 text-xs">Please select at least one option</p>
              )}

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="flex-1 py-2 border rounded-md text-gray-600 hover:bg-gray-50"
                >
                  Back
                </button>
                <button
                  type="button"
                  disabled={!offersPickup && !offersDelivery}
                  onClick={() => {
                    if (!offersPickup && !offersDelivery) return;
                    setStep(3);
                  }}
                  className="flex-1 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 font-medium flex items-center justify-center gap-2"
                >
                  Next: Payment Methods <ArrowRight size={16} />
                </button>
              </div>
            </>
          )}

          {step === 3 && (
            <>
              <h2 className="font-medium text-gray-900">
                How would you like to get paid?
              </h2>
              <p className="text-xs text-gray-400 -mt-2">
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
                    onChange={(e) => update("bank_name", e.target.value)}
                    className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
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
                    className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                  <input
                    type="text"
                    value={form.bank_account_number}
                    onChange={(e) => update("bank_account_number", e.target.value)}
                    placeholder="Account number"
                    className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                  <input
                    type="text"
                    value={form.bank_branch_code}
                    onChange={(e) => update("bank_branch_code", e.target.value)}
                    placeholder="Branch code"
                    className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
              )}

              {/* MoMo number — shown if MoMo selected */}
              {selectedMethods.includes("momo") && (
                <div className="border-t pt-3">
                  <label className="block text-sm font-medium text-gray-700 mb-1">MoMo Number</label>
                  <input
                    type="tel"
                    value={form.momo_number}
                    onChange={(e) => update("momo_number", e.target.value)}
                    placeholder="+264 81 123 4567"
                    className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
              )}

              {/* Pay2Cell number — shown if Pay2Cell selected */}
              {selectedMethods.includes("pay2cell") && (
                <div className="border-t pt-3">
                  <label className="block text-sm font-medium text-gray-700 mb-1">FNB Pay2Cell Number</label>
                  <input
                    type="tel"
                    value={form.pay2cell_number}
                    onChange={(e) => update("pay2cell_number", e.target.value)}
                    placeholder="+264 81 123 4567"
                    className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
              )}

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="flex-1 py-2 border rounded-md text-gray-600 hover:bg-gray-50"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={loading || selectedMethods.length === 0}
                  className="flex-1 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 font-medium flex items-center justify-center gap-2"
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

          {error && <p className="text-red-600 text-sm">{error}</p>}
        </div>
      </form>
    </div>
  );
}
