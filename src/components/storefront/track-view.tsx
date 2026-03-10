"use client";

import { useEffect } from "react";

export function TrackView({ merchantId }: { merchantId: string }) {
  useEffect(() => {
    // Only track once per session per store
    const key = `viewed_${merchantId}`;
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, "1");

    fetch("/api/analytics", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ merchant_id: merchantId }),
    }).catch(() => {});
  }, [merchantId]);

  return null;
}
