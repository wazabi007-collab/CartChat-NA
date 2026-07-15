# Referral Program (Phase 1) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let admin-created promoters refer merchants via a share code; referred merchants get a 45-day trial, and the admin console tracks each paying conversion's bounty for manual payout.

**Architecture:** A `?ref=<code>` param rides the existing `tier`-param rails (signup → email/Google OAuth → callback → setup) and is stamped onto `merchants.referred_by_code` at store creation, where the trial is also extended to 45 days for valid codes. Two new service-role-only tables (`referrers`, `referral_payouts`) plus an admin page compute bounties live from subscription tier/status and record manual payouts. No changes to the payment/DPO flow.

**Tech Stack:** Next.js 16 (App Router, RSC + client components), Supabase (Postgres + RLS, service-role client for admin/service reads), TypeScript, Tailwind v4. Verification is `npm run build` (typecheck+build) + `npm run lint` + targeted manual checks — the repo has **no unit-test runner** (Playwright E2E only).

## Global Constraints

- **Never name a React prop `ref`** — it's reserved. The OAuth button's referral prop is `referralCode`. The query-string key is `ref`; the localStorage key is `oshicart_ref`.
- Bounty amounts (cents): `oshi_start: 0 · oshi_basic: 7500 · oshi_grow: 20000 · oshi_pro: 40000`. Trial: `REFERRED_TRIAL_DAYS = 45`, `STANDARD_TRIAL_DAYS = 30`.
- Referral tables (`referrers`, `referral_payouts`) are **service-role only** — no public/merchant RLS policies. All admin reads/writes use `createServiceClient()`.
- `referral_payouts.merchant_id` is **UNIQUE** — a merchant is paid out at most once; a duplicate mark-paid must fail gracefully.
- Attribution is validated server-side (`/api/referral/validate`) before it is written or before the extended trial is granted — never trust the client-held code.
- Bounty is only non-zero for **paying** merchants (`subscriptions.status === 'active'`). Trial/free = N$0.
- Admin gate: new permission `manage_referrals`, granted to `super_admin` + `finance` only.
- Dev runs against the **production** Supabase DB; migration 053 must be applied (user-approved) before runtime tests of Tasks 2, 4, 6.
- Prod migrations require **explicit user approval** — never auto-apply.

---

## Task 1: Foundation — migration, types, constants, permission

**Files:**
- Create: `supabase/migrations/053_referral_program.sql`
- Modify: `src/types/database.ts`
- Modify: `src/lib/constants.ts` (append)
- Modify: `src/lib/admin-permissions.ts` (permission union + role grants only — NOT the nav item; that lands in Task 6 with the page)

**Interfaces:**
- Produces: `referrers` + `referral_payouts` tables; `merchants.referred_by_code` column; `REFERRAL_BOUNTY_NAD`, `REFERRED_TRIAL_DAYS`, `STANDARD_TRIAL_DAYS`, `getReferralBounty(tier: string): number`; `manage_referrals` Permission.

- [ ] **Step 1: Create migration `053_referral_program.sql`**

```sql
-- Migration 053: Referral program (Phase 1)
-- Admin-created promoters refer merchants; bounty tracked for manual payout.

CREATE TABLE IF NOT EXISTS referrers (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code          text NOT NULL UNIQUE,
  name          text NOT NULL,
  whatsapp      text,
  payout_number text,
  is_active     boolean NOT NULL DEFAULT true,
  notes         text,
  created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_referrers_code_active ON referrers (code) WHERE is_active = true;

ALTER TABLE merchants ADD COLUMN IF NOT EXISTS referred_by_code text DEFAULT NULL;
CREATE INDEX IF NOT EXISTS idx_merchants_referred_by ON merchants (referred_by_code) WHERE referred_by_code IS NOT NULL;

CREATE TABLE IF NOT EXISTS referral_payouts (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_code  text NOT NULL,
  merchant_id    uuid NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
  commission_nad integer NOT NULL,
  paid_reference text,
  admin_note     text,
  paid_by        uuid,
  paid_at        timestamptz NOT NULL DEFAULT now(),
  UNIQUE (merchant_id)
);

-- Service-role / admin only: enable RLS but add NO policies, so anon/authenticated
-- clients get nothing and only the service_role key can read/write.
ALTER TABLE referrers ENABLE ROW LEVEL SECURITY;
ALTER TABLE referral_payouts ENABLE ROW LEVEL SECURITY;
GRANT ALL ON referrers TO service_role;
GRANT ALL ON referral_payouts TO service_role;
```

