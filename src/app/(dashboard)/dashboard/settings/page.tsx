"use client";

import { useEffect, useState, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { BANKS_NAMIBIA, PAYMENT_METHODS, EWALLET_PROVIDERS } from "@/lib/constants";
import { storeSetupSchema } from "@/lib/validations";
import { Save, Plus, X } from "lucide-react";

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

interface DeliverySlots {
  enabled: boolean;
  days: number[];
  times: string[];
}

export default function SettingsPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [merchantId, setMerchantId] = useState("");
  const [newTimeSlot, setNewTimeSlot] = useState("");

  const [form, setForm] = useState({
    store_name: "",
    description: "",
    whatsapp_number: "",
    bank_name: "",
    bank_account_number: "",
    bank_account_holder: "",
    bank_branch_code: "",
    delivery_fee_display: "0",
    accepted_payment_methods: ["eft"] as string[],
    momo_number: "",
    ewallet_number: "",
    ewallet_provider: "",
  });

  const [deliverySlots, setDeliverySlots] = useState<DeliverySlots>({
    enabled: false,
    days: [],
    times: [],
  });

  useEffect(() => {
    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data: merchant } = await supabase
        .from("merchants")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (merchant) {
        setMerchantId(merchant.id);
        setForm({
          store_name: merchant.store_name,
          description: merchant.description || "",
          whatsapp_number: merchant.whatsapp_number,
          bank_name: merchant.bank_name || "",
          bank_account_number: merchant.bank_account_number || "",
          bank_account_holder: merchant.bank_account_holder || "",
          bank_branch_code: merchant.bank_branch_code || "",
          delivery_fee_display: merchant.delivery_fee_nad ? (merchant.delivery_fee_nad / 100).toFixed(2) : "0",
          accepted_payment_methods: merchant.accepted_payment_methods || ["eft"],
          momo_number: merchant.momo_number || "",
          ewallet_number: merchant.ewallet_number || "",
          ewallet_provider: merchant.ewallet_provider || "",
        });
        if (merchant.delivery_slots) {
          setDeliverySlots(merchant.delivery_slots as DeliverySlots);
        }
      }
      setLoading(false);
    }
    load();
  }, [supabase]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSuccess(false);

    const result = storeSetupSchema.safeParse(form);
    if (!result.success) {
      setError(result.error.issues[0].message);
      setSaving(false);
      return;
    }

    const deliveryFeeCents = Math.round((parseFloat(form.delivery_fee_display) || 0) * 100);

    const { error: updateError } = await supabase
      .from("merchants")
      .update({
        store_name: form.store_name,
        description: form.description || null,
        whatsapp_number: form.whatsapp_number,
        bank_name: form.bank_name || null,
        bank_account_number: form.bank_account_number || null,
        bank_account_holder: form.bank_account_holder || null,
        bank_branch_code: form.bank_branch_code || null,
        delivery_slots: deliverySlots.enabled ? deliverySlots : null,
        delivery_fee_nad: deliveryFeeCents,
        accepted_payment_methods: form.accepted_payment_methods,
        momo_number: form.momo_number || null,
        ewallet_number: form.ewallet_number || null,
        ewallet_provider: form.ewallet_provider || null,
      })
      .eq("id", merchantId);

    if (updateError) {
      setError(updateError.message);
    } else {
      setSuccess(true);
      router.refresh();
    }
    setSaving(false);
  }

  function toggleDay(day: number) {
    setDeliverySlots((prev) => ({
      ...prev,
      days: prev.days.includes(day)
        ? prev.days.filter((d) => d !== day)
        : [...prev.days, day].sort(),
    }));
  }

  function addTimeSlot() {
    const trimmed = newTimeSlot.trim();
    if (!trimmed || deliverySlots.times.includes(trimmed)) return;
    setDeliverySlots((prev) => ({ ...prev, times: [...prev.times, trimmed] }));
    setNewTimeSlot("");
  }

  function removeTimeSlot(slot: string) {
    setDeliverySlots((prev) => ({
      ...prev,
      times: prev.times.filter((t) => t !== slot),
    }));
  }

  if (loading) {
    return (
      <div className="md:ml-56">
        <p className="text-gray-400">Loading...</p>
      </div>
    );
  }

  return (
    <div className="md:ml-56 max-w-lg">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Store Settings</h1>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Store Details */}
        <div className="bg-white rounded-lg border p-6 space-y-4">
          <h2 className="font-medium text-gray-900">Store Details</h2>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Store Name
            </label>
            <input
              type="text"
              value={form.store_name}
              onChange={(e) =>
                setForm((p) => ({ ...p, store_name: e.target.value }))
              }
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              value={form.description}
              onChange={(e) =>
                setForm((p) => ({ ...p, description: e.target.value }))
              }
              rows={3}
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              WhatsApp Number
            </label>
            <input
              type="tel"
              value={form.whatsapp_number}
              onChange={(e) =>
                setForm((p) => ({ ...p, whatsapp_number: e.target.value }))
              }
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>
        </div>

        {/* Bank Details */}
        <div className="bg-white rounded-lg border p-6 space-y-4">
          <h2 className="font-medium text-gray-900">Bank Details</h2>
          <p className="text-xs text-gray-400">
            Shown to customers at checkout for EFT payment
          </p>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Bank
            </label>
            <select
              value={form.bank_name}
              onChange={(e) =>
                setForm((p) => ({ ...p, bank_name: e.target.value }))
              }
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              <option value="">Select bank...</option>
              {BANKS_NAMIBIA.map((bank) => (
                <option key={bank} value={bank}>
                  {bank}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Account Holder
            </label>
            <input
              type="text"
              value={form.bank_account_holder}
              onChange={(e) =>
                setForm((p) => ({
                  ...p,
                  bank_account_holder: e.target.value,
                }))
              }
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Account Number
            </label>
            <input
              type="text"
              value={form.bank_account_number}
              onChange={(e) =>
                setForm((p) => ({
                  ...p,
                  bank_account_number: e.target.value,
                }))
              }
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Branch Code
            </label>
            <input
              type="text"
              value={form.bank_branch_code}
              onChange={(e) =>
                setForm((p) => ({ ...p, bank_branch_code: e.target.value }))
              }
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>
        </div>

        {/* Payment Methods */}
        <div className="bg-white rounded-lg border p-6 space-y-4">
          <h2 className="font-medium text-gray-900">Payment Methods</h2>
          <p className="text-xs text-gray-400">
            Choose which payment methods customers can use at checkout
          </p>
          <div className="space-y-3">
            {PAYMENT_METHODS.map((method) => (
              <label key={method.value} className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.accepted_payment_methods.includes(method.value)}
                  onChange={(e) => {
                    setForm((p) => ({
                      ...p,
                      accepted_payment_methods: e.target.checked
                        ? [...p.accepted_payment_methods, method.value]
                        : p.accepted_payment_methods.filter((m) => m !== method.value),
                    }));
                  }}
                  className="w-4 h-4 text-green-600 rounded focus:ring-green-500"
                />
                <span className="text-sm text-gray-700">
                  {method.icon} {method.label}
                </span>
              </label>
            ))}
          </div>

          {form.accepted_payment_methods.includes("momo") && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                MoMo Number
              </label>
              <input
                type="tel"
                value={form.momo_number}
                onChange={(e) => setForm((p) => ({ ...p, momo_number: e.target.value }))}
                placeholder="+264 81 123 4567"
                className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
              />
              <p className="text-xs text-gray-400 mt-1">
                Customers will send MTC Money/Maris payment to this number
              </p>
            </div>
          )}

          {form.accepted_payment_methods.includes("ewallet") && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  eWallet Provider
                </label>
                <select
                  value={form.ewallet_provider}
                  onChange={(e) => setForm((p) => ({ ...p, ewallet_provider: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  <option value="">Select provider...</option>
                  {EWALLET_PROVIDERS.map((provider) => (
                    <option key={provider.value} value={provider.value}>
                      {provider.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  eWallet Number
                </label>
                <input
                  type="tel"
                  value={form.ewallet_number}
                  onChange={(e) => setForm((p) => ({ ...p, ewallet_number: e.target.value }))}
                  placeholder="+264 81 123 4567"
                  className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                />
                <p className="text-xs text-gray-400 mt-1">
                  Customers will send eWallet payment to this number
                </p>
              </div>
            </>
          )}
        </div>

        {/* Delivery Fee */}
        <div className="bg-white rounded-lg border p-6 space-y-4">
          <h2 className="font-medium text-gray-900">Delivery Fee</h2>
          <p className="text-xs text-gray-400">
            Flat rate charged when customers choose delivery. Set to 0 for free delivery.
          </p>
          <div className="relative max-w-xs">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
              N$
            </span>
            <input
              type="number"
              step="0.01"
              min="0"
              value={form.delivery_fee_display}
              onChange={(e) =>
                setForm((p) => ({ ...p, delivery_fee_display: e.target.value }))
              }
              className="w-full pl-9 px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
              placeholder="30.00"
            />
          </div>
        </div>

        {/* Delivery Scheduling */}
        <div className="bg-white rounded-lg border p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-medium text-gray-900">Delivery Scheduling</h2>
              <p className="text-xs text-gray-400 mt-0.5">
                Let customers choose a delivery date and time slot
              </p>
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <div className="relative">
                <input
                  type="checkbox"
                  checked={deliverySlots.enabled}
                  onChange={(e) =>
                    setDeliverySlots((p) => ({ ...p, enabled: e.target.checked }))
                  }
                  className="sr-only"
                />
                <div
                  className={`w-10 h-6 rounded-full transition-colors ${
                    deliverySlots.enabled ? "bg-green-600" : "bg-gray-300"
                  }`}
                />
                <div
                  className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                    deliverySlots.enabled ? "translate-x-5" : "translate-x-1"
                  }`}
                />
              </div>
            </label>
          </div>

          {deliverySlots.enabled && (
            <>
              {/* Days */}
              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">
                  Available days
                </p>
                <div className="flex gap-2 flex-wrap">
                  {DAY_LABELS.map((label, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => toggleDay(i)}
                      className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                        deliverySlots.days.includes(i)
                          ? "bg-green-600 text-white"
                          : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Time slots */}
              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">
                  Time slots
                </p>
                <div className="space-y-2 mb-3">
                  {deliverySlots.times.map((slot) => (
                    <div
                      key={slot}
                      className="flex items-center justify-between bg-gray-50 rounded-md px-3 py-2 text-sm"
                    >
                      <span className="text-gray-700">{slot}</span>
                      <button
                        type="button"
                        onClick={() => removeTimeSlot(slot)}
                        className="text-gray-400 hover:text-red-500"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="e.g. Morning (8:00 - 12:00)"
                    value={newTimeSlot}
                    onChange={(e) => setNewTimeSlot(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addTimeSlot())}
                    className="flex-1 px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                  <button
                    type="button"
                    onClick={addTimeSlot}
                    className="flex items-center gap-1 px-3 py-2 bg-green-600 text-white rounded-md text-sm hover:bg-green-700"
                  >
                    <Plus size={14} />
                    Add
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        {error && <p className="text-red-600 text-sm">{error}</p>}
        {success && (
          <p className="text-green-600 text-sm">Settings saved!</p>
        )}

        <button
          type="submit"
          disabled={saving}
          className="w-full py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 font-medium flex items-center justify-center gap-2"
        >
          <Save size={16} />
          {saving ? "Saving..." : "Save Settings"}
        </button>
      </form>
    </div>
  );
}
