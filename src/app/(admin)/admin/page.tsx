import { createServiceClient } from "@/lib/supabase/service";
import { Store, Flag, Clock, CheckCircle } from "lucide-react";
import Link from "next/link";

export default async function AdminDashboardPage() {
  const supabase = createServiceClient();

  const [merchantsResult, pendingResult, reportsResult, activeResult] = await Promise.all([
    supabase.from("merchants").select("id", { count: "exact", head: true }),
    supabase.from("merchants").select("id", { count: "exact", head: true }).eq("store_status", "pending"),
    supabase.from("reports").select("id", { count: "exact", head: true }).eq("status", "open"),
    supabase.from("merchants").select("id", { count: "exact", head: true }).eq("store_status", "active"),
  ]);

  const totalMerchants = merchantsResult.count || 0;
  const pendingStores = pendingResult.count || 0;
  const openReports = reportsResult.count || 0;
  const activeStores = activeResult.count || 0;

  return (
    <div className="md:ml-56">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Admin Dashboard</h1>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          icon={<Store size={20} className="text-blue-600" />}
          label="Total Stores"
          value={totalMerchants.toString()}
        />
        <StatCard
          icon={<Clock size={20} className="text-yellow-600" />}
          label="Pending Review"
          value={pendingStores.toString()}
          highlight={pendingStores > 0}
        />
        <StatCard
          icon={<CheckCircle size={20} className="text-green-600" />}
          label="Active Stores"
          value={activeStores.toString()}
        />
        <StatCard
          icon={<Flag size={20} className="text-red-600" />}
          label="Open Reports"
          value={openReports.toString()}
          highlight={openReports > 0}
        />
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {pendingStores > 0 && (
          <Link
            href="/admin/stores?status=pending"
            className="bg-yellow-50 border border-yellow-200 rounded-lg p-5 hover:shadow-sm transition-shadow"
          >
            <p className="font-semibold text-gray-900">
              {pendingStores} store{pendingStores > 1 ? "s" : ""} awaiting review
            </p>
            <p className="text-sm text-gray-500 mt-1">
              Review and approve new merchant registrations
            </p>
          </Link>
        )}
        {openReports > 0 && (
          <Link
            href="/admin/reports"
            className="bg-red-50 border border-red-200 rounded-lg p-5 hover:shadow-sm transition-shadow"
          >
            <p className="font-semibold text-gray-900">
              {openReports} open report{openReports > 1 ? "s" : ""}
            </p>
            <p className="text-sm text-gray-500 mt-1">
              Review customer reports about stores
            </p>
          </Link>
        )}
        <Link
          href="/admin/stores"
          className="bg-white border rounded-lg p-5 hover:shadow-sm transition-shadow"
        >
          <p className="font-semibold text-gray-900">Manage All Stores</p>
          <p className="text-sm text-gray-500 mt-1">
            View, approve, suspend, or ban merchant stores
          </p>
        </Link>
        <Link
          href="/admin/reports"
          className="bg-white border rounded-lg p-5 hover:shadow-sm transition-shadow"
        >
          <p className="font-semibold text-gray-900">All Reports</p>
          <p className="text-sm text-gray-500 mt-1">
            View all customer reports and their resolution status
          </p>
        </Link>
      </div>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  highlight,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div className={`rounded-lg border p-4 ${highlight ? "bg-yellow-50 border-yellow-200" : "bg-white"}`}>
      <div className="flex items-center gap-2 mb-2">
        {icon}
        <span className="text-xs text-gray-500">{label}</span>
      </div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
    </div>
  );
}
