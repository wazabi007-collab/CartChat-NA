// Generated from the live Supabase schema. Do not edit by hand —
// regenerate instead, or this drifts from the database like the old
// hand-maintained types did (they were missing 23 of 37 tables, and their
// payment_method list disagreed with the enum, hiding a live checkout bug).

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      _backup_product_descriptions_20260807: {
        Row: {
          backed_up_at: string | null
          description: string | null
          id: string | null
        }
        Insert: {
          backed_up_at?: string | null
          description?: string | null
          id?: string | null
        }
        Update: {
          backed_up_at?: string | null
          description?: string | null
          id?: string | null
        }
        Relationships: []
      }
      abandoned_checkouts: {
        Row: {
          cart_item_count: number
          cart_total_nad: number
          created_at: string
          customer_name: string
          customer_whatsapp: string
          id: string
          merchant_id: string
          recovered_at: string | null
          recovered_order_id: string | null
          reminder_sent_at: string | null
          updated_at: string
        }
        Insert: {
          cart_item_count?: number
          cart_total_nad?: number
          created_at?: string
          customer_name: string
          customer_whatsapp: string
          id?: string
          merchant_id: string
          recovered_at?: string | null
          recovered_order_id?: string | null
          reminder_sent_at?: string | null
          updated_at?: string
        }
        Update: {
          cart_item_count?: number
          cart_total_nad?: number
          created_at?: string
          customer_name?: string
          customer_whatsapp?: string
          id?: string
          merchant_id?: string
          recovered_at?: string | null
          recovered_order_id?: string | null
          reminder_sent_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "abandoned_checkouts_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "abandoned_checkouts_recovered_order_id_fkey"
            columns: ["recovered_order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_actions: {
        Row: {
          action: string
          admin_user_id: string | null
          created_at: string
          details: Json | null
          id: string
          target_id: string
          target_type: string
        }
        Insert: {
          action: string
          admin_user_id?: string | null
          created_at?: string
          details?: Json | null
          id?: string
          target_id: string
          target_type: string
        }
        Update: {
          action?: string
          admin_user_id?: string | null
          created_at?: string
          details?: Json | null
          id?: string
          target_id?: string
          target_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_actions_admin_user_id_fkey"
            columns: ["admin_user_id"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_password_reset_tokens: {
        Row: {
          admin_user_id: string
          created_at: string
          expires_at: string
          id: string
          token_hash: string
          used_at: string | null
        }
        Insert: {
          admin_user_id: string
          created_at?: string
          expires_at: string
          id?: string
          token_hash: string
          used_at?: string | null
        }
        Update: {
          admin_user_id?: string
          created_at?: string
          expires_at?: string
          id?: string
          token_hash?: string
          used_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "admin_password_reset_tokens_admin_user_id_fkey"
            columns: ["admin_user_id"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_users: {
        Row: {
          created_at: string
          created_by: string | null
          email: string
          id: string
          role: Database["public"]["Enums"]["admin_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          email: string
          id?: string
          role: Database["public"]["Enums"]["admin_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          email?: string
          id?: string
          role?: Database["public"]["Enums"]["admin_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_users_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
        ]
      }
      broadcast_sends: {
        Row: {
          customer_id: string
          id: string
          merchant_id: string
          sent_at: string
          template_id: string | null
        }
        Insert: {
          customer_id: string
          id?: string
          merchant_id: string
          sent_at?: string
          template_id?: string | null
        }
        Update: {
          customer_id?: string
          id?: string
          merchant_id?: string
          sent_at?: string
          template_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "broadcast_sends_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "broadcast_sends_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "broadcast_sends_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "broadcast_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      broadcast_templates: {
        Row: {
          body: string
          created_at: string
          id: string
          merchant_id: string | null
          name: string
          updated_at: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          merchant_id?: string | null
          name: string
          updated_at?: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          merchant_id?: string | null
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "broadcast_templates_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          created_at: string
          id: string
          image_url: string | null
          merchant_id: string
          name: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          id?: string
          image_url?: string | null
          merchant_id: string
          name: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          id?: string
          image_url?: string | null
          merchant_id?: string
          name?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "categories_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
        ]
      }
      coupons: {
        Row: {
          code: string
          created_at: string
          current_uses: number
          discount_type: Database["public"]["Enums"]["discount_type"]
          discount_value: number
          expires_at: string | null
          id: string
          is_active: boolean
          max_uses: number | null
          merchant_id: string
          min_order_nad: number | null
          starts_at: string | null
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          current_uses?: number
          discount_type?: Database["public"]["Enums"]["discount_type"]
          discount_value: number
          expires_at?: string | null
          id?: string
          is_active?: boolean
          max_uses?: number | null
          merchant_id: string
          min_order_nad?: number | null
          starts_at?: string | null
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          current_uses?: number
          discount_type?: Database["public"]["Enums"]["discount_type"]
          discount_value?: number
          expires_at?: string | null
          id?: string
          is_active?: boolean
          max_uses?: number | null
          merchant_id?: string
          min_order_nad?: number | null
          starts_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "coupons_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          created_at: string
          id: string
          marketing_opt_out: boolean
          merchant_id: string
          name: string | null
          notes: string | null
          updated_at: string
          whatsapp: string
        }
        Insert: {
          created_at?: string
          id?: string
          marketing_opt_out?: boolean
          merchant_id: string
          name?: string | null
          notes?: string | null
          updated_at?: string
          whatsapp: string
        }
        Update: {
          created_at?: string
          id?: string
          marketing_opt_out?: boolean
          merchant_id?: string
          name?: string | null
          notes?: string | null
          updated_at?: string
          whatsapp?: string
        }
        Relationships: [
          {
            foreignKeyName: "customers_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
        ]
      }
      merchant_announcements: {
        Row: {
          audience_filter: string
          created_at: string
          created_by: string | null
          failed_count: number
          id: string
          recipient_count: number
          sent_at: string | null
          sent_count: number
          status: string
          template_name: string
          title: string
          variables: Json
        }
        Insert: {
          audience_filter: string
          created_at?: string
          created_by?: string | null
          failed_count?: number
          id?: string
          recipient_count?: number
          sent_at?: string | null
          sent_count?: number
          status?: string
          template_name: string
          title: string
          variables?: Json
        }
        Update: {
          audience_filter?: string
          created_at?: string
          created_by?: string | null
          failed_count?: number
          id?: string
          recipient_count?: number
          sent_at?: string | null
          sent_count?: number
          status?: string
          template_name?: string
          title?: string
          variables?: Json
        }
        Relationships: [
          {
            foreignKeyName: "merchant_announcements_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
        ]
      }
      merchants: {
        Row: {
          accepted_payment_methods: string[] | null
          api_key: string | null
          bank_account_holder: string | null
          bank_account_number: string | null
          bank_branch_code: string | null
          bank_name: string | null
          callout_fee_nad: number
          cart_recovery_enabled: boolean
          created_at: string
          delivery_estimate: string | null
          delivery_fee_nad: number | null
          delivery_slots: Json | null
          description: string | null
          enabled_delivery_providers: string[]
          ewallet_number: string | null
          ewallet_provider: string | null
          getting_started_dismissed: boolean | null
          id: string
          industry: string | null
          is_active: boolean
          is_demo: boolean
          logo_url: string | null
          momo_number: string | null
          pay2cell_number: string | null
          paytoday_number: string | null
          wayame_number: string | null
          pickup_address: string | null
          pop_required: boolean
          prohibited_policy_accepted_at: string | null
          prohibited_policy_accepted_ip: unknown
          prohibited_policy_version: string | null
          referred_by_code: string | null
          region: string | null
          safety_notes: string | null
          store_link_shared: boolean | null
          store_name: string
          store_slug: string
          store_status: Database["public"]["Enums"]["store_status"]
          suspended_reason: string | null
          tos_accepted_at: string | null
          town: string | null
          updated_at: string
          user_id: string
          vat_inclusive: boolean
          vat_number: string | null
          whatsapp_number: string
        }
        Insert: {
          accepted_payment_methods?: string[] | null
          api_key?: string | null
          bank_account_holder?: string | null
          bank_account_number?: string | null
          bank_branch_code?: string | null
          bank_name?: string | null
          callout_fee_nad?: number
          cart_recovery_enabled?: boolean
          created_at?: string
          delivery_estimate?: string | null
          delivery_fee_nad?: number | null
          delivery_slots?: Json | null
          description?: string | null
          enabled_delivery_providers?: string[]
          ewallet_number?: string | null
          ewallet_provider?: string | null
          getting_started_dismissed?: boolean | null
          id?: string
          industry?: string | null
          is_active?: boolean
          is_demo?: boolean
          logo_url?: string | null
          momo_number?: string | null
          pay2cell_number?: string | null
          paytoday_number?: string | null
          wayame_number?: string | null
          pickup_address?: string | null
          pop_required?: boolean
          prohibited_policy_accepted_at?: string | null
          prohibited_policy_accepted_ip?: unknown
          prohibited_policy_version?: string | null
          referred_by_code?: string | null
          region?: string | null
          safety_notes?: string | null
          store_link_shared?: boolean | null
          store_name: string
          store_slug: string
          store_status?: Database["public"]["Enums"]["store_status"]
          suspended_reason?: string | null
          tos_accepted_at?: string | null
          town?: string | null
          updated_at?: string
          user_id: string
          vat_inclusive?: boolean
          vat_number?: string | null
          whatsapp_number: string
        }
        Update: {
          accepted_payment_methods?: string[] | null
          api_key?: string | null
          bank_account_holder?: string | null
          bank_account_number?: string | null
          bank_branch_code?: string | null
          bank_name?: string | null
          callout_fee_nad?: number
          cart_recovery_enabled?: boolean
          created_at?: string
          delivery_estimate?: string | null
          delivery_fee_nad?: number | null
          delivery_slots?: Json | null
          description?: string | null
          enabled_delivery_providers?: string[]
          ewallet_number?: string | null
          ewallet_provider?: string | null
          getting_started_dismissed?: boolean | null
          id?: string
          industry?: string | null
          is_active?: boolean
          is_demo?: boolean
          logo_url?: string | null
          momo_number?: string | null
          pay2cell_number?: string | null
          paytoday_number?: string | null
          wayame_number?: string | null
          pickup_address?: string | null
          pop_required?: boolean
          prohibited_policy_accepted_at?: string | null
          prohibited_policy_accepted_ip?: unknown
          prohibited_policy_version?: string | null
          referred_by_code?: string | null
          region?: string | null
          safety_notes?: string | null
          store_link_shared?: boolean | null
          store_name?: string
          store_slug?: string
          store_status?: Database["public"]["Enums"]["store_status"]
          suspended_reason?: string | null
          tos_accepted_at?: string | null
          town?: string | null
          updated_at?: string
          user_id?: string
          vat_inclusive?: boolean
          vat_number?: string | null
          whatsapp_number?: string
        }
        Relationships: []
      }
      order_items: {
        Row: {
          created_at: string
          id: string
          line_total: number
          order_id: string
          product_id: string | null
          product_name: string
          product_price: number
          product_variant_id: string | null
          quantity: number
          variant_attributes: Json
          variant_sku: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          line_total: number
          order_id: string
          product_id?: string | null
          product_name: string
          product_price: number
          product_variant_id?: string | null
          quantity: number
          variant_attributes?: Json
          variant_sku?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          line_total?: number
          order_id?: string
          product_id?: string | null
          product_name?: string
          product_price?: number
          product_variant_id?: string | null
          quantity?: number
          variant_attributes?: Json
          variant_sku?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_variant_id_fkey"
            columns: ["product_variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      order_payments: {
        Row: {
          amount_nad: number
          id: string
          merchant_id: string
          method: string | null
          note: string | null
          order_id: string
          paid_at: string
          recorded_at: string
          reference: string | null
          voided_at: string | null
        }
        Insert: {
          amount_nad: number
          id?: string
          merchant_id: string
          method?: string | null
          note?: string | null
          order_id: string
          paid_at: string
          recorded_at?: string
          reference?: string | null
          voided_at?: string | null
        }
        Update: {
          amount_nad?: number
          id?: string
          merchant_id?: string
          method?: string | null
          note?: string | null
          order_id?: string
          paid_at?: string
          recorded_at?: string
          reference?: string | null
          voided_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "order_payments_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_payments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          callout_fee_nad: number
          coupon_id: string | null
          created_at: string
          customer_name: string
          customer_whatsapp: string
          delivery_address: string | null
          delivery_date: string | null
          delivery_fee_nad: number | null
          delivery_method: Database["public"]["Enums"]["delivery_method"]
          delivery_provider: string
          delivery_time: string | null
          discount_nad: number | null
          dpo_transaction_token: string | null
          id: string
          last_reminder_at: string | null
          merchant_id: string
          notes: string | null
          order_number: number
          payment_method: Database["public"]["Enums"]["payment_method"] | null
          payment_reference: string | null
          proof_of_payment_url: string | null
          reminder_count: number
          status: Database["public"]["Enums"]["order_status"]
          status_history: Json
          subtotal_nad: number
          tracking_token: string | null
          updated_at: string
          vat_inclusive: boolean
          vat_nad: number
          vat_number: string | null
          vat_rate_bps: number
        }
        Insert: {
          callout_fee_nad?: number
          coupon_id?: string | null
          created_at?: string
          customer_name: string
          customer_whatsapp: string
          delivery_address?: string | null
          delivery_date?: string | null
          delivery_fee_nad?: number | null
          delivery_method?: Database["public"]["Enums"]["delivery_method"]
          delivery_provider?: string
          delivery_time?: string | null
          discount_nad?: number | null
          dpo_transaction_token?: string | null
          id?: string
          last_reminder_at?: string | null
          merchant_id: string
          notes?: string | null
          order_number: number
          payment_method?: Database["public"]["Enums"]["payment_method"] | null
          payment_reference?: string | null
          proof_of_payment_url?: string | null
          reminder_count?: number
          status?: Database["public"]["Enums"]["order_status"]
          status_history?: Json
          subtotal_nad: number
          tracking_token?: string | null
          updated_at?: string
          vat_inclusive?: boolean
          vat_nad?: number
          vat_number?: string | null
          vat_rate_bps?: number
        }
        Update: {
          callout_fee_nad?: number
          coupon_id?: string | null
          created_at?: string
          customer_name?: string
          customer_whatsapp?: string
          delivery_address?: string | null
          delivery_date?: string | null
          delivery_fee_nad?: number | null
          delivery_method?: Database["public"]["Enums"]["delivery_method"]
          delivery_provider?: string
          delivery_time?: string | null
          discount_nad?: number | null
          dpo_transaction_token?: string | null
          id?: string
          last_reminder_at?: string | null
          merchant_id?: string
          notes?: string | null
          order_number?: number
          payment_method?: Database["public"]["Enums"]["payment_method"] | null
          payment_reference?: string | null
          proof_of_payment_url?: string | null
          reminder_count?: number
          status?: Database["public"]["Enums"]["order_status"]
          status_history?: Json
          subtotal_nad?: number
          tracking_token?: string | null
          updated_at?: string
          vat_inclusive?: boolean
          vat_nad?: number
          vat_number?: string | null
          vat_rate_bps?: number
        }
        Relationships: [
          {
            foreignKeyName: "orders_coupon_id_fkey"
            columns: ["coupon_id"]
            isOneToOne: false
            referencedRelation: "coupons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount_nad: number
          created_at: string
          id: string
          merchant_id: string
          notes: string | null
          payment_method: string
          period_end: string
          period_start: string
          recorded_by: string | null
          reference: string | null
          subscription_id: string | null
          voided_at: string | null
        }
        Insert: {
          amount_nad: number
          created_at?: string
          id?: string
          merchant_id: string
          notes?: string | null
          payment_method: string
          period_end: string
          period_start: string
          recorded_by?: string | null
          reference?: string | null
          subscription_id?: string | null
          voided_at?: string | null
        }
        Update: {
          amount_nad?: number
          created_at?: string
          id?: string
          merchant_id?: string
          notes?: string | null
          payment_method?: string
          period_end?: string
          period_start?: string
          recorded_by?: string | null
          reference?: string | null
          subscription_id?: string | null
          voided_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_recorded_by_fkey"
            columns: ["recorded_by"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      phone_otp_codes: {
        Row: {
          attempts: number | null
          code_hash: string
          created_at: string | null
          expires_at: string
          id: string
          phone: string
          verified: boolean | null
        }
        Insert: {
          attempts?: number | null
          code_hash: string
          created_at?: string | null
          expires_at: string
          id?: string
          phone: string
          verified?: boolean | null
        }
        Update: {
          attempts?: number | null
          code_hash?: string
          created_at?: string | null
          expires_at?: string
          id?: string
          phone?: string
          verified?: boolean | null
        }
        Relationships: []
      }
      product_variants: {
        Row: {
          allow_backorder: boolean
          attributes: Json
          created_at: string
          id: string
          images: string[]
          is_available: boolean
          price_nad: number
          product_id: string
          sku: string
          sort_order: number
          source: string
          source_variation_id: string | null
          stock_quantity: number
          stock_status: string | null
          track_inventory: boolean
          updated_at: string
        }
        Insert: {
          allow_backorder?: boolean
          attributes?: Json
          created_at?: string
          id?: string
          images?: string[]
          is_available?: boolean
          price_nad: number
          product_id: string
          sku: string
          sort_order?: number
          source?: string
          source_variation_id?: string | null
          stock_quantity?: number
          stock_status?: string | null
          track_inventory?: boolean
          updated_at?: string
        }
        Update: {
          allow_backorder?: boolean
          attributes?: Json
          created_at?: string
          id?: string
          images?: string[]
          is_available?: boolean
          price_nad?: number
          product_id?: string
          sku?: string
          sort_order?: number
          source?: string
          source_variation_id?: string | null
          stock_quantity?: number
          stock_status?: string | null
          track_inventory?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_variants_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          allow_backorder: boolean | null
          category_id: string | null
          created_at: string
          deleted_at: string | null
          description: string | null
          id: string
          images: string[]
          is_available: boolean
          item_type: string
          low_stock_threshold: number | null
          merchant_id: string
          moderation_categories: string[]
          moderation_checked_at: string | null
          moderation_reasons: string[]
          moderation_source: string
          moderation_status: string
          name: string
          price_nad: number
          service_mode: string | null
          sku: string | null
          sort_order: number
          stock_quantity: number | null
          track_inventory: boolean | null
          updated_at: string
        }
        Insert: {
          allow_backorder?: boolean | null
          category_id?: string | null
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          id?: string
          images?: string[]
          is_available?: boolean
          item_type?: string
          low_stock_threshold?: number | null
          merchant_id: string
          moderation_categories?: string[]
          moderation_checked_at?: string | null
          moderation_reasons?: string[]
          moderation_source?: string
          moderation_status?: string
          name: string
          price_nad: number
          service_mode?: string | null
          sku?: string | null
          sort_order?: number
          stock_quantity?: number | null
          track_inventory?: boolean | null
          updated_at?: string
        }
        Update: {
          allow_backorder?: boolean | null
          category_id?: string | null
          created_at?: string
          deleted_at?: string | null
          description?: string | null
          id?: string
          images?: string[]
          is_available?: boolean
          item_type?: string
          low_stock_threshold?: number | null
          merchant_id?: string
          moderation_categories?: string[]
          moderation_checked_at?: string | null
          moderation_reasons?: string[]
          moderation_source?: string
          moderation_status?: string
          name?: string
          price_nad?: number
          service_mode?: string | null
          sku?: string | null
          sort_order?: number
          stock_quantity?: number | null
          track_inventory?: boolean | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
        ]
      }
      referral_payouts: {
        Row: {
          admin_note: string | null
          commission_nad: number
          id: string
          merchant_id: string
          paid_at: string
          paid_by: string | null
          paid_reference: string | null
          referrer_code: string
        }
        Insert: {
          admin_note?: string | null
          commission_nad: number
          id?: string
          merchant_id: string
          paid_at?: string
          paid_by?: string | null
          paid_reference?: string | null
          referrer_code: string
        }
        Update: {
          admin_note?: string | null
          commission_nad?: number
          id?: string
          merchant_id?: string
          paid_at?: string
          paid_by?: string | null
          paid_reference?: string | null
          referrer_code?: string
        }
        Relationships: [
          {
            foreignKeyName: "referral_payouts_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: true
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
        ]
      }
      referrers: {
        Row: {
          code: string
          created_at: string
          id: string
          is_active: boolean
          name: string
          notes: string | null
          payout_number: string | null
          whatsapp: string | null
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          notes?: string | null
          payout_number?: string | null
          whatsapp?: string | null
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          notes?: string | null
          payout_number?: string | null
          whatsapp?: string | null
        }
        Relationships: []
      }
      reports: {
        Row: {
          admin_notes: string | null
          created_at: string
          details: string | null
          id: string
          merchant_id: string
          reason: string
          reporter_contact: string | null
          reporter_name: string | null
          status: string
          updated_at: string
        }
        Insert: {
          admin_notes?: string | null
          created_at?: string
          details?: string | null
          id?: string
          merchant_id: string
          reason: string
          reporter_contact?: string | null
          reporter_name?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          admin_notes?: string | null
          created_at?: string
          details?: string | null
          id?: string
          merchant_id?: string
          reason?: string
          reporter_contact?: string | null
          reporter_name?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reports_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
        ]
      }
      reviews: {
        Row: {
          comment: string | null
          created_at: string
          customer_name: string | null
          id: string
          is_published: boolean
          merchant_id: string
          merchant_replied_at: string | null
          merchant_reply: string | null
          order_id: string
          rating: number
        }
        Insert: {
          comment?: string | null
          created_at?: string
          customer_name?: string | null
          id?: string
          is_published?: boolean
          merchant_id: string
          merchant_replied_at?: string | null
          merchant_reply?: string | null
          order_id: string
          rating: number
        }
        Update: {
          comment?: string | null
          created_at?: string
          customer_name?: string | null
          id?: string
          is_published?: boolean
          merchant_id?: string
          merchant_replied_at?: string | null
          merchant_reply?: string | null
          order_id?: string
          rating?: number
        }
        Relationships: [
          {
            foreignKeyName: "reviews_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: true
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      safety_reviews: {
        Row: {
          admin_notes: string | null
          categories: string[]
          content_excerpt: string | null
          created_at: string
          id: string
          merchant_id: string
          merchant_message: string | null
          product_id: string | null
          reasons: string[]
          resolved_at: string | null
          review_type: string
          severity: string
          status: string
          updated_at: string
        }
        Insert: {
          admin_notes?: string | null
          categories?: string[]
          content_excerpt?: string | null
          created_at?: string
          id?: string
          merchant_id: string
          merchant_message?: string | null
          product_id?: string | null
          reasons?: string[]
          resolved_at?: string | null
          review_type: string
          severity: string
          status?: string
          updated_at?: string
        }
        Update: {
          admin_notes?: string | null
          categories?: string[]
          content_excerpt?: string | null
          created_at?: string
          id?: string
          merchant_id?: string
          merchant_message?: string | null
          product_id?: string | null
          reasons?: string[]
          resolved_at?: string | null
          review_type?: string
          severity?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "safety_reviews_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "safety_reviews_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_adjustments: {
        Row: {
          change: number
          created_at: string | null
          id: string
          merchant_id: string
          new_quantity: number
          order_id: string | null
          previous_quantity: number
          product_id: string | null
          reason: string
        }
        Insert: {
          change: number
          created_at?: string | null
          id?: string
          merchant_id: string
          new_quantity: number
          order_id?: string | null
          previous_quantity: number
          product_id?: string | null
          reason?: string
        }
        Update: {
          change?: number
          created_at?: string | null
          id?: string
          merchant_id?: string
          new_quantity?: number
          order_id?: string | null
          previous_quantity?: number
          product_id?: string | null
          reason?: string
        }
        Relationships: [
          {
            foreignKeyName: "stock_adjustments_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_adjustments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_adjustments_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      store_analytics: {
        Row: {
          created_at: string
          date: string
          id: string
          merchant_id: string
          orders_confirmed: number
          orders_placed: number
          page_views: number
          revenue_nad: number
        }
        Insert: {
          created_at?: string
          date: string
          id?: string
          merchant_id: string
          orders_confirmed?: number
          orders_placed?: number
          page_views?: number
          revenue_nad?: number
        }
        Update: {
          created_at?: string
          date?: string
          id?: string
          merchant_id?: string
          orders_confirmed?: number
          orders_placed?: number
          page_views?: number
          revenue_nad?: number
        }
        Relationships: [
          {
            foreignKeyName: "store_analytics_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          cancel_at_period_end: boolean
          created_at: string
          current_period_end: string | null
          current_period_start: string | null
          dpo_transaction_token: string | null
          grace_ends_at: string | null
          id: string
          merchant_id: string
          payment_reference: string | null
          pending_amount_cents: number | null
          pending_months: number | null
          pending_tier: string | null
          soft_suspended_at: string | null
          status: Database["public"]["Enums"]["subscription_status"]
          tier: Database["public"]["Enums"]["subscription_tier"]
          trial_ends_at: string | null
          updated_at: string
        }
        Insert: {
          cancel_at_period_end?: boolean
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          dpo_transaction_token?: string | null
          grace_ends_at?: string | null
          id?: string
          merchant_id: string
          payment_reference?: string | null
          pending_amount_cents?: number | null
          pending_months?: number | null
          pending_tier?: string | null
          soft_suspended_at?: string | null
          status?: Database["public"]["Enums"]["subscription_status"]
          tier?: Database["public"]["Enums"]["subscription_tier"]
          trial_ends_at?: string | null
          updated_at?: string
        }
        Update: {
          cancel_at_period_end?: boolean
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          dpo_transaction_token?: string | null
          grace_ends_at?: string | null
          id?: string
          merchant_id?: string
          payment_reference?: string | null
          pending_amount_cents?: number | null
          pending_months?: number | null
          pending_tier?: string | null
          soft_suspended_at?: string | null
          status?: Database["public"]["Enums"]["subscription_status"]
          tier?: Database["public"]["Enums"]["subscription_tier"]
          trial_ends_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: true
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
        ]
      }
      tier_limits: {
        Row: {
          has_branding: boolean
          has_coupons: boolean
          has_inventory: boolean
          max_orders_per_month: number
          max_products: number
          price_nad: number
          tier: Database["public"]["Enums"]["subscription_tier"]
        }
        Insert: {
          has_branding?: boolean
          has_coupons?: boolean
          has_inventory?: boolean
          max_orders_per_month: number
          max_products: number
          price_nad?: number
          tier: Database["public"]["Enums"]["subscription_tier"]
        }
        Update: {
          has_branding?: boolean
          has_coupons?: boolean
          has_inventory?: boolean
          max_orders_per_month?: number
          max_products?: number
          price_nad?: number
          tier?: Database["public"]["Enums"]["subscription_tier"]
        }
        Relationships: []
      }
      whatsapp_messages: {
        Row: {
          category: string | null
          created_at: string
          delivered_at: string | null
          error_message: string | null
          event_key: string | null
          id: string
          merchant_id: string | null
          meta_message_id: string | null
          order_id: string | null
          read_at: string | null
          recipient_phone: string
          recipient_type: string | null
          sent_at: string | null
          status: string
          template_name: string
          variables: Json
        }
        Insert: {
          category?: string | null
          created_at?: string
          delivered_at?: string | null
          error_message?: string | null
          event_key?: string | null
          id?: string
          merchant_id?: string | null
          meta_message_id?: string | null
          order_id?: string | null
          read_at?: string | null
          recipient_phone: string
          recipient_type?: string | null
          sent_at?: string | null
          status?: string
          template_name: string
          variables?: Json
        }
        Update: {
          category?: string | null
          created_at?: string
          delivered_at?: string | null
          error_message?: string | null
          event_key?: string | null
          id?: string
          merchant_id?: string | null
          meta_message_id?: string | null
          order_id?: string | null
          read_at?: string | null
          recipient_phone?: string
          recipient_type?: string | null
          sent_at?: string | null
          status?: string
          template_name?: string
          variables?: Json
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_messages_merchant_id_fkey"
            columns: ["merchant_id"]
            isOneToOne: false
            referencedRelation: "merchants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_messages_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_revoke_user_sessions: {
        Args: { p_user_id: string }
        Returns: undefined
      }
      append_order_status: {
        Args: { p_order_id: string; p_status: string }
        Returns: undefined
      }
      check_expired_subscriptions: { Args: never; Returns: undefined }
      cleanup_expired_otp_codes: { Args: never; Returns: undefined }
      get_merchant_customers: {
        Args: { p_merchant_id: string }
        Returns: {
          completed_orders: number
          created_at: string
          id: string
          last_order_at: string
          marketing_opt_out: boolean
          name: string
          notes: string
          total_orders: number
          total_spent_nad: number
          whatsapp: string
        }[]
      }
      get_my_merchant: {
        Args: never
        Returns: {
          accepted_payment_methods: string[] | null
          api_key: string | null
          bank_account_holder: string | null
          bank_account_number: string | null
          bank_branch_code: string | null
          bank_name: string | null
          callout_fee_nad: number
          cart_recovery_enabled: boolean
          created_at: string
          delivery_estimate: string | null
          delivery_fee_nad: number | null
          delivery_slots: Json | null
          description: string | null
          enabled_delivery_providers: string[]
          ewallet_number: string | null
          ewallet_provider: string | null
          getting_started_dismissed: boolean | null
          id: string
          industry: string | null
          is_active: boolean
          is_demo: boolean
          logo_url: string | null
          momo_number: string | null
          pay2cell_number: string | null
          paytoday_number: string | null
          wayame_number: string | null
          pickup_address: string | null
          pop_required: boolean
          prohibited_policy_accepted_at: string | null
          prohibited_policy_accepted_ip: unknown
          prohibited_policy_version: string | null
          referred_by_code: string | null
          region: string | null
          safety_notes: string | null
          store_link_shared: boolean | null
          store_name: string
          store_slug: string
          store_status: Database["public"]["Enums"]["store_status"]
          suspended_reason: string | null
          tos_accepted_at: string | null
          town: string | null
          updated_at: string
          user_id: string
          vat_inclusive: boolean
          vat_number: string | null
          whatsapp_number: string
        }[]
        SetofOptions: {
          from: "*"
          to: "merchants"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_store_preview_images: {
        Args: { p_merchant_ids: string[] }
        Returns: {
          image: string
          merchant_id: string
        }[]
      }
      get_store_rating: {
        Args: { p_merchant_id: string }
        Returns: {
          average: number
          total: number
        }[]
      }
      normalize_na_phone: { Args: { p_phone: string }; Returns: string }
      place_order:
        | {
            Args: {
              p_coupon_code?: string
              p_customer_name: string
              p_customer_whatsapp: string
              p_delivery_address?: string
              p_delivery_date?: string
              p_delivery_fee?: number
              p_delivery_method: string
              p_delivery_time?: string
              p_discount_nad?: number
              p_items?: Json
              p_merchant_id: string
              p_notes?: string
              p_payment_method?: string
              p_payment_ref?: string
              p_proof_url?: string
              p_subtotal_nad: number
            }
            Returns: {
              order_id: string
              order_number: number
              payment_reference: string
              tracking_token: string
            }[]
          }
        | {
            Args: {
              p_coupon_code?: string
              p_customer_name: string
              p_customer_whatsapp: string
              p_delivery_address?: string
              p_delivery_date?: string
              p_delivery_fee?: number
              p_delivery_method: string
              p_delivery_provider: string
              p_delivery_time?: string
              p_discount_nad?: number
              p_items?: Json
              p_merchant_id: string
              p_notes?: string
              p_payment_method?: string
              p_payment_ref?: string
              p_proof_url?: string
              p_subtotal_nad: number
            }
            Returns: {
              order_id: string
              order_number: number
              payment_reference: string
              tracking_token: string
            }[]
          }
      safety_scan_values: {
        Args: { p_values: string[] }
        Returns: {
          categories: string[]
          reasons: string[]
          severity: string
        }[]
      }
      storefront_category_meta: {
        Args: { p_merchant_id: string }
        Returns: {
          category_id: string
          preview_images: string[]
          product_count: number
        }[]
      }
    }
    Enums: {
      admin_role: "super_admin" | "support" | "finance"
      delivery_method: "pickup" | "delivery"
      discount_type: "percentage" | "fixed"
      order_status:
        | "pending"
        | "confirmed"
        | "ready"
        | "completed"
        | "cancelled"
      payment_method:
        | "eft"
        | "cod"
        | "momo"
        | "ewallet"
        | "pay2cell"
        | "dpo"
        | "paytoday"
        | "wayame"
      store_status: "pending" | "active" | "suspended" | "banned"
      subscription_status:
        | "trial"
        | "active"
        | "grace"
        | "soft_suspended"
        | "hard_suspended"
      subscription_tier: "oshi_start" | "oshi_basic" | "oshi_grow" | "oshi_pro"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      admin_role: ["super_admin", "support", "finance"],
      delivery_method: ["pickup", "delivery"],
      discount_type: ["percentage", "fixed"],
      order_status: ["pending", "confirmed", "ready", "completed", "cancelled"],
      payment_method: [
        "eft",
        "cod",
        "momo",
        "ewallet",
        "pay2cell",
        "dpo",
        "paytoday",
        "wayame",
      ],
      store_status: ["pending", "active", "suspended", "banned"],
      subscription_status: [
        "trial",
        "active",
        "grace",
        "soft_suspended",
        "hard_suspended",
      ],
      subscription_tier: ["oshi_start", "oshi_basic", "oshi_grow", "oshi_pro"],
    },
  },
} as const
