import { getCoverGradient } from "@/lib/industry";

export function StoreCover({ archetype }: { archetype: string | null | undefined }) {
  return (
    <div
      className="h-32 md:h-40 w-full"
      style={{
        backgroundImage: `radial-gradient(circle at 18% 20%, rgba(255,255,255,0.18), transparent 28%), radial-gradient(circle at 82% 10%, rgba(242,183,5,0.2), transparent 24%), ${getCoverGradient(archetype)}`,
      }}
      aria-hidden="true"
    />
  );
}
