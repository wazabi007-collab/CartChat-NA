"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Check, Loader2, Pencil } from "lucide-react";

/**
 * Inline private note against a customer (e.g. "prefers pickup", "allergic to
 * nuts"). Writes straight to `customers` — RLS restricts the row to the owning
 * merchant, so no API route is needed.
 */
export function CustomerNotes({
  customerId,
  initialNotes,
}: {
  customerId: string;
  initialNotes: string | null;
}) {
  const [notes, setNotes] = useState(initialNotes ?? "");
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState(false);

  async function save() {
    setSaving(true);
    setError(false);
    const supabase = createClient();
    const { error: err } = await supabase
      .from("customers")
      .update({ notes: notes.trim() || null, updated_at: new Date().toISOString() })
      .eq("id", customerId);
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
    return (
      <button
        onClick={() => setEditing(true)}
        className="group flex w-full items-start gap-1.5 text-left text-xs text-slate-600 hover:text-slate-900"
      >
        <span className="flex-1 line-clamp-2">
          {notes || <span className="italic text-slate-400">Add a note…</span>}
        </span>
        {saved ? (
          <Check size={12} className="mt-0.5 shrink-0 text-emerald-600" />
        ) : (
          <Pencil size={12} className="mt-0.5 shrink-0 opacity-0 transition group-hover:opacity-60" />
        )}
      </button>
    );
  }

  return (
    <div className="space-y-1.5">
      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        rows={2}
        autoFocus
        maxLength={500}
        placeholder="Private note — only you can see this"
        className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-xs focus:border-emerald-500 focus:outline-none"
      />
      <div className="flex items-center gap-2">
        <button
          onClick={save}
          disabled={saving}
          className="inline-flex items-center gap-1 rounded-lg bg-slate-900 px-2.5 py-1 text-xs font-bold text-white disabled:opacity-50"
        >
          {saving && <Loader2 size={11} className="animate-spin" />}
          Save
        </button>
        <button
          onClick={() => {
            setNotes(initialNotes ?? "");
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
