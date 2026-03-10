"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { BANKS_NAMIBIA } from "@/lib/constants";
import { storeSetupSchema } from "@/lib/validations";
import { Save } from "lucide-react";

export default function SettingsPage() {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [merchantId, setMerchantId] = useState("");

  const [form, setForm] = useState({
    store_name: "",
    description: "",
    whatsapp_number: "",
    bank_name: "",
    bank_account_number: "",
    bank_account_holder: "",
    bank_branch_code: "",
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
        });
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
