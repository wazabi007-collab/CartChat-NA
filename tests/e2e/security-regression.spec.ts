/**
 * Security regression tests for the pre-launch blocker fixes
 * (see LAUNCH_READINESS_REVIEW.md). These assert the public authz contracts
 * of the hardened endpoints and need only a running server (no DB seed/auth).
 *
 * Run: PLAYWRIGHT_BASE_URL=http://localhost:3000 npx playwright test security-regression
 */
import { test, expect } from "@playwright/test";

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000";

test.describe("C2 — /api/whatsapp/send is server-only", () => {
  test("rejects an unauthenticated POST (no internal secret)", async ({ request }) => {
    const res = await request.post(`${BASE_URL}/api/whatsapp/send`, {
      data: {
        merchant_id: "00000000-0000-0000-0000-000000000000",
        template_name: "order_placed",
        recipient_phone: "+264811234567",
        variables: ["a", "b", "c", "d"],
      },
    });
    // Must NOT process the send for an anonymous caller.
    expect(res.status()).toBe(401);
  });
});

test.describe("C2 — /api/whatsapp/notify requires authentication", () => {
  test("rejects an unauthenticated POST", async ({ request }) => {
    const res = await request.post(`${BASE_URL}/api/whatsapp/notify`, {
      data: {
        merchant_id: "00000000-0000-0000-0000-000000000000",
        template_name: "order_confirmed",
        recipient_phone: "+264811234567",
        variables: ["a", "b", "c"],
      },
    });
    expect(res.status()).toBe(401);
  });
});

test.describe("C5 — /api/orders/lookup requires a possession code", () => {
  test("GET is no longer supported (must POST with a verified code)", async ({ request }) => {
    const res = await request.get(
      `${BASE_URL}/api/orders/lookup?merchant_id=00000000-0000-0000-0000-000000000000&whatsapp=0811234567`
    );
    // GET handler was removed; Next returns 405 Method Not Allowed.
    expect(res.status()).toBe(405);
  });

  test("POST without a code is rejected", async ({ request }) => {
    const res = await request.post(`${BASE_URL}/api/orders/lookup`, {
      data: { merchant_id: "00000000-0000-0000-0000-000000000000", whatsapp: "0811234567" },
    });
    expect(res.status()).toBe(400);
  });

  test("an unknown merchant_id is rejected (404) before the OTP is touched", async ({ request }) => {
    // The merchant check runs first, so a wrong/inactive merchant_id can never
    // consume a valid code. A bogus merchant therefore returns 404 (not 401),
    // and never order data.
    const res = await request.post(`${BASE_URL}/api/orders/lookup`, {
      data: {
        merchant_id: "00000000-0000-0000-0000-000000000000",
        whatsapp: "0811234567",
        code: "000000",
      },
    });
    expect(res.status()).toBe(404);
    const body = await res.json().catch(() => ({}));
    expect(body.orders).toBeUndefined();
  });
});

test.describe("C2/announce — /api/orders/announce needs a valid order token", () => {
  test("missing fields are rejected", async ({ request }) => {
    const res = await request.post(`${BASE_URL}/api/orders/announce`, { data: {} });
    expect(res.status()).toBe(400);
  });

  test("a bogus (order_id, tracking_token) pair is not accepted", async ({ request }) => {
    const res = await request.post(`${BASE_URL}/api/orders/announce`, {
      data: {
        order_id: "00000000-0000-0000-0000-000000000000",
        tracking_token: "deadbeef",
      },
    });
    expect(res.status()).toBe(404);
  });
});
