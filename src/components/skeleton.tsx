/**
 * Route-level loading skeletons.
 *
 * The app shipped with no loading.tsx anywhere, so every navigation to a
 * server-rendered route blocked on its database queries before painting
 * anything. Pressing a dashboard tab looked broken — the button took its
 * pressed state and then nothing moved for a second or more, which reads as
 * a frozen app rather than a loading one. A skeleton lets Next stream the
 * shell immediately, so the tap always produces motion.
 *
 * Deliberately plain: these render for a few hundred milliseconds, so they
 * exist to hold the layout still, not to be looked at.
 */

export function SkeletonBar({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded bg-gray-200 ${className}`} />;
}

export function SkeletonCard({ lines = 3 }: { lines?: number }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5">
      <SkeletonBar className="h-4 w-1/3" />
      <div className="mt-4 space-y-2.5">
        {Array.from({ length: lines }).map((_, i) => (
          <SkeletonBar key={i} className={`h-3 ${i === lines - 1 ? "w-2/3" : "w-full"}`} />
        ))}
      </div>
    </div>
  );
}

/** The shape almost every dashboard route takes: a title, then stacked cards. */
export function SkeletonPage({ cards = 3 }: { cards?: number }) {
  return (
    <div aria-busy="true" aria-live="polite" className="space-y-5">
      <span className="sr-only">Loading…</span>
      <div>
        <SkeletonBar className="h-6 w-44" />
        <SkeletonBar className="mt-2 h-3 w-64" />
      </div>
      {Array.from({ length: cards }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}

/** Storefront and browse pages, which lead with a grid of cards. */
export function SkeletonGrid({ cards = 6 }: { cards?: number }) {
  return (
    <div aria-busy="true" aria-live="polite" className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <span className="sr-only">Loading…</span>
      <SkeletonBar className="h-7 w-56" />
      <SkeletonBar className="mt-2 h-3 w-72" />
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: cards }).map((_, i) => (
          <div key={i} className="overflow-hidden rounded-xl border border-gray-200 bg-white">
            <SkeletonBar className="h-40 w-full rounded-none" />
            <div className="space-y-2.5 p-4">
              <SkeletonBar className="h-4 w-3/4" />
              <SkeletonBar className="h-3 w-1/3" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
