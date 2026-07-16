import Link from "next/link";
import { MessageCircle, ArrowRight, MapPin } from "lucide-react";
import { TOWN_LABELS } from "@/lib/constants";
import { INDUSTRY_LABELS, type EnrichedStore } from "@/lib/storefront/store-list";
import { StoreThumbGrid } from "@/components/storefront/store-thumb-grid";
import { IndustryIcon } from "@/components/industry-icon";

/** One store's card on /stores and /stores/[region]. */
export function StoreListCard({ store }: { store: EnrichedStore }) {
  return (
    <Link
      href={`/s/${store.store_slug}`}
      className="group overflow-hidden rounded-xl border border-border-warm bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg"
    >
      <div className="p-5">
        <div className="flex items-center gap-3 mb-3">
          <div className="relative shrink-0">
            <StoreThumbGrid
              productImages={store.previewImages}
              fallbackInitial={store.store_name.charAt(0).toUpperCase()}
            />
            <IndustryIcon
              industry={store.industry}
              size={30}
              className="absolute -bottom-1.5 -left-1.5 shadow-sm ring-2 ring-white"
              title={INDUSTRY_LABELS[store.industry || "other"] || "General"}
            />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="truncate font-black text-walnut transition-colors group-hover:text-terracotta">
              {store.store_name}
            </h3>
            {store.town && (
              <p className="flex items-center gap-1 text-xs font-semibold text-acacia">
                <MapPin size={12} /> {TOWN_LABELS[store.town] ?? ""}
              </p>
            )}
            <p className="text-xs font-semibold text-walnut-2/70">
              {INDUSTRY_LABELS[store.industry || "other"] || "General"} &middot; {store.productCount} product
              {store.productCount !== 1 ? "s" : ""}
            </p>
          </div>
        </div>

        {store.description && (
          <p className="mb-3 line-clamp-2 text-sm leading-6 text-walnut-2">{store.description}</p>
        )}

        <div className="flex items-center justify-between border-t border-border-warm pt-3">
          <span className="inline-flex items-center gap-1 text-xs font-bold text-acacia">
            <MessageCircle size={14} />
            WhatsApp Store
          </span>
          <span className="flex items-center gap-1 text-xs font-bold text-walnut-2/70 transition-colors group-hover:text-terracotta">
            Visit Store <ArrowRight size={14} />
          </span>
        </div>
      </div>
    </Link>
  );
}
