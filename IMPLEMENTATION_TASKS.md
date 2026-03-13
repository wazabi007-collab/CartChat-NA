# Implementation Tasks — P0 Features

> Generated: 2026-03-11
> Scope: Inventory system + Industry signup + Delivery fee
> Status: **P0 and P1 all COMPLETE and DEPLOYED** (as of 2026-03-13)
>
> **Note:** Admin Dashboard + Subscription Tier System tracked in TASKS.md (ADMIN section).
> Industry-Themed Storefronts tracked in TASKS.md (THEME section).

---

## Ship in 7 Days — P0 Sprint

### 1. Database Migration: Inventory + Industry Fields
- [ ] Create migration `005_inventory_and_industry.sql`
- [ ] Add `track_inventory boolean DEFAULT false` to products
- [ ] Add `stock_quantity integer DEFAULT 0` to products
- [ ] Add `low_stock_threshold integer DEFAULT 5` to products
- [ ] Add `allow_backorder boolean DEFAULT false` to products
- [ ] Add CHECK constraint: `allow_backorder = true OR stock_quantity >= 0`
- [ ] Add `industry text DEFAULT 'other'` to merchants
- [ ] Add `delivery_fee_nad integer DEFAULT 0` to merchants
- [ ] Create `stock_adjustments` audit table (id, product_id, merchant_id, previous_quantity, new_quantity, change, reason, order_id, created_at)
- [ ] Add RLS policies for stock_adjustments (merchant read/insert own)
- [ ] Test migration locally against docker-compose
- [ ] Apply migration to production DB

### 2. Update place_order() RPC — Stock Deduction
- [ ] Create migration `006_place_order_v2.sql`
- [ ] Add FOR UPDATE row lock on each product in cart
- [ ] Add stock check: IF stock < quantity AND NOT allow_backorder → RAISE EXCEPTION
- [ ] Add stock deduction: UPDATE stock_quantity = stock_quantity - quantity
- [ ] Insert stock_adjustment record for each deduction (reason: 'order')
- [ ] Test with concurrent transactions (two sessions, same product)
- [ ] Test with track_inventory = false products (should skip check)

### 3. Add cancel_order() Restock Function
- [ ] Create `cancel_order_restock()` function or trigger
- [ ] On order status change to 'cancelled': restock each order_item
- [ ] Only restock products where track_inventory = true AND product still exists
- [ ] Insert stock_adjustment record for each restock (reason: 'cancel')
- [ ] Test: create order → stock deducted → cancel → stock restored

### 4. Signup Flow — Industry Selection
- [ ] Add industry dropdown to signup page (after OTP, before store setup)
- [ ] Dropdown with 28 industries + "Other" (free text input)
- [ ] Save industry to merchants table on store setup
- [ ] Style consistent with existing signup UI (green theme, Tailwind)
- [ ] Mobile-responsive dropdown

### 5. Product Create/Edit — Inventory Controls
- [ ] Add "Track Inventory" toggle to product form
- [ ] When enabled, show: Stock Quantity input, Low Stock Threshold input, Allow Backorder toggle
- [ ] When disabled, hide stock fields (collapse)
- [ ] Validate: stock_quantity >= 0 (unless backorder)
- [ ] Save inventory fields via existing product API
- [ ] Update product API (POST /api/products) to handle new fields
- [ ] Update product edit page to load/save inventory fields

### 6. Products List — Stock Column
- [ ] Add "Stock" column to dashboard products grid
- [ ] Show: quantity number + color badge (green/orange/red/gray)
- [ ] Green: in stock (above threshold)
- [ ] Orange: low stock (at or below threshold)
- [ ] Red: out of stock (0 and no backorder)
- [ ] Gray: "Not tracked" (track_inventory = false)
- [ ] Sort/filter by stock status (optional, nice-to-have)

### 7. Dashboard Home — Low Stock Alerts
- [ ] Query products WHERE track_inventory = true AND stock_quantity <= low_stock_threshold
- [ ] Show warning card on dashboard: "X products low on stock"
- [ ] Link to products page filtered by low stock
- [ ] Show product name + current quantity for top 5 lowest

### 8. Storefront — Stock Display
- [ ] Product card: show stock badge (In Stock / Low Stock / Out of Stock)
- [ ] Low stock: "Only X left!" in orange text
- [ ] Out of stock: disable "Add to Cart" button, show "Out of Stock" red badge
- [ ] Product detail page: same stock status display
- [ ] Hide out-of-stock products from main grid (or show at bottom grayed out)

### 9. Checkout — Stock Validation
- [ ] Pre-checkout validation: check stock for all cart items before showing checkout form
- [ ] If any item out of stock: show error, highlight item, suggest removing
- [ ] place_order() already handles server-side (from task 2), but client-side UX needed
- [ ] Handle race condition error gracefully: "Sorry, {product} just sold out. Please update your cart."
- [ ] Clear sold-out items from localStorage cart on error

### 10. Delivery Fee — Flat Rate
- [ ] Add `delivery_fee_nad` to merchant settings page
- [ ] Input: "Delivery Fee (NAD)" — integer, default 0 (free)
- [ ] Show delivery fee at checkout when delivery method = "delivery"
- [ ] Add to order total: subtotal + delivery_fee = total
- [ ] Display on invoice
- [ ] Add `delivery_fee_nad` column to orders table (snapshot at order time)
- [ ] Update place_order() RPC to accept and store delivery_fee

