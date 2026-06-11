export function QuotaRow({
  label,
  used,
  limit,
}: {
  label: string;
  used: number;
  limit: number;
}) {
  if (limit === -1) {
    return (
      <div className="flex items-center justify-between gap-3 text-sm">
        <span className="font-semibold text-slate-700">{label}</span>
        <span className="font-black text-slate-950">
          {used} <span className="font-bold text-slate-400">/ Unlimited</span>
        </span>
      </div>
    );
  }

  const percentage = Math.min(100, Math.round((used / Math.max(limit, 1)) * 100));

  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-3 text-sm">
        <span className="font-semibold text-slate-700">{label}</span>
        <span className="font-black text-slate-950">
          {used} <span className="font-bold text-slate-400">/ {limit}</span>
        </span>
      </div>
      <div className="h-2 rounded-full bg-slate-100">
        <div
          className={`h-2 rounded-full ${percentage >= 80 ? "bg-amber-500" : "bg-gradient-to-r from-terracotta to-acacia"}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
