type Props = { productImages: string[]; fallbackInitial: string };

/**
 * A store's 2x2 thumbnail on the browse cards.
 *
 * Partially filled on purpose: a store with two photographed products shows
 * two photos and two padded cells. This used to require four images or it
 * rendered nothing but the initial, which hid real product photos from every
 * small store and made a 4-product bakery look richer than a 1,976-product
 * catalogue.
 */
export function StoreThumbGrid({ productImages, fallbackInitial }: Props) {
  const images = productImages.filter(Boolean).slice(0, 4);

  // Nothing to show — keep the plain initial tile rather than an empty grid.
  if (images.length === 0) {
    return (
      <div className="w-12 h-12 rounded-lg bg-sand-2 flex items-center justify-center text-terracotta font-bold">
        {fallbackInitial}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 grid-rows-2 gap-px w-12 h-12 rounded-lg overflow-hidden border border-border-warm">
      {images.map((src, i) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img key={i} src={src} alt="" className="w-full h-full object-cover" />
      ))}
      {Array.from({ length: 4 - images.length }).map((_, i) => (
        <div
          key={`pad-${i}`}
          className="flex items-center justify-center bg-sand-2 text-[10px] font-bold leading-none text-terracotta"
        >
          {/* The initial carries the padding once; repeating it reads as noise. */}
          {i === 0 ? fallbackInitial : ""}
        </div>
      ))}
    </div>
  );
}
