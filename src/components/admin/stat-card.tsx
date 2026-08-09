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
  // A stat card must never hide a digit. `truncate` rendered MRR of N$3,995
  // as "N$3,…" — the card was 7px too narrow — and it would have got worse as
  // the number grew. Scale the type to the value instead of clipping it.
  const display = String(value);
  const valueSize =
    display.length > 9
      ? "text-sm sm:text-base"
      : display.length > 7
      ? "text-base sm:text-lg"
      : display.length > 5
      ? "text-lg sm:text-xl"
      : "text-xl sm:text-2xl";

  const content = (
    <div className={`rounded-2xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-900/5 ${highlight ? "ring-2 ring-amber-400" : ""} ${href ? "cursor-pointer transition-all hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-lg hover:shadow-slate-900/10" : ""}`}>
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-black uppercase tracking-wide text-slate-500">{label}</p>
          <p
            className={`mt-2 font-black tabular-nums leading-tight text-slate-950 ${valueSize}`}
            title={display}
          >
            {value}
          </p>
          {trend && (
            <p className={`text-sm mt-1 ${trend.positive ? "text-green-600" : "text-red-600"}`}>
              {trend.value}
            </p>
          )}
        </div>
        <div className="rounded-xl bg-slate-50 p-3">
          <Icon className="h-6 w-6 text-slate-600" />
        </div>
      </div>
    </div>
  );
  if (href) return <Link href={href}>{content}</Link>;
  return content;
}
