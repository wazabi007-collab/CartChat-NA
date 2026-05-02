import Image from "next/image";

const STEPS = [
  {
    n: 1,
    title: "Create your catalog.",
    body: "Add products, prices, and photos in minutes from your phone.",
    img: "/landing/hiw-1-create.png",
    alt: "Adding a product in the Oshicart dashboard",
  },
  {
    n: 2,
    title: "Share your link.",
    body: "Drop your store link on WhatsApp Status, Instagram, or your bio.",
    img: "/landing/hiw-2-share.png",
    alt: "Storefront on a phone with WhatsApp share sheet open",
  },
  {
    n: 3,
    title: "Get paid.",
    body: "Customers chat, you confirm, they pay via PayToday/EFT/eWallet/Cash.",
    img: "/landing/hiw-3-paid.png",
    alt: "WhatsApp message with PayToday payment confirmation",
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="py-20 bg-white">
      <div className="mx-auto max-w-6xl px-6">
        <div className="text-center mb-12">
          <p className="text-[11px] tracking-[0.12em] font-bold text-terracotta mb-2">
            HOW IT WORKS
          </p>
          <h2 className="text-3xl lg:text-4xl font-extrabold tracking-tight text-walnut">
            Three steps to start selling online in Namibia.
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {STEPS.map((s) => (
            <div
              key={s.n}
              className="bg-sand rounded-2xl p-6 border border-border-warm flex flex-col"
            >
              <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-terracotta text-white font-bold text-sm mb-4">
                {s.n}
              </span>
              <h3 className="text-lg font-bold text-walnut mb-1">{s.title}</h3>
              <p className="text-sm text-walnut-2 mb-6">{s.body}</p>
              <div className="mt-auto rounded-xl overflow-hidden bg-white border border-border-warm aspect-[3/4] relative">
                <Image
                  src={s.img}
                  alt={s.alt}
                  fill
                  sizes="(min-width:768px) 30vw, 90vw"
                  className="object-cover"
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