- [ ] **Step 2: Add types to `src/types/database.ts`**

In the `merchants` table's Row block, after `town: string | null;` add `referred_by_code: string | null;`. In its Insert and Update blocks, after `town?: string | null;` add `referred_by_code?: string | null;`.

Then add two new table definitions inside the `Tables` object (mirroring the shape of existing tables — Row required, Insert/Update optional except noted):
```ts
      referrers: {
        Row: {
          id: string;
          code: string;
          name: string;
          whatsapp: string | null;
          payout_number: string | null;
          is_active: boolean;
          notes: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          code: string;
          name: string;
          whatsapp?: string | null;
          payout_number?: string | null;
          is_active?: boolean;
          notes?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          code?: string;
          name?: string;
          whatsapp?: string | null;
          payout_number?: string | null;
          is_active?: boolean;
          notes?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      referral_payouts: {
        Row: {
          id: string;
          referrer_code: string;
          merchant_id: string;
          commission_nad: number;
          paid_reference: string | null;
          admin_note: string | null;
          paid_by: string | null;
          paid_at: string;
        };
        Insert: {
          id?: string;
          referrer_code: string;
          merchant_id: string;
          commission_nad: number;
          paid_reference?: string | null;
          admin_note?: string | null;
          paid_by?: string | null;
          paid_at?: string;
        };
        Update: {
          id?: string;
          referrer_code?: string;
          merchant_id?: string;
          commission_nad?: number;
          paid_reference?: string | null;
          admin_note?: string | null;
          paid_by?: string | null;
          paid_at?: string;
        };
        Relationships: [];
      };
```
(If the file's `Tables` entries carry a `Relationships` array, include `Relationships: []` as shown; if that file's tables don't use it, omit those lines to match the file's actual shape.)

- [ ] **Step 3: Append constants to `src/lib/constants.ts`**

```ts
// ─── Referral program ───────────────────────────────────────────────────
// One-time bounty per paid tier (cents). Free/trial tier earns nothing.
export const REFERRAL_BOUNTY_NAD: Record<string, number> = {
  oshi_start: 0,
  oshi_basic: 7500,
  oshi_grow: 20000,
  oshi_pro: 40000,
};
export const REFERRED_TRIAL_DAYS = 45; // referred merchants (vs the standard 30)
export const STANDARD_TRIAL_DAYS = 30;

export function getReferralBounty(tier: string | null | undefined): number {
  return (tier && REFERRAL_BOUNTY_NAD[tier]) || 0;
}
```

- [ ] **Step 4: Add the `manage_referrals` permission in `src/lib/admin-permissions.ts`**

In the `Permission` union, after `| "view_audit"` add:
```ts
  | "manage_referrals";      // create referrers, mark referral payouts
```
In `ROLE_PERMISSIONS.super_admin`, add `"manage_referrals",` to the list. In `ROLE_PERMISSIONS.finance`, add `"manage_referrals",` to the list. Do **not** touch `getVisibleNavItems` here (Task 6).

- [ ] **Step 5: Typecheck + build**

Run: `cd chatcart-na && npm run build`
Expected: `✓ Compiled successfully`.

- [ ] **Step 6: CHECKPOINT — apply migration 053 to prod (USER APPROVAL REQUIRED)**

The controller (not this subagent) asks the user to approve applying `053_referral_program.sql` via the Supabase MCP `apply_migration` tool (project `pcseqiaqeiiaiqxqtfmw`). Do not apply without approval. Verify after: `select column_name from information_schema.columns where table_name='merchants' and column_name='referred_by_code';` returns one row, and `select to_regclass('public.referrers'), to_regclass('public.referral_payouts');` returns both.

- [ ] **Step 7: Commit**

```bash
git add chatcart-na/supabase/migrations/053_referral_program.sql chatcart-na/src/types/database.ts chatcart-na/src/lib/constants.ts chatcart-na/src/lib/admin-permissions.ts
git commit -m "feat(referral): migration 053 + types + bounty constants + manage_referrals permission"
```

---

## Task 2: Referral validation endpoint

**Files:**
- Create: `src/app/api/referral/validate/route.ts`

