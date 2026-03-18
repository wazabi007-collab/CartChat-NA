# Google OAuth Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add "Continue with Google" OAuth button to login and signup pages alongside existing email OTP.

**Architecture:** Supabase handles Google OAuth natively — we call `signInWithOAuth`, Supabase redirects to Google, Google redirects back to Supabase, Supabase redirects to our `/auth/callback`. The callback route checks merchant existence and routes accordingly. No new libraries needed.

**Tech Stack:** Supabase Auth (OAuth), Next.js App Router, existing Tailwind styling.

**Spec:** `docs/superpowers/specs/2026-03-18-google-oauth-design.md`

---

## File Map

| File | Action | Responsibility |
|------|--------|---------------|
| `src/components/google-sign-in-button.tsx` | **Create** | Reusable Google OAuth button component |
| `src/app/(auth)/login/page.tsx` | **Modify** | Add Google button + divider above OTP form |
| `src/app/(auth)/signup/page.tsx` | **Modify** | Add Google button + divider above OTP form |
| `src/app/auth/callback/route.ts` | **Modify** | Add merchant check + smart redirect logic |

---

### Task 1: Create Google Sign-In Button Component

**Files:**
- Create: `src/components/google-sign-in-button.tsx`

- [ ] **Step 1: Create the component file**

```tsx
"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

interface GoogleSignInButtonProps {
  /** Tier param to pass through the OAuth flow (for pricing page signups) */
  tier?: string | null;
}

export function GoogleSignInButton({ tier }: GoogleSignInButtonProps) {
  const [loading, setLoading] = useState(false);
  const supabase = createClient();

  async function handleGoogleSignIn() {
    setLoading(true);
    const redirectTo = `${window.location.origin}/auth/callback${
      tier ? `?tier=${encodeURIComponent(tier)}` : ""
    }`;

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo },
    });

    if (error) {
      console.error("Google sign-in error:", error.message);
      setLoading(false);
    }
    // If no error, browser is redirecting to Google — don't setLoading(false)
  }

  return (
    <button
      type="button"
      onClick={handleGoogleSignIn}
      disabled={loading}
      className="w-full flex items-center justify-center gap-3 py-2 px-4 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 font-medium text-gray-700 transition-colors"
    >
      <svg className="w-5 h-5" viewBox="0 0 24 24">
        <path
          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
          fill="#4285F4"
        />
        <path
          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
          fill="#34A853"
        />
        <path
          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
          fill="#FBBC05"
        />
        <path
          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
          fill="#EA4335"
        />
      </svg>
      {loading ? "Redirecting..." : "Continue with Google"}
    </button>
  );
}
```

- [ ] **Step 2: Verify file compiles**

Run: `npx tsc --noEmit src/components/google-sign-in-button.tsx 2>&1 || echo "Check errors above"`
Expected: No errors (or verify with full build later)

- [ ] **Step 3: Commit**

```bash
git add src/components/google-sign-in-button.tsx
git commit -m "feat: add Google sign-in button component"
```

---

### Task 2: Add Google Button to Login Page

**Files:**
- Modify: `src/app/(auth)/login/page.tsx`

- [ ] **Step 1: Add import at top of file**

After the existing imports (line 6), add:

```tsx
import { GoogleSignInButton } from "@/components/google-sign-in-button";
```

- [ ] **Step 2: Add Google button + divider inside the white card**

Replace line 93-94 (opening of the card div and the conditional):

```tsx
<div className="bg-white rounded-lg shadow-sm border p-6">
          {step === "email" ? (
```

With:

```tsx
<div className="bg-white rounded-lg shadow-sm border p-6">
          <GoogleSignInButton />

          <div className="relative my-5">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="bg-white px-3 text-gray-400">or</span>
            </div>
          </div>

          {step === "email" ? (
```

- [ ] **Step 3: Verify the page renders correctly**

Run: `npx next build 2>&1 | tail -20`
Expected: Build succeeds with no errors on `/login` route

- [ ] **Step 4: Commit**

```bash
git add src/app/(auth)/login/page.tsx
git commit -m "feat: add Google sign-in to login page"
```

- [ ] **Step 5: Add auth error display**

The login page needs to show a message when the user arrives with `?error=auth` (e.g., after cancelling Google consent). Wrap the page component in a Suspense boundary and read the error param.

First, wrap the export in a Suspense boundary. Replace the component export:

Change `export default function LoginPage()` to a wrapper pattern:

```tsx
export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
```

Add `Suspense` to the existing React import (line 3) and add `useSearchParams`:

```tsx
import { useState, useEffect, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
```

