"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { slugify } from "@/lib/utils";
import { BANKS_NAMIBIA } from "@/lib/constants";
import { storeSetupSchema } from "@/lib/validations";
import { Store, ArrowRight, Check } from "lucide-react";

export default function StoreSetupPage() {
  const router = useRouter();
  const supabase = createClient();

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    store_name: "",
    description: "",
    whatsapp_number: "",
    bank_name: "",
    bank_account_number: "",
    bank_account_holder: "",
    bank_branch_code: "",
  });

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

    const { error: insertError } = await supabase.from("merchants").insert({
      user_id: user.id,
      store_name: form.store_name,
      store_slug: finalSlug,
      description: form.description || null,
      whatsapp_number: form.whatsapp_number,
      bank_name: form.bank_name || null,
      bank_account_number: form.bank_account_number || null,
      bank_account_holder: form.bank_account_holder || null,
      bank_branch_code: form.bank_branch_code || null,
    });

    if (insertError) {
      setError(insertError.message);
      setLoading(false);
      return;
    }

    router.push("/dashboard");
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
          Step {step} of 2 — takes under 2 minutes
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
                    Your store link: chatcartna.com/s/
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
              <button
                type="button"
                onClick={() => {
                  if (!form.store_name || !form.whatsapp_number) {
                    setError("Store name and WhatsApp number are required");
                    return;
                  }
                  setError("");
                  setStep(2);
                }}
                className="w-full py-2 bg-green-600 text-white rounded-md hover:bg-green-700 font-medium flex items-center justify-center gap-2"
              >
                Next: Bank Details <ArrowRight size={16} />
              </button>
            </>
          )}

          {step === 2 && (
            <>
              <h2 className="font-medium text-gray-900">
                Bank Details{" "}
                <span className="text-gray-400 font-normal text-sm">
                  (for customers to pay you)
                </span>
              </h2>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Bank
                </label>
                <select
                  value={form.bank_name}
                  onChange={(e) => update("bank_name", e.target.value)}
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
                  Account Holder Name
                </label>
                <input
                  type="text"
                  value={form.bank_account_holder}
                  onChange={(e) =>
                    update("bank_account_holder", e.target.value)
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
                    update("bank_account_number", e.target.value)
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
                  onChange={(e) => update("bank_branch_code", e.target.value)}
                  className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
              <p className="text-xs text-gray-400">
                You can skip bank details and add them later in Settings.
              </p>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="flex-1 py-2 border rounded-md text-gray-600 hover:bg-gray-50"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={loading}
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
