"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { productSchema } from "@/lib/validations";
import { toCents, cn, TIER_LIMITS } from "@/lib/utils";
import { ArrowLeft, Upload, X, Loader2 } from "lucide-react";
import { MAX_IMAGE_SIZE } from "@/lib/constants";

interface Category {
  id: string;
  name: string;
  sort_order: number;
}

export default function NewProductPage() {
  const router = useRouter();
  const supabase = createClient();

  const [name, setName] = useState("");
  const [priceDisplay, setPriceDisplay] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState<string>("");
  const [isAvailable, setIsAvailable] = useState(true);
  const [categories, setCategories] = useState<Category[]>([]);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [globalError, setGlobalError] = useState("");

  const loadCategories = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { data: merchant } = await supabase
      .from("merchants")
      .select("id")
      .eq("user_id", user.id)
      .single();

    if (!merchant) return;

    const { data } = await supabase
      .from("categories")
      .select("*")
      .eq("merchant_id", merchant.id)
      .order("sort_order", { ascending: true });

    if (data) setCategories(data);
  }, [supabase]);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  function handleImageSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    const totalImages = imageFiles.length + files.length;

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

    const newFiles = [...imageFiles, ...files];
    setImageFiles(newFiles);

    const newPreviews = files.map((file) => URL.createObjectURL(file));
    setImagePreviews((prev) => [...prev, ...newPreviews]);
  }

  function removeImage(index: number) {
    URL.revokeObjectURL(imagePreviews[index]);
    setImageFiles((prev) => prev.filter((_, i) => i !== index));
    setImagePreviews((prev) => prev.filter((_, i) => i !== index));
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

      const { data: merchant } = await supabase
        .from("merchants")
        .select("id, tier")
        .eq("user_id", user.id)
        .single();

      if (!merchant) {
        setGlobalError("Store not found. Please complete setup first.");
        setLoading(false);
        return;
      }

      // Check product limit for free tier
      const tier = merchant.tier as keyof typeof TIER_LIMITS;
      const limit = TIER_LIMITS[tier]?.maxProducts ?? 20;

      const { count } = await supabase
        .from("products")
        .select("id", { count: "exact", head: true })
        .eq("merchant_id", merchant.id);

      if ((count || 0) >= limit) {
        setGlobalError(
          `You've reached the ${limit}-product limit on the ${tier} plan. Upgrade to add more products.`
        );
        setLoading(false);
        return;
      }

      // Upload images via the upload API route
      const imageUrls: string[] = [];
      for (const file of imageFiles) {
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
        imageUrls.push(url);
      }

      // Insert product
      const { error: insertError } = await supabase.from("products").insert({
        merchant_id: merchant.id,
        name: validation.data.name,
        description: validation.data.description || null,
        price_nad: validation.data.price_nad,
        category_id: validation.data.category_id || null,
        is_available: validation.data.is_available ?? true,
        images: imageUrls,
      });

      if (insertError) {
        throw new Error(insertError.message);
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
        <h1 className="text-2xl font-bold text-gray-900">Add Product</h1>
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
            placeholder="e.g. Grilled Chicken Wrap"
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
              placeholder="49.99"
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
            placeholder="Describe your product..."
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
            {imagePreviews.map((src, i) => (
              <div key={i} className="relative w-24 h-24 rounded-lg overflow-hidden border">
                <Image
                  src={src}
                  alt={`Preview ${i + 1}`}
                  fill
                  className="object-cover"
                />
                <button
                  type="button"
                  onClick={() => removeImage(i)}
                  className="absolute top-1 right-1 bg-black/50 text-white rounded-full p-0.5 hover:bg-black/70"
                >
                  <X size={14} />
                </button>
              </div>
            ))}
            {imageFiles.length < 3 && (
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
          <p className="text-xs text-gray-400 mt-1">
            Max 5MB per image. Images will be compressed automatically.
          </p>
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
            {loading ? "Saving..." : "Add Product"}
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
