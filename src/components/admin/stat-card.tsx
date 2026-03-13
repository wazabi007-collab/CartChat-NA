import Link from "next/link";
import { type LucideIcon } from "lucide-react";

interface StatCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  trend?: { value: string; positive: boolean };
  highlight?: boolean;
  href?: string;
}

export function StatCard({ label, value, icon: Icon, trend, highlight, href }: StatCardProps) {
  const content = (
    <div className={`bg-white rounded-lg border p-6 ${highlight ? "ring-2 ring-orange-400" : ""} ${href ? "hover:shadow-sm hover:border-gray-300 transition-all cursor-pointer" : ""}`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500">{label}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
          {trend && (
            <p className={`text-sm mt-1 ${trend.positive ? "text-green-600" : "text-red-600"}`}>
              {trend.value}
            </p>
          )}
        </div>
        <div className="p-3 bg-gray-50 rounded-lg">
          <Icon className="h-6 w-6 text-gray-600" />
        </div>
      </div>
    </div>
  );
  if (href) return <Link href={href}>{content}</Link>;
  return content;
}
