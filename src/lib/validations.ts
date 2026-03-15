import { z } from "zod";

// Namibian phone: +264... or 081/085/061 local format
const phoneRegex = /^(\+?264\d{8,9}|0\d{9,10})$/;

export const storeSetupSchema = z.object({
  store_name: z
    .string()
    .min(2, "Store name must be at least 2 characters")
    .max(50, "Store name must be under 50 characters"),
  description: z
    .string()
    .max(500, "Description must be under 500 characters")
    .optional(),
  whatsapp_number: z
    .string()
    .regex(phoneRegex, "Enter a valid Namibian number (e.g. 0811234567 or +264811234567)"),
  bank_name: z.string().optional(),
  bank_account_number: z.string().optional(),
  bank_account_holder: z.string().optional(),
  bank_branch_code: z.string().optional(),
});

export const productSchema = z.object({
  name: z
    .string()
    .min(1, "Product name is required")
    .max(100, "Product name must be under 100 characters"),
  description: z
    .string()
    .max(1000, "Description must be under 1000 characters")
    .optional(),
  price_nad: z
    .number()
    .int("Price must be a whole number (in cents)")
    .min(0, "Price cannot be negative"),
  category_id: z.string().uuid().nullable().optional(),
  is_available: z.boolean().optional(),
});

export const categorySchema = z.object({
  name: z
    .string()
    .min(1, "Category name is required")
    .max(50, "Category name must be under 50 characters"),
  sort_order: z.number().int().optional(),
});

export const checkoutSchema = z.object({
  customer_name: z
    .string()
    .min(1, "Name is required")
    .max(100, "Name must be under 100 characters"),
  customer_whatsapp: z
    .string()
    .min(8, "Enter a valid phone number")
    .max(15, "Enter a valid phone number"),
  delivery_method: z.enum(["pickup", "delivery"]),
  delivery_address: z.string().max(500).optional(),
  notes: z.string().max(500).optional(),
  items: z.array(
    z.object({
      product_id: z.string().uuid(),
      quantity: z.number().int().min(1),
    })
  ).min(1, "Cart cannot be empty"),
});

export type StoreSetupInput = z.infer<typeof storeSetupSchema>;
export type ProductInput = z.infer<typeof productSchema>;
export type CategoryInput = z.infer<typeof categorySchema>;
export type CheckoutInput = z.infer<typeof checkoutSchema>;
