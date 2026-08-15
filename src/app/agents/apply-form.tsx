"use client";

import { useState } from "react";
import Link from "next/link";

const input =
  "w-full rounded-xl border border-border-warm bg-white px-3 py-2.5 text-sm text-walnut placeholder-walnut-2/60 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-acacia";

export function AgentApplyForm() {
  const [form, setForm] = useState({
    name: "",
    whatsapp: "",
    email: "",
    payoutNumber: "",
    preferredCode: "",
  });
  const [accepted, setAccepted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState<{ code: string; already?: boolean; status?: string } | null>(null);

  function set<K extends keyof typeof form>(key: K, value: string) {
    setForm((p) => ({ ...p, [key]: value }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setError("");
    setBusy(true);
    try {
      const res = await fetch("/api/agents/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, acceptedTerms: accepted }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Something went wrong — please try again.");
        return;
      }
      setDone({ code: data.code, already: data.already, status: data.status });
    } catch {
      setError("Network problem — please try again.");
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <div className="mt-4 rounded-xl border border-green-200 bg-green-50 p-4 text-sm leading-6 text-green-900">
        {done.already ? (
          done.status === "active" ? (
            <p>
              You&apos;re already an approved agent! Your link is{" "}
              <b>oshicart.com/r/{done.code}</b> — start sharing it, and track
              what it earns in your{" "}
              <Link href="/agents/dashboard" className="font-bold underline">
                agent dashboard
              </Link>
              .
            </p>
          ) : (
            <p>
              We already have your application — it&apos;s still being
              reviewed. We&apos;ll reply on WhatsApp soon.
            </p>
          )
        ) : (
          <p>
            <b>Application received!</b> If approved, your personal link will
            be <b>oshicart.com/r/{done.code}</b>. We&apos;ll confirm on
            WhatsApp — usually within a day. Meanwhile, practise on the{" "}
            <Link href="/s/oshicart-demo" className="font-bold underline">
              demo store
            </Link>{" "}
            and read the{" "}
            {/* Plain <a>: the PDF is a static asset, and <Link> made Next
                RSC-prefetch it as if it were a route, logging a 404. */}
            <a href="/oshicart-referral-agent-handbook.pdf" className="font-bold underline">
              agent handbook
            </a>
            .
          </p>
        )}
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="mt-4 space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <input
          value={form.name}
          onChange={(e) => set("name", e.target.value)}
          placeholder="Full name *"
          required
          className={input}
        />
        <input
          value={form.whatsapp}
          onChange={(e) => set("whatsapp", e.target.value)}
          placeholder="WhatsApp number * (e.g. +264 81 234 5678)"
          required
          className={input}
        />
        <input
          value={form.email}
          onChange={(e) => set("email", e.target.value)}
          type="email"
          placeholder="Email (optional)"
          className={input}
        />
        <input
          value={form.preferredCode}
          onChange={(e) => set("preferredCode", e.target.value)}
          placeholder="Preferred code (optional, e.g. maria)"
          className={input}
        />
      </div>
      <input
        value={form.payoutNumber}
        onChange={(e) => set("payoutNumber", e.target.value)}
        placeholder="Bank account for payouts (optional — you can send it later)"
        className={input}
      />

      <label className="flex items-start gap-2.5 rounded-xl border border-border-warm bg-sand-2 p-3 text-sm leading-6 text-walnut">
        <input
          type="checkbox"
          checked={accepted}
          onChange={(e) => setAccepted(e.target.checked)}
          required
          className="mt-1.5 h-4 w-4 accent-[#159947]"
        />
        <span>
          I have read and accept the{" "}
          <Link href="/agents/terms" target="_blank" className="font-bold text-terracotta underline">
            Agent Rules &amp; Regulations
          </Link>
          , including that bounties are one-time, paid by EFT after the
          merchant&apos;s first paid month, and forfeited for fake or
          self-referred stores.
        </span>
      </label>

      {error && <p className="text-sm font-bold text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={busy || !accepted}
        className="min-h-12 w-full rounded-xl bg-acacia text-sm font-black text-white transition-colors hover:bg-green-700 disabled:opacity-50"
      >
        {busy ? "Sending…" : "Send my application"}
      </button>
    </form>
  );
}
