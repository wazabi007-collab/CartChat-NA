/**
 * Lightweight funnel event tracking utility.
 * Fires events to /api/analytics/event (non-blocking).
 * All events include timestamp, sessionId, and pathname automatically.
 *
 * Usage:
 *   track("signup_started", { method: "email" })
 *   track("checkout_submitted", { merchant_id: "abc", total_nad: 4999 })
 */

function getSessionId(): string {
  if (typeof window === "undefined") return "server";
  let sid = sessionStorage.getItem("oshi_sid");
  if (!sid) {
    sid = crypto.randomUUID?.() || Math.random().toString(36).slice(2);
    sessionStorage.setItem("oshi_sid", sid);
  }
  return sid;
}

export type TrackEvent =
  | "landing_cta_clicked"
  | "signup_started"
  | "signup_otp_sent"
  | "signup_completed"
  | "login_started"
  | "login_otp_sent"
  | "login_completed"
  | "onboarding_step_completed"
  | "onboarding_completed"
  | "product_created"
  | "checkout_started"
  | "checkout_submitted"
  | "checkout_completed"
  | "order_status_changed"
  | "coupon_applied"
  | "proof_uploaded";

export function track(
  event: TrackEvent,
  payload?: Record<string, string | number | boolean | null>
) {
  if (typeof window === "undefined") return;

  const data = {
    event,
    session_id: getSessionId(),
    pathname: window.location.pathname,
    timestamp: new Date().toISOString(),
    ...payload,
  };

  // Fire and forget — never block UI
  try {
    if (navigator.sendBeacon) {
      navigator.sendBeacon(
        "/api/analytics/event",
        new Blob([JSON.stringify(data)], { type: "application/json" })
      );
    } else {
      fetch("/api/analytics/event", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        keepalive: true,
      }).catch(() => {});
    }
  } catch {
    // Tracking must never break the app
  }
}
