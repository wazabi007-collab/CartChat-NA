"use client";

import { useEffect, useState, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { formatPrice } from "@/lib/utils";
import { copyToClipboard } from "@/lib/clipboard";
import { Plus, Trash2, Pencil, X, BadgePercent, Megaphone, TimerReset, Copy, Check } from "lucide-react";

interface Coupon {
  id: string;
  code: string;
  discount_type: "percentage" | "fixed";
  discount_value: number;
  min_order_nad: number;
  max_uses: number | null;
  current_uses: number;
  is_active: boolean;
  starts_at: string | null;
  expires_at: string | null;
  created_at: string;
}

interface CouponForm {
  code: string;
  discount_type: "percentage" | "fixed";
  discount_value_display: string;
  min_order_display: string;
  max_uses_display: string;
  is_active: boolean;
  starts_at: string;
  expires_at: string;
}

const emptyForm: CouponForm = {
  code: "",
  discount_type: "fixed",
  discount_value_display: "",
  min_order_display: "",
  max_uses_display: "",
  is_active: true,
  starts_at: "",
  expires_at: "",
};

export default function CouponsPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [loading, setLoading] = useState(true);
  const [merchantId, setMerchantId] = useState("");
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<CouponForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data: merchant } = await supabase
        .from("merchants")
        .select("id")
        .eq("user_id", user.id)
        .single();

      if (!merchant) return;
      setMerchantId(merchant.id);

      const { data } = await supabase
        .from("coupons")
        .select("*")
        .eq("merchant_id", merchant.id)
        .order("created_at", { ascending: false });

      setCoupons(data || []);
      setLoading(false);
    }
    load();
  }, [supabase]);

  function openCreate() {
    setEditingId(null);
    setForm(emptyForm);
    setError("");
    setShowForm(true);
  }

  function openEdit(coupon: Coupon) {
    setEditingId(coupon.id);
    setForm({
      code: coupon.code,
      discount_type: coupon.discount_type,
      discount_value_display:
        coupon.discount_type === "fixed"
          ? (coupon.discount_value / 100).toFixed(2)
          : String(coupon.discount_value),
      min_order_display: coupon.min_order_nad
        ? (coupon.min_order_nad / 100).toFixed(2)
        : "",
      max_uses_display: coupon.max_uses !== null ? String(coupon.max_uses) : "",
      is_active: coupon.is_active,
      starts_at: coupon.starts_at ? coupon.starts_at.split("T")[0] : "",
      expires_at: coupon.expires_at ? coupon.expires_at.split("T")[0] : "",
    });
    setError("");
    setShowForm(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const code = form.code.trim().toUpperCase();
    if (!code || code.length < 2) {
      setError("Code must be at least 2 characters");
      return;
    }
    if (!/^[A-Z0-9_-]+$/.test(code)) {
      setError("Code can only contain letters, numbers, dashes, and underscores");
      return;
    }

    const rawValue = parseFloat(form.discount_value_display);
    if (isNaN(rawValue) || rawValue <= 0) {
      setError("Discount value must be greater than 0");
      return;
    }
    if (form.discount_type === "percentage" && rawValue > 100) {
      setError("Percentage cannot exceed 100%");
      return;
    }

    const discountValue =
      form.discount_type === "fixed" ? Math.round(rawValue * 100) : Math.round(rawValue);

    const minOrderNad = form.min_order_display
      ? Math.round(parseFloat(form.min_order_display) * 100)
      : 0;

    const maxUses = form.max_uses_display
      ? parseInt(form.max_uses_display, 10)
      : null;

    setSaving(true);

    const record = {
      merchant_id: merchantId,
      code,
      discount_type: form.discount_type,
      discount_value: discountValue,
      min_order_nad: minOrderNad,
      max_uses: maxUses,
      is_active: form.is_active,
      starts_at: form.starts_at ? new Date(form.starts_at).toISOString() : null,
      expires_at: form.expires_at ? new Date(form.expires_at + "T23:59:59").toISOString() : null,
    };

    if (editingId) {
      const { error: updateError } = await supabase
        .from("coupons")
        .update(record)
        .eq("id", editingId);

      if (updateError) {
        setError(updateError.message.includes("unique_code_per_merchant") ? "A coupon with this code already exists" : updateError.message);
        setSaving(false);
        return;
      }
    } else {
      const { error: insertError } = await supabase
        .from("coupons")
        .insert(record);

      if (insertError) {
        setError(insertError.message.includes("unique_code_per_merchant") ? "A coupon with this code already exists" : insertError.message);
        setSaving(false);
        return;
      }
    }

    // Refresh
    const { data } = await supabase
      .from("coupons")
      .select("*")
      .eq("merchant_id", merchantId)
      .order("created_at", { ascending: false });

    setCoupons(data || []);
    setShowForm(false);
    setSaving(false);
    router.refresh();
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this coupon?")) return;

    await supabase.from("coupons").delete().eq("id", id);
    setCoupons((prev) => prev.filter((c) => c.id !== id));
  }

  function isExpired(coupon: Coupon): boolean {
    return !!coupon.expires_at && new Date(coupon.expires_at) < new Date();
  }

  const activeCoupons = coupons.filter((coupon) => coupon.is_active && !isExpired(coupon)).length;
  const totalUses = coupons.reduce((sum, coupon) => sum + coupon.current_uses, 0);

  if (loading) {
    return (
      <div className="md:ml-56">
        <p className="text-gray-400">Loading...</p>
      </div>
    );
  }

  return (
    <div className="md:ml-56">
      <div className="mb-6 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-900/5 sm:p-6">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-acacia">
              Promotions
            </p>
            <h1 className="mt-2 text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">
              Coupons
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
              Create clean discount campaigns for launches, repeat customers,
              slow stock, or seasonal offers.
            </p>
          </div>
          <button
            onClick={openCreate}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-acacia px-4 text-sm font-black text-white shadow-sm shadow-emerald-900/20 transition hover:bg-green-700"
          >
            <Plus size={16} />
            Create Coupon
          </button>
        </div>
        <div className="mt-5 grid grid-cols-3 gap-3">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-slate-500">
              <BadgePercent size={14} />
              Total
            </div>
            <p className="mt-2 text-2xl font-black text-slate-950">{coupons.length}</p>
          </div>
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-emerald-700">
              <Megaphone size={14} />
              Active
            </div>
            <p className="mt-2 text-2xl font-black text-emerald-700">{activeCoupons}</p>
          </div>
          <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-blue-700">
              <TimerReset size={14} />
              Uses
            </div>
            <p className="mt-2 text-2xl font-black text-blue-700">{totalUses}</p>
          </div>
        </div>
      </div>

      {/* Create/Edit Form Modal */}
      {showForm && (
        <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-900/5 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-gray-900">
              {editingId ? "Edit Coupon" : "New Coupon"}
            </h2>
            <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600">
              <X size={20} />
            </button>
          </div>

          <form onSubmit={handleSave} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Code *
                </label>
                <input
                  type="text"
                  value={form.code}
                  onChange={(e) => setForm((p) => ({ ...p, code: e.target.value.toUpperCase() }))}
                  placeholder="WELCOME10"
                  maxLength={20}
                  className="w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-green-500 uppercase"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Discount Type *
                </label>
                <select
                  value={form.discount_type}
                  onChange={(e) => setForm((p) => ({ ...p, discount_type: e.target.value as "percentage" | "fixed" }))}
                  className="w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  <option value="fixed">Fixed Amount (NAD)</option>
                  <option value="percentage">Percentage (%)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {form.discount_type === "fixed" ? "Discount Amount (N$) *" : "Discount Percentage (%) *"}
                </label>
                <input
                  type="number"
                  step={form.discount_type === "fixed" ? "0.01" : "1"}
                  min="0"
                  max={form.discount_type === "percentage" ? "100" : undefined}
                  value={form.discount_value_display}
                  onChange={(e) => setForm((p) => ({ ...p, discount_value_display: e.target.value }))}
                  placeholder={form.discount_type === "fixed" ? "50.00" : "10"}
                  className="w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Min. Order (N$)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.min_order_display}
                  onChange={(e) => setForm((p) => ({ ...p, min_order_display: e.target.value }))}
                  placeholder="Optional"
                  className="w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Max Uses
                </label>
                <input
                  type="number"
                  min="1"
                  value={form.max_uses_display}
                  onChange={(e) => setForm((p) => ({ ...p, max_uses_display: e.target.value }))}
                  placeholder="Unlimited"
                  className="w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Start Date
                </label>
                <input
                  type="date"
                  value={form.starts_at}
                  onChange={(e) => setForm((p) => ({ ...p, starts_at: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Expiry Date
                </label>
                <input
                  type="date"
                  value={form.expires_at}
                  onChange={(e) => setForm((p) => ({ ...p, expires_at: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
            </div>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.is_active}
                onChange={(e) => setForm((p) => ({ ...p, is_active: e.target.checked }))}
                className="w-4 h-4 text-green-600 rounded focus:ring-green-500"
              />
              <span className="text-sm text-gray-700">Active</span>
            </label>

            {error && <p className="text-red-600 text-sm">{error}</p>}

            <button
              type="submit"
              disabled={saving}
              className="w-full py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 font-medium"
            >
              {saving ? "Saving..." : editingId ? "Update Coupon" : "Create Coupon"}
            </button>
          </form>
        </div>
      )}

      {/* Coupons List */}
      {coupons.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center shadow-sm shadow-slate-900/5">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-50 text-acacia">
            <BadgePercent size={30} />
          </div>
          <p className="text-lg font-black text-slate-950">No coupons yet</p>
          <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-slate-500">
            Create a coupon code to offer discounts to your customers
          </p>
          <button
            onClick={openCreate}
            className="mt-6 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-acacia px-5 text-sm font-black text-white transition hover:bg-green-700"
          >
            <Plus size={16} />
            Create first coupon
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {coupons.map((coupon) => {
            const expired = isExpired(coupon);
            return (
              <div
                key={coupon.id}
                className={`rounded-2xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-900/5 ${expired || !coupon.is_active ? "opacity-60" : ""}`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-gray-900 font-mono text-lg">
                        {coupon.code}
                      </span>
                      <button
                        onClick={async () => {
                          await copyToClipboard(coupon.code);
                          setCopiedCode(coupon.code);
                          setTimeout(() => setCopiedCode(null), 2000);
                        }}
                        className="flex-shrink-0 px-2 py-0.5 rounded-md text-xs font-medium bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors inline-flex items-center gap-1"
                      >
                        {copiedCode === coupon.code ? (
                          <Check size={12} className="text-green-600" />
                        ) : (
                          <Copy size={12} />
                        )}
                        {copiedCode === coupon.code ? "Copied!" : "Copy"}
                      </button>
                      {!coupon.is_active && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">
                          Inactive
                        </span>
                      )}
                      {expired && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-600">
                          Expired
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 mt-1">
                      {coupon.discount_type === "percentage"
                        ? `${coupon.discount_value}% off`
                        : `${formatPrice(coupon.discount_value)} off`}
                      {coupon.min_order_nad > 0
                        ? ` (min. order ${formatPrice(coupon.min_order_nad)})`
                        : ""}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      Used {coupon.current_uses}
                      {coupon.max_uses !== null ? ` / ${coupon.max_uses}` : ""} times
                      {coupon.expires_at
                        ? ` · Expires ${new Date(coupon.expires_at).toLocaleDateString("en-NA", { day: "numeric", month: "short", year: "numeric" })}`
                        : ""}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => openEdit(coupon)}
                      className="p-2 text-gray-400 hover:text-green-600 rounded-md hover:bg-gray-50"
                    >
                      <Pencil size={16} />
                    </button>
                    <button
                      onClick={() => handleDelete(coupon.id)}
                      className="p-2 text-gray-400 hover:text-red-600 rounded-md hover:bg-gray-50"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
