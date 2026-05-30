"use client";

import { useState } from "react";
import { Megaphone, Send, Users } from "lucide-react";

const AUDIENCES = [
  { value: "active", label: "Active stores" },
  { value: "trial", label: "Trial merchants" },
  { value: "paid", label: "Paid merchants" },
  { value: "expiring_soon", label: "Expiring soon" },
  { value: "all", label: "All merchants" },
] as const;

const TEMPLATES = [
  { value: "merchant_platform_update", label: "Platform update" },
  { value: "merchant_maintenance_notice", label: "Maintenance notice" },
] as const;

interface PreviewState {
  count: number;
  sample: Array<{ store_name: string; whatsapp_number: string | null }>;
}

export default function AdminAnnouncementsPage() {
  const [audience, setAudience] = useState<(typeof AUDIENCES)[number]["value"]>("active");
  const [templateName, setTemplateName] = useState<(typeof TEMPLATES)[number]["value"]>("merchant_platform_update");
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [preview, setPreview] = useState<PreviewState | null>(null);
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);

  async function previewAudience() {
    setLoading(true);
    setStatus("");
    try {
      const res = await fetch("/api/admin/merchant-announcements/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ audience }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Preview failed");
      setPreview(data);
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Preview failed");
    } finally {
      setLoading(false);
    }
  }

  async function sendAnnouncement() {
    if (!title.trim() || !message.trim()) {
      setStatus("Title and message are required.");
      return;
    }

    const confirmed = window.confirm(
      `Send this WhatsApp announcement to ${preview?.count ?? "the selected"} merchants?`
    );
    if (!confirmed) return;

    setLoading(true);
    setStatus("");
    try {
      const res = await fetch("/api/admin/merchant-announcements/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          message: message.trim(),
          audience,
          template_name: templateName,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Send failed");
      setStatus(`Sent ${data.sent} messages. Failed: ${data.failed}.`);
      setPreview(null);
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Send failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-black uppercase tracking-[0.18em] text-emerald-600">
          Merchant WhatsApp
        </p>
        <h1 className="mt-2 text-2xl font-black text-slate-950">Announcements</h1>
        <p className="mt-1 max-w-2xl text-sm text-slate-500">
          Send approved platform and service updates to merchant WhatsApp numbers.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="mb-5 flex items-center gap-2">
            <Megaphone className="text-emerald-600" size={20} />
            <h2 className="text-lg font-bold text-slate-900">Message</h2>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-1.5">
              <span className="text-sm font-bold text-slate-700">Audience</span>
              <select
                value={audience}
                onChange={(e) => {
                  setAudience(e.target.value as typeof audience);
                  setPreview(null);
                }}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500"
              >
                {AUDIENCES.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-1.5">
              <span className="text-sm font-bold text-slate-700">Template</span>
              <select
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value as typeof templateName)}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500"
              >
                {TEMPLATES.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label className="mt-4 block space-y-1.5">
            <span className="text-sm font-bold text-slate-700">Title</span>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={120}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500"
              placeholder="New OshiCart update"
            />
          </label>

          <label className="mt-4 block space-y-1.5">
            <span className="text-sm font-bold text-slate-700">Message</span>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              maxLength={800}
              rows={7}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500"
              placeholder="Write a concise service update for merchants."
            />
          </label>

          {status && (
            <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
              {status}
            </div>
          )}

          <div className="mt-5 flex flex-wrap gap-3">
            <button
              onClick={previewAudience}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              <Users size={16} />
              Preview Audience
            </button>
            <button
              onClick={sendAnnouncement}
              disabled={loading || !preview}
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              <Send size={16} />
              Send WhatsApp
            </button>
          </div>
        </div>

        <aside className="rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="text-lg font-bold text-slate-900">Audience Preview</h2>
          {preview ? (
            <div className="mt-4">
              <p className="text-3xl font-black text-slate-950">{preview.count}</p>
              <p className="text-sm text-slate-500">merchant recipients</p>
              <div className="mt-4 space-y-2">
                {preview.sample.map((item) => (
                  <div key={`${item.store_name}-${item.whatsapp_number}`} className="rounded-lg bg-slate-50 px-3 py-2">
                    <p className="text-sm font-bold text-slate-800">{item.store_name}</p>
                    <p className="text-xs text-slate-500">{item.whatsapp_number}</p>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="mt-3 text-sm text-slate-500">
              Preview the audience before sending. Sending is disabled until a preview is loaded.
            </p>
          )}
        </aside>
      </div>
    </div>
  );
}
