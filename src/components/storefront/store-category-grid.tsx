import Link from "next/link";
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

type Cat = { slug: string; name: string; productCount: number };

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
    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
      {categories.map((c) => {
        const Icon = getCategoryIcon(c.name);
        return (
          <Link
            key={c.slug}
            href={`/s/${storeSlug}?cat=${c.slug}`}
            className="group rounded-2xl p-4 min-h-32 flex flex-col justify-between gap-4 border border-slate-200/80 bg-white/90 shadow-sm shadow-slate-900/5 hover:shadow-lg hover:shadow-slate-900/8 hover:-translate-y-0.5 transition"
          >
            <div className="h-10 w-10 rounded-xl bg-terracotta-soft text-terracotta flex items-center justify-center ring-1 ring-blue-100 group-hover:bg-terracotta group-hover:text-white transition-colors">
              <Icon size={19} strokeWidth={2.2} />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-950 leading-tight">{c.name}</p>
              <p className="text-[11px] text-slate-500 mt-1">
                {c.productCount} product{c.productCount === 1 ? "" : "s"}
              </p>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
