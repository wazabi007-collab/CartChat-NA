/**
 * Storefront sort order, applied on the server.
 *
 * Sorting used to be client state, which forced the whole product grid to be
 * a client component: every card, badge and wrapper shipped as JavaScript and
 * hydrated in the browser. A store paginating 100 products paid for 100 cards
 * of hydration on a phone, to support a dropdown most visitors never touch.
 *
 * As a URL parameter the grid renders on the server, the sort survives a
 * refresh, and a sorted view can be shared or bookmarked.
 */
export const SORT_OPTIONS = [
  { value: "default", label: "Sort" },
  { value: "name_asc", label: "Name A-Z" },
  { value: "name_desc", label: "Name Z-A" },
  { value: "price_asc", label: "Price: Low" },
  { value: "price_desc", label: "Price: High" },
] as const;

export type SortValue = (typeof SORT_OPTIONS)[number]["value"];

/** Anything unrecognised falls back to the merchant's own ordering. */
export function normalizeSort(value: string | undefined | null): SortValue {
  return SORT_OPTIONS.some((o) => o.value === value)
    ? (value as SortValue)
    : "default";
}

type Sortable = { name: string; price_nad: number };

/** Returns a new array; "default" keeps the incoming order untouched. */
export function sortProducts<T extends Sortable>(list: T[], sort: SortValue): T[] {
  if (sort === "default") return list;
  return [...list].sort((a, b) => {
    switch (sort) {
      case "name_asc":
        return a.name.localeCompare(b.name);
      case "name_desc":
        return b.name.localeCompare(a.name);
      case "price_asc":
        return a.price_nad - b.price_nad;
      case "price_desc":
        return b.price_nad - a.price_nad;
      default:
        return 0;
    }
  });
}
