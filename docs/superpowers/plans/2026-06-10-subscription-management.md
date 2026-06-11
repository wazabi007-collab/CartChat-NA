# Subscription Management Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give merchants a self-service `/dashboard/subscription` page showing their plan, usage, and payment history, with upgrade links and cancel-at-period-end.

**Architecture:** One new `cancel_at_period_end` boolean on `subscriptions`. A new server-component page reads the subscription, payments, and usage counts and renders plan/usage/history/actions. A small client component + API route toggle the cancel flag (kept off the guarded `subscriptions` table via a service-client route). Cancel reuses the existing lifecycle cron; the reminder cron just skips cancelling subs. The dashboard's `QuotaRow` is extracted to a shared component for reuse.

**Tech Stack:** Next.js 16 (App Router, server + client components), Supabase (Postgres, RLS, service client), Tailwind, TypeScript, lucide-react. No unit-test runner — verification is `npx tsc --noEmit`, `npm run build`, SQL checks, and a Playwright pass.

**Spec:** `docs/superpowers/specs/2026-06-10-subscription-management-design.md`

**Repo root for all paths/commands:** `chatcart-na/`

---

## Background facts (read before starting)

- `subscriptions` columns: `id, merchant_id, tier, status, trial_ends_at,
  current_period_start, current_period_end, grace_ends_at, soft_suspended_at,
  created_at, updated_at, pending_tier, payment_reference,
  dpo_transaction_token, pending_months, pending_amount_cents`. This task adds
  `cancel_at_period_end`.
- `payments` columns: `id, merchant_id, subscription_id, amount_nad,
  payment_method, reference, notes, recorded_by, period_start, period_end,
  voided_at, created_at`. `amount_nad` is in cents. RLS: merchants can read
  their own payments.
- **`src/types/database.ts` does NOT define `subscriptions` or `payments`
  tables** — the codebase uses inline row types (see `SubscriptionRow` in
  `src/app/api/cron/check-subscriptions/route.ts`). So there is NO database.ts
  edit; the page/route declare inline types.
- `guard_subscription_update` trigger blocks merchants from changing
  entitlement fields (tier/status/periods/pending_*) but NOT
  `cancel_at_period_end` (new, unlisted) — so the service-role route can set it
  freely, and even a merchant-scoped write would pass the guard.
- Helpers in `src/lib/tier-limits.ts`: `TIER_LIMITS`, `TIER_LABELS`,
  `STATUS_LABELS` (`{label,color}` per status), `formatTierPrice(tier)` →
  `"Free"`/`"N$149/mo"`, types `SubscriptionTier`/`SubscriptionStatus`.
- `src/lib/plans.ts` exports `PUBLIC_PLANS` (paid plans, with `tier`, `name`,
  `priceDisplay`). Use it for the upgrade list (but build checkout hrefs as
  `/pricing/checkout?tier=<tier>`, not the signup hrefs on the objects).
- The dashboard overview (`src/app/(dashboard)/dashboard/page.tsx`) computes
  the monthly order count (orders since start of month) and product count, and
  has a local `QuotaRow` component (~line 515) — extracted in Task 2.
- Support WhatsApp number (from checkout): `+264816274823`.
- **Migration application** is an orchestrator step (the auto-classifier blocks
  DB migrations from subagents); the implementer only creates the `.sql` file.

---

### Task 1: Migration — `cancel_at_period_end` column

**Files:**
- Create: `supabase/migrations/041_subscription_cancel_flag.sql`

- [ ] **Step 1: Write the migration**

```sql
-- 041_subscription_cancel_flag.sql
-- Merchant self-service cancel: flag the sub to not renew. The existing
-- lifecycle cron lapses it (grace -> suspended) at period end; no tier change.
ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS cancel_at_period_end boolean NOT NULL DEFAULT false;
```

- [ ] **Step 2: Confirm no database.ts change is needed**