**Interfaces:**
- Consumes: `referrers` table (Task 1), `normalizeNamibianPhone` from `@/lib/utils`, `createServiceClient` from `@/lib/supabase/service`.
- Produces: `POST /api/referral/validate` with body `{ code: string, phone?: string }` → `{ valid: boolean, referrerName?: string }`. Returns `valid: false` for unknown/inactive codes and for self-referral (phone matches the referrer's own WhatsApp).

- [ ] **Step 1: Create the endpoint**

```ts
import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { normalizeNamibianPhone } from "@/lib/utils";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const code = typeof body?.code === "string" ? body.code.trim().toLowerCase() : "";
  const phone = typeof body?.phone === "string" ? body.phone : "";

  if (!code) return NextResponse.json({ valid: false });

  const supabase = createServiceClient();
  const { data: referrer } = await supabase
    .from("referrers")
    .select("name, whatsapp")
    .eq("code", code)
    .eq("is_active", true)
    .limit(1)
    .single();

  if (!referrer) return NextResponse.json({ valid: false });

  // Self-referral guard: a promoter can't refer their own new store.
  if (phone && referrer.whatsapp) {
    if (normalizeNamibianPhone(phone) === normalizeNamibianPhone(referrer.whatsapp)) {
      return NextResponse.json({ valid: false });
    }
  }

  return NextResponse.json({ valid: true, referrerName: referrer.name });
}
```

- [ ] **Step 2: Build**

Run: `cd chatcart-na && npm run build` → `✓ Compiled successfully`.

- [ ] **Step 3: Runtime check (migration must be applied)**

With `npm run dev` and a test referrer row present (insert one via Supabase for the check, e.g. `code='qa-ref', name='QA', is_active=true`):
`curl -s -X POST http://localhost:3000/api/referral/validate -H "Content-Type: application/json" -d '{"code":"qa-ref"}'` → `{"valid":true,"referrerName":"QA"}`.
`curl ... -d '{"code":"nope"}'` → `{"valid":false}`.

- [ ] **Step 4: Commit**

```bash
git add chatcart-na/src/app/api/referral/validate/route.ts
git commit -m "feat(referral): /api/referral/validate endpoint"
```

---

## Task 3: Attribution capture — signup, Google button, OAuth callback

**Files:**
- Modify: `src/components/google-sign-in-button.tsx`
- Modify: `src/app/auth/callback/route.ts`
- Modify: `src/app/(auth)/signup/page.tsx`

**Interfaces:**
- Produces: a `ref` query param carried from `/signup` through both signup paths to `/dashboard/setup?ref=<code>`, plus `localStorage.oshicart_ref` set on the signup page.

- [ ] **Step 1: Add `referralCode` prop to the Google button**

In `src/components/google-sign-in-button.tsx`, change the interface and `redirectTo`:
```tsx
interface GoogleSignInButtonProps {
  /** Tier param to pass through the OAuth flow (for pricing page signups) */
  tier?: string | null;
  /** Referral code to pass through the OAuth flow (named referralCode — `ref` is reserved) */
  referralCode?: string | null;
}

export function GoogleSignInButton({ tier, referralCode }: GoogleSignInButtonProps) {
```
Replace the `redirectTo` construction with:
```tsx
    const params = new URLSearchParams();
    if (tier) params.set("tier", tier);
    if (referralCode) params.set("ref", referralCode);
    const qs = params.toString();
    const redirectTo = `${window.location.origin}/auth/callback${qs ? `?${qs}` : ""}`;
```

- [ ] **Step 2: Forward `ref` in the OAuth callback**

In `src/app/auth/callback/route.ts`, after `const tier = await searchParams.get("tier");` add:
```ts
  const ref = await searchParams.get("ref");
```
Replace the new-user setup redirect block (the `else` branch that builds `setupUrl`) with:
```ts
    } else {
      // New user → setup (carry tier and referral code if present)
      const params = new URLSearchParams();
      if (tier) params.set("tier", tier);
      if (ref) params.set("ref", ref);
      const qs = params.toString();
      return NextResponse.redirect(`${origin}/dashboard/setup${qs ? `?${qs}` : ""}`);
    }
```
(Leave the existing-merchant + tier → `/pricing/checkout` branch unchanged; referral doesn't apply to existing merchants.)

- [ ] **Step 3: Capture + forward `ref` on the signup page**

In `src/app/(auth)/signup/page.tsx`, after `const tierParam = searchParams.get("tier");` add:
```tsx
  const refParam = searchParams.get("ref");
```
Add an effect to persist the ref (place it near the other `useEffect`s):
```tsx
  // Persist referral code as a backstop so it survives the OAuth round-trip.
  useEffect(() => {
    if (refParam) {
      try { localStorage.setItem("oshicart_ref", refParam); } catch { /* storage unavailable */ }
    }
  }, [refParam]);
```
In the "already logged in" effect's new-user branch, change:
```tsx
        window.location.href = `/dashboard/setup?tier=${tierParam}`;
```
to carry both params:
```tsx
        window.location.href = `/dashboard/setup?${new URLSearchParams({ tier: tierParam, ...(refParam ? { ref: refParam } : {}) }).toString()}`;
```
In `handleSubmit`, replace the final redirect:
```tsx
    // Redirect: carry tier + referral code to setup if present
    const params = new URLSearchParams();
    if (tierParam) params.set("tier", tierParam);
    if (refParam) params.set("ref", refParam);
    const qs = params.toString();
    window.location.href = `/dashboard/setup${qs ? `?${qs}` : ""}`;
```
Update the Google button usage:
```tsx
          <GoogleSignInButton tier={tierParam} referralCode={refParam} />
```

- [ ] **Step 4: Build + visual verify**

Run: `cd chatcart-na && npm run build` → `✓ Compiled successfully`.
Visual (`npm run dev`): open `/signup?ref=qa-ref`; in devtools, `localStorage.getItem('oshicart_ref')` returns `"qa-ref"`. (Full end-to-end stamping is verified in Task 4.)

- [ ] **Step 5: Commit**

```bash
git add chatcart-na/src/components/google-sign-in-button.tsx chatcart-na/src/app/auth/callback/route.ts "chatcart-na/src/app/(auth)/signup/page.tsx"
git commit -m "feat(referral): carry ref code through signup + Google OAuth to setup"
```

---

## Task 4: Setup wizard — validate ref, banner, stamp code + 45-day trial

**Files:**
- Modify: `src/app/(dashboard)/dashboard/setup/page.tsx`

**Interfaces:**
- Consumes: `POST /api/referral/validate` (Task 2); `REFERRED_TRIAL_DAYS`, `STANDARD_TRIAL_DAYS` (Task 1).
- Produces: writes `merchants.referred_by_code` and a 45-day trial subscription when a valid, non-self referral is present.

- [ ] **Step 1: Import constants + read the ref param**

Add to the `@/lib/constants` import in this file: `REFERRED_TRIAL_DAYS`, `STANDARD_TRIAL_DAYS`. Near `const tierParam = searchParams.get("tier");` add:
```tsx
  const refParam = searchParams.get("ref");
```
Add state (near the other `useState` calls):
```tsx
  const [referralCode, setReferralCode] = useState<string | null>(null);
  const [referrerName, setReferrerName] = useState<string | null>(null);
```

- [ ] **Step 2: Validate the ref on mount and show the perk banner**

Add an effect (after hydration is fine; it only reads):
```tsx
  useEffect(() => {
    let code = refParam;
    if (!code) {
      try { code = localStorage.getItem("oshicart_ref"); } catch { code = null; }
    }
    if (!code) return;
    fetch("/api/referral/validate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code }),
    })
      .then((r) => r.json())
      .then((v) => {
        if (v?.valid) {
          setReferralCode(code);
          setReferrerName(v.referrerName ?? null);
        }
      })
      .catch(() => { /* ignore — no attribution */ });
  }, [refParam]);
```
Render a banner near the top of the form (above `<StepProgress ... />`), shown only when `referralCode` is set:
```tsx
      {referralCode && (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
          <span>🎉</span>
          <p>
            {referrerName ? `Referred by ${referrerName} — ` : "Referred by a friend — "}
            you get a <b>45-day free trial</b> instead of 30.
          </p>
        </div>
      )}
```

- [ ] **Step 3: Re-validate with phone at submit + stamp attribution + extend trial**

In `handleSubmit`, immediately BEFORE the `const { data: newMerchant, error: insertError } = await supabase.from("merchants").insert({...})` call, resolve the final attribution (re-checking with the phone to catch self-referral):
```tsx
    let validReferral: string | null = null;
    if (referralCode) {
      const rv = await fetch("/api/referral/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: referralCode, phone: form.whatsapp_number }),
      }).then((r) => r.json()).catch(() => ({ valid: false }));
      if (rv?.valid) validReferral = referralCode;
    }
```
In the `merchants.insert({...})` object, after `town: form.town || null,` add:
```tsx
        referred_by_code: validReferral,
```
Replace the trial-subscription block:
```tsx
    // Create trial subscription (30-day, or 45-day for referred merchants)
    const trialDays = validReferral ? REFERRED_TRIAL_DAYS : STANDARD_TRIAL_DAYS;
    const trialEnds = new Date();
    trialEnds.setDate(trialEnds.getDate() + trialDays);

    await supabase.from("subscriptions").insert({
      merchant_id: newMerchant.id,
      tier: "oshi_start",
      status: "trial",
      trial_ends_at: trialEnds.toISOString(),
    });

    try { localStorage.removeItem("oshicart_ref"); } catch { /* ignore */ }
```

- [ ] **Step 4: Build + visual verify**

Run: `cd chatcart-na && npm run build` → `✓ Compiled successfully`.
Visual (migration applied, a test referrer `qa-ref` active): open `/dashboard/setup?ref=qa-ref` while logged in as a user with no store → the green "45-day free trial" banner shows. (Actual write is checked in Task 7's E2E; do not create throwaway stores here.)

- [ ] **Step 5: Commit**

```bash
git add "chatcart-na/src/app/(dashboard)/dashboard/setup/page.tsx"
git commit -m "feat(referral): validate ref at setup, show 45-day-trial banner, stamp code + extend trial"
```

---

## Task 5: Pretty share link `/r/[code]`

**Files:**
- Create: `src/app/r/[code]/route.ts`

**Interfaces:**
- Produces: `GET /r/<code>` → 302 redirect to `/signup?ref=<code>`.

- [ ] **Step 1: Create the redirect route**

```ts
import { NextResponse } from "next/server";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;
  const { origin } = new URL(request.url);
  const safe = encodeURIComponent(code.toLowerCase());
  return NextResponse.redirect(`${origin}/signup?ref=${safe}`);
}
```

- [ ] **Step 2: Build + verify redirect**

Run: `cd chatcart-na && npm run build` → `✓ Compiled successfully`.
`curl -s -o /dev/null -w "%{http_code} %{redirect_url}\n" http://localhost:3000/r/maria` → `307`/`308` (or `302`) with location ending `/signup?ref=maria`.

- [ ] **Step 3: Commit**

```bash
git add "chatcart-na/src/app/r/[code]/route.ts"
git commit -m "feat(referral): /r/[code] pretty share link redirects to signup"
```

---

## Task 6: Admin referrals console + API + nav

**Files:**
- Create: `src/app/(admin)/admin/referrals/page.tsx`
- Create: `src/app/(admin)/admin/referrals/referral-actions.tsx`
- Create: `src/app/api/admin/referrals/route.ts`
- Modify: `src/lib/admin-permissions.ts` (add the nav item now that the page exists)
- Modify: `src/components/admin/nav.tsx` (add an icon for `/admin/referrals`)

**Interfaces:**
- Consumes: `getReferralBounty` (Task 1), `requireAdminPermission` from `@/lib/admin-auth`, `createServiceClient`.
- Produces: `/admin/referrals` page; `POST /api/admin/referrals` with `{ action: "create_referrer" | "toggle_active" | "mark_paid", ... }`.

- [ ] **Step 1: Create the admin API route**

```ts
import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { requireAdminPermission } from "@/lib/admin-auth";

export async function POST(req: NextRequest) {
  const admin = await requireAdminPermission("manage_referrals");
  const body = await req.json().catch(() => null);
  const action = body?.action;
  const supabase = createServiceClient();

  if (action === "create_referrer") {
    const code = String(body.code || "").trim().toLowerCase();
    const name = String(body.name || "").trim();
    if (!/^[a-z0-9][a-z0-9-]{1,30}$/.test(code)) {
      return NextResponse.json({ error: "Code must be 2–31 chars: lowercase letters, numbers, hyphens." }, { status: 400 });
    }
    if (!name) return NextResponse.json({ error: "Name is required." }, { status: 400 });
    const { error } = await supabase.from("referrers").insert({
      code,
      name,
      whatsapp: body.whatsapp ? String(body.whatsapp).trim() : null,
      payout_number: body.payout_number ? String(body.payout_number).trim() : null,
    });
    if (error) {
      const msg = error.code === "23505" ? "That code is already taken." : "Could not create referrer.";
      return NextResponse.json({ error: msg }, { status: 400 });
    }
    return NextResponse.json({ ok: true });
  }

  if (action === "toggle_active") {
    const { error } = await supabase
      .from("referrers")
      .update({ is_active: !!body.is_active })
      .eq("id", String(body.referrer_id));
    if (error) return NextResponse.json({ error: "Could not update referrer." }, { status: 400 });
    return NextResponse.json({ ok: true });
  }

  if (action === "mark_paid") {
    const commission = Number(body.commission_nad);
    if (!body.merchant_id || !body.referrer_code || !Number.isFinite(commission) || commission < 0) {
      return NextResponse.json({ error: "Invalid payout data." }, { status: 400 });
    }
    const { error } = await supabase.from("referral_payouts").insert({
      merchant_id: String(body.merchant_id),
      referrer_code: String(body.referrer_code),
      commission_nad: Math.round(commission),
      paid_reference: body.paid_reference ? String(body.paid_reference).trim() : null,
      admin_note: body.admin_note ? String(body.admin_note).trim() : null,
      paid_by: admin.userId ?? null,
    });
    if (error) {
      const msg = error.code === "23505" ? "This merchant's bounty was already paid." : "Could not record payout.";
      return NextResponse.json({ error: msg }, { status: 400 });
    }
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Unknown action." }, { status: 400 });
}
```
Note: `admin.userId` — use whatever field `AuthenticatedAdmin` exposes for the auth user id (check `src/lib/admin-auth.ts`; it returns `adminId`, `role`, etc.). If the auth user's id is on a different field (e.g. `userId`/`adminId`), use that; if none fits, pass `null` (the column is nullable).

- [ ] **Step 2: Create the client actions component**

```tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

async function post(body: Record<string, unknown>): Promise<string | null> {
  const res = await fetch("/api/admin/referrals", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  return res.ok ? null : (data.error || "Something went wrong.");
}

export function CreateReferrerForm() {
  const router = useRouter();
  const [form, setForm] = useState({ name: "", code: "", whatsapp: "", payout_number: "" });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    const err = await post({ action: "create_referrer", ...form });
    setSaving(false);
    if (err) { setError(err); return; }
    setForm({ name: "", code: "", whatsapp: "", payout_number: "" });
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="grid gap-2 sm:grid-cols-4">
      <input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} placeholder="Name" required className="rounded-lg border border-slate-200 px-3 py-2 text-sm" />
      <input value={form.code} onChange={(e) => setForm((p) => ({ ...p, code: e.target.value }))} placeholder="code (e.g. maria)" required className="rounded-lg border border-slate-200 px-3 py-2 text-sm" />
      <input value={form.whatsapp} onChange={(e) => setForm((p) => ({ ...p, whatsapp: e.target.value }))} placeholder="WhatsApp" className="rounded-lg border border-slate-200 px-3 py-2 text-sm" />
      <div className="flex gap-2">
        <input value={form.payout_number} onChange={(e) => setForm((p) => ({ ...p, payout_number: e.target.value }))} placeholder="Payout number" className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm" />
        <button type="submit" disabled={saving} className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-bold text-white disabled:opacity-50">Add</button>
      </div>
      {error && <p className="sm:col-span-4 text-xs text-red-600">{error}</p>}
    </form>
  );
}

export function MarkPaidButton({ merchantId, referrerCode, commissionNad }: { merchantId: string; referrerCode: string; commissionNad: number }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function markPaid() {
    const reference = window.prompt(`Mark N$${(commissionNad / 100).toFixed(2)} as paid.\nEnter the payout reference (eWallet/txn):`);
    if (reference === null) return;
    setBusy(true);
    const err = await post({ action: "mark_paid", merchant_id: merchantId, referrer_code: referrerCode, commission_nad: commissionNad, paid_reference: reference });
    setBusy(false);
    if (err) { window.alert(err); return; }
    router.refresh();
  }

  return (
    <button onClick={markPaid} disabled={busy} className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-bold text-white disabled:opacity-50">
      {busy ? "…" : "Mark paid"}
    </button>
  );
}

export function ToggleReferrerButton({ referrerId, isActive }: { referrerId: string; isActive: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  async function toggle() {
    setBusy(true);
    await post({ action: "toggle_active", referrer_id: referrerId, is_active: !isActive });
    setBusy(false);
    router.refresh();
  }
  return (
    <button onClick={toggle} disabled={busy} className={`rounded-full px-2 py-0.5 text-xs font-bold ${isActive ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-600"}`}>
      {isActive ? "Active" : "Inactive"}
    </button>
  );
}
```

- [ ] **Step 3: Create the admin page**

```tsx
import { requireAdminPermission } from "@/lib/admin-auth";
import { createServiceClient } from "@/lib/supabase/service";
import { getReferralBounty, SITE_URL } from "@/lib/constants";
import { CreateReferrerForm, MarkPaidButton, ToggleReferrerButton } from "./referral-actions";

export default async function AdminReferralsPage() {
  await requireAdminPermission("manage_referrals");
  const supabase = createServiceClient();

  const [{ data: referrers }, { data: merchants }, { data: payouts }] = await Promise.all([
    supabase.from("referrers").select("*").order("created_at", { ascending: false }),
    supabase
      .from("merchants")
      .select("id, store_name, store_slug, referred_by_code, subscriptions(tier, status, current_period_end)")
      .not("referred_by_code", "is", null),
    supabase.from("referral_payouts").select("*"),
  ]);

  const paidByMerchant = new Map((payouts || []).map((p) => [p.merchant_id, p]));

  const rows = (merchants || []).map((m) => {
    const sub = Array.isArray(m.subscriptions) ? m.subscriptions[0] : m.subscriptions;
    const tier = sub?.tier ?? "oshi_start";
    const status = sub?.status ?? "trial";
    const isPaying = status === "active";
    const bounty = isPaying ? getReferralBounty(tier) : 0;
    const payout = paidByMerchant.get(m.id);
    return { ...m, tier, status, isPaying, bounty, payout, currentPeriodEnd: sub?.current_period_end ?? null };
  });

  // Per-referrer totals
  const totals = new Map<string, { paid: number; outstanding: number }>();
  for (const r of rows) {
    const t = totals.get(r.referred_by_code!) ?? { paid: 0, outstanding: 0 };
    if (r.payout) t.paid += r.payout.commission_nad;
    else if (r.isPaying) t.outstanding += r.bounty;
    totals.set(r.referred_by_code!, t);
  }

  const nad = (cents: number) => `N$${(cents / 100).toLocaleString()}`;

  return (
    <div className="md:ml-56">
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Referrals</h1>
      <p className="text-sm text-slate-500 mb-6">
        Bounty is owed once a referred merchant is <b>paying</b>. Confirm they&apos;ve been paying ~30 days before you pay out, then record the reference.
      </p>

      {/* Referrers */}
      <section className="mb-8 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900 mb-3">Promoters</h2>
        <CreateReferrerForm />
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-slate-500">
              <tr><th className="py-2">Name</th><th>Share link</th><th>Payout</th><th>Paid</th><th>Outstanding</th><th>Status</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(referrers || []).map((r) => {
                const t = totals.get(r.code) ?? { paid: 0, outstanding: 0 };
                return (
                  <tr key={r.id}>
                    <td className="py-2 font-medium text-slate-900">{r.name}</td>
                    <td className="text-slate-600">{SITE_URL.replace(/^https?:\/\//, "")}/r/{r.code}</td>
                    <td className="text-slate-600">{r.payout_number || "—"}</td>
                    <td className="text-slate-600">{nad(t.paid)}</td>
                    <td className="font-semibold text-emerald-700">{nad(t.outstanding)}</td>
                    <td><ToggleReferrerButton referrerId={r.id} isActive={r.is_active} /></td>
                  </tr>
                );
              })}
              {(referrers || []).length === 0 && <tr><td colSpan={6} className="py-4 text-center text-slate-400">No promoters yet — add one above.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>

      {/* Referred merchants */}
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900 mb-3">Referred merchants ({rows.length})</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-slate-500">
              <tr><th className="py-2">Store</th><th>Referrer</th><th>Plan</th><th>Status</th><th>Bounty</th><th>Payout</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((r) => (
                <tr key={r.id}>
                  <td className="py-2 font-medium text-slate-900">{r.store_name}</td>
                  <td className="text-slate-600">{r.referred_by_code}</td>
                  <td className="text-slate-600">{r.tier}</td>
                  <td className="text-slate-600">{r.status}</td>
                  <td className="text-slate-600">{r.isPaying ? nad(r.bounty) : "—"}</td>
                  <td>
                    {r.payout
                      ? <span className="text-xs text-emerald-700">Paid {nad(r.payout.commission_nad)}{r.payout.paid_reference ? ` · ${r.payout.paid_reference}` : ""}</span>
                      : r.isPaying && r.bounty > 0
                        ? <MarkPaidButton merchantId={r.id} referrerCode={r.referred_by_code!} commissionNad={r.bounty} />
                        : <span className="text-xs text-slate-400">not eligible</span>}
                  </td>
                </tr>
              ))}
              {rows.length === 0 && <tr><td colSpan={6} className="py-4 text-center text-slate-400">No referred merchants yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
```
(If `subscriptions` is a to-many relation and the select returns an array, the `Array.isArray` guard already handles it. If the file's `SITE_URL` import path differs, match the codebase — it's exported from `@/lib/constants`.)

- [ ] **Step 4: Add the nav item + icon**

In `src/lib/admin-permissions.ts` `getVisibleNavItems`, add after the Billing item:
```ts
    { label: "Referrals", href: "/admin/referrals", permission: "manage_referrals" as Permission },
```
In `src/components/admin/nav.tsx`, add an icon for the new route to the icon map (import an icon like `Gift` from `lucide-react` and map `"/admin/referrals": Gift`).

- [ ] **Step 5: Build + visual verify**

Run: `cd chatcart-na && npm run build` → `✓ Compiled successfully`.
Visual (logged in as a `finance` or `super_admin` admin, migration applied): `/admin/referrals` loads, shows the "Referrals" nav item, the create-promoter form works (add `qa-ref`), and the referred-merchants table renders (empty until a real referred store exists). Confirm a `support`-role admin does NOT see the nav item / gets redirected from the page.

- [ ] **Step 6: Commit**

```bash
git add "chatcart-na/src/app/(admin)/admin/referrals/page.tsx" "chatcart-na/src/app/(admin)/admin/referrals/referral-actions.tsx" chatcart-na/src/app/api/admin/referrals/route.ts chatcart-na/src/lib/admin-permissions.ts chatcart-na/src/components/admin/nav.tsx
git commit -m "feat(referral): admin console — manage promoters, track referred merchants, mark payouts"
```

---

## Task 7: Full verification + deploy

**Files:** none (verification + deploy).

- [ ] **Step 1: Full build + lint**

Run: `cd chatcart-na && npm run build && npm run lint`
Expected: build succeeds; no **new** lint errors (pre-existing warnings in unrelated files are acceptable).

- [ ] **Step 2: End-to-end manual verification (migration applied; dev against prod DB)**

With `npm run dev` and a test referrer `qa-ref` (active, with a distinct WhatsApp):
1. Visit `/r/qa-ref` → lands on `/signup?ref=qa-ref`.
2. Complete a signup as a NEW test user → the setup wizard shows the "45-day free trial" banner → finish setup → in Supabase, that merchant row has `referred_by_code = 'qa-ref'` and its subscription `trial_ends_at` ≈ 45 days out.
3. In Supabase, set that merchant's subscription `tier='oshi_pro', status='active'` → `/admin/referrals` shows the store with bounty **N$400** and a "Mark paid" button.
4. Click "Mark paid", enter a reference → row flips to "Paid N$400"; a second attempt is rejected ("already paid").
5. Self-referral: validate with the referrer's own WhatsApp returns `{valid:false}` (no banner, no stamp).
6. Clean up the test merchant/referrer rows afterward.

- [ ] **Step 3: CHECKPOINT — deploy (USER GO-AHEAD)**

Confirm with the user, then `git push origin master` (Vercel auto-deploys). Verify live: `/r/<code>` redirects and `/admin/referrals` loads for an authorized admin.

---

## Notes for the implementer

- **`ref` is a reserved React prop** — the button prop is `referralCode`; only the URL/query key is `ref`.
- Do **not** add RLS policies to `referrers`/`referral_payouts` — enabling RLS with no policies is intentional (service-role-only). All admin access goes through `createServiceClient()` behind `requireAdminPermission`.
- Do **not** touch the payment/DPO flow — qualification is read live from `subscriptions.status`.
- The migration-apply and the final deploy are **user-gated checkpoints** the controller handles, not the implementer subagent.
