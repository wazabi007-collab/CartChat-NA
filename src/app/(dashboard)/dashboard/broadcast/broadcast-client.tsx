"use client";

import { useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { whatsappLink } from "@/lib/utils";
import { card, sectionHeading, helperText, inputBase, textareaBase, focusGreen, btnPrimaryGreen } from "@/lib/ui";
import {
  Check,
  Loader2,
  Megaphone,
  Pencil,
  Plus,
  Trash2,
  Users,
} from "lucide-react";
import type { BroadcastCustomer, BroadcastTemplate } from "./page";
import { WhatsAppIcon } from "@/components/whatsapp-icon";

type Audience = "all" | "repeat" | "recent";

const AUDIENCES: { value: Audience; label: string; hint: string }[] = [
  { value: "all", label: "All customers", hint: "Everyone who has ordered" },
  { value: "repeat", label: "Repeat buyers", hint: "2 or more orders" },
  { value: "recent", label: "Recent buyers", hint: "Ordered in the last 90 days" },
];

/** Replace the placeholders a merchant can use in a template. */
function renderMessage(
  body: string,
  vars: { name: string; store: string; link: string; address: string }
) {
  return body
    .replace(/\{name\}/g, vars.name)
    .replace(/\{store\}/g, vars.store)
    .replace(/\{link\}/g, vars.link)
    .replace(/\{address\}/g, vars.address);
}

export function BroadcastClient({
  merchantId,
  storeName,
  storeUrl,
  pickupAddress,
  customers,
  templates: initialTemplates,
  recentlyMessagedIds,
}: {
  merchantId: string;
  storeName: string;
  storeUrl: string;
  pickupAddress: string | null;
  customers: BroadcastCustomer[];
  templates: BroadcastTemplate[];
  recentlyMessagedIds: string[];
}) {
  const [templates, setTemplates] = useState(initialTemplates);
  const [selectedId, setSelectedId] = useState(initialTemplates[0]?.id ?? "");
  const [audience, setAudience] = useState<Audience>("all");
  const [sentIds, setSentIds] = useState<Set<string>>(new Set());
  const [skipRecent, setSkipRecent] = useState(true);

  // Template editor
  const [editing, setEditing] = useState<BroadcastTemplate | "new" | null>(null);
  const [draftName, setDraftName] = useState("");
  const [draftBody, setDraftBody] = useState("");
  const [saving, setSaving] = useState(false);

  const selected = templates.find((t) => t.id === selectedId) ?? templates[0];
  const recentlyMessaged = useMemo(() => new Set(recentlyMessagedIds), [recentlyMessagedIds]);

  const audienceList = useMemo(() => {
    const ninetyDaysAgo = Date.now() - 90 * 24 * 60 * 60 * 1000;
    return customers
      // Never message someone who has asked not to be marketed to.
      .filter((c) => !c.marketing_opt_out)
      .filter((c) => {
        if (audience === "repeat") return c.completed_orders >= 2;
        if (audience === "recent") {
          return !!c.last_order_at && new Date(c.last_order_at).getTime() >= ninetyDaysAgo;
        }
        return true;
      })
      .filter((c) => (skipRecent ? !recentlyMessaged.has(c.id) : true));
  }, [customers, audience, skipRecent, recentlyMessaged]);

  const optedOutCount = customers.filter((c) => c.marketing_opt_out).length;

  function messageFor(c: BroadcastCustomer) {
    return renderMessage(selected?.body ?? "", {
      name: (c.name || "there").split(" ")[0],
      store: storeName,
      link: storeUrl,
      address: pickupAddress || storeUrl,
    });
  }

  /** Opens the merchant's own WhatsApp with the message pre-filled, then logs it. */
  async function handleSend(c: BroadcastCustomer) {
    window.open(whatsappLink(c.whatsapp, messageFor(c)), "_blank", "noopener");
    setSentIds((prev) => new Set(prev).add(c.id));
    const supabase = createClient();
    await supabase.from("broadcast_sends").insert({
      merchant_id: merchantId,
      customer_id: c.id,
      template_id: selected?.id ?? null,
    });
  }

  async function saveTemplate() {
    if (!draftName.trim() || !draftBody.trim()) return;
    setSaving(true);
    const supabase = createClient();
    if (editing === "new") {
      const { data } = await supabase
        .from("broadcast_templates")
        .insert({ merchant_id: merchantId, name: draftName.trim(), body: draftBody.trim() })
        .select("id, merchant_id, name, body")
        .single();
      if (data) {
        setTemplates((t) => [...t, data as BroadcastTemplate]);
        setSelectedId(data.id);
      }
    } else if (editing) {
      const { data } = await supabase
        .from("broadcast_templates")
        .update({ name: draftName.trim(), body: draftBody.trim(), updated_at: new Date().toISOString() })
        .eq("id", editing.id)
        .select("id, merchant_id, name, body")
        .single();
      if (data) {
        setTemplates((t) => t.map((x) => (x.id === data.id ? (data as BroadcastTemplate) : x)));
      }
    }
    setSaving(false);
    setEditing(null);
  }

  async function deleteTemplate(t: BroadcastTemplate) {
    if (!window.confirm(`Delete the template "${t.name}"?`)) return;
    const supabase = createClient();
    await supabase.from("broadcast_templates").delete().eq("id", t.id);
    setTemplates((prev) => prev.filter((x) => x.id !== t.id));
    if (selectedId === t.id) setSelectedId(templates[0]?.id ?? "");
  }

  return (
    <div className="md:ml-56 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Broadcast</h1>
        <p className="mt-1 text-sm text-gray-500">
          Message your customers from <b>your own WhatsApp</b>. Pick a message, choose who to send
          it to, then tap each customer — WhatsApp opens with the message ready to send.
        </p>
      </div>

      {/* 1. Message */}
      <section className={`${card} space-y-3`}>
        <div className="flex items-center justify-between gap-3">
          <h2 className={sectionHeading}>1. Choose your message</h2>
          <button
            onClick={() => {
              setEditing("new");
              setDraftName("");
              setDraftBody("Hi {name}! ");
            }}
            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50"
          >
            <Plus size={13} /> New message
          </button>
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
          {templates.map((t) => (
            <label
              key={t.id}
              className={`flex cursor-pointer items-start gap-2 rounded-xl border p-3 transition ${
                selected?.id === t.id
                  ? "border-emerald-500 bg-emerald-50/50"
                  : "border-slate-200 hover:border-slate-300"
              }`}
            >
              <input
                type="radio"
                name="template"
                checked={selected?.id === t.id}
                onChange={() => setSelectedId(t.id)}
                className="mt-1"
              />
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-1.5">
                  <span className="text-sm font-bold text-slate-900">{t.name}</span>
                  {t.merchant_id === null && (
                    <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-black text-slate-500">
                      SAMPLE
                    </span>
                  )}
                </span>
                <span className="mt-0.5 block text-xs leading-5 text-slate-600">{t.body}</span>
                {t.merchant_id !== null && (
                  <span className="mt-1.5 flex gap-2">
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        setEditing(t);
                        setDraftName(t.name);
                        setDraftBody(t.body);
                      }}
                      className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-500 hover:text-slate-800"
                    >
                      <Pencil size={11} /> Edit
                    </button>
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        deleteTemplate(t);
                      }}
                      className="inline-flex items-center gap-1 text-[11px] font-bold text-red-500 hover:text-red-700"
                    >
                      <Trash2 size={11} /> Delete
                    </button>
                  </span>
                )}
              </span>
            </label>
          ))}
        </div>

        {editing && (
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-2">
            <input
              value={draftName}
              onChange={(e) => setDraftName(e.target.value)}
              placeholder="Message name (e.g. December promo)"
              className={`${inputBase} ${focusGreen}`}
            />
            <textarea
              value={draftBody}
              onChange={(e) => setDraftBody(e.target.value)}
              rows={3}
              maxLength={900}
              placeholder="Hi {name}! ..."
              className={`${textareaBase} ${focusGreen}`}
            />
            <p className={helperText}>
              Use <b>{"{name}"}</b> for the customer&apos;s first name, <b>{"{store}"}</b> for your
              store name, <b>{"{link}"}</b> for your store link, and <b>{"{address}"}</b> for your
              pickup address.
            </p>
            <div className="flex gap-2">
              <button
                onClick={saveTemplate}
                disabled={saving || !draftName.trim() || !draftBody.trim()}
                className="inline-flex items-center gap-1 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-bold text-white disabled:opacity-50"
              >
                {saving && <Loader2 size={12} className="animate-spin" />} Save
              </button>
              <button
                onClick={() => setEditing(null)}
                className="text-xs font-semibold text-slate-500 hover:text-slate-700"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </section>

      {/* 2. Audience */}
      <section className={`${card} space-y-3`}>
        <h2 className={sectionHeading}>2. Choose who gets it</h2>
        <div className="grid gap-2 sm:grid-cols-3">
          {AUDIENCES.map((a) => (
            <label
              key={a.value}
              className={`cursor-pointer rounded-xl border p-3 transition ${
                audience === a.value
                  ? "border-emerald-500 bg-emerald-50/50"
                  : "border-slate-200 hover:border-slate-300"
              }`}
            >
              <span className="flex items-center gap-2">
                <input
                  type="radio"
                  name="audience"
                  checked={audience === a.value}
                  onChange={() => setAudience(a.value)}
                />
                <span className="text-sm font-bold text-slate-900">{a.label}</span>
              </span>
              <span className="mt-0.5 block pl-6 text-xs text-slate-500">{a.hint}</span>
            </label>
          ))}
        </div>

        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={skipRecent}
            onChange={(e) => setSkipRecent(e.target.checked)}
            className="h-4 w-4 rounded text-emerald-600 focus:ring-emerald-500"
          />
          Skip anyone I&apos;ve already messaged in the last 30 days
        </label>

        <div className="flex flex-wrap items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-sm">
          <Users size={15} className="text-slate-500" />
          <span className="font-bold text-slate-900">{audienceList.length}</span>
          <span className="text-slate-600">
            customer{audienceList.length === 1 ? "" : "s"} will receive this
          </span>
          {optedOutCount > 0 && (
            <span className="text-xs text-slate-500">
              · {optedOutCount} opted out and {optedOutCount === 1 ? "is" : "are"} excluded
            </span>
          )}
        </div>
      </section>

      {/* 3. Send */}
      <section className={`${card} space-y-3`}>
        <div className="flex items-center justify-between gap-3">
          <h2 className={sectionHeading}>3. Send them</h2>
          <span className="text-xs font-bold text-slate-500">
            {sentIds.size} of {audienceList.length} sent
          </span>
        </div>

        {audienceList.length === 0 ? (
          <div className="py-8 text-center">
            <Megaphone size={28} className="mx-auto text-slate-300" />
            <p className="mt-2 font-semibold text-slate-700">Nobody to message right now</p>
            <p className="mt-1 text-sm text-slate-500">
              Try a wider audience, or untick the 30-day filter.
            </p>
          </div>
        ) : (
          <>
            <p className={helperText}>
              Tapping a customer opens WhatsApp with the message already typed — you just press
              send. Nothing is sent automatically.
            </p>
            <div className="divide-y divide-slate-100">
              {audienceList.map((c) => {
                const done = sentIds.has(c.id);
                return (
                  <div key={c.id} className="flex items-center gap-3 py-2.5">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-slate-900">
                        {c.name || "Unnamed customer"}
                      </p>
                      <p className="truncate text-xs text-slate-500">{c.whatsapp}</p>
                    </div>
                    <button
                      onClick={() => handleSend(c)}
                      className={`inline-flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                        done
                          ? "bg-slate-100 text-slate-500"
                          : "bg-emerald-600 text-white hover:bg-emerald-700"
                      }`}
                    >
                      {done ? <Check size={13} /> : <WhatsAppIcon size={13} />}
                      {done ? "Sent" : "Send"}
                    </button>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </section>

      {/* Preview */}
      {selected && audienceList[0] && (
        <section className={`${card} space-y-2`}>
          <h2 className={sectionHeading}>Preview</h2>
          <div className="rounded-2xl rounded-tl-sm bg-emerald-50 p-3 text-sm leading-6 text-slate-800">
            {messageFor(audienceList[0])}
          </div>
          <p className={helperText}>
            This is how it will look to {audienceList[0].name || "your first customer"}.
          </p>
        </section>
      )}

      <button
        type="button"
        onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
        className={`${btnPrimaryGreen} w-full sm:hidden`}
      >
        Back to top
      </button>
    </div>
  );
}
