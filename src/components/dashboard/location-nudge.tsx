"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { MapPin, X } from "lucide-react";

const DISMISS_KEY = "oshicart-location-nudge-dismissed";

export function LocationNudge() {
  const [show, setShow] = useState(false);

  // Post-hydration setState: localStorage is browser-only, can't be read during SSR.
  // The one-time setState is intentional.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    try {
      if (!localStorage.getItem(DISMISS_KEY)) setShow(true);
    } catch {
      // storage unavailable — leave hidden
    }
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  if (!show) return null;

  return (
    <div className="mb-4 flex items-center justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
      <div className="flex items-center gap-2">
        <MapPin size={16} className="shrink-0" />
        <p>
          Add your town so customers know where you sell from.{" "}
          <Link href="/dashboard/settings" className="font-semibold underline hover:text-amber-900">
            Add location →
          </Link>
        </p>
      </div>
      <button
        type="button"
        onClick={() => {
          try {
            localStorage.setItem(DISMISS_KEY, "1");
          } catch {
            // ignore
          }
          setShow(false);
        }}
        aria-label="Dismiss"
        className="shrink-0 text-amber-600 hover:text-amber-800"
      >
        <X size={16} />
      </button>
    </div>
  );
}