At the top of the `LoginForm` function, add:

```tsx
  const searchParams = useSearchParams();
  const authError = searchParams.get("error");
```

Add an error banner right above the Google button (inside the white card):

```tsx
          {authError === "auth" && (
            <p className="text-red-600 text-sm mb-4 text-center">
              Sign-in failed or was cancelled. Please try again.
            </p>
          )}

          <GoogleSignInButton />
```

- [ ] **Step 6: Commit**

```bash
git add src/app/(auth)/login/page.tsx
git commit -m "feat: add Google sign-in and auth error display to login page"
```

Note: This replaces the separate commit from Step 4. Stage all login page changes together.

---

### Task 3: Add Google Button to Signup Page

**Files:**
- Modify: `src/app/(auth)/signup/page.tsx`

- [ ] **Step 1: Add import at top of file**

After the existing imports (line 8), add:

```tsx
import { GoogleSignInButton } from "@/components/google-sign-in-button";
```

- [ ] **Step 2: Add Google button + divider inside the white card**

The signup page needs to pass the tier param through. Replace line 148-149:

```tsx
<div className="bg-white rounded-lg shadow-sm border p-6">
          {step === "form" ? (
```

With:

```tsx
<div className="bg-white rounded-lg shadow-sm border p-6">
          <GoogleSignInButton tier={tierParam} />

          <div className="relative my-5">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="bg-white px-3 text-gray-400">or</span>
            </div>
          </div>

          {step === "form" ? (
```

- [ ] **Step 3: Verify the page renders correctly**

Run: `npx next build 2>&1 | tail -20`
Expected: Build succeeds with no errors on `/signup` route

- [ ] **Step 4: Commit**

```bash
git add src/app/(auth)/signup/page.tsx
git commit -m "feat: add Google sign-in to signup page"
```

---

### Task 4: Extend Auth Callback with Merchant Check

**Files:**
- Modify: `src/app/auth/callback/route.ts`

- [ ] **Step 1: Replace the entire callback route**

The current callback blindly redirects to `next` param. We need it to:
1. Exchange code for session
2. Check if user has a merchant profile
3. Route new users to `/dashboard/setup`, existing merchants to `/dashboard`
4. Existing merchants with `tier` param → `/pricing/checkout?tier=X`
5. New users with `tier` param → `/dashboard/setup?tier=X`

Replace the entire file contents:

```ts
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const tier = searchParams.get("tier");

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=auth`);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(`${origin}/login?error=auth`);
  }

  // Check merchant existence to decide where to send the user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const { data: merchant } = await supabase
      .from("merchants")
      .select("id")
      .eq("user_id", user.id)
      .single();

    if (merchant) {
      // Existing merchant with tier param → pricing checkout
      if (tier) {
        return NextResponse.redirect(`${origin}/pricing/checkout?tier=${encodeURIComponent(tier)}`);
      }
      return NextResponse.redirect(`${origin}/dashboard`);
    } else {
      // New user → setup (with tier if present)
      const setupUrl = tier
        ? `/dashboard/setup?tier=${encodeURIComponent(tier)}`
        : "/dashboard/setup";
      return NextResponse.redirect(`${origin}${setupUrl}`);
    }
  }

  return NextResponse.redirect(`${origin}/dashboard`);
}
```

- [ ] **Step 2: Verify build**

Run: `npx next build 2>&1 | tail -20`
Expected: Build succeeds

- [ ] **Step 3: Commit**

```bash
git add src/app/auth/callback/route.ts
git commit -m "feat: extend auth callback with merchant check and redirect validation"
```

---

### Task 5: Full Build Verification and Deploy

- [ ] **Step 1: Run full build**

Run: `npx next build`
Expected: Build succeeds with no errors

- [ ] **Step 2: Commit all remaining changes (if any)**

```bash
git status
```

- [ ] **Step 3: Push and deploy**

```bash
git push origin master
```

Expected: Vercel picks up the push and deploys automatically.

---

## Manual Steps (User Must Do)

After deployment, the user needs to configure Google OAuth in two places:

### Google Cloud Console
1. Go to https://console.cloud.google.com/apis/credentials
2. Create OAuth 2.0 Client ID → Web application
3. Add authorized redirect URI: `https://<supabase-project-ref>.supabase.co/auth/v1/callback`
4. Copy the Client ID and Client Secret

### Supabase Dashboard
1. Go to Authentication → Providers → Google
2. Enable the Google provider
3. Paste the Client ID and Client Secret from Google Cloud Console
4. Save

After both are configured, the "Continue with Google" button will work end-to-end.
