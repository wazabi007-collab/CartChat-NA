"use client";

import { useState } from "react";
import { Store, Loader2 } from "lucide-react";

interface Props {
  /** The agent's existing store, if they have one at all. */
  existingSlug: string | null;
  /** True when that store is a practice store rather than a real business. */
  existingIsPractice: boolean;
}

/**
 * The agent's own store to rehearse in.
 *
 * Rehearsing on the shared demo storefront only ever showed the customer
 * half. The automated WhatsApp messages — the thing an agent is really
 * selling — fire when a MERCHANT advances an order, so an agent who owns no
 * store never saw one. Here they own the store: they order from it, then move
 * the order along in their own dashboard, and the message arrives on their
 * own phone.
 */
export function PracticeStoreCard({ existingSlug, existingIsPractice }: Props) {
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const [slug, setSlug] = useState(existingSlug);
  const [isPractice, setIsPractice] = useState(existingIsPractice);

  async function create() {
    setCreating(true);
    setError("");
    const res = await fetch("/api/agents/practice-store", { method: "POST" });
    const data = await res.json();
    setCreating(false);
    if (!res.ok || !data.ok) {
      setError(data.error ?? "Could not create it. Try again in a moment.");
      return;
    }
    setSlug(data.storeSlug);
    setIsPractice(data.isPractice ?? true);
  }

  // An agent who already sells on OshiCart has their own real store, and one
  // login can only own one — they already know how the product works.
  if (slug && !isPractice) {
    return (
      <div className="mt-8 rounded-2xl border border-border-warm bg-white p-5 shadow-sm">
        <h2 className="flex items-center gap-2 text-sm font-black uppercase tracking-wide text-walnut-2">
          <Store size={16} className="text-acacia" />
          Practice store
        </h2>
        <p className="mt-2 text-sm leading-6 text-walnut-2">
          You already run your own OshiCart store, so you have the real thing to
          demonstrate — no practice store needed.
        </p>
        <a
          href="/dashboard"
          className="mt-3 inline-flex min-h-11 items-center rounded-xl border border-border-warm bg-white px-5 text-sm font-black text-walnut hover:bg-sand-2"
        >
          Open my dashboard
        </a>
      </div>
    );
  }

  return (
    <div className="mt-8 rounded-2xl border border-border-warm bg-white p-5 shadow-sm">
      <h2 className="flex items-center gap-2 text-sm font-black uppercase tracking-wide text-walnut-2">
        <Store size={16} className="text-acacia" />
        Practice store
      </h2>

      {slug ? (
        <>
          <p className="mt-2 text-sm leading-6 text-walnut-2">
            Your practice store is ready, with one product, one service and one
            hire already in it. Order something from the shop link, then move
            that order along in your dashboard — the WhatsApp arrives on your
            own phone, which is exactly what you are showing a shop owner.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <a
              href={`/s/${slug}`}
              className="inline-flex min-h-11 items-center rounded-xl bg-acacia px-5 text-sm font-black text-white transition-colors hover:bg-green-700"
            >
              Open my shop link
            </a>
            <a
              href="/dashboard"
              className="inline-flex min-h-11 items-center rounded-xl border border-border-warm bg-white px-5 text-sm font-black text-walnut hover:bg-sand-2"
            >
              Open my dashboard
            </a>
          </div>
          <p className="mt-3 text-xs leading-5 text-walnut-2">
            Nobody can find this store in Browse Stores, and no automatic
            messages go to the customers you invent in it. Practice orders are
            cleared after 30 days.
          </p>
        </>
      ) : (
        <>
          <p className="mt-2 text-sm leading-6 text-walnut-2">
            A shop of your own to rehearse in. Order from it as a customer, then
            move the order along as the shop owner and watch the WhatsApp land
            on your phone — that is the part that sells OshiCart.
          </p>
          <button
            onClick={create}
            disabled={creating}
            className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-xl bg-acacia px-5 text-sm font-black text-white transition-colors hover:bg-green-700 disabled:opacity-50"
          >
            {creating && <Loader2 size={16} className="animate-spin" />}
            {creating ? "Setting it up…" : "Create my practice store"}
          </button>
          {error && (
            <p className="mt-2 text-sm font-semibold text-red-600">{error}</p>
          )}
        </>
      )}
    </div>
  );
}
