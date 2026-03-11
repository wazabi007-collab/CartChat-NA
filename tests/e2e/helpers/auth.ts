/**
 * Auth helper for Playwright tests.
 *
 * Bypasses OTP email delivery by calling the GoTrue admin API to get the
 * OTP code directly, then fills it through the real login UI. Requires:
 *   SUPABASE_URL            (e.g. https://oshicart.octovianexus.com/supabase)
 *   SUPABASE_SERVICE_ROLE_KEY
 *   TEST_MERCHANT_EMAIL
 *   PLAYWRIGHT_BASE_URL     (default: http://localhost:3000)
 */

import type { Page } from "@playwright/test";

const SUPABASE_URL =
  process.env.SUPABASE_URL || "https://oshicart.octovianexus.com/supabase";
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000";

export async function loginAsMerchant(page: Page): Promise<void> {
  const email = process.env.TEST_MERCHANT_EMAIL!;

  // Call GoTrue admin API to generate a magic link — also returns the raw OTP
  const res = await fetch(`${SUPABASE_URL}/auth/v1/admin/generate_link`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
      apikey: SERVICE_ROLE_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ type: "magiclink", email }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`GoTrue admin generate_link failed (${res.status}): ${body}`);
  }

  const data = (await res.json()) as { email_otp?: string };
  const otp = data.email_otp;
  if (!otp) throw new Error("No email_otp in admin generate_link response");

  // Step 1 — enter email and request OTP
  await page.goto(`${BASE_URL}/login`);
  await page.fill('input[type="email"]', email);
  await page.click('button[type="submit"]');

  // Step 2 — fill in OTP and sign in
  await page.waitForSelector('input[inputmode="numeric"]', { timeout: 10_000 });
  await page.fill('input[inputmode="numeric"]', otp);
  await page.click('button[type="submit"]');

  await page.waitForURL(/dashboard/, { timeout: 15_000 });
}

/** Returns true if the env vars required for auth tests are present. */
export function hasAuthCredentials(): boolean {
  return !!(process.env.TEST_MERCHANT_EMAIL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}
