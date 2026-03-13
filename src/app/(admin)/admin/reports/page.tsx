import { createServiceClient } from "@/lib/supabase/service";
import { ReportActions } from "./report-actions";

export default async function AdminReportsPage() {
  const supabase = createServiceClient();

  const { data: reports } = await supabase
    .from("reports")
    .select("*, merchants(store_name, store_slug, store_status)")
    .order("created_at", { ascending: false });

  const reportList = reports || [];
  const openReports = reportList.filter((r) => r.status === "open");
  const resolvedReports = reportList.filter((r) => r.status !== "open");

  return (
    <div className="md:ml-56">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Store Reports</h1>

      {/* Open reports */}
      <h2 className="text-lg font-semibold text-gray-900 mb-3">
        Open Reports ({openReports.length})
      </h2>
      {openReports.length === 0 ? (
        <div className="bg-white rounded-lg border p-6 text-center text-gray-500 mb-8">
          No open reports.
        </div>
      ) : (
        <div className="space-y-3 mb-8">
          {openReports.map((report) => (
            <ReportCard key={report.id} report={report} />
          ))}
        </div>
      )}

      {/* Resolved reports */}
      {resolvedReports.length > 0 && (
        <>
          <h2 className="text-lg font-semibold text-gray-900 mb-3">
            Resolved ({resolvedReports.length})
          </h2>
          <div className="space-y-3">
            {resolvedReports.map((report) => (
              <ReportCard key={report.id} report={report} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

interface ReportData {
  id: string;
  merchant_id: string;
  reason: string;
  details: string | null;
  reporter_name: string | null;
  reporter_contact: string | null;
  status: string;
  admin_notes: string | null;
  created_at: string;
  merchants: { store_name: string; store_slug: string; store_status: string } | null;
}

function ReportCard({ report }: { report: ReportData }) {
  const date = new Date(report.created_at).toLocaleDateString("en-NA", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const statusColors: Record<string, string> = {
    open: "bg-red-100 text-red-800",
    reviewed: "bg-green-100 text-green-800",
    dismissed: "bg-gray-100 text-gray-600",
  };

  return (
    <div className="bg-white rounded-lg border p-4">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColors[report.status] || ""}`}>
              {report.status}
            </span>
            <span className="text-xs text-gray-400">{date}</span>
          </div>
          <p className="font-medium text-gray-900 mb-1">
            Store: {report.merchants?.store_name || "Unknown"}{" "}
            <span className="text-xs text-gray-400">(/s/{report.merchants?.store_slug})</span>
          </p>
          <p className="text-sm text-gray-700">
            <span className="font-medium">Reason:</span> {report.reason}
          </p>
          {report.details && (
            <p className="text-sm text-gray-600 mt-1">{report.details}</p>
          )}
          {report.reporter_name && (
            <p className="text-xs text-gray-400 mt-1">
              Reported by: {report.reporter_name}
              {report.reporter_contact && ` (${report.reporter_contact})`}
            </p>
          )}
          {report.admin_notes && (
            <p className="text-xs text-blue-600 mt-1 bg-blue-50 rounded px-2 py-1">
              Admin: {report.admin_notes}
            </p>
          )}
        </div>
        {report.status === "open" && (
          <ReportActions reportId={report.id} merchantId={report.merchant_id} />
        )}
      </div>
    </div>
  );
}
