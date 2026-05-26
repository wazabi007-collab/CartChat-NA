import Link from "next/link";
import Image from "next/image";
import {
  Baby,
  BookOpen,
  Boxes,
  Cable,
  Camera,
  Cpu,
  Dumbbell,
  Gamepad2,
  Headphones,
  HeartPulse,
  Home,
  LampDesk,
  Luggage,
  Network,
  Shirt,
  Smartphone,
  Sofa,
  Tv,
} from "lucide-react";

type Cat = { slug: string; name: string; productCount: number; imageUrls?: string[] };

const CATEGORY_ICONS = [
  { match: ["education", "learning", "book"], Icon: BookOpen },
  { match: ["device", "mobile", "phone", "wearable"], Icon: Smartphone },
  { match: ["computer", "peripheral", "accessor"], Icon: Cpu },
  { match: ["gaming", "toys", "game"], Icon: Gamepad2 },
  { match: ["audio", "headphone"], Icon: Headphones },
  { match: ["bags", "luggage"], Icon: Luggage },
  { match: ["electrical", "network"], Icon: Cable },
  { match: ["kitchen", "home"], Icon: Home },
  { match: ["furniture"], Icon: Sofa },
  { match: ["television"], Icon: Tv },
  { match: ["photography"], Icon: Camera },
  { match: ["baby", "toddler"], Icon: Baby },
  { match: ["health", "wellness"], Icon: HeartPulse },
  { match: ["lighting"], Icon: LampDesk },
  { match: ["sports", "fitness"], Icon: Dumbbell },
  { match: ["fashion", "shirt"], Icon: Shirt },
  { match: ["networking"], Icon: Network },
];

function getCategoryIcon(name: string) {
  const normalized = name.toLowerCase();
  return CATEGORY_ICONS.find((item) => item.match.some((term) => normalized.includes(term)))?.Icon ?? Boxes;
}

export function StoreCategoryGrid({
  storeSlug,
  categories,
}: {
  storeSlug: string;
  categories: Cat[];
}) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-3.5">
      {categories.map((c) => {
        const Icon = getCategoryIcon(c.name);
        const images = (c.imageUrls || []).filter(Boolean).slice(0, 4);
        return (
          <Link
            key={c.slug}
            href={`/s/${storeSlug}?cat=${c.slug}`}
            className="group overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm shadow-slate-900/5 transition hover:-translate-y-0.5 hover:shadow-xl hover:shadow-slate-900/10"
          >
            <div className="relative aspect-[4/3] overflow-hidden bg-gradient-to-br from-slate-50 via-white to-emerald-50">
              {images.length > 0 ? (
                <div className="absolute inset-0 grid grid-cols-2 grid-rows-2 gap-px bg-slate-100">
                  {images.map((imageUrl, index) => (
                    <div
                      key={`${c.slug}-${imageUrl}-${index}`}
                      className={`relative bg-white ${images.length === 1 ? "col-span-2 row-span-2" : ""}`}
                    >
                      <Image
                        src={imageUrl}
                        alt={`${c.name} product preview ${index + 1}`}
                        fill
                        sizes="(max-width: 768px) 50vw, 280px"
                        className="object-contain p-2.5 transition duration-500 group-hover:scale-105"
                      />
                    </div>
                  ))}
                  {images.length === 3 && <div className="bg-gradient-to-br from-slate-50 to-emerald-50" />}
                </div>
              ) : (
                <div className="absolute inset-0 flex items-center justify-center">
                  <Icon size={38} strokeWidth={1.8} className="text-slate-300" />
                </div>
              )}
              <div className="absolute left-3 top-3 flex h-9 w-9 items-center justify-center rounded-xl bg-white/92 text-terracotta shadow-sm ring-1 ring-slate-200/70 backdrop-blur">
                <Icon size={17} strokeWidth={2.2} />
              </div>
            </div>
            <div className="p-3.5">
              <p className="min-h-9 text-sm font-black leading-tight text-slate-950">{c.name}</p>
              <p className="mt-1.5 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-500">
                {c.productCount} product{c.productCount === 1 ? "" : "s"}
              </p>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
