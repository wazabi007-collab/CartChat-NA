import Link from "next/link";
import { Eye } from "lucide-react";

export function PreviewBanner() {
  return (
    <div className="sticky top-0 z-50 bg-amber-500 text-white">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-2 px-4 py-2 text-sm">
        <p className="flex items-center gap-1.5 font-bold">
          <Eye size={15} />
          Preview mode — only you can see this. Ordering is disabled.
        </p>
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="font-semibold underline-offset-2 hover:underline">
            Dashboard
          </Link>
          <a
            href="/api/preview/exit"
            className="rounded-md bg-white/20 px-2.5 py-1 font-bold transition-colors hover:bg-white/30"
          >
            Exit preview
          </a>
        </div>
      </div>
    </div>
  );
}
