"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export function WelcomeNotice({ merchantId, failed = false }: { merchantId: string; failed?: boolean }) {
  const key = `oshicart:welcome-failed:${merchantId}`;
  const [visible, setVisible] = useState(failed);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("Your store was created successfully, but the welcome WhatsApp could not be sent.");
  const [done, setDone] = useState(false);
  useEffect(() => {
    try {
      if (failed) sessionStorage.setItem(key, "1");
      // Browser-only recovery state survives the plan-checkout round trip.
      if (sessionStorage.getItem(key)) setVisible(true);
    } catch { /* The URL still supplies the initial notice if storage is blocked. */ }
  }, [key, failed]);

  function clearNotice() {
    try { sessionStorage.removeItem(key); } catch { /* optional browser storage */ }
    const url = new URL(window.location.href);
    if (url.searchParams.get("notification") === "failed") {
      url.searchParams.delete("notification");
      window.history.replaceState(null, "", url);
    }
  }

  async function retry() {
    if (busy || done) return;
    setBusy(true);
    try {
      const response = await fetch("/api/whatsapp/welcome-retry", { method: "POST" });
      const body = await response.json();
      if (!response.ok || !body.ok) throw new Error(body.error || "Could not retry. Please contact support.");
      setMessage(body.skipped ? "A welcome message has already been queued or attempted. No duplicate was sent." : "The welcome message was sent.");
      setDone(true);
      clearNotice();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not retry. Please contact support.");
    } finally { setBusy(false); }
  }
  if (!visible) return null;
  return <div role="status" className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
    <p>{message} Your store setup is saved.</p>
    <div className="mt-2 flex flex-wrap gap-3">
      {!done && <button type="button" onClick={retry} disabled={busy} className="min-h-11 rounded-lg border border-amber-800 px-3 font-semibold disabled:opacity-60">{busy ? "Retrying…" : "Retry welcome message"}</button>}
      <Link href="/help" className="inline-flex min-h-11 items-center underline">Get help</Link>
      <button type="button" onClick={() => { setVisible(false); clearNotice(); }} className="min-h-11 px-3 underline">Dismiss</button>
    </div>
  </div>;
}
