# Google OAuth Integration — Design Spec

**Date:** 2026-03-18
**Status:** Approved

## Goal

Add "Continue with Google" as an alternative to email OTP on login and signup pages. Reduces friction for new merchants, looks more professional, and auto-links with existing email OTP accounts.

## Auth Flow

1. User clicks "Continue with Google" on `/login` or `/signup`
2. `supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo } })` redirects to Google consent screen
3. Google redirects back to `/auth/callback`
4. Callback route (already exists with code exchange) is extended to check merchant profile:
   - **Has merchant** → redirect to `/dashboard`
   - **No merchant** → redirect to `/dashboard/setup`
5. The `/dashboard/setup` page already collects WhatsApp number as part of its form — no separate page needed

**Note:** The Google button acts as both sign-in AND sign-up. If someone clicks it on the login page but has no account, Supabase creates one automatically. The callback's merchant check handles routing them to setup regardless of entry point.

### Tier Parameter Threading

When a `?tier=` param is present (from pricing page):
1. Signup page reads `tier` from URL search params
2. Passes `redirectTo: origin + '/auth/callback?next=/dashboard/setup?tier=' + tier` to `signInWithOAuth`
3. Callback reads `next` from search params and redirects accordingly

## Account Linking

- If a Google sign-in email matches an existing OTP-created account, Supabase auto-links them (same `auth.users` row, new identity in `auth.identities`)
- No manual linking needed — this is Supabase's default behavior when the email is confirmed on both sides

## UI Changes

### Login Page (`/src/app/(auth)/login/page.tsx`)
- Add "Continue with Google" button above the email OTP form
- Visual divider: horizontal line with "or" text between Google button and OTP form
- Google button: white background, Google "G" icon, brand-compliant styling
- Existing OTP flow unchanged

### Signup Page (`/src/app/(auth)/signup/page.tsx`)
- Same layout: Google button on top, "or" divider, then existing OTP form below
- Existing WhatsApp number + email + OTP flow unchanged

### Auth Callback (`/src/app/auth/callback/route.ts`)
- Already implements code exchange and redirect to `next` param
- Extend: after code exchange, query `merchants` table to check if user has a profile
- If no merchant → redirect to `/dashboard/setup` (with tier param if present)
- If has merchant → redirect to `/dashboard`
- **Security:** Validate that redirect paths start with `/` and don't contain `//` or protocol strings to prevent open redirects

## Supabase Configuration (Manual Steps)

1. **Google Cloud Console:**
   - Create OAuth 2.0 Client ID (Web application)
   - Authorized redirect URI: `https://<supabase-project>.supabase.co/auth/v1/callback`
   - Note the Client ID and Client Secret

2. **Supabase Dashboard:**
   - Authentication → Providers → Google → Enable
   - Paste Client ID and Client Secret
   - Authorized redirect URL is auto-configured by Supabase

3. **Environment variables:** No new env vars needed — Google OAuth config lives in Supabase dashboard, not in app code.

## Files Changed

| File | Change |
|------|--------|
| `src/app/(auth)/login/page.tsx` | Add Google button + divider |
| `src/app/(auth)/signup/page.tsx` | Add Google button + divider |
| `src/app/auth/callback/route.ts` | Extend with merchant-existence check + redirect logic |

## Files NOT Changed

- `src/middleware.ts` — no changes needed, existing route protection works. Note: logged-in users hitting `/login` or `/signup` are redirected to `/dashboard` — this is existing behavior and is fine.
- `src/lib/supabase/*` — client/server/service clients unchanged
- `src/app/(dashboard)/*` — dashboard and setup page untouched (already collects WhatsApp number)
- `src/lib/admin-auth.ts` — admin auth untouched

## Edge Cases

- **User cancels Google consent** — redirected back to login with no session, no error shown
- **Google email already linked** — Supabase handles seamlessly, user just logs in
- **User has merchant but signs in via Google for first time** — auto-links account, goes to dashboard
- **New user clicks Google on login page** — creates account automatically, routes to setup (same as signup)
- **Tier param flow** — threaded through `signInWithOAuth` redirectTo → callback → setup page
- **Open redirect prevention** — callback validates redirect paths are relative

## Testing

- New user signs up with Google → setup page (WhatsApp collected there) → dashboard
- Existing OTP user signs in with Google (same email) → auto-links → dashboard
- New user signs up with Google when `?tier=starter` → setup with tier pre-selected
- OTP flow still works identically after changes
- Cancel Google consent → returns to login page gracefully
- Verify redirect param validation blocks external URLs
