"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { productSchema } from "@/lib/validations";
import { toCents, formatPrice, cn } from "@/lib/utils";
import { ArrowLeft, Upload, X, Loader2 } from "lucide-react";
import { MAX_IMAGE_SIZE } from "@/lib/constants";

interface Category {
  id: string;
  name: string;
  sort_order: number;
}

interface Product {
  id: string;
  merchant_id: string;
  name: string;
  description: string | null;
  price_nad: number;
  category_id: string | null;
  is_available: boolean;
  images: string[];
}

export default function EditProductPage() {
  const router = useRouter();
  const params = useParams();
  const productId = params.id as string;
  const supabase = createClient();

  const [product, setProduct] = useState<Product | null>(null);
  const [name, setName] = useState("");
  const [priceDisplay, setPriceDisplay] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState<string>("");
  const [isAvailable, setIsAvailable] = useState(true);
  const [categories, setCategories] = useState<Category[]>([]);

  // Existing images (URLs) and new files
  const [existingImages, setExistingImages] = useState<string[]>([]);
  const [newImageFiles, setNewImageFiles] = useState<File[]>([]);
  const [newImagePreviews, setNewImagePreviews] = useState<string[]>([]);

  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [globalError, setGlobalError] = useState("");

  const loadData = useCallback(async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }

      const { data: merchant } = await supabase
        .from("merchants")
        .select("id")
        .eq("user_id", user.id)
        .single();

      if (!merchant) {
        router.push("/dashboard/setup");
        return;
      }

      // Load product
      const { data: prod } = await supabase
        .from("products")
        .select("*")
        .eq("id", productId)
        .eq("merchant_id", merchant.id)
        .single();

      if (!prod) {
        router.push("/dashboard/products");
        return;
      }

      setProduct(prod);
      setName(prod.name);
      setPriceDisplay((prod.price_nad / 100).toFixed(2));
      setDescription(prod.description || "");
      setCategoryId(prod.category_id || "");
      setIsAvailable(prod.is_available);
      setExistingImages(prod.images || []);

      // Load categories
      const { data: cats } = await supabase
        .from("categories")
        .select("*")
        .eq("merchant_id", merchant.id)
        .order("sort_order", { ascending: true });

      if (cats) setCategories(cats);
    } catch {
      setGlobalError("Failed to load product data");
    } finally {
      setPageLoading(false);
    }
  }, [supabase, productId, router]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  function handleImageSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    const totalImages = existingImages.length + newImageFiles.length + files.length;

    if (totalImages > 3) {
      setErrors((prev) => ({
        ...prev,
        images: "Maximum 3 images allowed",
      }));
      return;
    }

    for (const file of files) {
      if (file.size > MAX_IMAGE_SIZE) {
        setErrors((prev) => ({
          ...prev,
          images: `${file.name} exceeds 5MB limit`,
        }));
        return;
      }
    }

    setErrors((prev) => {
      const next = { ...prev };
      delete next.images;
      return next;
    });

    setNewImageFiles((prev) => [...prev, ...files]);
    const previews = files.map((file) => URL.createObjectURL(file));
    setNewImagePreviews((prev) => [...prev, ...previews]);
  }

  function removeExistingImage(index: number) {
    setExistingImages((prev) => prev.filter((_, i) => i !== index));
  }

  function removeNewImage(index: number) {
    URL.revokeObjectURL(newImagePreviews[index]);
    setNewImageFiles((prev) => prev.filter((_, i) => i !== index));
    setNewImagePreviews((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrors({});
    setGlobalError("");

    const priceInCents = toCents(parseFloat(priceDisplay) || 0);

    const validation = productSchema.safeParse({
      name,
      description: description || undefined,
      price_nad: priceInCents,
      category_id: categoryId || null,
      is_available: isAvailable,
    });

    if (!validation.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of validation.error.issues) {
        const field = issue.path[0]?.toString() || "form";
        fieldErrors[field] = issue.message;
      }
      setErrors(fieldErrors);
      return;
    }

    setLoading(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setGlobalError("You must be logged in");
        setLoading(false);
        return;
      }

      // Upload new images
      const newImageUrls: string[] = [];
      for (const file of newImageFiles) {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("path", `${user.id}/products`);

        const res = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });

        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || "Image upload failed");
        }

        const { url } = await res.json();
        newImageUrls.push(url);
      }

      const allImages = [...existingImages, ...newImageUrls];

      const { error: updateError } = await supabase
        .from("products")
        .update({
          name: validation.data.name,
          description: validation.data.description || null,
          price_nad: validation.data.price_nad,
          category_id: validation.data.category_id || null,
          is_available: validation.data.is_available ?? true,
          images: allImages,
          updated_at: new Date().toISOString(),
        })
        .eq("id", productId)
        .eq("merchant_id", product!.merchant_id);

      if (updateError) {
        throw new Error(updateError.message);
      }

      router.push("/dashboard/products");
      router.refresh();
    } catch (err) {
      setGlobalError(
        err instanceof Error ? err.message : "Something went wrong"
      );
    } finally {
      setLoading(false);
    }
  }

  const totalImages = existingImages.length + newImageFiles.length;

  if (pageLoading) {
    return (
      <div className="md:ml-56 flex items-center justify-center py-20">
        <Loader2 size={32} className="animate-spin text-gray-400" />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="md:ml-56 text-center py-20">
        <p className="text-gray-500">Product not found.</p>
        <Link
          href="/dashboard/products"
          className="text-green-600 hover:underline text-sm mt-2 inline-block"
        >
          Back to products
        </Link>
      </div>
    );
  }

  return (
    <div className="md:ml-56">
      <div className="mb-6">
        <Link
          href="/dashboard/products"
          className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-900 mb-3"
        >
          <ArrowLeft size={16} />
          Back to products
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Edit Product</h1>
        <p className="text-sm text-gray-500 mt-1">
          Current price: {formatPrice(product.price_nad)}
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-lg border p-6 max-w-2xl space-y-6"
      >
        {globalError && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
            {globalError}
          </div>
        )}

        {/* Name */}
        <div>
          <label
            htmlFor="name"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Product name *
          </label>
          <input
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={cn(
              "w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent",
              errors.name ? "border-red-300" : "border-gray-300"
            )}
            maxLength={100}
          />
          {errors.name && (
            <p className="text-red-500 text-xs mt-1">{errors.name}</p>
          )}
        </div>

        {/* Price */}
        <div>
          <label
            htmlFor="price"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Price (NAD) *
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
              N$
            </span>
            <input
              id="price"
              type="number"
              step="0.01"
              min="0"
              value={priceDisplay}
              onChange={(e) => setPriceDisplay(e.target.value)}
              className={cn(
                "w-full border rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent",
                errors.price_nad ? "border-red-300" : "border-gray-300"
              )}
            />
          </div>
          {errors.price_nad && (
            <p className="text-red-500 text-xs mt-1">{errors.price_nad}</p>
          )}
        </div>

        {/* Description */}
        <div>
          <label
            htmlFor="description"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Description
          </label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none"
            maxLength={1000}
          />
          {errors.description && (
            <p className="text-red-500 text-xs mt-1">{errors.description}</p>
          )}
        </div>

        {/* Category */}
        <div>
          <label
            htmlFor="category"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Category
          </label>
          <select
            id="category"
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white"
          >
            <option value="">No category</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
        </div>

        {/* Availability */}
        <div className="flex items-center gap-3">
          <input
            id="available"
            type="checkbox"
            checked={isAvailable}
            onChange={(e) => setIsAvailable(e.target.checked)}
            className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
          />
          <label htmlFor="available" className="text-sm text-gray-700">
            Available for purchase
          </label>
        </div>

        {/* Images */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Images (up to 3)
          </label>
          <div className="flex flex-wrap gap-3">
            {/* Existing images */}
            {existingImages.map((src, i) => (
              <div
                key={`existing-${i}`}
                className="relative w-24 h-24 rounded-lg overflow-hidden border"
              >
                <Image
                  src={src}
                  alt={`Product image ${i + 1}`}
                  fill
                  className="object-cover"
                />
                <button
                  type="button"
                  onClick={() => removeExistingImage(i)}
                  className="absolute top-1 right-1 bg-black/50 text-white rounded-full p-0.5 hover:bg-black/70"
                >
                  <X size={14} />
                </button>
              </div>
            ))}

            {/* New image previews */}
            {newImagePreviews.map((src, i) => (
              <div
                key={`new-${i}`}
                className="relative w-24 h-24 rounded-lg overflow-hidden border border-green-300"
              >
                <Image
                  src={src}
                  alt={`New image ${i + 1}`}
                  fill
                  className="object-cover"
                />
                <button
                  type="button"
                  onClick={() => removeNewImage(i)}
                  className="absolute top-1 right-1 bg-black/50 text-white rounded-full p-0.5 hover:bg-black/70"
                >
                  <X size={14} />
                </button>
                <span className="absolute bottom-1 left-1 bg-green-600 text-white text-[10px] px-1 rounded">
                  New
                </span>
              </div>
            ))}

            {totalImages < 3 && (
              <label className="w-24 h-24 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-green-500 hover:bg-green-50 transition-colors">
                <Upload size={20} className="text-gray-400" />
                <span className="text-xs text-gray-400 mt-1">Upload</span>
                <input
                  type="file"
                  accept="image/*,image/heic,image/heif"
                  onChange={handleImageSelect}
                  className="sr-only"
                />
              </label>
            )}
          </div>
          {errors.images && (
            <p className="text-red-500 text-xs mt-1">{errors.images}</p>
          )}
        </div>

        {/* Submit */}
        <div className="flex items-center gap-3 pt-4 border-t">
          <button
            type="submit"
            disabled={loading}
            className={cn(
              "flex items-center gap-2 bg-green-600 text-white px-6 py-2.5 rounded-lg font-medium text-sm transition-colors",
              loading
                ? "opacity-50 cursor-not-allowed"
                : "hover:bg-green-700"
            )}
          >
            {loading && <Loader2 size={16} className="animate-spin" />}
            {loading ? "Saving..." : "Save Changes"}
          </button>
          <Link
            href="/dashboard/products"
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
