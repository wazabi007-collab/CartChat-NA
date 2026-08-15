"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { copyToClipboard } from "@/lib/clipboard";
import { WhatsAppIcon } from "@/components/whatsapp-icon";

/**
 * The agent's referral link, ready to paste.
 *
 * `url` arrives already built from SITE_URL so the copied link is the real
 * public one — an agent pasting a localhost link into a WhatsApp pitch is a
 * lost signup.
 */
export function ShareLinkCard({ code, url }: { code: string; url: string }) {
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedPitch, setCopiedPitch] = useState(false);

  async function copy(text: string, setter: (v: boolean) => void) {
    await copyToClipboard(text);
    setter(true);
    setTimeout(() => setter(false), 2000);
  }

  const pitch = `Put your business online with OshiCart — your own store link, orders straight to WhatsApp, no commission on your sales.\n\nSign up here: ${url}`;

  return (
    <div className="mt-8 rounded-2xl border border-border-warm bg-white p-5 shadow-sm">
      <h2 className="text-sm font-black uppercase tracking-wide text-walnut-2">
        Your referral link
      </h2>
      <p className="mt-1 text-sm text-walnut-2">
        Every store that signs up through this link is credited to your code{" "}
        <span className="font-black text-walnut">{code}</span>.
      </p>

      <div className="mt-3 flex flex-col gap-2 rounded-xl border border-border-warm bg-sand-2 px-3 py-2.5 sm:flex-row sm:items-center">
        <span className="flex-1 truncate text-sm font-bold text-walnut">{url}</span>
        <button
          type="button"
          onClick={() => copy(url, setCopiedLink)}
          className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl bg-acacia px-4 text-sm font-black text-white transition-colors hover:bg-green-700"
        >
          {copiedLink ? <Check size={14} /> : <Copy size={14} />}
          {copiedLink ? "Copied!" : "Copy link"}
        </button>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <a
          href={`https://wa.me/?text=${encodeURIComponent(pitch)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-border-warm bg-white px-4 text-sm font-black text-walnut transition-colors hover:bg-sand-2"
        >
          <WhatsAppIcon size={15} />
          Send on WhatsApp
        </a>
        <button
          type="button"
          onClick={() => copy(pitch, setCopiedPitch)}
          className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-border-warm bg-white px-4 text-sm font-black text-walnut transition-colors hover:bg-sand-2"
        >
          {copiedPitch ? <Check size={15} className="text-acacia" /> : <Copy size={15} />}
          {copiedPitch ? "Pitch copied!" : "Copy pitch message"}
        </button>
      </div>
    </div>
  );
}
