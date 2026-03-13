"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Admin {
  id: string;
  email: string;
  role: string;
  created_at: string;
}

const ROLES = ["super_admin", "support", "finance"] as const;
const ROLE_LABELS: Record<string, string> = {
  super_admin: "Super Admin",
  support: "Support",
  finance: "Finance",
};

export function TeamActions({ admins }: { admins: Admin[] }) {
  const router = useRouter();
  const [showInvite, setShowInvite] = useState(false);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<string>("support");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await fetch("/api/admin/team", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, role }),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Failed to invite admin");
      setLoading(false);
      return;
    }

    setShowInvite(false);
    setEmail("");
    router.refresh();
    setLoading(false);
  }

  async function handleChangeRole(adminId: string, newRole: string) {
    const res = await fetch("/api/admin/team", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ adminId, role: newRole }),
    });
    if (res.ok) router.refresh();
    else {
      const data = await res.json();
      alert(data.error || "Failed to update role");
    }
  }

  async function handleRemove(adminId: string, adminEmail: string) {
    if (!confirm(`Remove ${adminEmail} from admin team?`)) return;

    const res = await fetch("/api/admin/team", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ adminId }),
    });
    if (res.ok) router.refresh();
    else {
      const data = await res.json();
      alert(data.error || "Failed to remove admin");
    }
  }

  return (
    <div>
      <div className="flex justify-end mb-4">
        <button
          onClick={() => setShowInvite(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
        >
          Invite Admin
        </button>
      </div>

      {showInvite && (
        <div className="bg-white border rounded-lg p-6 mb-6">
          <h3 className="font-semibold mb-4">Invite New Admin</h3>
          <form onSubmit={handleInvite} className="flex flex-wrap gap-3 items-end">
            <div className="flex-1 min-w-[200px]">
              <label className="block text-sm text-gray-700 mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="user@example.com"
                className="w-full border rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-700 mb-1">Role</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="border rounded-lg px-3 py-2 text-sm"
              >
                {ROLES.map((r) => (
                  <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                ))}
              </select>
            </div>
            <button type="submit" disabled={loading} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm disabled:opacity-50">
              {loading ? "Inviting..." : "Invite"}
            </button>
            <button type="button" onClick={() => setShowInvite(false)} className="px-4 py-2 border rounded-lg text-sm">
              Cancel
            </button>
          </form>
          {error && <p className="text-sm text-red-600 mt-2">{error}</p>}
        </div>
      )}

      <div className="bg-white border rounded-lg overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-gray-500">Email</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">Role</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">Added</th>
              <th className="px-4 py-3 text-right font-medium text-gray-500">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {admins.map((admin) => (
              <tr key={admin.id}>
                <td className="px-4 py-3">{admin.email}</td>
                <td className="px-4 py-3">
                  <select
                    value={admin.role}
                    onChange={(e) => handleChangeRole(admin.id, e.target.value)}
                    className="border rounded px-2 py-1 text-sm"
                  >
                    {ROLES.map((r) => (
                      <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                    ))}
                  </select>
                </td>
                <td className="px-4 py-3 text-xs text-gray-500">
                  {(() => { const d = new Date(admin.created_at); return `${d.getUTCDate().toString().padStart(2, "0")}/${(d.getUTCMonth() + 1).toString().padStart(2, "0")}/${d.getUTCFullYear()}`; })()}
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    onClick={() => handleRemove(admin.id, admin.email)}
                    className="text-red-600 hover:text-red-800 text-sm"
                  >
                    Remove
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
