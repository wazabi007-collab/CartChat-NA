export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type MerchantTier = "free" | "pro" | "business";
export type OrderStatus = "pending" | "confirmed" | "completed" | "cancelled";
export type DeliveryMethod = "pickup" | "delivery";
export type PaymentMethod = "eft" | "cod" | "momo" | "ewallet";
export type DiscountType = "percentage" | "fixed";
export type EwalletProvider = "fnb_ewallet" | "paypulse" | "easywallet" | "paytoday";

export interface Database {
  public: {
    Tables: {
      merchants: {
        Row: {
          id: string;
          user_id: string;
          store_name: string;
          store_slug: string;
          description: string | null;
          whatsapp_number: string;
          bank_name: string | null;
          bank_account_number: string | null;
          bank_account_holder: string | null;
          bank_branch_code: string | null;
          logo_url: string | null;
          tier: MerchantTier;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          store_name: string;
          store_slug: string;
          description?: string | null;
          whatsapp_number: string;
          bank_name?: string | null;
          bank_account_number?: string | null;
          bank_account_holder?: string | null;
          bank_branch_code?: string | null;
          logo_url?: string | null;
          tier?: MerchantTier;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          store_name?: string;
          store_slug?: string;
          description?: string | null;
          whatsapp_number?: string;
          bank_name?: string | null;
          bank_account_number?: string | null;
          bank_account_holder?: string | null;
          bank_branch_code?: string | null;
          logo_url?: string | null;
          tier?: MerchantTier;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      categories: {
        Row: {
          id: string;
          merchant_id: string;
          name: string;
          sort_order: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          merchant_id: string;
          name: string;
          sort_order?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          merchant_id?: string;
          name?: string;
          sort_order?: number;
          created_at?: string;
        };
      };
      products: {
        Row: {
          id: string;
          merchant_id: string;
          category_id: string | null;
          name: string;
          description: string | null;
          price_nad: number;
          images: string[];
          is_available: boolean;
          sort_order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          merchant_id: string;
          category_id?: string | null;
          name: string;
          description?: string | null;
          price_nad: number;
          images?: string[];
          is_available?: boolean;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          merchant_id?: string;
          category_id?: string | null;
          name?: string;
          description?: string | null;
          price_nad?: number;
          images?: string[];
          is_available?: boolean;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
      orders: {
        Row: {
          id: string;
          merchant_id: string;
          order_number: number;
          customer_name: string;
          customer_whatsapp: string;
          delivery_method: DeliveryMethod;
          delivery_address: string | null;
          status: OrderStatus;
          subtotal_nad: number;
          proof_of_payment_url: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          merchant_id: string;
          order_number?: number;
          customer_name: string;
          customer_whatsapp: string;
          delivery_method: DeliveryMethod;
          delivery_address?: string | null;
          status?: OrderStatus;
          subtotal_nad: number;
          proof_of_payment_url?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          merchant_id?: string;
          order_number?: number;
          customer_name?: string;
          customer_whatsapp?: string;
          delivery_method?: DeliveryMethod;
          delivery_address?: string | null;
          status?: OrderStatus;
          subtotal_nad?: number;
          proof_of_payment_url?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      order_items: {
        Row: {
          id: string;
          order_id: string;
          product_id: string;
          product_name: string;
          product_price: number;
          quantity: number;
          line_total: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          order_id: string;
          product_id: string;
          product_name: string;
          product_price: number;
          quantity: number;
          line_total: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          order_id?: string;
          product_id?: string;
          product_name?: string;
          product_price?: number;
          quantity?: number;
          line_total?: number;
          created_at?: string;
        };
      };
      store_analytics: {
        Row: {
          id: string;
          merchant_id: string;
          date: string;
          page_views: number;
          orders_placed: number;
          orders_confirmed: number;
          revenue_nad: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          merchant_id: string;
          date: string;
          page_views?: number;
          orders_placed?: number;
          orders_confirmed?: number;
          revenue_nad?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          merchant_id?: string;
          date?: string;
          page_views?: number;
          orders_placed?: number;
          orders_confirmed?: number;
          revenue_nad?: number;
          created_at?: string;
        };
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      merchant_tier: MerchantTier;
      order_status: OrderStatus;
      delivery_method: DeliveryMethod;
    };
  };
}
