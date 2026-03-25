# Merchant Auth Upgrade — Password + WhatsApp OTP

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade merchant login to a 3-method auth system: email+password (primary), WhatsApp OTP via Meta Business API (secondary), and Google OAuth (existing). Email OTP is removed.

**Architecture:** Add Supabase native password auth alongside a custom WhatsApp OTP flow that generates codes server-side, stores them (hashed) in a `phone_otp_codes` table with 5-min expiry, and sends via the existing Meta Cloud API integration (`src/lib/whatsapp.ts`). The login page gets a tabbed UI with Email+Password and WhatsApp OTP tabs. Signup uses password instead of email OTP. Existing merchants can set a password from a new account settings page.

**Tech Stack:** Next.js 16, Supabase Auth (`signInWithPassword`, `signUp`), Meta WhatsApp Business API (existing), Zod validation, existing UI system (`src/lib/ui.ts`)

---

## File Structure

| Action | File | Responsibility |
|--------|------|---------------|
| Create | `supabase/migrations/026_phone_otp_codes.sql` | OTP storage table + RLS + auto-cleanup |
| Create | `src/app/api/auth/whatsapp-otp/send/route.ts` | Generate OTP, store in DB, send via Meta (disabled initially) |
| Create | `src/app/api/auth/whatsapp-otp/verify/route.ts` | Verify OTP, create/sign-in Supabase user (disabled initially) |
| Create | `src/app/api/auth/signup/route.ts` | Server-side signup with admin API (skip email confirmation) |
| Modify | `src/app/(auth)/login/page.tsx` | Tabbed login: password + WhatsApp OTP (WA tab hidden when disabled) |
| Modify | `src/app/(auth)/signup/page.tsx` | Password signup, remove email OTP step |
| Create | `src/app/(dashboard)/dashboard/account/page.tsx` | Set/change password for existing merchants |
| Modify | `src/lib/whatsapp.ts` | Add `sendOtpMessage()` helper |

---

### Task 1: Database Migration — OTP Codes Table

**Files:**
- Create: `supabase/migrations/026_phone_otp_codes.sql`

- [ ] **Step 1: Write the migration SQL**

```sql
-- 026_phone_otp_codes.sql
-- Stores WhatsApp OTP codes for phone-based authentication
-- OTP codes are SHA-256 hashed before storage for security

CREATE TABLE phone_otp_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone TEXT NOT NULL,
  code_hash TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  verified BOOLEAN DEFAULT FALSE,
  attempts INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast lookup by phone + unexpired
CREATE INDEX idx_phone_otp_lookup ON phone_otp_codes (phone, expires_at DESC)
  WHERE verified = FALSE;

-- RLS: service-role only (no direct client access)
ALTER TABLE phone_otp_codes ENABLE ROW LEVEL SECURITY;

-- Auto-cleanup: delete expired codes older than 1 hour
CREATE OR REPLACE FUNCTION cleanup_expired_otp_codes()
RETURNS void AS $$
BEGIN
  DELETE FROM phone_otp_codes
  WHERE expires_at < NOW() - INTERVAL '1 hour';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Schedule cleanup every 30 minutes via pg_cron (if available)
-- If pg_cron is not enabled, create a Next.js cron route instead
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.schedule('cleanup-otp-codes', '*/30 * * * *', 'SELECT cleanup_expired_otp_codes()');
  END IF;
END $$;
```

- [ ] **Step 2: Apply migration to Supabase**

Run via Supabase dashboard SQL editor or CLI:
```bash
# If using Supabase CLI:
supabase db push
# Otherwise: paste SQL into Supabase Dashboard → SQL Editor → Run
```

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/026_phone_otp_codes.sql
git commit -m "feat: add phone_otp_codes table for WhatsApp OTP auth"
```

---

### Task 2: WhatsApp OTP Helper in whatsapp.ts

**Files:**
- Modify: `src/lib/whatsapp.ts` (add `sendOtpMessage` function)

- [ ] **Step 1: Add the OTP-specific send function**

Add this function at the bottom of `src/lib/whatsapp.ts`, before the webhook verification section:

```typescript
// ---------- Authentication OTP via WhatsApp ----------

/**
 * Send a 6-digit OTP code via WhatsApp authentication template.
 * Requires an approved "authentication_otp" template in Meta Business Manager.
 *
 * Template format (authentication category):
 *   Body: "Your OshiCart verification code is {{1}}. It expires in 5 minutes."
 *   Button: Copy code (URL button with {{1}} parameter)
 */
