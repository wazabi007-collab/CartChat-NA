import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { formatPrice, whatsappLink } from "@/lib/utils";
import { card } from "@/lib/ui";
import { MessageCircle, Repeat, Users, Wallet } from "lucide-react";
import { CustomerSearch } from "./customer-search";
import { CustomerNotes } from "./customer-notes";
import { CustomerOptOut } from "./customer-opt-out";

interface CustomerRow {
  id: string;
  whatsapp: string;
  name: string | null;
  notes: string | null;
  marketing_opt_out: boolean;
  created_at: string;
  total_orders: number;
  completed_orders: number;
  total_spent_nad: number;
  last_order_at: string | null;
}

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-NA", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: merchant } = await supabase
    .from("merchants")
    .select("id, store_name")
    .eq("user_id", user.id)
    .single();
  if (!merchant) redirect("/dashboard/setup");

  // Stats are aggregated in Postgres so a store with thousands of orders
  // doesn't pull them all into the page.
  const { data, error } = await supabase.rpc("get_merchant_customers", {
    p_merchant_id: merchant.id,
  });
  const all = (error ? [] : ((data ?? []) as CustomerRow[]));

  const term = (q ?? "").trim().toLowerCase();
  const customers = term
    ? all.filter(
        (c) =>
          (c.name ?? "").toLowerCase().includes(term) ||
          c.whatsapp.toLowerCase().includes(term)
      )
    : all;

  const totalCustomers = all.length;
  const repeatCustomers = all.filter((c) => c.completed_orders > 1).length;
  const lifetimeRevenue = all.reduce((sum, c) => sum + Number(c.total_spent_nad || 0), 0);

  return (
    <div className="md:ml-56 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Customers</h1>
        <p className="mt-1 text-sm text-gray-500">
          Everyone who has ordered from {merchant.store_name}. Built automatically from your orders.
        </p>
      </div>

      {/* Summary */}
      <div className="grid gap-3 sm:grid-cols-3">
        <div className={`${card} flex items-center gap-3`}>
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-emerald-50 text-emerald-700">
            <Users size={18} />
          </span>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Customers</p>
            <p className="text-xl font-black text-slate-900">{totalCustomers}</p>
          </div>
        </div>
        <div className={`${card} flex items-center gap-3`}>
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-amber-50 text-amber-700">
            <Repeat size={18} />
          </span>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Repeat buyers</p>
            <p className="text-xl font-black text-slate-900">{repeatCustomers}</p>
          </div>
        </div>
        <div className={`${card} flex items-center gap-3`}>
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-blue-50 text-blue-700">
            <Wallet size={18} />
          </span>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Lifetime sales</p>
            <p className="text-xl font-black text-slate-900">{formatPrice(lifetimeRevenue)}</p>
          </div>
        </div>
      </div>

      <CustomerSearch initialValue={q ?? ""} />

      {customers.length === 0 ? (
        <div className={`${card} py-12 text-center`}>
          <Users size={32} className="mx-auto text-slate-300" />
          <p className="mt-3 font-semibold text-slate-700">
            {totalCustomers === 0 ? "No customers yet" : "No customers match that search"}
          </p>
          <p className="mt-1 text-sm text-slate-500">
            {totalCustomers === 0
              ? "As soon as someone orders from your store they'll appear here."
              : "Try a different name or number."}
          </p>
        </div>
      ) : (
        <>
          {/* Mobile: cards */}
          <div className="space-y-3 md:hidden">
            {customers.map((c) => (
              <div key={c.id} className={`${card} space-y-2`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-bold text-slate-900">{c.name || "Unnamed customer"}</p>
                    <p className="text-xs text-slate-500">{c.whatsapp}</p>
                  </div>
                  <a
                    href={whatsappLink(c.whatsapp, "")}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1.5 text-xs font-bold text-white"
                  >
                    <MessageCircle size={13} /> Chat
                  </a>
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600">
                  <span><b>{c.completed_orders}</b> order{c.completed_orders === 1 ? "" : "s"}</span>
                  <span><b>{formatPrice(Number(c.total_spent_nad || 0))}</b> spent</span>
                  <span>Last: {formatDate(c.last_order_at)}</span>
                </div>
                <CustomerOptOut customerId={c.id} initialOptOut={c.marketing_opt_out} />
                <CustomerNotes customerId={c.id} initialNotes={c.notes} />
              </div>
            ))}
          </div>

          {/* Desktop: table */}
          <div className={`${card} hidden overflow-x-auto md:block`}>
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase tracking-wide text-slate-500">
                <tr className="border-b border-slate-100">
                  <th className="py-2 pr-3">Customer</th>
                  <th className="py-2 pr-3">Orders</th>
                  <th className="py-2 pr-3">Spent</th>
                  <th className="py-2 pr-3">Last order</th>
                  <th className="py-2 pr-3">Notes</th>
                  <th className="py-2" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {customers.map((c) => (
                  <tr key={c.id} className="align-top">
                    <td className="py-3 pr-3">
                      <p className="font-semibold text-slate-900">{c.name || "Unnamed customer"}</p>
                      <p className="text-xs text-slate-500">{c.whatsapp}</p>
                      <div className="mt-1">
                        <CustomerOptOut customerId={c.id} initialOptOut={c.marketing_opt_out} />
                      </div>
                    </td>
                    <td className="py-3 pr-3 text-slate-700">
                      {c.completed_orders}
                      {c.completed_orders > 1 && (
                        <span className="ml-1.5 rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-black text-amber-800">
                          REPEAT
                        </span>
                      )}
                    </td>
                    <td className="py-3 pr-3 font-semibold text-slate-900">
                      {formatPrice(Number(c.total_spent_nad || 0))}
                    </td>
                    <td className="py-3 pr-3 text-slate-600">{formatDate(c.last_order_at)}</td>
                    <td className="py-3 pr-3 w-64">
                      <CustomerNotes customerId={c.id} initialNotes={c.notes} />
                    </td>
                    <td className="py-3">
                      <a
                        href={whatsappLink(c.whatsapp, "")}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1.5 text-xs font-bold text-white hover:bg-emerald-700"
                      >
                        <MessageCircle size={13} /> Chat
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