Run: `grep -c "subscriptions:" src/types/database.ts`
Expected: `0` (subscriptions is not typed in database.ts — inline types are used). No edit required.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/041_subscription_cancel_flag.sql
git commit -m "Add subscriptions.cancel_at_period_end column"
```

- [ ] **Step 4: Orchestrator applies the migration**

(Orchestrator, not subagent.) Apply via Supabase MCP `apply_migration` to
project `pcseqiaqeiiaiqxqtfmw`, then verify:

```sql
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name='subscriptions' AND column_name='cancel_at_period_end';
```

Expected: one row, `boolean`, default `false`.

---

### Task 2: Extract shared `QuotaRow` component

**Files:**
- Create: `src/components/dashboard/quota-row.tsx`
- Modify: `src/app/(dashboard)/dashboard/page.tsx` (remove local `QuotaRow`, import shared)

- [ ] **Step 1: Create the shared component**

Create `src/components/dashboard/quota-row.tsx` with the dashboard's existing
QuotaRow markup, exported:

```tsx
export function QuotaRow({
  label,
  used,
  limit,
}: {
  label: string;
  used: number;
  limit: number;
}) {
  if (limit === -1) {
    return (
      <div className="flex items-center justify-between gap-3 text-sm">
        <span className="font-semibold text-slate-700">{label}</span>
        <span className="font-black text-slate-950">
          {used} <span className="font-bold text-slate-400">/ Unlimited</span>
        </span>
      </div>
    );
  }

  const percentage = Math.min(100, Math.round((used / Math.max(limit, 1)) * 100));

  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-3 text-sm">
        <span className="font-semibold text-slate-700">{label}</span>
        <span className="font-black text-slate-950">
          {used} <span className="font-bold text-slate-400">/ {limit}</span>
        </span>
      </div>
      <div className="h-2 rounded-full bg-slate-100">
        <div
          className="h-2 rounded-full bg-acacia transition-all"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
```

NOTE: open `src/app/(dashboard)/dashboard/page.tsx`, find the local
`function QuotaRow({...}) {...}` (around line 515) and copy its EXACT body into
the component above (the markup here mirrors it; if the real one differs, the
real one wins — keep it byte-identical). Then proceed to Step 2.

- [ ] **Step 2: Use the shared component in the dashboard**

In `src/app/(dashboard)/dashboard/page.tsx`:
- Delete the local `function QuotaRow({ ... }) { ... }` definition entirely.
- Add the import near the other component imports at the top:
  ```tsx
  import { QuotaRow } from "@/components/dashboard/quota-row";
  ```
(The two `<QuotaRow .../>` usages stay unchanged.)

- [ ] **Step 3: Typecheck + lint**

Run: `npx tsc --noEmit`
Expected: no errors.
Run: `npx eslint src/components/dashboard/quota-row.tsx "src/app/(dashboard)/dashboard/page.tsx"`
Expected: clean.

- [ ] **Step 4: Commit**

```bash
git add src/components/dashboard/quota-row.tsx "src/app/(dashboard)/dashboard/page.tsx"
git commit -m "Extract shared QuotaRow dashboard component"
```

---

### Task 3: Cancel API route

**Files:**
- Create: `src/app/api/subscription/cancel/route.ts`

- [ ] **Step 1: Write the route**

```ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

/**
 * POST /api/subscription/cancel  { cancel: boolean }
 * Sets subscriptions.cancel_at_period_end for the authenticated merchant.
 * Only togglable from active/grace. Uses the service client so the write
 * stays off the merchant-guarded subscriptions RLS path.
 */
export async function POST(req: NextRequest) {
  const supabaseAuth = await createClient();
  const {
    data: { user },
  } = await supabaseAuth.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const cancel = body?.cancel;
  if (typeof cancel !== "boolean") {
    return NextResponse.json({ error: "Missing 'cancel' boolean" }, { status: 400 });
  }

  const service = createServiceClient();

  const { data: merchant } = await service
    .from("merchants")
    .select("id")
    .eq("user_id", user.id)
    .single();
  if (!merchant) {
    return NextResponse.json({ error: "No store found" }, { status: 404 });
  }

  const { data: sub } = await service
    .from("subscriptions")
    .select("id, status")
    .eq("merchant_id", merchant.id)
    .single();
  if (!sub) {
    return NextResponse.json({ error: "No subscription found" }, { status: 404 });
  }
  if (!["active", "grace"].includes(sub.status)) {
    return NextResponse.json(
      { error: "Only active subscriptions can be cancelled" },
      { status: 400 }
    );
  }

  const { error } = await service
    .from("subscriptions")
    .update({ cancel_at_period_end: cancel })
    .eq("id", sub.id);
  if (error) {
    return NextResponse.json({ error: "Failed to update subscription" }, { status: 500 });
  }

  return NextResponse.json({ success: true, cancel_at_period_end: cancel });
}
```

- [ ] **Step 2: Typecheck + lint**

Run: `npx tsc --noEmit`
Expected: no errors.
Run: `npx eslint "src/app/api/subscription/cancel/route.ts"`
Expected: clean.

- [ ] **Step 3: Commit**

```bash
git add "src/app/api/subscription/cancel/route.ts"
git commit -m "Add subscription cancel toggle API route"
```

---

### Task 4: Subscription page + actions component

**Files:**
- Create: `src/app/(dashboard)/dashboard/subscription/page.tsx`
- Create: `src/app/(dashboard)/dashboard/subscription/subscription-actions.tsx`

- [ ] **Step 1: Write the actions client component**

`src/app/(dashboard)/dashboard/subscription/subscription-actions.tsx`:

```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Loader2 } from "lucide-react";

