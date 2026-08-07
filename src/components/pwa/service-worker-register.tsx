"use client";

import { useEffect } from "react";

/**
 * Registers the shell service worker. Failure is non-fatal — the site works
 * exactly the same without it, so errors are swallowed rather than surfaced.
 */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  }, []);

  return null;
}
