import { CalendarClock, Globe, KeyRound, ShoppingBag } from "lucide-react";

/**
 * Merchants kept assuming OshiCart was products-only, so the four selling
 * modes get their own section: each card names real Namibian businesses and
 * the one platform behaviour that matters for that mode. Same terracotta/
 * walnut/sand tokens as FeatureBlocks so it reads as one page.
 */
const MODES: Array<{
  icon: typeof ShoppingBag;
  title: string;
  who: string;
  body: string;
}> = [
  {
    icon: ShoppingBag,
    title: "Physical products",
    who: "Shops, boutiques, food sellers, farms",
    body: "Stock control, out-of-stock badges, delivery or collection — with courier options in Windhoek, Swakopmund, and Walvis Bay.",
  },
  {
    icon: CalendarClock,
    title: "Services & bookings",
    who: "Salons, barbers, nail techs, mechanics",
    body: "Customers pick a date and time slot on a calendar. You set your session times and block out days off — no double bookings.",
  },
  {
    icon: KeyRound,
    title: "Rentals & hire",
    who: "Car hire, tents & chairs, dresses, guest rooms",
    body: "Customers pick their dates and the price works itself out — per day or per night. OshiCart counts what's already out, so the same unit can never be hired twice, and refundable deposits are handled for you.",
  },
  {
    icon: Globe,
    title: "Digital & online services",
    who: "Designers, tutors, consultants, media",
    body: "No delivery step, no courier questions — the order flow speaks 'online service' from checkout to completion.",
  },
];

export function SellAnything() {
  return (
    <section className="bg-sand py-16 lg:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-terracotta">
            More than products
          </p>
          <h2 className="mt-3 text-3xl font-black tracking-tight text-walnut sm:text-4xl">
            Whatever you sell, OshiCart speaks its language.
          </h2>
          <p className="mt-4 text-base leading-7 text-walnut-2">
            Products, appointments, hire, or online work — the checkout,
            WhatsApp updates, and invoices adapt to how your business actually
            sells.
          </p>
        </div>

        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {MODES.map((mode) => {
            const Icon = mode.icon;
            return (
              <div
                key={mode.title}
                className="rounded-xl border border-border-warm bg-white p-5"
              >
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-sand text-terracotta shadow-sm">
                  <Icon size={21} />
                </span>
                <h3 className="mt-4 text-lg font-black text-walnut">
                  {mode.title}
                </h3>
                <p className="mt-1 text-xs font-bold uppercase tracking-wide text-terracotta">
                  {mode.who}
                </p>
                <p className="mt-2 text-sm leading-6 text-walnut-2">
                  {mode.body}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
