/**
 * Auth helper for Playwright tests.
 *
 * Injects a valid Supabase session directly as a cookie, bypassing the OTP
 * login UI entirely. This avoids the 2-step email OTP flow and eliminates
 * the extra network round-trips that push tests over the 30 s timeout.
 *
 * Required env vars:
 *   SUPABASE_URL               (e.g. https://oshicart.octovianexus.com/supabase)
 *   SUPABASE_SERVICE_ROLE_KEY
 *   TEST_MERCHANT_EMAIL
 *   PLAYWRIGHT_BASE_URL        (default: http://localhost:3000)
 */

import type { Page } from "@playwright/test";

const SUPABASE_URL =
  process.env.SUPABASE_URL || "https://oshicart.octovianexus.com/supabase";
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000";

// @supabase/supabase-js computes the storage key (= cookie name) as:
//   `sb-${new URL(supabaseUrl).hostname.split('.')[0]}-auth-token`
// This MUST match what the app's createServerClient / createBrowserClient uses.
const SUPABASE_PUBLIC_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL || SUPABASE_URL;
const STORAGE_KEY = `sb-${new URL(SUPABASE_PUBLIC_URL).hostname.split(".")[0]}-auth-token`;

const BASE64_PREFIX = "base64-";

/** Encodes a UTF-8 string as Base64-URL (no padding), matching @supabase/ssr. */
function toBase64URL(str: string): string {
  return Buffer.from(str, "utf-8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

export async function loginAsMerchant(page: Page): Promise<void> {
  const email = process.env.TEST_MERCHANT_EMAIL!;

  // ── Step 1: Admin API → magic link + hashed_token + user data ────────────
  const genRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/generate_link`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
      apikey: SERVICE_ROLE_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ type: "magiclink", email }),
  });

  if (!genRes.ok) {
    throw new Error(
      `generate_link failed (${genRes.status}): ${await genRes.text()}`
    );
  }

  const genData = (await genRes.json()) as {
    id: string;
    email: string;
    email_confirmed_at: string;
    app_metadata: Record<string, unknown>;
    user_metadata: Record<string, unknown>;
    created_at: string;
    updated_at: string;
    hashed_token: string;
  };

  // ── Step 2: Verify token → get access_token + refresh_token (implicit) ───
  // Call GoTrue verify without following the redirect; tokens are in the
  // Location header's URL fragment (#access_token=...&refresh_token=...).
  const verifyRes = await fetch(
    `${SUPABASE_URL}/auth/v1/verify?token=${genData.hashed_token}&type=magiclink&redirect_to=${encodeURIComponent(BASE_URL)}`,
    { redirect: "manual" }
  );

  const location = verifyRes.headers.get("location") || "";
  const fragment = location.split("#")[1] || "";
  const p = new URLSearchParams(fragment);
  const accessToken = p.get("access_token");
  const refreshToken = p.get("refresh_token");
  const expiresAt = Number(p.get("expires_at") || "0");
  const expiresIn = Number(p.get("expires_in") || "3600");

  if (!accessToken || !refreshToken) {
    throw new Error(
      `GoTrue verify did not return tokens. Location: ${location}`
    );
  }

  // ── Step 3: Build session JSON (matches @supabase/auth-js Session type) ──
  const session = JSON.stringify({
    access_token: accessToken,
    refresh_token: refreshToken,
    expires_at: expiresAt,
    expires_in: expiresIn,
    token_type: "bearer",
    user: {
      id: genData.id,
      aud: "authenticated",
      role: "authenticated",
      email: genData.email,
      email_confirmed_at: genData.email_confirmed_at,
      app_metadata: genData.app_metadata,
      user_metadata: genData.user_metadata,
      created_at: genData.created_at,
      updated_at: genData.updated_at,
    },
  });

  // @supabase/ssr stores the session with "base64-" prefix + base64url body
  const cookieValue = BASE64_PREFIX + toBase64URL(session);

  // ── Step 4: Inject cookie into Playwright browser context ─────────────────
  const appUrl = new URL(BASE_URL);
  await page.context().addCookies([
    {
      name: STORAGE_KEY,
      value: cookieValue,
      domain: appUrl.hostname,
      path: "/",
      httpOnly: false,
      secure: appUrl.protocol === "https:",
      sameSite: "Lax",
    },
  ]);

  // ── Step 5: Navigate to dashboard (middleware validates the cookie) ────────
  await page.goto(`${BASE_URL}/dashboard`);
  await page.waitForURL(/dashboard/, { timeout: 15_000 });
}

/** Returns true when the env vars required for auth tests are present. */
export function hasAuthCredentials(): boolean {
  return !!(
    process.env.TEST_MERCHANT_EMAIL && process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}
