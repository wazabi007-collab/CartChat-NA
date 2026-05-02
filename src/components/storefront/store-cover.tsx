import { getCoverGradient } from "@/lib/industry";

export function StoreCover({ archetype }: { archetype: string | null | undefined }) {
  return (
    <div
      className="h-32 md:h-40 w-full"
      style={{ background: getCoverGradient(archetype) }}
      aria-hidden="true"
    />
  );
}
