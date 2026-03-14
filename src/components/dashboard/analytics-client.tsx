"use client";

import { useState, useMemo } from "react";
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { Download, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { formatPrice } from "@/lib/utils";

/* ─── Types ───────────────────────────────────────────── */

interface DayRow {
  date: string;
  page_views: number;
  orders_placed: number;
  orders_confirmed: number;
  revenue_nad: number;
}

interface ProductRow {
  name: string;
  qty: number;
  revenue: number;
}

interface AnalyticsClientProps {
  allData: DayRow[];
  topProducts: ProductRow[];
}

type RangeKey = "7d" | "30d" | "90d" | "custom";

/* ─── Helpers ─────────────────────────────────────────── */

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().split("T")[0];
}

function pctChange(current: number, previous: number): { value: string; positive: boolean; neutral: boolean } {
  if (previous === 0 && current === 0) return { value: "0%", positive: false, neutral: true };
  if (previous === 0) return { value: "+100%", positive: true, neutral: false };
  const pct = Math.round(((current - previous) / previous) * 100);
  return {
    value: `${pct >= 0 ? "+" : ""}${pct}%`,
    positive: pct > 0,
    neutral: pct === 0,
  };
}

function formatShortDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-NA", { day: "numeric", month: "short" });
}

/* ─── Main Component ──────────────────────────────────── */

