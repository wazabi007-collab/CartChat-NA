"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { TIER_LABELS, STATUS_LABELS, formatTierPrice, type SubscriptionTier, type SubscriptionStatus } from "@/lib/tier-limits";

const TABS = ["Overview", "Subscription", "Performance", "Products", "Orders", "Activity"] as const;

function fmtDate(d: string) {
  const date = new Date(d);
  return `${date.getUTCDate().toString().padStart(2, "0")}/${(date.getUTCMonth() + 1).toString().padStart(2, "0")}/${date.getUTCFullYear()}`;
}

function fmtDateTime(d: string) {
  const date = new Date(d);
  return `${fmtDate(d)} ${date.getUTCHours().toString().padStart(2, "0")}:${date.getUTCMinutes().toString().padStart(2, "0")}`;
}

interface MerchantTabsProps {
  merchant: Record<string, unknown>;
  subscription: Record<string, unknown> | null;
  payments: Record<string, unknown>[];
  products: Record<string, unknown>[];
  orders: Record<string, unknown>[];
  actions: Record<string, unknown>[];
}

export function MerchantTabs({ merchant, subscription, payments, products, orders, actions }: MerchantTabsProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<(typeof TABS)[number]>("Overview");
  const [saving, setSaving] = useState(false);
  const [actionError, setActionError] = useState("");

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const ordersThisMonth = orders.filter(
    (o) => (o.created_at as string) >= monthStart && o.status !== "cancelled"
  );
  const totalRevenue = orders
    .filter((o) => o.status !== "cancelled")
    .reduce((sum, o) => sum + ((o.subtotal_nad as number) || 0), 0);

  return (
    <div>
      {/* Tab bar */}
      <div className="flex gap-1 border-b mb-6 overflow-x-auto">
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
              activeTab === tab
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === "Overview" && (
        <div className="grid md:grid-cols-2 gap-6">
          <InfoCard title="Store Info">
            <InfoRow label="Name" value={merchant.store_name as string} />
            <InfoRow label="Slug" value={merchant.slug as string} />
            <InfoRow label="Industry" value={merchant.industry as string || "—"} />
            <InfoRow label="WhatsApp" value={merchant.whatsapp_number as string || "—"} />
            <InfoRow label="Bank" value={merchant.bank_name as string || "—"} />
            <InfoRow label="Account" value={merchant.bank_account as string || "—"} />
            <InfoRow label="Joined" value={fmtDate(merchant.created_at as string)} />
          </InfoCard>
          <InfoCard title="Quick Stats">
            <InfoRow label="Products" value={products.length.toString()} />
            <InfoRow label="Orders This Month" value={ordersThisMonth.length.toString()} />
            <InfoRow label="Total Revenue" value={`N$${(totalRevenue / 100).toLocaleString()}`} />
            <InfoRow label="Total Orders" value={orders.length.toString()} />
          </InfoCard>
        </div>
      )}

      {activeTab === "Subscription" && (
        <div className="space-y-6">
          {subscription ? (
            <InfoCard title="Subscription Details">
              <InfoRow label="Tier" value={TIER_LABELS[subscription.tier as SubscriptionTier]} />
              <InfoRow label="Price" value={formatTierPrice(subscription.tier as SubscriptionTier)} />
              <InfoRow label="Status" value={STATUS_LABELS[subscription.status as SubscriptionStatus]?.label || (subscription.status as string)} />
              {subscription.trial_ends_at ? (
                <InfoRow label="Trial Ends" value={fmtDate(subscription.trial_ends_at as string)} />
              ) : null}
              {subscription.current_period_end ? (
                <InfoRow label="Period Ends" value={fmtDate(subscription.current_period_end as string)} />
              ) : null}
              {subscription.grace_ends_at ? (
                <InfoRow label="Grace Ends" value={fmtDate(subscription.grace_ends_at as string)} />
              ) : null}
            </InfoCard>
          ) : (
            <p className="text-gray-500">No subscription found</p>
          )}

          {/* Admin Actions */}
          {subscription && (
            <InfoCard title="Actions">
              {actionError && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded text-sm mb-4">{actionError}</div>
              )}
              <div className="space-y-4">
                {/* Change Tier */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Change Tier</label>
                  <div className="flex flex-wrap gap-2">
                    {(["oshi_start", "oshi_basic", "oshi_grow", "oshi_pro"] as SubscriptionTier[]).map((t) => (
                      <button
                        key={t}
                        disabled={saving || subscription.tier === t}
                        onClick={async () => {
                          setSaving(true);
                          setActionError("");
                          try {
                            const res = await fetch("/api/admin/subscriptions", {
                              method: "PATCH",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({ merchant_id: merchant.id, tier: t }),
                            });
                            if (!res.ok) {
                              const err = await res.json();
                              throw new Error(err.error || "Failed to update tier");
                            }
                            router.refresh();
                          } catch (err) {
                            setActionError(err instanceof Error ? err.message : "Something went wrong");
                          } finally {
                            setSaving(false);
                          }
                        }}
                        className={`px-3 py-1.5 text-xs rounded-full border transition-colors ${
                          subscription.tier === t
                            ? "bg-gray-900 text-white border-gray-900 cursor-default"
                            : "bg-white text-gray-600 border-gray-300 hover:bg-gray-50 disabled:opacity-50"
                        }`}
                      >
                        {TIER_LABELS[t]}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Change Status */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Change Status</label>
                  <div className="flex flex-wrap gap-2">
                    {(["trial", "active", "grace", "soft_suspended", "hard_suspended"] as SubscriptionStatus[]).map((s) => {
                      const info = STATUS_LABELS[s];
                      return (
                        <button
                          key={s}
                          disabled={saving || subscription.status === s}
                          onClick={async () => {
                            setSaving(true);
                            setActionError("");
                            try {
                              const res = await fetch("/api/admin/subscriptions", {
                                method: "PATCH",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ merchant_id: merchant.id, status: s }),
                              });
                              if (!res.ok) {
                                const err = await res.json();
                                throw new Error(err.error || "Failed to update status");
                              }
                              router.refresh();
                            } catch (err) {
                              setActionError(err instanceof Error ? err.message : "Something went wrong");
                            } finally {
                              setSaving(false);
                            }
                          }}
                          className={`px-3 py-1.5 text-xs rounded-full border transition-colors ${
                            subscription.status === s
                              ? "bg-gray-900 text-white border-gray-900 cursor-default"
                              : "bg-white text-gray-600 border-gray-300 hover:bg-gray-50 disabled:opacity-50"
                          }`}
                        >
                          {info.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Activate (shortcut: set to active + set period) */}
                {subscription.status !== "active" && (
                  <button
                    disabled={saving}
                    onClick={async () => {
                      setSaving(true);
                      setActionError("");
                      try {
                        const res = await fetch("/api/admin/subscriptions", {
                          method: "PATCH",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ merchant_id: merchant.id, status: "active", set_period: true }),
                        });
                        if (!res.ok) {
                          const err = await res.json();
                          throw new Error(err.error || "Failed to activate");
                        }
                        router.refresh();
                      } catch (err) {
                        setActionError(err instanceof Error ? err.message : "Something went wrong");
                      } finally {
                        setSaving(false);
                      }
                    }}
                    className="w-full py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50 transition-colors"
                  >
                    {saving ? "Saving..." : "Activate Subscription (set 30-day period)"}
                  </button>
                )}
              </div>
            </InfoCard>
          )}

          {payments.length > 0 && (
            <InfoCard title="Payment History">
              <div className="space-y-2">
                {payments.map((p) => (
                  <div key={p.id as string} className="flex items-center justify-between text-sm border-b pb-2 last:border-0">
                    <div>
                      <span className="font-medium">N${((p.amount_nad as number) / 100).toLocaleString()}</span>
                      <span className="text-gray-500 ml-2">{p.payment_method as string}</span>
                      {p.reference ? <span className="text-gray-400 ml-2">ref: {String(p.reference)}</span> : null}
                    </div>
                    <span className="text-xs text-gray-400">{fmtDate(p.created_at as string)}</span>
                  </div>
                ))}
              </div>
            </InfoCard>
          )}
        </div>
      )}

      {activeTab === "Performance" && (
        <div className="grid md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white border rounded-lg p-4 text-center">
            <p className="text-2xl font-bold">{ordersThisMonth.length}</p>
            <p className="text-sm text-gray-500">Orders This Month</p>
          </div>
          <div className="bg-white border rounded-lg p-4 text-center">
            <p className="text-2xl font-bold">N${(totalRevenue / 100).toLocaleString()}</p>
            <p className="text-sm text-gray-500">Total Revenue</p>
          </div>
          <div className="bg-white border rounded-lg p-4 text-center">
            <p className="text-2xl font-bold">{products.length}</p>
            <p className="text-sm text-gray-500">Products</p>
          </div>
        </div>
      )}

      {activeTab === "Products" && (
        <div className="bg-white border rounded-lg overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Name</th>
                <th className="px-4 py-3 text-right font-medium text-gray-500">Price</th>
                <th className="px-4 py-3 text-right font-medium text-gray-500">Stock</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {products.map((p) => (
                <tr key={p.id as string}>
                  <td className="px-4 py-3">{p.name as string}</td>
                  <td className="px-4 py-3 text-right">N${((p.price_nad as number) / 100).toFixed(2)}</td>
                  <td className="px-4 py-3 text-right">{p.track_inventory ? (p.stock_quantity as number) : "—"}</td>
                </tr>
              ))}
              {products.length === 0 && (
                <tr><td colSpan={3} className="px-4 py-6 text-center text-gray-500">No products</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === "Orders" && (
        <div className="bg-white border rounded-lg overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-500">#</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Customer</th>
                <th className="px-4 py-3 text-right font-medium text-gray-500">Total</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Status</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {orders.slice(0, 50).map((o) => (
                <tr key={o.id as string}>
                  <td className="px-4 py-3">#{o.order_number as number}</td>
                  <td className="px-4 py-3">{o.customer_name as string}</td>
                  <td className="px-4 py-3 text-right">N${((o.subtotal_nad as number) / 100).toFixed(2)}</td>
                  <td className="px-4 py-3">
                    <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100">{o.status as string}</span>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">{fmtDate(o.created_at as string)}</td>
                </tr>
              ))}
              {orders.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-6 text-center text-gray-500">No orders</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === "Activity" && (
        <div className="bg-white border rounded-lg p-6">
          {actions.length === 0 ? (
            <p className="text-gray-500">No activity recorded</p>
          ) : (
            <ul className="space-y-4">
              {actions.map((a) => {
                const adminInfo = a.admin_users as Record<string, unknown> | null;
                return (
                  <li key={a.id as string} className="border-l-2 border-gray-200 pl-4">
                    <p className="text-sm">
                      <span className="font-medium">{String(adminInfo?.email || "System")}</span>{" "}
                      <span className="text-gray-600">{String(a.action).replace(/_/g, " ")}</span>
                    </p>
                    {a.details ? (
                      <pre className="text-xs text-gray-400 mt-1 overflow-x-auto">
                        {JSON.stringify(a.details, null, 2)}
                      </pre>
                    ) : null}
                    <p className="text-xs text-gray-400 mt-1">
                      {fmtDateTime(a.created_at as string)}
                    </p>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

function InfoCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white border rounded-lg p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-gray-500">{label}</span>
      <span className="font-medium text-gray-900">{value}</span>
    </div>
  );
}
