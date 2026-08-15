"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { SERVICE_MODES, type ServiceMode } from "@/lib/service-mode";
import { productSchema } from "@/lib/validations";
import { safetyMessage, scanTextForProhibitedContent } from "@/lib/safety/prohibited-content";
import { toCents, cn } from "@/lib/utils";
import { canAddProduct, hasTierFeature, TIER_LIMITS, TIER_LABELS, type SubscriptionTier } from "@/lib/tier-limits";
import { ArrowLeft, Upload, X, Loader2, Lock } from "lucide-react";
import { MAX_IMAGE_SIZE } from "@/lib/constants";
import { track } from "@/lib/track";
import { uploadProductImages, type ImageUploadStatus } from "@/lib/upload-product-images";
import {
  ProductVariantsEditor,
  parseVariantOptions,
  type ProductVariantDraft,
} from "@/components/dashboard/product-variants-editor";

interface Category {
  id: string;
  name: string;
  sort_order: number;
}

export default function NewProductPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

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
  const [stockQuantity, setStockQuantity] = useState(0);
  const [lowStockThreshold, setLowStockThreshold] = useState(5);
  const [allowBackorder, setAllowBackorder] = useState(false);
  const [variants, setVariants] = useState<ProductVariantDraft[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [imageStatus, setImageStatus] = useState<Record<number, ImageUploadStatus>>({});
  const [uploadingImages, setUploadingImages] = useState(false);
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [globalError, setGlobalError] = useState("");
  const [tier, setTier] = useState<SubscriptionTier>("oshi_start");
  const [productCount, setProductCount] = useState(0);
  const [merchantId, setMerchantId] = useState<string | null>(null);
  const [merchantIndustry, setMerchantIndustry] = useState<string | null>(null);
  const [merchantVatNumber, setMerchantVatNumber] = useState<string | null>(null);
  const [merchantVatInclusive, setMerchantVatInclusive] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data: merchant } = await supabase
        .from("merchants")
        .select("id, industry, vat_number, vat_inclusive")
        .eq("user_id", user.id)
        .single();

      if (!merchant) return;
      setMerchantId(merchant.id);
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

      // Load current product count (includes soft-deleted — counts toward tier limit by design)
      const { count } = await supabase
        .from("products")
        .select("id", { count: "exact", head: true })
        .eq("merchant_id", merchant.id);

      setProductCount(count || 0);

      // Load categories
      const { data } = await supabase
        .from("categories")
        .select("*")
        .eq("merchant_id", merchant.id)
        .order("sort_order", { ascending: true });

      if (data) setCategories(data);
    } finally {
      setPageLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const atLimit = !canAddProduct(tier, productCount);
  const hasInventory = hasTierFeature(tier, "inventory");
  const productLimit = TIER_LIMITS[tier].products;
  const productsRemaining = productLimit === -1 ? -1 : Math.max(0, productLimit - productCount);

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

    const safetyScan = scanTextForProhibitedContent([name, description]);
    if (safetyScan.severity === "block") {
      setGlobalError(safetyMessage(safetyScan));
      return;
    }

    setLoading(true);

    try {
      let userId = "";
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setGlobalError("You must be logged in");
          setLoading(false);
          return;
        }
        userId = user.id;
      } catch (authErr) {
        setGlobalError(`Auth error: ${authErr instanceof Error ? authErr.message : "session expired"}`);
        setLoading(false);
        return;
      }

      if (!merchantId) {
        setGlobalError("Store not found. Please complete setup first.");
        setLoading(false);
        return;
      }

      // Re-check product limit at submit time
      if (atLimit) {
        setGlobalError(
          `You've reached the ${productLimit === -1 ? "unlimited" : productLimit}-product limit on the ${TIER_LABELS[tier]} plan. Upgrade to add more products.`
        );
        setLoading(false);
        return;
      }

      // Compress + upload images in parallel (non-fatal: a failed image is skipped)
      setUploadingImages(true);
      setImageStatus({});
      const { urls: imageUrls, failed: failedImages } = await uploadProductImages(
        imageFiles,
        userId,
        supabase,
        (i, s) => setImageStatus((prev) => ({ ...prev, [i]: s })),
      );
      setUploadingImages(false);

      const variantsToSave = itemType === "product" ? variants : [];
      for (const [index, variant] of variantsToSave.entries()) {
        if (!variant.optionText.trim()) {
          setGlobalError(`Variation ${index + 1} needs options, for example "Fit: Ladies, Colour: Red, Size: Large".`);
          setLoading(false);
          return;
        }
      }

      // Insert product
      const { data: newProduct, error: insertError } = await supabase.from("products").insert({
        merchant_id: merchantId,
        item_type: itemType,
        rental_min_days: itemType === "rental" ? rentalMinDays : 1,
        rental_max_days: itemType === "rental" ? Math.max(rentalMaxDays, rentalMinDays) : 30,
        rental_unit: itemType === "rental" ? rentalUnit : "day",
        deposit_nad: itemType === "rental" ? depositNad * 100 : 0,
        rental_buffer_days: itemType === "rental" ? rentalBufferDays : 0,
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
        images: imageUrls,
        track_inventory: hasInventory ? trackInventory : false,
        stock_quantity: itemType === "rental" ? rentalUnitsOwned : hasInventory && trackInventory ? stockQuantity : 0,
        low_stock_threshold: hasInventory ? lowStockThreshold : 5,
        allow_backorder: hasInventory ? allowBackorder : false,
      }).select("id").single();

      if (insertError || !newProduct) {
        throw new Error(`Save product: ${insertError.message}`);
      }

      if (variantsToSave.length > 0) {
        const variantRows = variantsToSave.map((variant, index) => ({
          product_id: newProduct.id,
          source: "manual",
          source_variation_id: `manual-${index + 1}`,
          sku: variant.sku.trim() || `${validation.data.name.slice(0, 16).replace(/[^a-z0-9]+/gi, "-")}-${index + 1}`,
          price_nad: variant.priceDisplay ? toCents(parseFloat(variant.priceDisplay) || 0) : validation.data.price_nad,
          images: variant.imageUrl.trim() ? [variant.imageUrl.trim()] : [],
          attributes: parseVariantOptions(variant.optionText),
          is_available: variant.isAvailable,
          track_inventory: hasInventory ? variant.trackInventory : false,
          stock_quantity: hasInventory && variant.trackInventory ? variant.stockQuantity : 0,
          allow_backorder: hasInventory ? variant.allowBackorder : false,
          stock_status: variant.isAvailable ? "instock" : "outofstock",
          sort_order: index,
        }));
        const { error: variantError } = await supabase.from("product_variants").insert(variantRows);
        if (variantError) {
          throw new Error(`Save variations: ${variantError.message}`);
        }
      }

      track("product_created", { item_type: itemType, has_images: imageUrls.length > 0, category: categoryId || "none" });
      router.push(failedImages > 0 ? "/dashboard/products?img_notice=1" : "/dashboard/products");
      router.refresh();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("Product form error:", err);
      setGlobalError(
        msg.includes(":") ? msg : `Unexpected: ${msg}`
      );
    } finally {
      setLoading(false);
      setUploadingImages(false);
    }
  }

  if (pageLoading) {
    return (
      <div className="md:ml-56 flex items-center justify-center py-20">
        <Loader2 size={32} className="animate-spin text-gray-400" />
      </div>
    );
  }

  if (atLimit) {
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
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-6 max-w-2xl text-center">
          <Lock size={32} className="mx-auto text-amber-500 mb-3" />
          <h2 className="text-lg font-semibold text-gray-900 mb-1">Product limit reached</h2>
          <p className="text-sm text-gray-600 mb-4">
            You&apos;ve reached your plan&apos;s product limit ({productCount}/{productLimit}) on the{" "}
            <span className="font-medium">{TIER_LABELS[tier]}</span> plan.
            Upgrade to add more.
          </p>
          <Link
            href="/pricing"
            className="inline-block bg-green-600 text-white px-6 py-2.5 rounded-lg font-medium text-sm hover:bg-green-700 transition-colors"
          >
            View Plans
          </Link>
        </div>
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
        <h1 className="text-2xl font-bold text-gray-900">Add {itemType === "service" ? "Service" : "Product"}</h1>
        {productLimit !== -1 && (
          <p className="text-xs text-gray-400 mt-1">
            {productCount}/{productLimit} items used ({TIER_LABELS[tier]})
          </p>
        )}
        {productLimit !== -1 && productsRemaining <= 3 && (
          <p className="text-xs text-amber-600 mt-1">
            {productsRemaining} product{productsRemaining !== 1 ? "s" : ""} remaining on your plan.{" "}
            <Link href="/pricing" className="text-green-600 hover:underline">Upgrade</Link>
          </p>
        )}
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

        {/* Item Type Toggle */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            What are you adding?
          </label>
          <div className="flex gap-3">
            <label
              className={`flex-1 border rounded-lg p-3 cursor-pointer text-center transition-colors ${
                itemType === "product"
                  ? "border-green-600 bg-green-50 text-green-700"
                  : "border-gray-300 text-gray-600 hover:border-gray-400"
              }`}
            >
              <input
                type="radio"
                name="itemType"
                value="product"
                checked={itemType === "product"}
                onChange={() => setItemType("product")}
                className="sr-only"
              />
              <span className="font-medium text-sm">Product</span>
              <p className="text-xs mt-0.5 opacity-70">Physical item for sale</p>
            </label>
            <label
              className={`flex-1 border rounded-lg p-3 cursor-pointer text-center transition-colors ${
                itemType === "service"
                  ? "border-green-600 bg-green-50 text-green-700"
                  : "border-gray-300 text-gray-600 hover:border-gray-400"
              }`}
            >
              <input
                type="radio"
                name="itemType"
                value="service"
                checked={itemType === "service"}
                onChange={() => {
                  setItemType("service");
                  setTrackInventory(false);
                }}
                className="sr-only"
              />
              <span className="font-medium text-sm">Service</span>
              <p className="text-xs mt-0.5 opacity-70">Service you offer</p>
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
              <p className="text-xs mt-0.5 opacity-70">Rented out and returned</p>
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
                <input
                  type="number"
                  min={1}
                  value={rentalUnitsOwned}
                  onChange={(e) => setRentalUnitsOwned(Math.max(1, parseInt(e.target.value) || 1))}
                  className="mt-1 w-full min-h-11 rounded-lg border border-gray-300 px-3 text-sm"
                />
                <span className="mt-0.5 block text-xs text-gray-500">
                  That many can be out at the same time.
                </span>
              </label>
              <label className="block">
                <span className="block text-sm font-medium text-gray-700">Minimum days</span>
                <input
                  type="number"
                  min={1}
                  value={rentalMinDays}
                  onChange={(e) => setRentalMinDays(Math.max(1, parseInt(e.target.value) || 1))}
                  className="mt-1 w-full min-h-11 rounded-lg border border-gray-300 px-3 text-sm"
                />
              </label>
              <label className="block">
                <span className="block text-sm font-medium text-gray-700">Maximum days</span>
                <input
                  type="number"
                  min={1}
                  value={rentalMaxDays}
                  onChange={(e) => setRentalMaxDays(Math.max(1, parseInt(e.target.value) || 1))}
                  className="mt-1 w-full min-h-11 rounded-lg border border-gray-300 px-3 text-sm"
                />
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
                  Per night, the check-out day is free and a new guest can check in that same day.
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
            {itemType === "rental" ? "Price per day (NAD) *" : `Price (NAD) ${itemType === "service" ? "" : "*"}`}
          </label>
          {itemType === "service" && (
            <p className="text-xs text-gray-400 mb-1">Leave at 0 for &quot;Request a Quote&quot;</p>
          )}
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
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none"
            placeholder={itemType === "service" ? "Describe your service..." : "Describe your product..."}
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

        {/* Inventory (hidden for services) */}
        {itemType !== "service" && (hasInventory ? (
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
        ))}

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
                {imageStatus[i] === "uploading" && (
                  <span className="absolute inset-0 flex items-center justify-center bg-black/40 text-white text-xs rounded-lg">Uploading…</span>
                )}
                {imageStatus[i] === "failed" && (
                  <span className="absolute inset-0 flex items-center justify-center bg-red-600/70 text-white text-xs rounded-lg">Failed</span>
                )}
              </div>
            ))}
            {imageFiles.length < 3 && (
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
          <p className="text-xs text-gray-400 mt-1">
            Images will be compressed automatically.
          </p>
        </div>

        {/* Submit */}
        <div className="flex items-center gap-3 pt-4 border-t">
          <button
            type="submit"
            disabled={loading || atLimit}
            className={cn(
              "flex items-center gap-2 bg-green-600 text-white px-6 py-2.5 rounded-lg font-medium text-sm transition-colors",
              loading || atLimit
                ? "opacity-50 cursor-not-allowed"
                : "hover:bg-green-700"
            )}
          >
            {loading && <Loader2 size={16} className="animate-spin" />}
            {uploadingImages ? "Optimising & uploading photos…" : loading ? "Saving…" : itemType === "service" ? "Add Service" : "Add Product"}
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
