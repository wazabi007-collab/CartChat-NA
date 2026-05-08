type Props = { productImages: string[]; fallbackInitial: string };

export function StoreThumbGrid({ productImages, fallbackInitial }: Props) {
  if (productImages.length < 4) {
    return (
      <div className="w-12 h-12 rounded-lg bg-sand-2 flex items-center justify-center text-terracotta font-bold">
        {fallbackInitial}
      </div>
    );
  }
  const four = productImages.slice(0, 4);
  return (
    <div className="grid grid-cols-2 grid-rows-2 gap-px w-12 h-12 rounded-lg overflow-hidden border border-border-warm">
      {four.map((src, i) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img key={i} src={src} alt="" className="w-full h-full object-cover" />
      ))}
    </div>
  );
}
