import { Clock, MapPin, MessageCircle, Phone, Star } from "lucide-react";
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
    deliveryEstimate?: string | null;
    slug: string;
  };
  storeUrl: string;
  qrUrl: string;
};

export function StoreHeaderCard({ store, storeUrl, qrUrl }: Props) {
  const initial = store.storeName.charAt(0).toUpperCase();
  const waLink = `https://wa.me/${store.whatsappNumber.replace(/\D/g, "")}`;
  const tagline = store.description ?? "Open for orders";
  const taglineSuffix = store.openingHours ? ` - ${store.openingHours}` : "";

  return (
    <div className="bg-white">
      <div className="mx-auto max-w-4xl px-4 -mt-12 md:-mt-14 relative">
        <div className="flex items-end gap-4">
          <div className="w-16 h-16 md:w-20 md:h-20 rounded-2xl bg-white border-[3px] border-white shadow-xl shadow-slate-900/12 ring-1 ring-slate-200/80 overflow-hidden flex items-center justify-center shrink-0">
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
            <h1 className="text-xl md:text-2xl font-extrabold text-slate-950 leading-tight truncate">
              {store.storeName}
            </h1>
            <p className="text-sm text-slate-600">
              {tagline}
              {taglineSuffix}
            </p>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {store.location && (
            <span className="inline-flex items-center gap-1.5 text-xs px-3 py-1 rounded-full bg-slate-50 border border-slate-200 text-slate-600">
              <MapPin size={13} />
              {store.location}
            </span>
          )}
          {store.phone && (
            <a
              href={`tel:${store.phone}`}
              className="inline-flex items-center gap-1.5 text-xs px-3 py-1 rounded-full bg-slate-50 border border-slate-200 text-slate-600 hover:bg-slate-100"
            >
              <Phone size={13} />
              {store.phone}
            </a>
          )}
          {store.rating != null && store.orderCount != null && store.orderCount > 0 && (
            <span className="inline-flex items-center gap-1.5 text-xs px-3 py-1 rounded-full bg-emerald-50 border border-emerald-100 text-slate-600">
              <Star size={13} className="text-acacia" fill="currentColor" />
              <b className="text-acacia">{store.rating.toFixed(1)}</b>
              <span>-</span>
              {store.orderCount} order{store.orderCount === 1 ? "" : "s"}
            </span>
          )}
          {store.deliveryEstimate && (
            <span className="inline-flex items-center gap-1.5 text-xs px-3 py-1 rounded-full bg-slate-50 border border-slate-200 text-slate-600">
              <Clock size={13} />
              Usually ready in {store.deliveryEstimate}
            </span>
          )}
        </div>

        <div className="mt-5 flex gap-2">
          <a
            href={waLink}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-acacia text-white font-semibold text-sm shadow-sm shadow-emerald-900/10 hover:bg-emerald-700 transition"
          >
            <MessageCircle size={17} />
            Message on WhatsApp
          </a>
          <ShareActions storeUrl={storeUrl} qrUrl={qrUrl} />
        </div>
      </div>
    </div>
  );
}
