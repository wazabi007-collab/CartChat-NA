import { ShareActions } from "./share-actions";

type Props = {
  store: {
    storeName: string;
    description?: string | null;
    logoUrl?: string | null;
    location?: string | null;
    phone?: string | null;
    whatsappNumber: string;
    openingHours?: string | null;
    rating?: number | null;
    orderCount?: number | null;
    slug: string;
  };
  storeUrl: string;
  qrUrl: string;
};

export function StoreHeaderCard({ store, storeUrl, qrUrl }: Props) {
  const initial = store.storeName.charAt(0).toUpperCase();
  const waLink = `https://wa.me/${store.whatsappNumber.replace(/\D/g, "")}`;
  const tagline = store.description ?? "Open for orders";
  const taglineSuffix = store.openingHours ? ` · ${store.openingHours}` : "";

  return (
    <div className="bg-white">
      <div className="mx-auto max-w-4xl px-4 -mt-12 md:-mt-14 relative">
        <div className="flex items-end gap-4">
          <div className="w-16 h-16 md:w-20 md:h-20 rounded-2xl bg-sand-2 border-[3px] border-white shadow-lg overflow-hidden flex items-center justify-center shrink-0">
            {store.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={store.logoUrl}
                alt={`${store.storeName} logo`}
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-2xl font-extrabold text-terracotta">{initial}</span>
            )}
          </div>
          <div className="pb-2 min-w-0">
            <h1 className="text-xl md:text-2xl font-extrabold text-walnut leading-tight truncate">
              {store.storeName}
            </h1>
            <p className="text-sm text-walnut-2">
              {tagline}{taglineSuffix}
            </p>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {store.location && (
            <span className="text-xs px-3 py-1 rounded-full bg-sand border border-border-warm text-walnut-2">
              📍 {store.location}
            </span>
          )}
          {store.phone && (
            <a
              href={`tel:${store.phone}`}
              className="text-xs px-3 py-1 rounded-full bg-sand border border-border-warm text-walnut-2 hover:bg-sand-2"
            >
              📞 {store.phone}
            </a>
          )}
          {store.rating != null && store.orderCount != null && store.orderCount > 0 && (
            <span className="text-xs px-3 py-1 rounded-full bg-sand border border-border-warm text-walnut-2">
              <b className="text-acacia">★ {store.rating.toFixed(1)}</b> ·{" "}
              {store.orderCount} order{store.orderCount === 1 ? "" : "s"}
            </span>
          )}
        </div>

        <div className="mt-4 flex gap-2">
          <a
            href={waLink}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-acacia text-white font-semibold text-sm hover:opacity-90 transition"
          >
            💬 Message on WhatsApp
          </a>
          <ShareActions storeUrl={storeUrl} qrUrl={qrUrl} />
        </div>
      </div>
    </div>
  );
}
