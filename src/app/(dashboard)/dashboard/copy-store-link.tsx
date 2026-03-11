"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";

export function CopyStoreLink({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for browsers that block clipboard without HTTPS
      const el = document.createElement("textarea");
      el.value = url;
      el.setAttribute("readonly", "");
      el.style.position = "absolute";
      el.style.left = "-9999px";
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  return (
    <span className="inline-flex items-center gap-1.5 min-w-0">
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        data-testid="store-share-link"
        className="text-green-600 hover:underline truncate text-sm"
      >
        {url}
      </a>
      <button
        onClick={handleCopy}
        data-testid="copy-store-link-btn"
        aria-label="Copy store link"
        className="flex-shrink-0 p-1 rounded text-gray-400 hover:text-green-600 hover:bg-gray-100 transition-colors"
        title="Copy link"
      >
        {copied ? (
          <Check className="w-4 h-4 text-green-600" />
        ) : (
          <Copy className="w-4 h-4" />
        )}
      </button>
      {copied && (
        <span className="text-xs text-green-600 flex-shrink-0">Copied!</span>
      )}
    </span>
  );
}
