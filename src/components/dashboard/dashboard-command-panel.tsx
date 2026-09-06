"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  ArrowRight,
  BarChart3,
  CheckCircle2,
  PackagePlus,
  Radio,
  Send,
  ShoppingCart,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import { formatPrice } from "@/lib/utils";
import { WhatsAppIcon } from "@/components/whatsapp-icon";
import { GetTheAppRow } from "@/components/pwa/get-the-app-row";

type TabKey = "today" | "growth" | "automation";

interface DashboardCommandPanelProps {
  productCount: number;
  pendingOrders: number;
  completedOrders: number;
  totalOrders: number;
  totalRevenue: number;
  storeUrl: string;
  itemPlural: string;
  addItemLabel: string;
  setupComplete: boolean;
  storeLinkShared: boolean;
}

const tabs: { key: TabKey; label: string; icon: typeof BarChart3 }[] = [
  { key: "today", label: "Today", icon: BarChart3 },
  { key: "growth", label: "Growth", icon: TrendingUp },
  { key: "automation", label: "Automation", icon: Radio },
];

export function DashboardCommandPanel({
  productCount,
  pendingOrders,
  completedOrders,
  totalOrders,
  totalRevenue,
  storeUrl,
  itemPlural,
  addItemLabel,
  setupComplete,
  storeLinkShared,
}: DashboardCommandPanelProps) {
  const [activeTab, setActiveTab] = useState<TabKey>("today");

  const setupScore = useMemo(() => {
    const checks = [productCount > 0, storeLinkShared, totalOrders > 0, setupComplete];
    return checks.filter(Boolean).length;
  }, [productCount, setupComplete, storeLinkShared, totalOrders]);

  const tabContent = {
    today: {
      title: "Work queue",
      eyebrow: "Daily operations",
      image: "/landing/featured-krotoa-leather-goods.webp",
      description:
        pendingOrders > 0
          ? "Start with pending orders, then check payment confirmations and stock."
          : "No pending orders right now. Keep your catalog fresh and share your store link.",
      primaryHref: pendingOrders > 0 ? "/dashboard/orders" : "/dashboard/products/new",
      primaryLabel: pendingOrders > 0 ? "Review pending orders" : addItemLabel,
      Icon: ShoppingCart,
      highlights: [
        { label: "Pending", value: pendingOrders.toString() },
        { label: "Completed", value: completedOrders.toString() },
        { label: "Revenue", value: formatPrice(totalRevenue) },
      ],
    },
    growth: {
      title: "Share and sell",
      eyebrow: "Store growth",
      image: "/landing/featured-octovia-nexus.webp",
      description:
        "Your store link, QR code, and WhatsApp sharing are the fastest path to more customer orders.",
      primaryHref: storeUrl,
      primaryLabel: "Open store preview",
      Icon: Send,
      highlights: [
        { label: itemPlural, value: productCount.toString() },
        { label: "Orders", value: totalOrders.toString() },
        { label: "Store link", value: storeLinkShared ? "Shared" : "Share now" },
      ],
    },
    automation: {
      title: "WhatsApp-ready workflow",
      eyebrow: "Automation",
      image: "/landing/featured-apatchy-beard-company.webp",
      description:
        "Order updates are designed around WhatsApp so customers stay informed without manual back-and-forth.",
      primaryHref: "/dashboard/settings",
      primaryLabel: "Check store settings",
      Icon: WhatsAppIcon,
      highlights: [
        { label: "Order alerts", value: "Active" },
        { label: "Setup", value: `${setupScore}/4` },
        { label: "Status", value: "Ready" },
      ],
    },
  } satisfies Record<TabKey, {
    title: string;
    eyebrow: string;
    image: string;
    description: string;
    primaryHref: string;
    primaryLabel: string;
    // Widened from `typeof ShoppingCart` so non-Lucide icons (the official
    // WhatsAppIcon) can be used here too.
    Icon: React.ComponentType<{ size?: number; className?: string }>;
    highlights: { label: string; value: string }[];
  }>;

  const current = tabContent[activeTab];
  const CurrentIcon = current.Icon;

  return (
    <section className="mb-8 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm shadow-slate-900/5">
      <div className="grid lg:grid-cols-[0.92fr_1.08fr]">
        <div className="relative overflow-hidden bg-slate-900 p-5 text-white md:p-6">
          <div
            className="absolute inset-0 bg-cover bg-center opacity-45"
            style={{ backgroundImage: `url(${current.image})` }}
          />
          <div className="absolute inset-0 bg-gradient-to-br from-slate-950/95 via-slate-900/78 to-emerald-950/72" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_22%_20%,rgba(43,94,167,0.45),transparent_34%),radial-gradient(circle_at_86%_18%,rgba(20,153,71,0.38),transparent_30%)]" />
          <div className="absolute -right-12 bottom-5 hidden h-36 w-36 rounded-full border border-white/15 bg-white/5 backdrop-blur-sm sm:block" />
          <div className="absolute -right-5 bottom-16 hidden h-20 w-20 rounded-3xl border border-white/20 bg-white/10 backdrop-blur-sm sm:block" />
          <div className="relative">
            <div className="mb-5 flex flex-wrap gap-2">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const active = activeTab === tab.key;
                return (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-black transition ${
                      active
                        ? "bg-white text-slate-950"
                        : "bg-white/10 text-white/75 hover:bg-white/15 hover:text-white"
                    }`}
                  >
                    <Icon size={14} />
                    {tab.label}
                  </button>
                );
              })}
            </div>

            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/12 ring-1 ring-white/15">
              <CurrentIcon size={24} />
            </div>
            <p className="mt-5 text-xs font-black uppercase tracking-[0.18em] text-white/60">
              {current.eyebrow}
            </p>
            <h2 className="mt-2 text-2xl font-black tracking-tight">{current.title}</h2>
            <p className="mt-3 max-w-md text-sm leading-6 text-white/72">
              {current.description}
            </p>
            <Link
              href={current.primaryHref}
              target={current.primaryHref.startsWith("/s/") ? "_blank" : undefined}
              className="mt-5 inline-flex items-center gap-2 rounded-xl bg-acacia px-4 py-2.5 text-sm font-black text-white shadow-sm shadow-emerald-950/20 transition hover:bg-emerald-700"
            >
              {current.primaryLabel}
              <ArrowRight size={15} />
            </Link>
          </div>
        </div>

        <div className="p-5 md:p-6">
          <div className="grid gap-3 sm:grid-cols-3">
            {current.highlights.map((item) => (
              <div
                key={`${activeTab}-${item.label}`}
                className="rounded-2xl border border-slate-200 bg-slate-50 p-4 transition hover:-translate-y-0.5 hover:bg-white hover:shadow-sm"
              >
                <p className="text-xs font-bold text-slate-500">{item.label}</p>
                <p className="mt-2 truncate text-lg font-black text-slate-950">{item.value}</p>
              </div>
            ))}
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 p-4">
              <div className="flex items-center gap-2">
                <Sparkles size={17} className="text-acacia" />
                <p className="font-black text-slate-950">Store readiness</p>
              </div>
              <div className="mt-4 space-y-3">
                <ReadinessRow label={`${itemPlural} listed`} done={productCount > 0} />
                <ReadinessRow label="Store link shared" done={storeLinkShared} />
                <ReadinessRow label="First order received" done={totalOrders > 0} />
                <ReadinessRow label="Store setup complete" done={setupComplete} />
                {/* Client-resolved: installing leaves no server-side trace, so
                    this is informational and not part of setupScore. */}
                <GetTheAppRow />
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 p-4">
              <div className="flex items-center gap-2">
                <PackagePlus size={17} className="text-terracotta" />
                <p className="font-black text-slate-950">Momentum</p>
              </div>
              <div className="mt-4 space-y-4">
                <ProgressRow label="Catalog depth" value={productCount} target={Math.max(10, productCount)} />
                <ProgressRow label="Order progress" value={completedOrders} target={Math.max(3, totalOrders)} />
                <ProgressRow label="Launch score" value={setupScore} target={4} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function ReadinessRow({ label, done }: { label: string; done: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <span className="font-semibold text-slate-700">{label}</span>
      <span
        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-black ${
          done ? "bg-emerald-50 text-acacia" : "bg-slate-100 text-slate-500"
        }`}
      >
        <CheckCircle2 size={13} />
        {done ? "Done" : "Next"}
      </span>
    </div>
  );
}

function ProgressRow({
  label,
  value,
  target,
}: {
  label: string;
  value: number;
  target: number;
}) {
  const percentage = Math.min(100, Math.round((value / Math.max(target, 1)) * 100));

  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-3 text-sm">
        <span className="font-semibold text-slate-700">{label}</span>
        <span className="font-black text-slate-950">{percentage}%</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full rounded-full bg-gradient-to-r from-terracotta to-acacia transition-all duration-700"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
