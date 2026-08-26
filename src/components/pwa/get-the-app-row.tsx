"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { CheckCircle2, Smartphone } from "lucide-react";

/**
 * "Get the app" row for the dashboard readiness card.
 *
 * Resolved in the browser on purpose: installing a PWA leaves no server-side
 * trace, so this cannot be driven by server props without showing a checkmark
 * the platform is unable to back up. It is presentational and deliberately does
 * not count toward the setup score.
 */
export function GetTheAppRow() {
  const [installed, setInstalled] = useState(false);

  // Display mode is browser-only, so it cannot seed useState -- that runs on
  // the server too and would mismatch the hydrated HTML. One post-hydration
  // setState is the intended shape here.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    const nav = navigator as Navigator & { standalone?: boolean };
    setInstalled(
      window.matchMedia("(display-mode: standalone)").matches ||
        nav.standalone === true
    );
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <span className="font-semibold text-slate-700">Store app on your phone</span>
      {installed ? (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-black text-acacia">
          <CheckCircle2 size={13} />
          Installed
        </span>
      ) : (
        <Link
          href="/app"
          className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-black text-slate-500 transition-colors hover:bg-slate-200 hover:text-slate-700"
        >
          <Smartphone size={13} />
          Get the app
        </Link>
      )}
    </div>
  );
}
