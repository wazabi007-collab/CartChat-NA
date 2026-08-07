"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Check, Loader2, Reply } from "lucide-react";

/**
 * Merchant reply to a review.
 *
 * Merchants can reply but deliberately cannot edit or delete the review itself
 * — a store that can erase bad reviews has a rating nobody should trust. Column
 * grants (migration 059) allow UPDATE only on the reply columns, so this is
 * enforced by the database, not just the UI.
 */
export function ReviewReply({
  reviewId,
  initialReply,
}: {
  reviewId: string;
  initialReply: string | null;
}) {
  const [reply, setReply] = useState(initialReply ?? "");
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState(false);

  async function save() {
    setSaving(true);
    setError(false);
    const supabase = createClient();
    const { error: err } = await supabase
      .from("reviews")
      .update({
        merchant_reply: reply.trim() || null,
        merchant_replied_at: reply.trim() ? new Date().toISOString() : null,
      })
      .eq("id", reviewId);
    setSaving(false);
    if (err) {
      setError(true);
      return;
    }
    setEditing(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  if (!editing) {
    return reply ? (
      <div className="rounded-lg border-l-2 border-emerald-300 bg-slate-50 px-3 py-2">
        <p className="text-xs font-bold text-slate-700">Your reply</p>
        <p className="mt-0.5 text-sm leading-6 text-slate-600">{reply}</p>
        <button
          onClick={() => setEditing(true)}
          className="mt-1 text-xs font-bold text-slate-500 hover:text-slate-800"
        >
          Edit reply
        </button>
        {saved && <Check size={12} className="ml-1 inline text-emerald-600" />}
      </div>
    ) : (
      <button
        onClick={() => setEditing(true)}
        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-50"
      >
        <Reply size={13} /> Reply publicly
      </button>
    );
  }

  return (
    <div className="space-y-2">
      <textarea
        value={reply}
        onChange={(e) => setReply(e.target.value)}
        rows={2}
        maxLength={600}
        autoFocus
        placeholder="Thanks for shopping with us! …"
        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
      />
      <div className="flex items-center gap-2">
        <button
          onClick={save}
          disabled={saving}
          className="inline-flex items-center gap-1 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-bold text-white disabled:opacity-50"
        >
          {saving && <Loader2 size={11} className="animate-spin" />} Post reply
        </button>
        <button
          onClick={() => {
            setReply(initialReply ?? "");
            setEditing(false);
            setError(false);
          }}
          className="text-xs font-semibold text-slate-500 hover:text-slate-700"
        >
          Cancel
        </button>
        {error && <span className="text-xs text-red-600">Couldn&apos;t save</span>}
      </div>
    </div>
  );
}