export function AnalyticsClient({ allData, topProducts }: AnalyticsClientProps) {
  const [rangeKey, setRangeKey] = useState<RangeKey>("30d");
  const [customFrom, setCustomFrom] = useState(daysAgo(30));
  const [customTo, setCustomTo] = useState(daysAgo(0));

  // Filter data by range
  const { filtered, prevFiltered } = useMemo(() => {
    let from: string;
    let to: string;
    let rangeDays: number;

    if (rangeKey === "custom") {
      from = customFrom;
      to = customTo;
      rangeDays = Math.max(1, Math.ceil((new Date(to).getTime() - new Date(from).getTime()) / 86400000));
    } else {
      rangeDays = parseInt(rangeKey);
      from = daysAgo(rangeDays);
      to = daysAgo(0);
    }

    const prevFrom = (() => {
      const d = new Date(from);
      d.setDate(d.getDate() - rangeDays);
      return d.toISOString().split("T")[0];
    })();

    const filtered = allData.filter((d) => d.date >= from && d.date <= to);
    const prevFiltered = allData.filter((d) => d.date >= prevFrom && d.date < from);

    return { filtered, prevFiltered };
  }, [allData, rangeKey, customFrom, customTo]);

  // Totals
  const totals = filtered.reduce(
    (acc, day) => ({
      views: acc.views + day.page_views,
      orders: acc.orders + day.orders_placed,
      confirmed: acc.confirmed + day.orders_confirmed,
      revenue: acc.revenue + day.revenue_nad,
    }),
    { views: 0, orders: 0, confirmed: 0, revenue: 0 }
  );

  const prevTotals = prevFiltered.reduce(
    (acc, day) => ({
      views: acc.views + day.page_views,
      orders: acc.orders + day.orders_placed,
      confirmed: acc.confirmed + day.orders_confirmed,
      revenue: acc.revenue + day.revenue_nad,
    }),
    { views: 0, orders: 0, confirmed: 0, revenue: 0 }
  );

  // Conversion & AOV
  const conversionRate = totals.views > 0 ? ((totals.orders / totals.views) * 100).toFixed(1) : "0.0";
  const avgOrderValue = totals.orders > 0 ? Math.round(totals.revenue / totals.orders) : 0;
  const prevConvRate = prevTotals.views > 0 ? ((prevTotals.orders / prevTotals.views) * 100) : 0;
  const prevAOV = prevTotals.orders > 0 ? Math.round(prevTotals.revenue / prevTotals.orders) : 0;

  // Chart data (sorted ascending by date)
  const chartData = [...filtered]
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((d) => ({
      date: formatShortDate(d.date),
      Views: d.page_views,
      Orders: d.orders_placed,
      Revenue: d.revenue_nad / 100, // convert cents to NAD for chart
    }));

  // CSV export
  function downloadCSV() {
    const header = "Date,Page Views,Orders Placed,Orders Confirmed,Revenue (NAD)\n";
    const rows = [...filtered]
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((d) => `${d.date},${d.page_views},${d.orders_placed},${d.orders_confirmed},${(d.revenue_nad / 100).toFixed(2)}`)
      .join("\n");
    const blob = new Blob([header + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `analytics-${rangeKey}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const ranges: { key: RangeKey; label: string }[] = [
    { key: "7d", label: "7 Days" },
    { key: "30d", label: "30 Days" },
    { key: "90d", label: "90 Days" },
    { key: "custom", label: "Custom" },
  ];

  return (
    <div>
      {/* Date Range Picker */}
      <div className="flex flex-wrap items-center gap-2 mb-6">
        {ranges.map((r) => (
          <button
            key={r.key}
            onClick={() => setRangeKey(r.key)}
            className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
              rangeKey === r.key
                ? "bg-green-600 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {r.label}
          </button>
        ))}
        {rangeKey === "custom" && (
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={customFrom}
              onChange={(e) => setCustomFrom(e.target.value)}
              className="border rounded-md px-2 py-1 text-sm"
            />
            <span className="text-gray-400">to</span>
            <input
              type="date"
              value={customTo}
              onChange={(e) => setCustomTo(e.target.value)}
              className="border rounded-md px-2 py-1 text-sm"
            />
          </div>
        )}
        <button
          onClick={downloadCSV}
          className="ml-auto flex items-center gap-1.5 px-3 py-1.5 text-sm border rounded-md text-gray-600 hover:bg-gray-50 transition-colors"
        >
          <Download size={14} />
          Export CSV
        </button>
      </div>

      {/* Stat Cards with Period Comparison */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        <StatBox label="Page Views" value={totals.views.toLocaleString()} change={pctChange(totals.views, prevTotals.views)} />
        <StatBox label="Orders Placed" value={totals.orders.toLocaleString()} change={pctChange(totals.orders, prevTotals.orders)} />
        <StatBox label="Orders Confirmed" value={totals.confirmed.toLocaleString()} change={pctChange(totals.confirmed, prevTotals.confirmed)} />
        <StatBox label="Revenue" value={formatPrice(totals.revenue)} change={pctChange(totals.revenue, prevTotals.revenue)} highlight />
        <StatBox label="Conversion Rate" value={`${conversionRate}%`} change={pctChange(parseFloat(conversionRate), prevConvRate)} />
        <StatBox label="Avg Order Value" value={formatPrice(avgOrderValue)} change={pctChange(avgOrderValue, prevAOV)} />
      </div>

      {/* Charts */}
      <div className="grid lg:grid-cols-2 gap-6 mb-8">
        {/* Views & Orders Line Chart */}
        <div className="bg-white rounded-lg border p-4">
          <h2 className="font-medium text-gray-900 mb-3">Daily Views & Orders</h2>
          {chartData.length === 0 ? (
            <p className="text-sm text-gray-400 py-8 text-center">No data for this period.</p>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="Views" stroke="#6366f1" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="Orders" stroke="#16a34a" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Revenue Bar Chart */}
        <div className="bg-white rounded-lg border p-4">
          <h2 className="font-medium text-gray-900 mb-3">Daily Revenue (NAD)</h2>
          {chartData.length === 0 ? (
            <p className="text-sm text-gray-400 py-8 text-center">No data for this period.</p>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(value) => [`N$${Number(value).toFixed(2)}`, "Revenue"]} />
                <Bar dataKey="Revenue" fill="#16a34a" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Product Performance */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Top Products Table */}
        <div className="bg-white rounded-lg border p-4">
          <h2 className="font-medium text-gray-900 mb-3">Top Selling Products</h2>
          {topProducts.length === 0 ? (
            <p className="text-sm text-gray-400">Complete some orders to see your top products.</p>
          ) : (
            <div className="space-y-2">
              {topProducts.map((p, i) => (
                <div key={p.name} className="flex items-center justify-between text-sm py-1.5 border-b border-gray-50 last:border-0">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="w-5 text-center text-gray-400 font-medium">{i + 1}</span>
                    <span className="text-gray-700 truncate">{p.name}</span>
                  </div>
                  <div className="flex gap-4 text-right shrink-0">
                    <span className="text-gray-500">{p.qty} sold</span>
                    <span className="text-green-600 font-medium w-20">{formatPrice(p.revenue)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Top Products Bar Chart */}
        <div className="bg-white rounded-lg border p-4">
          <h2 className="font-medium text-gray-900 mb-3">Product Revenue</h2>
          {topProducts.length === 0 ? (
            <p className="text-sm text-gray-400">No product data yet.</p>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart
                data={topProducts.slice(0, 8).map((p) => ({
                  name: p.name.length > 15 ? p.name.slice(0, 15) + "…" : p.name,
                  Revenue: p.revenue / 100,
                  Quantity: p.qty,
                }))}
                layout="vertical"
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={120} />
                <Tooltip formatter={(value, name) => [String(name) === "Revenue" ? `N$${Number(value).toFixed(2)}` : value, name]} />
                <Legend />
                <Bar dataKey="Revenue" fill="#16a34a" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── Stat Box ────────────────────────────────────────── */

function StatBox({
  label,
  value,
  change,
  highlight,
}: {
  label: string;
  value: string;
  change: { value: string; positive: boolean; neutral: boolean };
  highlight?: boolean;
}) {
  return (
    <div className="bg-white rounded-lg border p-4">
      <p className="text-xs text-gray-500">{label}</p>
      <p className={`text-lg sm:text-2xl font-bold mt-1 truncate ${highlight ? "text-green-600" : "text-gray-900"}`} title={value}>{value}</p>
      <div className="flex items-center gap-1 mt-1">
        {change.neutral ? (
          <Minus size={12} className="text-gray-400" />
        ) : change.positive ? (
          <TrendingUp size={12} className="text-green-600" />
        ) : (
          <TrendingDown size={12} className="text-red-500" />
        )}
        <span className={`text-xs ${change.neutral ? "text-gray-400" : change.positive ? "text-green-600" : "text-red-500"}`}>
          {change.value} vs prev
        </span>
      </div>
    </div>
  );
}