export function SubscriptionActions({
  cancelling,
  periodEndLabel,
}: {
  cancelling: boolean;
  periodEndLabel: string;
}) {
  const [loading, setLoading] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function setCancel(cancel: boolean) {
    setLoading(true);
    setError(null);
    setConfirming(false);
    try {
      const res = await fetch("/api/subscription/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cancel }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Could not update your subscription");
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <span className="inline-flex items-center gap-2 text-sm text-slate-500">
        <Loader2 size={16} className="animate-spin" /> Updating…
      </span>
    );
  }

  if (cancelling) {
    return (
      <div className="space-y-2">
        <button
          onClick={() => setCancel(false)}
          className="inline-flex items-center justify-center rounded-lg bg-acacia px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-acacia/90"
        >
          Keep my plan
        </button>
        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>
    );
  }

  if (confirming) {
    return (
      <div className="flex flex-col gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3">
        <div className="flex items-start gap-2">
          <AlertTriangle size={16} className="mt-0.5 text-amber-500" />
          <p className="text-sm text-slate-700">
            Cancel your subscription? Your store stays active until {periodEndLabel}, then goes offline unless you resubscribe.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setCancel(true)}
            className="rounded-lg bg-red-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-red-700"
          >
            Yes, cancel
          </button>
          <button
            onClick={() => setConfirming(false)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50"
          >
            No, keep it
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <button
        onClick={() => setConfirming(true)}
        className="inline-flex items-center justify-center rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50"
      >
        Cancel subscription
      </button>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
```

- [ ] **Step 2: Write the page (server component)**

`src/app/(dashboard)/dashboard/subscription/page.tsx`:

```tsx
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { redirect } from "next/navigation";
import Link from "next/link";
import { CreditCard } from "lucide-react";
import {
  TIER_LIMITS,
  TIER_LABELS,
  STATUS_LABELS,
  formatTierPrice,
  type SubscriptionTier,
  type SubscriptionStatus,
} from "@/lib/tier-limits";
import { PUBLIC_PLANS } from "@/lib/plans";
import { QuotaRow } from "@/components/dashboard/quota-row";
import { SubscriptionActions } from "./subscription-actions";

const TIER_RANK: Record<SubscriptionTier, number> = {
  oshi_start: 0,
  oshi_basic: 1,
  oshi_grow: 2,
  oshi_pro: 3,
};

const SUPPORT_WHATSAPP = "264816274823";

function formatDate(value: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-NA", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  eft: "EFT",
  cash: "Cash",
  dpo: "Card (DPO)",
  momo: "MoMo",
  ewallet: "eWallet",
};

export default async function SubscriptionPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const service = createServiceClient();

  const { data: merchant } = await service
    .from("merchants")
    .select("id, store_name")
    .eq("user_id", user.id)
    .single();
  if (!merchant) redirect("/dashboard/setup");

  const { data: sub } = await service
    .from("subscriptions")
    .select(
      "tier, status, trial_ends_at, current_period_end, grace_ends_at, cancel_at_period_end"
    )
    .eq("merchant_id", merchant.id)
    .single();

  const tier = (sub?.tier ?? "oshi_start") as SubscriptionTier;
  const status = (sub?.status ?? "trial") as SubscriptionStatus;
  const cancelling = Boolean(sub?.cancel_at_period_end);
  const limits = TIER_LIMITS[tier];
  const statusInfo = STATUS_LABELS[status];

  // Usage: product count + this-month order count (mirrors dashboard overview)
  const { count: productCount } = await service
    .from("products")
    .select("id", { count: "exact", head: true })
    .eq("merchant_id", merchant.id);

  let monthlyOrderCount = 0;
  if (limits.orders_per_month !== -1) {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    const { count } = await service
      .from("orders")
      .select("id", { count: "exact", head: true })
      .eq("merchant_id", merchant.id)
      .gte("created_at", startOfMonth.toISOString());
    monthlyOrderCount = count || 0;
  }

  // Payment history (own, non-voided, newest first)
  const { data: payments } = await service
    .from("payments")
    .select("id, amount_nad, payment_method, period_start, period_end, created_at")
    .eq("merchant_id", merchant.id)
    .is("voided_at", null)
    .order("created_at", { ascending: false });

  const periodEndLabel = formatDate(sub?.current_period_end ?? null);

  // Date line by status
  let dateLine: string;
  if (status === "trial") {
    dateLine = `Free trial ends ${formatDate(sub?.trial_ends_at ?? null)}`;
  } else if (status === "active") {
    dateLine = cancelling
      ? `Ends ${periodEndLabel}`
      : `Renews ${periodEndLabel}`;
  } else if (status === "grace") {
    dateLine = `Payment overdue — store pauses ${formatDate(sub?.grace_ends_at ?? null)}`;
  } else {
    dateLine = "Suspended — reactivate to reopen your store";
  }

  const upgradeTargets = PUBLIC_PLANS.filter(
    (p) => TIER_RANK[p.tier] > TIER_RANK[tier]
  );
  const isSuspended = status === "soft_suspended" || status === "hard_suspended";
  const canCancel = (status === "active" || status === "grace");

  return (
    <div className="md:ml-56 space-y-6">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-acacia">
          Billing
        </p>
        <h1 className="mt-2 text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">
          Subscription
        </h1>
      </div>

      {cancelling && status === "active" && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          Your subscription is set to end on <strong>{periodEndLabel}</strong>.
          Your store will go offline after this date unless you resubscribe.
        </div>
      )}

      {/* Current plan */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-900/5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-acacia-soft text-acacia">
                <CreditCard size={18} />
              </span>
              <h2 className="text-xl font-black text-slate-950">
                {TIER_LABELS[tier]}
              </h2>
              <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusInfo.color}`}>
                {statusInfo.label}
              </span>
            </div>
            <p className="mt-2 text-sm font-semibold text-slate-500">{dateLine}</p>
          </div>
          <p className="text-lg font-black text-slate-950">{formatTierPrice(tier)}</p>
        </div>

        <div className="mt-5 space-y-3 border-t border-slate-100 pt-5">
          <QuotaRow label="Products" used={productCount || 0} limit={limits.products} />
          <QuotaRow
            label="Orders this month"
            used={monthlyOrderCount}
            limit={limits.orders_per_month}
          />
        </div>
      </div>

      {/* Actions */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-900/5 sm:p-6">
        <h2 className="text-sm font-black uppercase tracking-wide text-slate-500">
          Manage plan
        </h2>
        <div className="mt-4 flex flex-wrap gap-3">
          {upgradeTargets.map((p) => (
            <Link
              key={p.tier}
              href={`/pricing/checkout?tier=${p.tier}`}
              className="inline-flex items-center justify-center rounded-lg bg-terracotta px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-[#234B86]"
            >
              {isSuspended ? "Reactivate as" : "Upgrade to"} {p.name} · {p.priceDisplay}
            </Link>
          ))}
          <a
            href={`https://wa.me/${SUPPORT_WHATSAPP}?text=${encodeURIComponent(
              `Hi OshiCart, I'd like to change my plan for my store "${merchant.store_name}".`
            )}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50"
          >
            Change or downgrade plan
          </a>
        </div>
        {canCancel && (
          <div className="mt-4 border-t border-slate-100 pt-4">
            <SubscriptionActions cancelling={cancelling} periodEndLabel={periodEndLabel} />
          </div>
        )}
      </div>

      {/* Payment history */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-900/5 sm:p-6">
        <h2 className="text-sm font-black uppercase tracking-wide text-slate-500">
          Payment history
        </h2>
        {payments && payments.length > 0 ? (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-slate-400">
                  <th className="pb-2 font-bold">Date</th>
                  <th className="pb-2 font-bold">Amount</th>
                  <th className="pb-2 font-bold">Method</th>
                  <th className="pb-2 font-bold">Period</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {payments.map((p) => (
                  <tr key={p.id}>
                    <td className="py-2 text-slate-700">{formatDate(p.created_at)}</td>
                    <td className="py-2 font-semibold text-slate-900">
                      N${(p.amount_nad / 100).toLocaleString()}
                    </td>
                    <td className="py-2 text-slate-600">
                      {PAYMENT_METHOD_LABELS[p.payment_method] ?? p.payment_method}
                    </td>
                    <td className="py-2 text-slate-500">
                      {p.period_start && p.period_end
                        ? `${formatDate(p.period_start)} – ${formatDate(p.period_end)}`
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="mt-3 text-sm text-slate-500">No payments yet.</p>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Typecheck + lint**

Run: `npx tsc --noEmit`
Expected: no errors.
Run: `npx eslint "src/app/(dashboard)/dashboard/subscription/page.tsx" "src/app/(dashboard)/dashboard/subscription/subscription-actions.tsx"`
Expected: clean.

- [ ] **Step 4: Commit**

```bash
git add "src/app/(dashboard)/dashboard/subscription/"
git commit -m "Add merchant subscription management page"
```

---

### Task 5: Nav link + reminder cron filter

**Files:**
- Modify: `src/components/dashboard/nav.tsx` (import + baseNavItems entry)
- Modify: `src/app/api/cron/check-subscriptions/route.ts` (skip cancelling subs)

- [ ] **Step 1: Add the nav link**

In `src/components/dashboard/nav.tsx`, add `CreditCard` to the lucide import
block:

```tsx
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  BarChart3,
  Settings,
  LogOut,
  Ticket,
  User,
  Store,
  CreditCard,
} from "lucide-react";
```

Then add an entry to `baseNavItems`, after the Account item:

```tsx
  { href: "/dashboard/account", label: "Account", icon: User, requireFeature: null },
  { href: "/dashboard/subscription", label: "Subscription", icon: CreditCard, requireFeature: null },
  { href: "/dashboard/settings", label: "Settings", icon: Settings, requireFeature: null },
```

- [ ] **Step 2: Skip cancelling subs in the reminder cron**

In `src/app/api/cron/check-subscriptions/route.ts`:

Add `cancel_at_period_end` to the `SubscriptionRow` type (after
`soft_suspended_at`):
```tsx
  soft_suspended_at: string | null;
  cancel_at_period_end: boolean;
```

Add it to the select string and exclude cancelling subs from reminders. Change:
```tsx
  const { data: endingSoon } = await supabase
    .from("subscriptions")
    .select("id, merchant_id, tier, status, trial_ends_at, current_period_end, grace_ends_at, soft_suspended_at, merchants!inner(id, store_name, whatsapp_number)")
    .in("status", ["trial", "active"])
    .or(`trial_ends_at.lte.${sevenDaysAhead},current_period_end.lte.${sevenDaysAhead}`);
```
to:
```tsx
  const { data: endingSoon } = await supabase
    .from("subscriptions")
    .select("id, merchant_id, tier, status, trial_ends_at, current_period_end, grace_ends_at, soft_suspended_at, cancel_at_period_end, merchants!inner(id, store_name, whatsapp_number)")
    .in("status", ["trial", "active"])
    .eq("cancel_at_period_end", false)
    .or(`trial_ends_at.lte.${sevenDaysAhead},current_period_end.lte.${sevenDaysAhead}`);
```

- [ ] **Step 3: Typecheck + lint**

Run: `npx tsc --noEmit`
Expected: no errors.
Run: `npx eslint src/components/dashboard/nav.tsx "src/app/api/cron/check-subscriptions/route.ts"`
Expected: clean.

- [ ] **Step 4: Commit**

```bash
git add src/components/dashboard/nav.tsx "src/app/api/cron/check-subscriptions/route.ts"
git commit -m "Add Subscription nav link and skip cancelling subs in reminders"
```

---

### Task 6: Build + manual verification

- [ ] **Step 1: Full build**

Run: `npm run build`
Expected: build succeeds, 0 type errors; `/dashboard/subscription` appears in
the route list.

- [ ] **Step 2: Manual pass (Playwright/manual, local dev, QA merchant)**

The QA merchant is `afbc66c3-4b3d-407d-aeb1-d815e27b20b8` (currently
`oshi_start`/suspended from earlier testing). Use the orchestrator's Supabase
MCP to stage states and verify; reset afterward.

1. **Trial state:** set the QA sub to
   `tier='oshi_start', status='trial', trial_ends_at=now()+15 days,
   cancel_at_period_end=false`. Visit `/dashboard/subscription`: card shows
   "Oshi-Start", Trial badge, "Free trial ends …", quotas (products X/20,
   orders Y/50), no Cancel button, upgrade buttons to Storefront/Automate/Pro,
   "No payments yet".
2. **Active + cancel flow:** set
   `status='active', current_period_end=now()+20 days, tier='oshi_basic'`.
   Page shows "Renews …"; click Cancel → confirm → "Yes, cancel" → banner
   appears, date line "Ends …", "Keep my plan" shows. Verify
   `SELECT cancel_at_period_end FROM subscriptions WHERE merchant_id=…` is true.
   Click "Keep my plan" → flag clears, banner gone.
3. **Reminder cron exclusion:** with `cancel_at_period_end=true` and
   `current_period_end` within 7 days, confirm the cron's query
   (`.in(status,[trial,active]).eq(cancel_at_period_end,false)`) excludes it —
   inspect via SQL count with/without the filter.
4. **Pro state:** set `tier='oshi_pro'`. Quotas show "/ Unlimited"; no upgrade
   buttons.
5. **Payment history:** insert a test payment
   (`INSERT INTO payments (merchant_id, amount_nad, payment_method,
   period_start, period_end, created_at) VALUES (…, 14900, 'eft', …, …, now())`)
   → row renders "N$149", "EFT", period. Set its `voided_at` → row disappears.
   Delete the test payment after.
6. **Reset QA merchant** to its prior state: `status='soft_suspended'` (or
   whatever it was), `cancel_at_period_end=false`.

- [ ] **Step 3: Final commit (if fixups) + update handoff**

```bash
git add -A && git commit -m "Subscription page verification fixups"
```

Update `.remember/remember.md`: sub-project B done; note whether pushed;
migration 041 must be applied to prod (Task 1 Step 4).

---

## Self-review notes

- **Spec coverage:** migration + flag (T1); current-plan card with
  status-by-status date line, quotas, cancellation banner, payment history,
  upgrade/support/cancel actions (T4); cancel route off the guarded table (T3);
  nav link + reminder-cron skip (T5); QuotaRow reuse via extraction (T2);
  build + manual incl. trial/active/pro/suspended edges (T6).
- **database.ts:** correctly NOT edited (subscriptions/payments aren't typed
  there) — T1 Step 2 asserts this; page/route use inline selects.
- **Type consistency:** `SubscriptionActions` props (`cancelling`,
  `periodEndLabel`) match the page's usage; `TIER_RANK`/`PUBLIC_PLANS`/
  `formatTierPrice`/`STATUS_LABELS` used with their real shapes; `amount_nad`
  treated as cents (`/100`) consistently.
- **Edges:** trial hides Cancel (canCancel = active|grace); suspended shows
  "Reactivate as" CTA; Pro hides upgrades (empty `upgradeTargets`).
- **Migration application** is an orchestrator step (auto-classifier blocks DB
  migrations from subagents), as in the POP and tier plans.
