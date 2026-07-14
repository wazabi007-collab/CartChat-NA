import { Banknote, Landmark, Wallet, type LucideIcon } from "lucide-react";

// Methods that have no brand logo get a brand-coloured badge with a clean
// glyph, so the picker reads as one cohesive set alongside the real logos.
const BADGE: Record<string, { Icon: LucideIcon; bg: string }> = {
  eft: { Icon: Landmark, bg: "#2b5ea7" }, // Atlantic Blue
  cod: { Icon: Banknote, bg: "#159947" }, // Acacia Green
};

/**
 * Renders a payment method's visual: a real brand logo when one exists
 * (public/payment-logos/*), otherwise a brand-coloured badge. Shared by the
 * setup wizard, settings, and checkout so all three stay identical.
 */
export function PaymentMethodVisual({
  value,
  logo,
  label,
  size = 28,
}: {
  value: string;
  logo?: string | null;
  label: string;
  size?: number;
}) {
  if (logo) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={logo}
        alt={`${label} logo`}
        className="shrink-0 rounded-md bg-white object-contain ring-1 ring-black/5"
        style={{ width: size, height: size }}
      />
    );
  }

  const badge = BADGE[value] ?? { Icon: Wallet, bg: "#526174" }; // Slate fallback
  const Icon = badge.Icon;
  return (
    <span
      aria-hidden
      className="inline-flex shrink-0 items-center justify-center rounded-md text-white"
      style={{ width: size, height: size, background: badge.bg }}
    >
      <Icon size={Math.round(size * 0.58)} />
    </span>
  );
}
