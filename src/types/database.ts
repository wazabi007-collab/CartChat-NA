import type { Database } from "./supabase";

/**
 * Application-facing type aliases, derived from the generated schema.
 *
 * This file used to hand-maintain both the aliases and a partial `Database`
 * interface covering 14 of 37 tables. It drifted, as hand-maintained schema
 * copies do — and one of those drifts was live: PaymentMethod listed
 * "paytoday" while the Postgres enum did not, so TypeScript accepted a value
 * the database rejected and every PayToday order failed at runtime.
 *
 * Anything that mirrors the database now comes from ./supabase.ts, which is
 * generated. Only genuinely app-level types are written by hand below.
 */
export type { Json, Database } from "./supabase";

type Enums = Database["public"]["Enums"];

export type DeliveryMethod = Enums["delivery_method"];
export type PaymentMethod = Enums["payment_method"];
export type DiscountType = Enums["discount_type"];
export type OrderStatus = Enums["order_status"];
export type StoreStatus = Enums["store_status"];
export type SubscriptionTier = Enums["subscription_tier"];
export type SubscriptionStatus = Enums["subscription_status"];

/**
 * Hand-written because orders.delivery_provider is a plain text column, not a
 * Postgres enum, so there is nothing to derive from. Keep in step with
 * COURIER_TOWNS in lib/constants.ts.
 */
export type DeliveryProvider = "store" | "yango" | "indrive";

/** Convenience row helpers, so callers stop redeclaring table shapes locally. */
type Tables = Database["public"]["Tables"];
export type Row<T extends keyof Tables> = Tables[T]["Row"];

export type MerchantRow = Row<"merchants">;
export type ProductRow = Row<"products">;
export type OrderRow = Row<"orders">;
export type OrderItemRow = Row<"order_items">;
export type OrderPaymentRow = Row<"order_payments">;
