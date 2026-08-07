import { Star } from "lucide-react";

/**
 * Read-only star display. Renders partial fill for averages like 4.3 by
 * clipping a filled layer over the outline layer.
 */
export function StarRating({
  value,
  size = 14,
  className = "",
}: {
  value: number;
  size?: number;
  className?: string;
}) {
  const clamped = Math.max(0, Math.min(5, value));
  const percent = (clamped / 5) * 100;

  return (
    <span
      className={`relative inline-flex shrink-0 ${className}`}
      role="img"
      aria-label={`${clamped.toFixed(1)} out of 5 stars`}
    >
      {/* Outline layer */}
      <span className="flex">
        {[0, 1, 2, 3, 4].map((i) => (
          <Star key={i} size={size} className="text-amber-300" strokeWidth={1.75} />
        ))}
      </span>
      {/* Filled layer, clipped to the score */}
      <span
        className="absolute inset-0 flex overflow-hidden"
        style={{ width: `${percent}%` }}
        aria-hidden="true"
      >
        {[0, 1, 2, 3, 4].map((i) => (
          <Star
            key={i}
            size={size}
            className="shrink-0 text-amber-400"
            fill="currentColor"
            strokeWidth={1.75}
          />
        ))}
      </span>
    </span>
  );
}
