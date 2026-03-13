import { createServiceClient } from "@/lib/supabase/service";

export default async function AuditLogPage() {
  const service = createServiceClient();

  const { data: actions } = await service
    .from("admin_actions")
    .select("*, admin_users(email)")
    .order("created_at", { ascending: false })
    .limit(200);

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Audit Log</h1>

      <div className="bg-white border rounded-lg overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-gray-500">Admin</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">Action</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">Target</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">Details</th>
              <th className="px-4 py-3 text-left font-medium text-gray-500">Time</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {(actions || []).map((a: Record<string, unknown>) => {
              const adminInfo = a.admin_users as Record<string, unknown> | null;
              return (
                <tr key={a.id as string} className="hover:bg-gray-50">
                  <td className="px-4 py-3">{(adminInfo?.email as string) || "System"}</td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-0.5 bg-gray-100 rounded text-xs font-mono">
                      {a.action as string}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">
                    {a.target_type as string}: {(a.target_id as string).slice(0, 8)}...
                  </td>
                  <td className="px-4 py-3">
                    {a.details ? (
                      <details className="text-xs">
                        <summary className="cursor-pointer text-gray-500 hover:text-gray-700">View</summary>
                        <pre className="mt-1 text-gray-400 overflow-x-auto max-w-xs">
                          {JSON.stringify(a.details, null, 2)}
                        </pre>
                      </details>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                    {new Date(a.created_at as string).toLocaleString()}
                  </td>
                </tr>
              );
            })}
            {(actions || []).length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-gray-500">No admin actions recorded yet</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
