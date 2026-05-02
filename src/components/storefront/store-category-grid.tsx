import Link from "next/link";

type Cat = { slug: string; name: string; productCount: number };

export function StoreCategoryGrid({
  storeSlug,
  categories,
}: {
  storeSlug: string;
  categories: Cat[];
}) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
      {categories.map((c) => (
        <Link
          key={c.slug}
          href={`/s/${storeSlug}?cat=${c.slug}`}
          className="rounded-xl p-4 flex flex-col justify-between gap-3 border border-border-warm hover:shadow-md hover:-translate-y-0.5 transition"
          style={{
            background: "linear-gradient(180deg, var(--sand-2), var(--sand))",
          }}
        >
          <div className="w-8 h-8 rounded-md bg-terracotta" />
          <div>
            <p className="text-sm font-bold text-walnut leading-tight">{c.name}</p>
            <p className="text-[11px] text-walnut-2 mt-0.5">
              {c.productCount} product{c.productCount === 1 ? "" : "s"}
            </p>
          </div>
        </Link>
      ))}
    </div>
  );
}
