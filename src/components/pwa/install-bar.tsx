"use client";

import { useEffect, useState } from "react";
import { Share, X } from "lucide-react";
import { isMobileDevice, installDismissKey } from "@/lib/pwa";

/** The slice of beforeinstallprompt we use. Not in TypeScript's DOM lib. */
interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

interface Props {
  /**
   * Which app is being offered. Dismissal is remembered per scope, so a
   * merchant declining the dashboard app is not also declining the shopper one.
   */
  scope?: string;
  title?: string;
  subtitle?: string;
}

/**
 * Offers to add OshiCart to the visitor's home screen.
 *
 * Three gates, all of which must pass: the device is a phone or tablet, the app
 * is not already installed, and the visitor has not dismissed it before. PCs
 * never see this — installing on a desktop is explicitly not wanted.
 */
export function InstallBar({
  scope = "shopper",
  title = "Add OshiCart to your home screen",
  subtitle = "Browse every shop like an app, straight from your phone.",
}: Props) {
  const [prompt, setPrompt] = useState<InstallPromptEvent | null>(null);
  const [showIosHint, setShowIosHint] = useState(false);
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    const nav = navigator as Navigator & {
      standalone?: boolean;
      userAgentData?: { mobile?: boolean };
    };

    // Already installed — nothing to offer.
    if (
      window.matchMedia("(display-mode: standalone)").matches ||
      nav.standalone === true
    ) {
      return;
    }

    if (
      !isMobileDevice({
        uaDataMobile: nav.userAgentData?.mobile,
        coarsePointer: window.matchMedia("(pointer: coarse)").matches,
        maxTouchPoints: navigator.maxTouchPoints,
      })
    ) {
      return;
    }

    if (localStorage.getItem(installDismissKey(scope))) return;

    setDismissed(false);

    // iOS fires no install event, so Safari gets written instructions instead.
    const ua = navigator.userAgent;
    const isIos =
      /iphone|ipad|ipod/i.test(ua) ||
      (navigator.maxTouchPoints > 1 && /macintosh/i.test(ua));
    const isSafari = /safari/i.test(ua) && !/chrome|crios|fxios|edgios/i.test(ua);
    if (isIos && isSafari) setShowIosHint(true);

    const onBeforeInstall = (event: Event) => {
      // Always suppress Chrome's own mini-infobar; we decide when to ask.
      event.preventDefault();
      setPrompt(event as InstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    return () => window.removeEventListener("beforeinstallprompt", onBeforeInstall);
  }, [scope]);

  const close = () => {
    localStorage.setItem(installDismissKey(scope), "1");
    setDismissed(true);
  };

  const install = async () => {
    if (!prompt) return;
    await prompt.prompt();
    await prompt.userChoice;
    setPrompt(null);
    close();
  };

  // Android before the event arrives, or any browser that cannot install.
  if (dismissed || (!prompt && !showIosHint)) return null;

  return (
    <div className="mb-4 flex items-start gap-3 rounded-xl border border-acacia/20 bg-acacia-soft p-3">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold text-walnut">{title}</p>
        {showIosHint ? (
          <p className="mt-1 flex flex-wrap items-center gap-1 text-xs font-semibold text-walnut-2">
            Tap <Share size={13} className="inline shrink-0" /> Share, then
            <span className="font-black">Add to Home Screen</span>
          </p>
        ) : (
          <p className="mt-1 text-xs font-semibold text-walnut-2">{subtitle}</p>
        )}
      </div>

      {prompt && (
        <button
          onClick={install}
          className="min-h-[44px] shrink-0 rounded-lg bg-acacia px-4 text-xs font-black text-white"
        >
          Install
        </button>
      )}

      <button
        onClick={close}
        aria-label="Dismiss"
        className="min-h-[44px] min-w-[44px] shrink-0 rounded-lg text-walnut-2 hover:bg-white"
      >
        <X size={16} className="mx-auto" />
      </button>
    </div>
  );
}
