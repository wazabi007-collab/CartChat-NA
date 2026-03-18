# WhatsApp Free-Tier Enforcement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Block users from creating multiple free-tier stores with the same WhatsApp number. Paid merchants get a warning but can proceed.

**Architecture:** New API route `/api/check-whatsapp` queries merchants + subscriptions tables. Setup page calls it on blur of WhatsApp field and again on form submit. Follows the existing `/api/check-email` pattern.

**Tech Stack:** Next.js API route, Supabase service client, existing `normalizeNamibianPhone()`.

**Spec:** `docs/superpowers/specs/2026-03-18-whatsapp-free-tier-enforcement-design.md`

---

## File Map

| File | Action | Responsibility |
|------|--------|---------------|
| `src/app/api/check-whatsapp/route.ts` | **Create** | API: check if WhatsApp number is already used, return blocked/warning status |
| `src/app/(dashboard)/dashboard/setup/page.tsx` | **Modify** | Add blur validation on WhatsApp field + submit-time re-check |

---

### Task 1: Create the Check WhatsApp API Route

**Files:**
- Create: `src/app/api/check-whatsapp/route.ts`

- [ ] **Step 1: Create the API route file**

```ts
import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { createClient } from "@/lib/supabase/server";
import { normalizeNamibianPhone } from "@/lib/utils";

export async function POST(req: NextRequest) {
  const start = Date.now();

  // Require authentication
  const supabaseAuth = await createClient();
  const {
    data: { user },
  } = await supabaseAuth.auth.getUser();
  if (!user) {
    return NextResponse.json({ exists: false, blocked: false });
  }

  const body = await req.json().catch(() => null);
  const phone = body?.phone;

  if (!phone || typeof phone !== "string" || phone.length < 7) {
    return NextResponse.json({ exists: false, blocked: false });
  }

  const normalized = normalizeNamibianPhone(phone);
  const supabase = createServiceClient();

  // Find any merchant with this WhatsApp number
  const { data: merchant } = await supabase
    .from("merchants")
    .select("id")
    .eq("whatsapp_number", normalized)
    .limit(1)
    .single();

  if (!merchant) {
    // Consistent response time
    const elapsed = Date.now() - start;
    if (elapsed < 200) {
      await new Promise((r) => setTimeout(r, 200 - elapsed));
    }
    return NextResponse.json({ exists: false, blocked: false });
  }

  // Check subscription tier
  const { data: subscription } = await supabase
    .from("subscriptions")
    .select("tier")
    .eq("merchant_id", merchant.id)
    .limit(1)
    .single();

  // No subscription or oshi_start = free tier = blocked
  const isFree = !subscription || subscription.tier === "oshi_start";

  // Consistent response time
  const elapsed = Date.now() - start;
  if (elapsed < 200) {
    await new Promise((r) => setTimeout(r, 200 - elapsed));
  }

  return NextResponse.json({
    exists: true,
    blocked: isFree,
  });
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/check-whatsapp/route.ts
git commit -m "feat: add check-whatsapp API route for free-tier enforcement"
```

---

### Task 2: Add WhatsApp Blur Validation to Setup Page

**Files:**
- Modify: `src/app/(dashboard)/dashboard/setup/page.tsx`

- [ ] **Step 1: Add state variables for WhatsApp check**

After the existing state declarations (after line 45, `const [offersDelivery, setOffersDelivery] = useState(false);`), add:

```tsx
  const [whatsappStatus, setWhatsappStatus] = useState<"idle" | "checking" | "blocked" | "warning" | "clear">("idle");
```

- [ ] **Step 2: Add the blur handler function**

After the `update` function (after line 49), add:

```tsx
  async function checkWhatsapp(phone: string) {
    if (!phone || phone.length < 7) {
      setWhatsappStatus("idle");
      return;
    }
    setWhatsappStatus("checking");
    try {
      const res = await fetch("/api/check-whatsapp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      });
      const data = await res.json();
      if (data.blocked) {
        setWhatsappStatus("blocked");
      } else if (data.exists) {
        setWhatsappStatus("warning");
      } else {
        setWhatsappStatus("clear");
      }
    } catch {
      setWhatsappStatus("idle");
    }
  }
```

- [ ] **Step 3: Add onBlur and onChange to the WhatsApp input**

Find the WhatsApp input (line 201-208):

```tsx
                <input
                  type="tel"
                  value={form.whatsapp_number}
                  onChange={(e) => update("whatsapp_number", e.target.value)}
                  placeholder="+264811234567"
                  required
                  className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                />
```

Replace with:

```tsx
                <input
                  type="tel"
                  value={form.whatsapp_number}
                  onChange={(e) => {
                    update("whatsapp_number", e.target.value);
                    if (whatsappStatus !== "idle") setWhatsappStatus("idle");
                  }}
                  onBlur={(e) => checkWhatsapp(e.target.value)}
                  placeholder="+264811234567"
                  required
                  className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                />
```

- [ ] **Step 4: Add status messages below the WhatsApp input**

Right after the closing `</input>` tag (after the replaced input above), add:

```tsx
                {whatsappStatus === "checking" && (
                  <p className="text-xs text-gray-400 mt-1">Checking number...</p>
                )}
                {whatsappStatus === "blocked" && (
                  <div className="mt-1">
                    <p className="text-xs text-red-600">
                      This WhatsApp number is already linked to a store. Please subscribe to continue.
                    </p>
                    <a
                      href="/pricing"
                      className="text-xs text-[#2B5EA7] hover:underline font-medium"
                    >
                      View Plans →
                    </a>
                  </div>
                )}
                {whatsappStatus === "warning" && (
                  <p className="text-xs text-amber-600 mt-1">
                    This number is already linked to another store.
                  </p>
                )}
```

- [ ] **Step 5: Block the "Next" button when WhatsApp is blocked**

Find the Next button's onClick handler (line 231-248). The current validation check:

```tsx
                  if (!form.store_name || !form.whatsapp_number) {
                    setError("Store name and WhatsApp number are required");
                    return;
                  }
                  if (!form.industry) {
                    setError("Please select your industry");
                    return;
                  }
```

Add after the industry check (before `setError(""); setStep(2);`):

```tsx
                  if (whatsappStatus === "blocked") {
                    setError("This WhatsApp number is already linked to a store. Please subscribe to continue.");
                    return;
                  }
```

- [ ] **Step 6: Add server-side re-check on form submit**

In the `handleSubmit` function, after the slug uniqueness check (after line 84, `const finalSlug = existing ? ...`), add:

```tsx
    // Server-side WhatsApp duplicate check (safety net)
    const waCheck = await fetch("/api/check-whatsapp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone: form.whatsapp_number }),
    }).then((r) => r.json()).catch(() => ({ blocked: false }));

    if (waCheck.blocked) {
      setError("This WhatsApp number is already linked to a store. Please subscribe to continue.");
      setLoading(false);
      return;
    }
```

- [ ] **Step 7: Commit**

```bash
git add src/app/(dashboard)/dashboard/setup/page.tsx
git commit -m "feat: add WhatsApp number free-tier enforcement to setup page"
```

---

### Task 3: Build Verification and Deploy

- [ ] **Step 1: Run full build**

Run: `npx next build`
Expected: Build succeeds with no errors

- [ ] **Step 2: Push and deploy**

```bash
git push origin master
```

Expected: Vercel deploys automatically.
