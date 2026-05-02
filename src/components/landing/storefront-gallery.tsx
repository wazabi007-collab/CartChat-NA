import Image from "next/image";
import Link from "next/link";

type Store = { slug: string; name: string; archetype: string; thumb: string };

const STORES: Store[] = [
  { slug: "octovia-nexus", name: "Octovia Nexus", archetype: "Retail", thumb: "/landing/store-thumb-1.png" },
  { slug: "apatchy-beard-company", name: "Apatchy Beard Company", archetype: "Beauty", thumb: "/landing/store-thumb-2.png" },
  { slug: "krotoa-leather-goods", name: "Krotoa Leather Goods", archetype: "Retail", thumb: "/landing/store-thumb-3.png" },
  { slug: "diekapey-takeaways", name: "DieKapey Takeaways", archetype: "Food", thumb: "/landing/store-thumb-4.png" },
];

export function StorefrontGallery() {
  return (
    <section className="py-20 bg-sand">
      <div className="mx-auto max-w-6xl px-6">
        <div className="text-center mb-12">
          <p className="text-[11px] tracking-[0.12em] font-bold text-terracotta mb-2">
            REAL STORES, LIVE NOW
          </p>
          <h2 className="text-3xl lg:text-4xl font-extrabold tracking-tight text-walnut">
            See what Namibian merchants are building.
          </h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {STORES.map((s) => (
            <Link
              key={s.slug}
              href={`/s/${s.slug}`}
              className="group rounded-xl overflow-hidden bg-white border border-border-warm hover:shadow-lg hover:-translate-y-0.5 transition"
            >
              <div className="aspect-[3/4] bg-sand-2 relative">
                <Image
                  src={s.thumb}
                  alt={`${s.name} storefront`}
                  fill
                  sizes="(min-width:768px) 22vw, 45vw"
                  className="object-cover"
                />
              </div>
              <div className="p-3">
                <p className="text-sm font-bold text-walnut truncate">{s.name}</p>
                <p className="text-[11px] text-walnut-2">{s.archetype}</p>
              </div>
            </Link>
          ))}
        </div>
        <div className="text-center mt-10">
          <Link
            href="/stores"
            className="text-sm font-semibold text-terracotta hover:underline"
          >
            Browse all stores →
          </Link>
        </div>
      </div>
    </section>
  );
}
