import Link from "next/link";

export function CtaBar() {
  return (
    <section className="bg-walnut text-sand">
      <div className="mx-auto max-w-5xl px-6 py-16 text-center">
        <h2 className="text-3xl lg:text-4xl font-extrabold tracking-tight">
          Open your shop today. Free forever to start.
        </h2>
        <p className="mt-3 text-base text-[color:#d4c2a0]">
          Join 34 Namibian merchants already selling on Oshicart.
        </p>
        <Link
          href="/signup"
          className="mt-8 inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-terracotta text-white font-semibold text-sm hover:opacity-90 transition"
        >
          Open my free store →
        </Link>
      </div>
    </section>
  );
}
