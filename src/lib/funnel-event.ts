export const FUNNEL_EVENTS = [
  "landing_cta_clicked", "signup_started", "signup_otp_sent", "signup_completed",
  "login_started", "login_otp_sent", "login_completed", "onboarding_step_completed",
  "onboarding_completed", "product_created", "checkout_started", "checkout_submitted",
  "checkout_completed", "order_status_changed", "coupon_applied", "proof_uploaded",
  "dpo_payment_initiated", "dpo_payment_success", "dpo_payment_failed",
] as const;

/** A reverse proxy can give Next an internal URL. Trust only the configured
 * public origin (or the request origin when unconfigured), never forwarded headers.
 */
export function isTrustedFunnelOrigin(origin: string | null, requestUrl: string, siteUrl?: string) {
  if (!origin) return true;
  try {
    const expected = new URL(siteUrl || requestUrl);
    return (expected.protocol === "https:" || expected.protocol === "http:") && origin === expected.origin;
  } catch {
    return false;
  }
}

/** Private analytics accepts only event/session/route, never arbitrary payloads,
 * customer details or receipt capabilities. UI events are not a financial ledger.
 */
export function parseFunnelEvent(value: unknown) {
  if (!value || typeof value !== "object") return null;
  const body = value as Record<string, unknown>;
  if (typeof body.event !== "string" || !FUNNEL_EVENTS.some((event) => event === body.event)) return null;
  if (typeof body.session_id !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(body.session_id)) return null;
  if (typeof body.pathname !== "string" || !body.pathname.startsWith("/") || body.pathname.length > 200) return null;
  const pathname = body.pathname.split(/[?#]/)[0]
    .replace(/^\/(track|invoice|credit-note)\/[^/]+/, "/$1/[id]")
    .replace(/^\/s\/[^/]+(?:\/[^/]+)?/, "/s/[store]/[item]")
    .replace(/[0-9a-f]{8}-[0-9a-f-]{27,}/gi, "[id]");
  return { event: body.event, session_id: body.session_id, pathname };
}
