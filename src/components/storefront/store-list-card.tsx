import Link from "next/link";
import { ArrowRight, MapPin } from "lucide-react";
import { TOWN_LABELS } from "@/lib/constants";
import { INDUSTRY_LABELS, type EnrichedStore } from "@/lib/storefront/store-list";
import { StoreThumbGrid } from "@/components/storefront/store-thumb-grid";
import { IndustryIcon } from "@/components/industry-icon";
import { getThemeConfig } from "@/lib/industry";
import { WhatsAppIcon } from "@/components/whatsapp-icon";

/** One store's card on /stores and /stores/[region]. */
/**
 * The card is used under a results section on /stores and under a region
 * heading on /stores/[region]. Hard-coding <h3> skipped straight from the page
 * H1 on the directory, so screen-reader heading navigation misreported the
 * hierarchy. The caller owns the level because only the caller knows the
 * outline it sits in.
 */
export function StoreListCard({
  store,
  headingLevel = "h3",
}: {
  store: EnrichedStore;
  headingLevel?: "h2" | "h3";
}) {
  const Heading = headingLevel;
  const sellsServices = getThemeConfig(store.industry)?.isService ?? false;

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
            <Heading className="truncate font-black text-walnut transition-colors group-hover:text-terracotta">
              {store.store_name}
            </Heading>
            {store.town && (
              <p className="flex items-center gap-1 text-xs font-semibold text-acacia">
                <MapPin size={12} /> {TOWN_LABELS[store.town] ?? ""}
              </p>
            )}
            <p className="text-xs font-semibold text-walnut-2">
              {INDUSTRY_LABELS[store.industry || "other"] || "General"} &middot;{" "}
              {store.productCount}{" "}
              {sellsServices
                ? store.productCount === 1
                  ? "service"
                  : "services"
                : store.productCount === 1
                ? "product"
                : "products"}
            </p>
          </div>
        </div>

        {store.description && (
          <p className="mb-3 line-clamp-2 text-sm leading-6 text-walnut-2">{store.description}</p>
        )}

        <div className="flex items-center justify-between border-t border-border-warm pt-3">
          <span className="inline-flex items-center gap-1 text-xs font-bold text-acacia">
            <WhatsAppIcon size={14} />
            {store.orderingAvailable ? "Accepting orders" : "Ordering paused · browse catalogue"}
          </span>
          <span className="flex items-center gap-1 text-xs font-bold text-walnut-2 transition-colors group-hover:text-terracotta">
            Visit Store <ArrowRight size={14} />
          </span>
        </div>
      </div>
    </Link>
  );
}
