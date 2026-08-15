"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { SERVICE_MODES, isServiceMode, type ServiceMode } from "@/lib/service-mode";
import { productSchema } from "@/lib/validations";
import { safetyMessage, scanTextForProhibitedContent } from "@/lib/safety/prohibited-content";
import { toCents, formatPrice, cn } from "@/lib/utils";
import { hasTierFeature, type SubscriptionTier } from "@/lib/tier-limits";
import { ArrowLeft, Upload, X, Loader2, Lock } from "lucide-react";
import { MAX_IMAGE_SIZE } from "@/lib/constants";
import { uploadProductImages, type ImageUploadStatus } from "@/lib/upload-product-images";
import {
  ProductVariantsEditor,
  formatVariantOptions,
  parseVariantOptions,
  type ProductVariantDraft,
} from "@/components/dashboard/product-variants-editor";

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
  // useMemo gives a stable reference — prevents loadData from re-running on every keystroke
  const supabase = useMemo(() => createClient(), []);

  const [product, setProduct] = useState<Product | null>(null);
  const [itemType, setItemType] = useState<"product" | "service" | "rental">("product");
  const [serviceMode, setServiceMode] = useState<ServiceMode>("at_store");
  const [name, setName] = useState("");
  const [priceDisplay, setPriceDisplay] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState<string>("");
  const [isAvailable, setIsAvailable] = useState(true);
  const [trackInventory, setTrackInventory] = useState(false);
  const [rentalUnitsOwned, setRentalUnitsOwned] = useState(1);
  const [rentalMinDays, setRentalMinDays] = useState(1);
  const [rentalMaxDays, setRentalMaxDays] = useState(30);
  const [rentalUnit, setRentalUnit] = useState<"day" | "night">("day");
  const [depositNad, setDepositNad] = useState(0);
  const [rentalBufferDays, setRentalBufferDays] = useState(0);
  const [lateFeeNad, setLateFeeNad] = useState(0);
  const [requiredDocuments, setRequiredDocuments] = useState("");
  const [requiresIdNumber, setRequiresIdNumber] = useState(false);
  const [stockQuantity, setStockQuantity] = useState(0);
  const [lowStockThreshold, setLowStockThreshold] = useState(5);
  const [allowBackorder, setAllowBackorder] = useState(false);
  const [variants, setVariants] = useState<ProductVariantDraft[]>([]);
  const [loadedVariantIds, setLoadedVariantIds] = useState<string[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);

  // Existing images (URLs) and new files
  const [existingImages, setExistingImages] = useState<string[]>([]);
  const [newImageFiles, setNewImageFiles] = useState<File[]>([]);
  const [newImagePreviews, setNewImagePreviews] = useState<string[]>([]);

  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [globalError, setGlobalError] = useState("");
  const [imageStatus, setImageStatus] = useState<Record<number, ImageUploadStatus>>({});
  const [uploadingImages, setUploadingImages] = useState(false);
  const [tier, setTier] = useState<SubscriptionTier>("oshi_start");
  const [merchantIndustry, setMerchantIndustry] = useState<string | null>(null);
  const [merchantVatNumber, setMerchantVatNumber] = useState<string | null>(null);
  const [merchantVatInclusive, setMerchantVatInclusive] = useState(false);

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
        .select("id, industry, vat_number, vat_inclusive")
        .eq("user_id", user.id)
        .single();

      if (!merchant) {
        router.push("/dashboard/setup");
        return;
      }
      setMerchantIndustry(merchant.industry);
      setMerchantVatNumber(merchant.vat_number || null);
      setMerchantVatInclusive(merchant.vat_inclusive ?? false);

      // Load subscription tier
      const { data: sub } = await supabase
        .from("subscriptions")
        .select("tier")
        .eq("merchant_id", merchant.id)
        .single();

      if (sub?.tier) setTier(sub.tier as SubscriptionTier);

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
      setItemType(
        prod.item_type === "service" ? "service" : prod.item_type === "rental" ? "rental" : "product"
      );
      if (prod.item_type === "rental") {
        setRentalUnitsOwned(prod.stock_quantity || 1);
        setRentalMinDays(prod.rental_min_days ?? 1);
        setRentalMaxDays(prod.rental_max_days ?? 30);
        const p2 = prod as {
          rental_unit?: string | null;
          deposit_nad?: number | null;
          rental_buffer_days?: number | null;
        };
        setRentalUnit(p2.rental_unit === "night" ? "night" : "day");
        setDepositNad(Math.round((p2.deposit_nad ?? 0) / 100));
        setRentalBufferDays(p2.rental_buffer_days ?? 0);
        const p3 = prod as {
          late_fee_nad?: number | null;
          required_documents?: string | null;
        };
        setLateFeeNad(Math.round((p3.late_fee_nad ?? 0) / 100));
        setRequiredDocuments(p3.required_documents ?? "");
        setRequiresIdNumber(
          (prod as { requires_id_number?: boolean | null }).requires_id_number ?? false
        );
      }
      // Services created before migration 062 have no mode yet.
      const savedMode = (prod as { service_mode?: string | null }).service_mode;
      if (isServiceMode(savedMode)) setServiceMode(savedMode);
      setName(prod.name);
      setPriceDisplay((prod.price_nad / 100).toFixed(2));
      setDescription(prod.description || "");
      setCategoryId(prod.category_id || "");
      setIsAvailable(prod.is_available);
      setTrackInventory(prod.track_inventory ?? false);
      setStockQuantity(prod.stock_quantity ?? 0);
      setLowStockThreshold(prod.low_stock_threshold ?? 5);
      setAllowBackorder(prod.allow_backorder ?? false);
      setExistingImages(prod.images || []);

      const { data: productVariants } = await supabase
        .from("product_variants")
        .select("id, source, source_variation_id, sku, price_nad, images, attributes, is_available, track_inventory, stock_quantity, allow_backorder, sort_order")
        .eq("product_id", productId)
        .order("sort_order", { ascending: true });

      if (productVariants) {
        setLoadedVariantIds(productVariants.map((variant) => variant.id));
        setVariants(
          productVariants.map((variant) => ({
            id: variant.id,
            source: variant.source || "manual",
            sourceVariationId: variant.source_variation_id,
            sku: variant.sku || "",
            optionText: formatVariantOptions(variant.attributes as Record<string, string> | null),
            priceDisplay: typeof variant.price_nad === "number" ? (variant.price_nad / 100).toFixed(2) : "",
            isAvailable: variant.is_available ?? true,
            trackInventory: variant.track_inventory ?? false,
            stockQuantity: variant.stock_quantity ?? 0,
            allowBackorder: variant.allow_backorder ?? false,
            imageUrl: Array.isArray(variant.images) && variant.images.length > 0 ? String(variant.images[0]) : "",
          }))
        );
      }

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
          images: `${file.name} exceeds 20MB limit`,
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

    const safetyScan = scanTextForProhibitedContent([name, description]);
    if (safetyScan.severity === "block") {
      setGlobalError(safetyMessage(safetyScan));
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

      // Compress + upload new images in parallel (non-fatal)
      setUploadingImages(true);
      setImageStatus({});
      const { urls: newImageUrls, failed: failedImages } = await uploadProductImages(
        newImageFiles,
        user.id,
        supabase,
        (i, s) => setImageStatus((prev) => ({ ...prev, [i]: s })),
      );
      setUploadingImages(false);

      const allImages = [...existingImages, ...newImageUrls];

      const variantsToSave = itemType === "product" ? variants : [];
      for (const [index, variant] of variantsToSave.entries()) {
        if (!variant.optionText.trim()) {
          setGlobalError(`Variation ${index + 1} needs options, for example "Fit: Ladies, Colour: Red, Size: Large".`);
          setLoading(false);
          return;
        }
      }

      const { error: updateError } = await supabase
        .from("products")
        .update({
          item_type: itemType,
          rental_min_days: itemType === "rental" ? rentalMinDays : 1,
          rental_max_days: itemType === "rental" ? Math.max(rentalMaxDays, rentalMinDays) : 30,
          rental_unit: itemType === "rental" ? rentalUnit : "day",
          deposit_nad: itemType === "rental" ? depositNad * 100 : 0,
          rental_buffer_days: itemType === "rental" ? rentalBufferDays : 0,
          late_fee_nad: itemType === "rental" ? lateFeeNad * 100 : 0,
          required_documents:
            itemType === "rental" && requiredDocuments.trim() ? requiredDocuments.trim() : null,
          requires_id_number: itemType === "rental" ? requiresIdNumber : false,
          service_mode: itemType === "service" ? serviceMode : null,
          name: validation.data.name,
          description: validation.data.description || null,
          price_nad: validation.data.price_nad,
          category_id: validation.data.category_id || null,
          is_available: validation.data.is_available ?? true,
          moderation_status: safetyScan.severity === "review" ? "review_required" : "approved",
          moderation_reasons: safetyScan.reasons,
          moderation_categories: safetyScan.categories,
          moderation_checked_at: new Date().toISOString(),
          moderation_source: "client_rules_v1",
          images: allImages,
          track_inventory: hasInventory ? trackInventory : false,
          stock_quantity: itemType === "rental" ? rentalUnitsOwned : hasInventory && trackInventory ? stockQuantity : 0,
          low_stock_threshold: hasInventory ? lowStockThreshold : 5,
          allow_backorder: hasInventory ? allowBackorder : false,
          updated_at: new Date().toISOString(),
        })
        .eq("id", productId)
        .eq("merchant_id", product!.merchant_id);

      if (updateError) {
        throw new Error(`Save product: ${updateError.message}`);
      }

      const keptVariantIds = variantsToSave.map((variant) => variant.id).filter(Boolean) as string[];
      const removedVariantIds = loadedVariantIds.filter((id) => !keptVariantIds.includes(id));
      if (removedVariantIds.length > 0) {
        const { error: deleteError } = await supabase
          .from("product_variants")
          .delete()
          .eq("product_id", productId)
          .in("id", removedVariantIds);

        if (deleteError) {
          throw new Error(`Delete variations: ${deleteError.message}`);
        }
      }

      const existingUpdates = variantsToSave.filter((v) => v.id);
      const newVariants = variantsToSave.filter((v) => !v.id);

      const buildPayload = (variant: typeof variantsToSave[number], index: number) => {
        const rand = Math.random().toString(36).slice(2, 6);
        return {
          product_id: productId,
          source: variant.source || "manual",
          source_variation_id:
            variant.sourceVariationId || (variant.id ? variant.id : `manual-${Date.now()}-${index + 1}-${rand}`),
          sku:
            variant.sku.trim() ||
            `${validation.data.name.slice(0, 16).replace(/[^a-z0-9]+/gi, "-")}-${index + 1}-${rand}`,
          price_nad: variant.priceDisplay ? toCents(parseFloat(variant.priceDisplay) || 0) : validation.data.price_nad,
          images: variant.imageUrl.trim() ? [variant.imageUrl.trim()] : [],
          attributes: parseVariantOptions(variant.optionText),
          is_available: variant.isAvailable,
          track_inventory: hasInventory ? variant.trackInventory : false,
          stock_quantity: hasInventory && variant.trackInventory ? variant.stockQuantity : 0,
          allow_backorder: hasInventory ? variant.allowBackorder : false,
          stock_status: variant.isAvailable ? "instock" : "outofstock",
          sort_order: variantsToSave.indexOf(variant),
        };
      };

      // Update existing variants individually (idempotent, by id)
      for (const variant of existingUpdates) {
        const { error: vErr } = await supabase
          .from("product_variants")
          .update(buildPayload(variant, variantsToSave.indexOf(variant)))
          .eq("id", variant.id!)
          .eq("product_id", productId);
        if (vErr) {
          throw new Error(
            vErr.code === "23505"
              ? "Each variation needs a unique SKU — two variations have the same SKU."
              : `Save variations: ${vErr.message}`,
          );
        }
      }

      // Bulk-insert new variants in one call
      if (newVariants.length > 0) {
        const newPayloads = newVariants.map((variant) => buildPayload(variant, variantsToSave.indexOf(variant)));
        const { error: insErr } = await supabase.from("product_variants").insert(newPayloads);
        if (insErr) {
          throw new Error(
            insErr.code === "23505"
              ? "Each variation needs a unique SKU — two variations have the same SKU."
              : `Save variations: ${insErr.message}`,
          );
        }
      }

      router.push(failedImages > 0 ? "/dashboard/products?img_notice=1" : "/dashboard/products");
      router.refresh();
    } catch (err) {
      setGlobalError(
        err instanceof Error ? err.message : "Something went wrong"
      );
    } finally {
      setLoading(false);
      setUploadingImages(false);
    }
  }

  const totalImages = existingImages.length + newImageFiles.length;
  const hasInventory = hasTierFeature(tier, "inventory");

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
        <h1 className="text-2xl font-bold text-gray-900">Edit {itemType === "service" ? "Service" : "Product"}</h1>
        <p className="text-sm text-gray-500 mt-1">
          Current price: {formatPrice(product.price_nad)}
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        data-testid="edit-product-form"
        className="bg-white rounded-lg border p-6 max-w-2xl space-y-6"
      >
        {globalError && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
            {globalError}
          </div>
        )}

        {/* Item Type Toggle */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Type</label>
          <div className="flex gap-3">
            <label
              className={`flex-1 border rounded-lg p-3 cursor-pointer text-center transition-colors ${
                itemType === "product"
                  ? "border-green-600 bg-green-50 text-green-700"
                  : "border-gray-300 text-gray-600 hover:border-gray-400"
              }`}
            >
              <input type="radio" name="itemType" value="product" checked={itemType === "product"} onChange={() => setItemType("product")} className="sr-only" />
              <span className="font-medium text-sm">Product</span>
            </label>
            <label
              className={`flex-1 border rounded-lg p-3 cursor-pointer text-center transition-colors ${
                itemType === "service"
                  ? "border-green-600 bg-green-50 text-green-700"
                  : "border-gray-300 text-gray-600 hover:border-gray-400"
              }`}
            >
              <input type="radio" name="itemType" value="service" checked={itemType === "service"} onChange={() => { setItemType("service"); setTrackInventory(false); }} className="sr-only" />
              <span className="font-medium text-sm">Service</span>
            </label>
            <label
              className={`flex-1 border rounded-lg p-3 cursor-pointer text-center transition-colors ${
                itemType === "rental"
                  ? "border-green-600 bg-green-50 text-green-700"
                  : "border-gray-300 text-gray-600 hover:border-gray-400"
              }`}
            >
              <input
                type="radio"
                name="itemType"
                value="rental"
                checked={itemType === "rental"}
                onChange={() => {
                  setItemType("rental");
                  setTrackInventory(false);
                }}
                className="sr-only"
              />
              <span className="font-medium text-sm">For hire</span>
            </label>

          </div>

          {itemType === "service" && (
            <div className="mt-3">
              <p className="text-sm font-medium text-gray-700">Where does it happen?</p>
              <p className="text-xs text-gray-500 mt-0.5">
                This decides what checkout asks the customer for.
              </p>
              <div className="mt-2 space-y-2">
                {SERVICE_MODES.map((mode) => (
                  <label
                    key={mode.value}
                    className={`block border rounded-lg p-3 cursor-pointer transition-colors ${
                      serviceMode === mode.value
                        ? "border-green-600 bg-green-50"
                        : "border-gray-300 hover:border-gray-400"
                    }`}
                  >
                    <input
                      type="radio"
                      name="serviceMode"
                      value={mode.value}
                      checked={serviceMode === mode.value}
                      onChange={() => setServiceMode(mode.value)}
                      className="sr-only"
                    />
                    <span
                      className={`font-medium text-sm ${
                        serviceMode === mode.value ? "text-green-700" : "text-gray-700"
                      }`}
                    >
                      {mode.label}
                    </span>
                    <p className="text-xs mt-0.5 text-gray-500">{mode.hint}</p>
                  </label>
                ))}
              </div>
            </div>
          )}
          {itemType === "rental" && (
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              <label className="block">
                <span className="block text-sm font-medium text-gray-700">How many do you own?</span>
                <input type="number" min={1} value={rentalUnitsOwned}
                  onChange={(e) => setRentalUnitsOwned(Math.max(1, parseInt(e.target.value) || 1))}
                  className="mt-1 w-full min-h-11 rounded-lg border border-gray-300 px-3 text-sm" />
                <span className="mt-0.5 block text-xs text-gray-500">That many can be out at the same time.</span>
              </label>
              <label className="block">
                <span className="block text-sm font-medium text-gray-700">Minimum days</span>
                <input type="number" min={1} value={rentalMinDays}
                  onChange={(e) => setRentalMinDays(Math.max(1, parseInt(e.target.value) || 1))}
                  className="mt-1 w-full min-h-11 rounded-lg border border-gray-300 px-3 text-sm" />
              </label>
              <label className="block">
                <span className="block text-sm font-medium text-gray-700">Maximum days</span>
                <input type="number" min={1} value={rentalMaxDays}
                  onChange={(e) => setRentalMaxDays(Math.max(1, parseInt(e.target.value) || 1))}
                  className="mt-1 w-full min-h-11 rounded-lg border border-gray-300 px-3 text-sm" />
              </label>
              <label className="block">
                <span className="block text-sm font-medium text-gray-700">Charged per</span>
                <select
                  value={rentalUnit}
                  onChange={(e) => setRentalUnit(e.target.value === "night" ? "night" : "day")}
                  className="mt-1 w-full min-h-11 rounded-lg border border-gray-300 px-3 text-sm bg-white"
                >
                  <option value="day">Day (tools, tents, dresses)</option>
                  <option value="night">Night (rooms, accommodation)</option>
                </select>
                <span className="mt-0.5 block text-xs text-gray-500">
                  {rentalUnit === "night"
                    ? "Per night, the check-out day is free and a new guest can check in that same day."
                    : "Both the first and last day count, so 20–22 Aug is 3 days."}
                </span>
              </label>
              <label className="block">
                <span className="block text-sm font-medium text-gray-700">Refundable deposit (N$)</span>
                <input
                  type="number"
                  min={0}
                  value={depositNad}
                  onChange={(e) => setDepositNad(Math.max(0, parseInt(e.target.value) || 0))}
                  className="mt-1 w-full min-h-11 rounded-lg border border-gray-300 px-3 text-sm"
                />
                <span className="mt-0.5 block text-xs text-gray-500">
                  Per unit hired. Added to the amount due, given back on return. 0 = no deposit.
                </span>
              </label>
              <label className="block">
                <span className="block text-sm font-medium text-gray-700">Days between hires</span>
                <input
                  type="number"
                  min={0}
                  value={rentalBufferDays}
                  onChange={(e) => setRentalBufferDays(Math.max(0, parseInt(e.target.value) || 0))}
                  className="mt-1 w-full min-h-11 rounded-lg border border-gray-300 px-3 text-sm"
                />
                <span className="mt-0.5 block text-xs text-gray-500">
                  Turnaround for cleaning or checks. 0 = back-to-back hires allowed.
                </span>
              </label>
              <label className="block">
                <span className="block text-sm font-medium text-gray-700">Late fee per day (N$)</span>
                <input
                  type="number"
                  min={0}
                  value={lateFeeNad}
                  onChange={(e) => setLateFeeNad(Math.max(0, parseInt(e.target.value) || 0))}
                  className="mt-1 w-full min-h-11 rounded-lg border border-gray-300 px-3 text-sm"
                />
                <span className="mt-0.5 block text-xs text-gray-500">
                  Suggested when a return is recorded late. 0 = no late fee.
                </span>
              </label>
              <label className="block sm:col-span-2">
                <span className="block text-sm font-medium text-gray-700">Documents the customer must bring</span>
                <input
                  value={requiredDocuments}
                  onChange={(e) => setRequiredDocuments(e.target.value)}
                  placeholder="e.g. Driver's licence and proof of address"
                  className="mt-1 w-full min-h-11 rounded-lg border border-gray-300 px-3 text-sm"
                />
                <span className="mt-0.5 block text-xs text-gray-500">
                  Shown on the product, at checkout, and in the WhatsApp order. Leave empty if none.
                </span>
              </label>
              <label className="block sm:col-span-2">
                <span className="flex items-start gap-2">
                  <input
                    type="checkbox"
                    checked={requiresIdNumber}
                    onChange={(e) => setRequiresIdNumber(e.target.checked)}
                    className="mt-0.5 h-4 w-4 accent-[#008938]"
                  />
                  <span>
                    <span className="block text-sm font-medium text-gray-700">
                      Ask for the hirer&apos;s ID number at checkout
                    </span>
                    <span className="mt-0.5 block text-xs text-gray-500">
                      Recorded against this hire only, visible to you on the order, and
                      never shown to anyone else. Leave off unless you genuinely need it —
                      it is personal information you then have to look after.
                    </span>
                  </span>
                </span>
              </label>
            </div>
          )}

        </div>

        {/* Name */}
        <div>
          <label
            htmlFor="name"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            {itemType === "service" ? "Service" : "Product"} name *
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
            {/* A night hire bills one less unit than the dates span, so the rate must name its unit. */}
            {itemType === "rental"
              ? rentalUnit === "night"
                ? "Price per night (NAD) *"
                : "Price per day (NAD) *"
              : "Price (NAD) *"}
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
          {merchantVatNumber && (
            <div className="mt-2 rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-xs leading-5 text-blue-800">
              {merchantVatInclusive
                ? "VAT registered: enter the shelf price customers should pay. VAT is treated as included and will be shown on checkout and invoices."
                : "VAT registered: enter the product price excluding VAT. OshiCart adds 15% VAT at checkout and shows it on the invoice."}
            </div>
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
            data-testid="product-description"
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

        {itemType === "product" && (
          <ProductVariantsEditor
            variants={variants}
            onChange={setVariants}
            industry={merchantIndustry}
          />
        )}

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

        {/* Inventory */}
        {hasInventory ? (
          <div className="border rounded-lg p-4 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-700">Track Inventory</p>
                <p className="text-xs text-gray-400">Enable stock quantity tracking for this product</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={trackInventory}
                  onChange={(e) => setTrackInventory(e.target.checked)}
                  className="sr-only"
                />
                <div className={`w-10 h-6 rounded-full transition-colors ${trackInventory ? "bg-green-600" : "bg-gray-300"}`} />
                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${trackInventory ? "translate-x-5" : "translate-x-1"}`} />
              </label>
            </div>

            {trackInventory && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="stock" className="block text-sm font-medium text-gray-700 mb-1">
                      Stock Quantity *
                    </label>
                    <input
                      id="stock"
                      type="number"
                      min="0"
                      value={stockQuantity}
                      onChange={(e) => setStockQuantity(parseInt(e.target.value) || 0)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label htmlFor="threshold" className="block text-sm font-medium text-gray-700 mb-1">
                      Low Stock Alert
                    </label>
                    <input
                      id="threshold"
                      type="number"
                      min="0"
                      value={lowStockThreshold}
                      onChange={(e) => setLowStockThreshold(parseInt(e.target.value) || 0)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    />
                    <p className="text-xs text-gray-400 mt-1">Alert when stock drops to this level</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <input
                    id="backorder"
                    type="checkbox"
                    checked={allowBackorder}
                    onChange={(e) => setAllowBackorder(e.target.checked)}
                    className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
                  />
                  <label htmlFor="backorder" className="text-sm text-gray-700">
                    Allow backorders (sell even when out of stock)
                  </label>
                </div>
              </>
            )}
          </div>
        ) : (
          <div className="border border-dashed border-gray-200 rounded-lg p-4 bg-gray-50">
            <div className="flex items-center gap-2 text-gray-400">
              <Lock size={16} />
              <p className="text-sm font-medium">Inventory Tracking</p>
            </div>
            <p className="text-xs text-gray-400 mt-1">
              Available on Oshi-Grow and above.{" "}
              <Link href="/#pricing" className="text-green-600 hover:underline">Upgrade</Link>
            </p>
          </div>
        )}

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
                {imageStatus[i] === "uploading" && (
                  <span className="absolute inset-0 flex items-center justify-center bg-black/40 text-white text-xs rounded-lg">Uploading…</span>
                )}
                {imageStatus[i] === "failed" && (
                  <span className="absolute inset-0 flex items-center justify-center bg-red-600/70 text-white text-xs rounded-lg">Failed</span>
                )}
              </div>
            ))}

            {totalImages < 3 && (
              <div className="flex gap-2">
                <label className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-green-500 hover:bg-green-50 transition-colors text-sm text-gray-600">
                  <Upload size={16} />
                  Choose Photo
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageSelect}
                    className="hidden"
                  />
                </label>
                <label className="flex items-center justify-center gap-2 py-2.5 px-4 border-2 border-dashed border-blue-300 rounded-lg cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition-colors text-sm text-blue-600">
                  📷 Take Photo
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handleImageSelect}
                    className="hidden"
                  />
                </label>
              </div>
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
            data-testid="save-product-btn"
            className={cn(
              "flex items-center gap-2 bg-green-600 text-white px-6 py-2.5 rounded-lg font-medium text-sm transition-colors",
              loading
                ? "opacity-50 cursor-not-allowed"
                : "hover:bg-green-700"
            )}
          >
            {loading && <Loader2 size={16} className="animate-spin" />}
            {uploadingImages ? "Optimising & uploading photos…" : loading ? "Saving…" : "Save Changes"}
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