export async function sendOtpMessage(
  recipientPhone: string,
  otpCode: string
): Promise<SendResult> {
  return sendWhatsAppTemplate(
    recipientPhone,
    "authentication_otp",
    [otpCode],          // body variable {{1}}
    [otpCode]           // button "copy code" parameter
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/whatsapp.ts
git commit -m "feat: add sendOtpMessage helper for WhatsApp auth OTP"
```

---

### Task 3: WhatsApp OTP Send API Route

**Files:**
- Create: `src/app/api/auth/whatsapp-otp/send/route.ts`

- [ ] **Step 1: Create the send OTP endpoint**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { sendOtpMessage, isWhatsAppEnabled } from "@/lib/whatsapp";
import { normalizeNamibianPhone } from "@/lib/utils";
import { randomInt, createHash } from "crypto";
import { z } from "zod";

const sendSchema = z.object({
  phone: z.string().min(7, "Valid phone number is required"),
});

// Rate limit: max 3 OTP requests per phone per 10 minutes
const RATE_LIMIT_WINDOW_MIN = 10;
const RATE_LIMIT_MAX = 3;
const OTP_EXPIRY_MIN = 5;

function hashOtp(code: string): string {
  return createHash("sha256").update(code).digest("hex");
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = sendSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" },
        { status: 400 }
      );
    }

    if (!isWhatsAppEnabled()) {
      return NextResponse.json(
        { ok: false, error: "WhatsApp login is currently unavailable" },
        { status: 503 }
      );
    }

    const normalizedPhone = normalizeNamibianPhone(parsed.data.phone);
    const cleanPhone = normalizedPhone.replace(/\D/g, "");
    const supabase = createServiceClient();

    // Rate limit check
    const windowStart = new Date(
      Date.now() - RATE_LIMIT_WINDOW_MIN * 60 * 1000
    ).toISOString();

    const { count } = await supabase
      .from("phone_otp_codes")
      .select("id", { count: "exact", head: true })
      .eq("phone", cleanPhone)
      .gte("created_at", windowStart);

    if ((count ?? 0) >= RATE_LIMIT_MAX) {
      return NextResponse.json(
        { ok: false, error: "Too many requests. Please wait a few minutes." },
        { status: 429 }
      );
    }

    // Invalidate any previous unverified OTPs for this phone
    await supabase
      .from("phone_otp_codes")
      .update({ verified: true })
      .eq("phone", cleanPhone)
      .eq("verified", false);

    // Generate 6-digit OTP and hash before storage
    const code = String(randomInt(100000, 999999));
    const codeHash = hashOtp(code);
    const expiresAt = new Date(
      Date.now() + OTP_EXPIRY_MIN * 60 * 1000
    ).toISOString();

    // Store hashed OTP
    const { error: insertError } = await supabase
      .from("phone_otp_codes")
      .insert({ phone: cleanPhone, code_hash: codeHash, expires_at: expiresAt });

    if (insertError) {
      console.error("[WhatsApp OTP] Insert error:", insertError);
      return NextResponse.json(
        { ok: false, error: "Failed to generate code" },
        { status: 500 }
      );
    }

    // Send plaintext code via WhatsApp (user needs to read it)
    const result = await sendOtpMessage(cleanPhone, code);

    if (!result.success) {
      console.error("[WhatsApp OTP] Send failed:", result.error);
      return NextResponse.json(
        { ok: false, error: "Failed to send WhatsApp message. Try email login instead." },
        { status: 502 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[WhatsApp OTP Send]", err);
    return NextResponse.json(
      { ok: false, error: "Internal error" },
      { status: 500 }
    );
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/auth/whatsapp-otp/send/route.ts
git commit -m "feat: WhatsApp OTP send endpoint with rate limiting"
```

---

### Task 4: WhatsApp OTP Verify API Route

**Files:**
- Create: `src/app/api/auth/whatsapp-otp/verify/route.ts`

- [ ] **Step 1: Create the verify OTP endpoint**

This endpoint:
1. Validates the OTP code against the database
2. Finds or creates a Supabase auth user by phone number
3. Returns a session (via admin API `signInWithPassword` using a phone-linked email)

```typescript
import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { normalizeNamibianPhone } from "@/lib/utils";
import { timingSafeEqual, createHash } from "crypto";
import { z } from "zod";

const verifySchema = z.object({
  phone: z.string().min(7),
  code: z.string().length(6),
});

const MAX_ATTEMPTS = 5;

function hashOtp(code: string): string {
  return createHash("sha256").update(code).digest("hex");
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = verifySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: "Phone and 6-digit code required" },
        { status: 400 }
      );
    }

    const { phone, code } = parsed.data;
    const normalizedPhone = normalizeNamibianPhone(phone);
    const cleanPhone = normalizedPhone.replace(/\D/g, "");
    const supabase = createServiceClient();

    // Find the most recent unexpired, unverified OTP for this phone
    const { data: otpRow, error: fetchError } = await supabase
      .from("phone_otp_codes")
      .select("id, code_hash, attempts")
      .eq("phone", cleanPhone)
      .eq("verified", false)
      .gte("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (fetchError || !otpRow) {
      return NextResponse.json(
        { ok: false, error: "Code expired or not found. Request a new one." },
        { status: 400 }
      );
    }

    // Check attempts (brute-force protection)
    if (otpRow.attempts >= MAX_ATTEMPTS) {
      await supabase
        .from("phone_otp_codes")
        .update({ verified: true })
        .eq("id", otpRow.id);

      return NextResponse.json(
        { ok: false, error: "Too many incorrect attempts. Request a new code." },
        { status: 429 }
      );
    }

    // Increment attempts
    await supabase
      .from("phone_otp_codes")
      .update({ attempts: otpRow.attempts + 1 })
      .eq("id", otpRow.id);

    // Timing-safe comparison of hashed OTP
    const inputHash = hashOtp(code);
    const storedBuffer = Buffer.from(otpRow.code_hash);
    const inputBuffer = Buffer.from(inputHash);
    if (storedBuffer.length !== inputBuffer.length || !timingSafeEqual(storedBuffer, inputBuffer)) {
      return NextResponse.json(
        { ok: false, error: "Incorrect code. Please try again." },
        { status: 400 }
      );
    }

    // Mark OTP as verified
    await supabase
      .from("phone_otp_codes")
      .update({ verified: true })
      .eq("id", otpRow.id);

    // Find existing user by phone number in merchants table
    // Column is "whatsapp_number" (not "whatsapp")
    const { data: merchant } = await supabase
      .from("merchants")
      .select("user_id, store_name")
      .eq("whatsapp_number", normalizedPhone)
      .single();

    if (!merchant) {
      // No merchant with this phone — check auth users metadata as fallback
      // NOTE: listUsers limited to 1000. For >1000 users, consider a direct
      // SQL query on auth.users or storing phone in a searchable column.
      const { data: { users } } = await supabase.auth.admin.listUsers({
        perPage: 1000,
      });

      const matchedUser = users.find(
        (u) =>
          u.user_metadata?.whatsapp_number === normalizedPhone ||
          u.phone === cleanPhone
      );

      if (!matchedUser) {
        return NextResponse.json({
          ok: true,
          action: "no_account",
          message: "No account found with this WhatsApp number. Please sign up first.",
        });
      }

      // User exists but no merchant — generate magic link for session
      const { data: linkData, error: linkError } =
        await supabase.auth.admin.generateLink({
          type: "magiclink",
          email: matchedUser.email!,
        });

      if (linkError || !linkData) {
        return NextResponse.json(
          { ok: false, error: "Failed to create session" },
          { status: 500 }
        );
      }

      return NextResponse.json({
        ok: true,
        action: "verify_redirect",
        token_hash: linkData.properties?.hashed_token,
        email: matchedUser.email,
        has_merchant: false,
      });
    }

    // Merchant found — get their auth user email
    const { data: { user: authUser } } =
      await supabase.auth.admin.getUserById(merchant.user_id);

    if (!authUser?.email) {
      return NextResponse.json(
        { ok: false, error: "Account configuration error" },
        { status: 500 }
      );
    }

    // Generate a magic link to establish session
    // Token is single-use (Supabase enforced) and site is HTTPS-only
    const { data: linkData, error: linkError } =
      await supabase.auth.admin.generateLink({
        type: "magiclink",
        email: authUser.email,
      });

    if (linkError || !linkData) {
      return NextResponse.json(
        { ok: false, error: "Failed to create session" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,
      action: "verify_redirect",
      token_hash: linkData.properties?.hashed_token,
      email: authUser.email,
      has_merchant: true,
    });
  } catch (err) {
    console.error("[WhatsApp OTP Verify]", err);
    return NextResponse.json(
      { ok: false, error: "Internal error" },
      { status: 500 }
    );
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/auth/whatsapp-otp/verify/route.ts
git commit -m "feat: WhatsApp OTP verify endpoint with brute-force protection"
```

---

### Task 5: Rewrite Login Page — Tabbed UI

**Files:**
- Modify: `src/app/(auth)/login/page.tsx` (full rewrite)

- [ ] **Step 1: Rewrite the login page with 3 auth methods**

Replace the entire content of `src/app/(auth)/login/page.tsx` with a tabbed UI:

- **Tab 1: Email + Password** (default) — uses `supabase.auth.signInWithPassword()`
- **Tab 2: WhatsApp OTP** — calls `/api/auth/whatsapp-otp/send` then `/verify`
- **Google OAuth button** below tabs (always visible)
- Existing routing logic preserved (merchant check → dashboard or setup)
- Uses existing `PhoneInput` component, `@/lib/ui` styles, `@/lib/track`
- Keeps Suspense boundary wrapper
- Auth error from `?error=auth` query param still displayed

**WhatsApp OTP is built but disabled for initial launch.** The WhatsApp tab is conditionally shown based on `WHATSAPP_ENABLED` env var. When disabled, merchants only see password + Google OAuth. When enabled later, the WhatsApp tab appears automatically.

To check WhatsApp status, the login page calls `GET /api/whatsapp/status` (already exists) on mount. If `{ enabled: true }`, show the WhatsApp tab.

Key UI elements:
- Tab buttons at top: "Email" + "WhatsApp" (WhatsApp tab hidden when `WHATSAPP_ENABLED=false`)
- **Email tab** (default): email input + password input + "Sign In" button + "Forgot password?" link
- **WhatsApp tab** (shown only when enabled): phone input → send code → 6-digit OTP entry
- Divider with "or"
- Google sign-in button
- "Don't have a store? Create one free" link at bottom

Password login flow:
```
supabase.auth.signInWithPassword({ email, password })
→ success: check merchant → route to /dashboard or /dashboard/setup
→ error "Invalid login credentials": show error
```

WhatsApp OTP flow:
```
POST /api/auth/whatsapp-otp/send { phone }
→ success: show OTP input
→ OTP entered: POST /api/auth/whatsapp-otp/verify { phone, code }
→ success + action "verify_redirect":
    supabase.auth.verifyOtp({ email, token_hash, type: "email" })
    → route based on has_merchant
→ success + action "no_account": show "Please sign up first" message
```

- [ ] **Step 2: Test manually**

1. Start dev server: `npm run dev`
2. Navigate to `/login`
3. Verify Email tab shows email + password fields
4. Verify WhatsApp tab shows phone input
5. Verify Google button appears below both tabs
6. Test password login with an existing account
7. Test WhatsApp OTP flow (requires WhatsApp enabled)

- [ ] **Step 3: Commit**

```bash
git add src/app/(auth)/login/page.tsx
git commit -m "feat: tabbed login page with password + WhatsApp OTP + Google"
```

---

### Task 6: Update Signup Page — Add Password Field

**Files:**
- Modify: `src/app/(auth)/signup/page.tsx`

- [ ] **Step 1: Add password fields to signup form**

Modifications to the existing signup form:
1. Add `password` and `confirmPassword` state variables
2. Add password + confirm password inputs between email and the submit button
3. Remove the OTP step entirely from signup
4. Create a server-side signup API route `src/app/api/auth/signup/route.ts` that:
   - Uses `supabase.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { whatsapp_number } })` to create user with confirmed email (skips email confirmation)
   - Returns success so the client can call `signInWithPassword()` to establish session
5. Add client-side password validation:
   - Minimum 8 characters
   - Passwords must match
   - Show inline validation errors
6. After successful signup + sign-in → route to `/dashboard/setup` (or checkout if tier param)
7. Keep the email duplicate check (already exists)
8. Keep GoogleSignInButton with tier param
9. Keep PhoneInput for WhatsApp number collection

- [ ] **Step 2: Test manually**

1. Navigate to `/signup`
2. Verify WhatsApp + Email + Password + Confirm Password fields appear
3. Test password mismatch validation
4. Test short password validation
5. Test successful signup creates account and redirects

- [ ] **Step 3: Commit**

```bash
git add src/app/(auth)/signup/page.tsx
git commit -m "feat: signup with password instead of email OTP"
```

---

### Task 7: Account Settings Page — Set/Change Password

**Files:**
- Create: `src/app/(dashboard)/dashboard/account/page.tsx`

- [ ] **Step 1: Create the account settings page**

A simple page accessible from the dashboard where merchants can:
1. See their email and WhatsApp number (read-only)
2. Set a password (if they signed up via Google OAuth and don't have one yet)
3. Change their password (if they already have one — must enter current password first)

Uses:
- `supabase.auth.updateUser({ password: newPassword })` — for setting/changing
- `supabase.auth.signInWithPassword()` — to verify current password before changing
- Server component wrapper that fetches user data
- Client component form for password update
- Existing UI constants from `@/lib/ui`
- Success/error feedback with `alertSuccess`/`alertError`

**Setting password** (Google OAuth users, no existing password):
- New Password (min 8 chars) + Confirm Password + "Set Password" button

**Changing password** (users who already have a password):
- Current Password + New Password + Confirm Password + "Change Password" button
- Current password verified via `signInWithPassword` before allowing update

After successful update, show success message. No redirect needed.

- [ ] **Step 2: Add navigation link to account page**

Find the dashboard navigation component and add an "Account" link pointing to `/dashboard/account`. This will likely be in `src/components/dashboard/nav.tsx` — add it near the existing navigation items.

- [ ] **Step 3: Test manually**

1. Log in as a merchant
2. Navigate to `/dashboard/account`
3. Set a new password
4. Log out
5. Log back in using email + password

- [ ] **Step 4: Commit**

```bash
git add src/app/(dashboard)/dashboard/account/page.tsx
git commit -m "feat: account settings page with password management"
```

---

### Task 8: Meta Authentication Template Setup

This is a manual step — not code. The developer must create an authentication message template in Meta Business Manager.

- [ ] **Step 1: Create template in Meta Business Manager**

Go to: Meta Business Manager → WhatsApp Manager → Message Templates → Create Template

Settings:
- **Category:** Authentication
- **Template name:** `authentication_otp`
- **Language:** English
- **Body:** `Your OshiCart verification code is {{1}}. It expires in 5 minutes.`
- **Button:** Copy Code (URL type, with `{{1}}` parameter)

Meta auto-approves authentication templates quickly (usually within minutes).

- [ ] **Step 2: Verify template is approved**

Check template status in WhatsApp Manager. Status should be "Approved".

- [ ] **Step 3: Test OTP delivery**

Use the Meta test tool or the WhatsApp OTP send endpoint to verify a code arrives on a test phone number.

---

### Task 9: Integration Testing & Cleanup

- [ ] **Step 1: Test full login flow — password**

1. Go to `/signup`, create account with password
2. Log out
3. Go to `/login`, sign in with email + password
4. Verify dashboard loads

- [ ] **Step 2: Test full login flow — WhatsApp OTP**

1. Go to `/login`, switch to WhatsApp tab
2. Enter phone number, click "Send Code"
3. Check WhatsApp for OTP message
4. Enter code, verify login succeeds
5. Test with a phone number not in the system — should show "no account" message

- [ ] **Step 3: Test full login flow — Google OAuth**

1. Go to `/login`, click "Continue with Google"
2. Complete OAuth flow
3. Verify dashboard loads (existing flow, should still work)

- [ ] **Step 4: Test signup flow**

1. Go to `/signup`, fill in WhatsApp + email + password
2. Verify account created and redirected to setup
3. Verify can log back in with password

- [ ] **Step 5: Test account settings**

1. Log in, go to `/dashboard/account`
2. Set/change password
3. Log out, log back in with new password

- [ ] **Step 6: Test edge cases**

- Wrong password → shows error
- Wrong OTP → shows error, max 5 attempts
- Expired OTP → shows "request new code"
- Rate limit → shows "too many requests" after 3 OTP sends in 10 min
- Non-existent email + password → shows error
- Non-existent phone + WhatsApp OTP → shows "no account" message

- [ ] **Step 7: Final commit**

```bash
git add -A
git commit -m "feat: complete merchant auth upgrade — password + WhatsApp OTP + Google OAuth"
```

---

## Environment Variables

No new env vars needed. The existing WhatsApp vars are already configured:
- `WHATSAPP_PHONE_NUMBER_ID` (existing)
- `WHATSAPP_ACCESS_TOKEN` (existing)
- `WHATSAPP_APP_SECRET` (existing)
- `WHATSAPP_VERIFY_TOKEN` (existing)
- `WHATSAPP_ENABLED` (existing)

## Rollback Plan

If issues arise:
1. The old email OTP login still works via Supabase Auth (users who signed up with OTP can still use "Forgot password" flow or Google OAuth)
2. WhatsApp OTP is independent — disable by setting `WHATSAPP_ENABLED=false`
3. Password auth is native Supabase — no rollback needed, it's additive
