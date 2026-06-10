"use client";

import {
  createContext,
  useContext,
  useState,
  type ReactNode,
} from "react";
import Image from "next/image";

interface VariantImagesContextValue {
  variantImages: string[];
  setVariantImages: (images: string[]) => void;
}

const VariantImagesContext = createContext<VariantImagesContextValue | null>(null);

// Lets the purchase panel publish the selected variant's images so the
// gallery (rendered elsewhere in the server layout) can react to them.
export function VariantImagesProvider({ children }: { children: ReactNode }) {
  const [variantImages, setVariantImages] = useState<string[]>([]);

  return (
    <VariantImagesContext.Provider value={{ variantImages, setVariantImages }}>
      {children}
    </VariantImagesContext.Provider>
  );
}

export function useVariantImages() {
  return useContext(VariantImagesContext);
}

export function ProductGallery({
  images,
  productName,
}: {
  images: string[];
  productName: string;
}) {
  const ctx = useContext(VariantImagesContext);
  const variantImages = ctx?.variantImages ?? [];
  // Show the selected variant's own images when it has any; otherwise fall
  // back to the base product images.
  const displayImages = variantImages.length > 0 ? variantImages : images;

  if (displayImages.length === 0) {
    return (
      <div className="aspect-square sm:aspect-[4/3] bg-gradient-to-br from-blue-50 via-white to-emerald-50 flex items-center justify-center">
        <span className="text-slate-300 text-6xl">
          {productName.charAt(0).toUpperCase()}
        </span>
      </div>
    );
  }

  return (
    <div className="relative">
      {displayImages.length === 1 ? (
        <div className="aspect-square sm:aspect-[4/3] relative bg-slate-100">
          <Image
            src={displayImages[0]}
            alt={productName}
            fill
            sizes="(max-width: 768px) 100vw, 896px"
            priority
            className="object-contain"
          />
        </div>
      ) : (
        <div
          key={displayImages.join("|")}
          className="flex overflow-x-auto snap-x snap-mandatory scrollbar-hide"
        >
          {displayImages.map((img: string, idx: number) => (
            <div
              key={idx}
              className="aspect-square sm:aspect-[4/3] flex-shrink-0 w-full snap-center relative bg-slate-100"
            >
              <Image
                src={img}
                alt={`${productName} - Image ${idx + 1}`}
                fill
                sizes="(max-width: 768px) 100vw, 896px"
                priority={idx === 0}
                className="object-contain"
              />
            </div>
          ))}
        </div>
      )}
      {displayImages.length > 1 && (
        <div className="flex justify-center gap-1.5 py-2 bg-white">
          {displayImages.map((_: string, idx: number) => (
            <div
              key={idx}
              className="w-2 h-2 rounded-full bg-slate-300"
            />
          ))}
        </div>
      )}
    </div>
  );
}
