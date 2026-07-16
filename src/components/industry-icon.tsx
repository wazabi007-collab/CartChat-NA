import {
  UtensilsCrossed,
  Sandwich,
  Flame,
  Coffee,
  Croissant,
  ChefHat,
  ShoppingBasket,
  Beef,
  Wine,
  Wheat,
  Droplets,
  Shirt,
  Recycle,
  Scissors,
  Sparkles,
  Pill,
  Smartphone,
  Signal,
  Hammer,
  Sofa,
  Car,
  Pencil,
  Dumbbell,
  ToyBrick,
  Palette,
  PawPrint,
  Flower2,
  Store,
  SprayCan,
  Printer,
  Wrench,
  Briefcase,
  type LucideIcon,
} from "lucide-react";
import { getIndustryAccent } from "@/lib/industry";

/**
 * One flat glyph per industry (keys match INDUSTRIES_NAMIBIA `value`s in
 * lib/constants). Rendered inside a coloured circular badge by <IndustryIcon>.
 */
const INDUSTRY_ICONS: Record<string, LucideIcon> = {
  restaurant: UtensilsCrossed,
  takeaway: Sandwich,
  street_food: Flame,
  cafe: Coffee,
  bakery: Croissant,
  catering: ChefHat,
  grocery: ShoppingBasket,
  butchery: Beef,
  liquor: Wine,
  agriculture: Wheat,
  gas_water: Droplets,
  fashion: Shirt,
  second_hand: Recycle,
  salon: Scissors,
  cosmetics: Sparkles,
  pharmacy: Pill,
  electronics: Smartphone,
  airtime: Signal,
  hardware: Hammer,
  furniture: Sofa,
  auto_parts: Car,
  stationery: Pencil,
  sports: Dumbbell,
  toys: ToyBrick,
  crafts: Palette,
  pet: PawPrint,
  flowers: Flower2,
  general_dealer: Store,
  cleaning: SprayCan,
  printing: Printer,
  repairs: Wrench,
  services: Briefcase,
  other: Store,
};

export function getIndustryIcon(industry: string | null | undefined): LucideIcon {
  return INDUSTRY_ICONS[industry ?? "other"] ?? Store;
}

interface IndustryIconProps {
  industry: string | null | undefined;
  /** Badge diameter in px. */
  size?: number;
  /** Glyph size in px; defaults to ~52% of the badge. */
  iconSize?: number;
  className?: string;
  /** "solid" = filled accent circle with white glyph (default). "tint" = soft accent wash with accent glyph. */
  variant?: "solid" | "tint";
  /** Accessible label; when omitted the badge is decorative (aria-hidden). */
  title?: string;
}

/** A category badge for a store's industry, coloured by its archetype accent. */
export function IndustryIcon({
  industry,
  size = 40,
  iconSize,
  className = "",
  variant = "solid",
  title,
}: IndustryIconProps) {
  const Icon = getIndustryIcon(industry);
  const accent = getIndustryAccent(industry);
  const styles =
    variant === "solid"
      ? { backgroundColor: accent, color: "#ffffff" }
      : { backgroundColor: `${accent}1a`, color: accent };

  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-full ${className}`}
      style={{ width: size, height: size, ...styles }}
      title={title}
      role={title ? "img" : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
    >
      <Icon size={iconSize ?? Math.round(size * 0.52)} strokeWidth={2.1} />
    </span>
  );
}