### 11. E2E Tests
- [ ] Test: product with track_inventory, create order, verify stock deducted
- [ ] Test: product out of stock, verify checkout blocked
- [ ] Test: order cancelled, verify stock restored
- [ ] Test: product without tracking, verify no stock check
- [ ] Test: signup with industry selection
- [ ] Test: delivery fee displayed and calculated correctly
- [ ] Test: concurrent checkout (two browsers, last item) — one succeeds, one fails
- [ ] Update existing 24 tests if any break from schema changes

---

## Ship in 30 Days — P1 Features

### 12. Discount/Coupon Codes
- [ ] Create `discount_codes` table (id, merchant_id, code, type: percentage/fixed, value, min_order, max_uses, used_count, active, expires_at)
- [ ] Dashboard: CRUD for discount codes
- [ ] Checkout: coupon input field + "Apply" button
- [ ] Validate code: active, not expired, under max_uses, meets min_order
- [ ] Apply discount to subtotal
- [ ] Store discount on order record

### 13. Cash on Delivery
- [ ] Add 'cod' to payment options (alongside EFT)
- [ ] Merchant setting: enable/disable COD
- [ ] Checkout: show COD option (no proof upload needed)
- [ ] Order marked as payment_status: 'pending_cod'
- [ ] Merchant confirms payment on delivery

### 14. Customer List + Order History
- [ ] Dashboard: `/dashboard/customers` page
- [ ] Aggregate unique customers from orders (by WhatsApp number)
- [ ] Show: name, WhatsApp, order count, total spent, last order date
- [ ] Click customer → see their order history
- [ ] WhatsApp button per customer

### 15. Low Stock Alerts (Enhanced)
- [ ] Merchant setting: low stock notification (on/off)
- [ ] When stock hits threshold: show in-app notification bell
- [ ] V2: WhatsApp alert to merchant

### 16. Product Variants
- [ ] Create `product_variants` table (id, product_id, name, options JSON, price_nad, stock_quantity, sku)
- [ ] Product form: add variant builder (size/color matrix)
- [ ] Storefront: variant selector on product detail
- [ ] Checkout: variant info in order_items
- [ ] Stock tracking per variant

### 17. Payment Gateway (PayToday/PayFast)
- [ ] Research PayToday API (Namibia)
- [ ] Implement payment initiation endpoint
- [ ] Implement callback/webhook for payment confirmation
- [ ] Auto-confirm order on successful payment
- [ ] Add payment_method field to orders

---

## API Endpoints to Add/Update

| Method | Endpoint | Change | Task |
|--------|----------|--------|------|
| PATCH | `/api/products/[id]` | Accept inventory fields | #5 |
| POST | `/api/products` | Accept inventory fields | #5 |
| GET | `/api/products` | Return inventory fields for dashboard | #6 |
| RPC | `place_order()` | Stock deduction + delivery fee | #2, #10 |
| RPC | `cancel_order_restock()` | New: restock on cancel | #3 |
| PATCH | `/api/merchants/[id]` | Accept industry, delivery_fee | #4, #10 |
| GET | `/api/stock/low` | New: low stock products query | #7 |

---

## Frontend Changes Summary

| Page | Changes | Task |
|------|---------|------|
| `/auth/signup` or `/dashboard/setup` | Industry dropdown (new step) | #4 |
| `/dashboard/products/new` | Inventory toggle + stock fields | #5 |
| `/dashboard/products/[id]/edit` | Inventory toggle + stock fields | #5 |
| `/dashboard/products` | Stock column + badges | #6 |
| `/dashboard` (home) | Low stock alert cards | #7 |
| `/dashboard/settings` | Delivery fee input | #10 |
| `/s/[slug]` | Stock badges on product cards | #8 |
| `/s/[slug]/[productId]` | Stock status + "Only X left" | #8 |
| `/checkout/[slug]` | Stock validation + delivery fee line | #9, #10 |
| `/invoice/[orderId]` | Delivery fee line item | #10 |

---

## Test Plan

### Unit Tests
- [ ] Stock status logic function (in stock / low / out / backorder)
- [ ] Delivery fee calculation (subtotal + fee)
- [ ] Industry dropdown value validation

### Integration Tests
- [ ] place_order() with stock deduction (Supabase RPC)
- [ ] place_order() with insufficient stock (expect error)
- [ ] cancel order → restock (Supabase trigger)
- [ ] Concurrent place_order() calls (FOR UPDATE locking)
- [ ] Merchant settings save (industry + delivery fee)

### Playwright E2E Tests
- [ ] Signup → select industry → store setup → verify industry saved
- [ ] Add product with inventory tracking → verify stock display
- [ ] Customer adds to cart → checkout → verify stock deducted
- [ ] Customer tries to buy out-of-stock product → verify blocked
- [ ] Merchant cancels order → verify stock restored
- [ ] Checkout with delivery → verify delivery fee in total
- [ ] Two concurrent checkouts for last item → one succeeds, one gets error
- [ ] Existing 24 tests still pass (regression)
