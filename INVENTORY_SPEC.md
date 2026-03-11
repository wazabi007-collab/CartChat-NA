# Inventory System Specification (P0)

> Generated: 2026-03-11 | Priority: P0 — Ship in 7 days
> Objective: Robust stock tracking that prevents overselling and shows real-time availability

---

## 1. Product Fields

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `track_inventory` | boolean | `false` | Whether to track stock for this product |
| `stock_quantity` | integer | `0` | Current stock count (only meaningful when track_inventory = true) |
| `low_stock_threshold` | integer | `5` | Alert when stock drops to or below this level |
| `allow_backorder` | boolean | `false` | Allow orders when stock = 0 |

**Existing field interaction:**
- `is_available` remains as manual override (merchant can hide product regardless of stock)
- When `track_inventory = true` AND `stock_quantity = 0` AND `allow_backorder = false` → product is effectively unavailable for purchase

---

## 2. Stock Status Logic

```
IF is_available = false:
  → "Unavailable" (manual override, merchant turned off)
ELSE IF track_inventory = false:
  → "In Stock" (no tracking, always available)
ELSE IF stock_quantity > low_stock_threshold:
  → "In Stock"
ELSE IF stock_quantity > 0:
  → "Low Stock" (show "Only X left!")
ELSE IF allow_backorder = true:
  → "Backorder" (show "Available on backorder")
ELSE:
  → "Out of Stock" (disable Add to Cart)
```

### Storefront Display

| Status | Badge Color | Cart Button | Customer Message |
|--------|------------|-------------|------------------|
| In Stock | Green | Enabled | (none or "In Stock") |
| Low Stock | Orange | Enabled | "Only {n} left!" |
| Backorder | Blue | Enabled | "Available on backorder" |
| Out of Stock | Red | Disabled | "Out of Stock" |
| Unavailable | Gray | Hidden | Product hidden from storefront |

---

## 3. Order → Stock Event Flow

### Happy Path: Order Created → Confirmed → Completed

```
Customer submits checkout
  └─→ place_order() RPC
       ├─ Create order + order_items (status: pending)
       ├─ FOR EACH item WHERE product.track_inventory = true:
       │    ├─ SELECT stock_quantity FROM products WHERE id = item.product_id FOR UPDATE
       │    ├─ IF stock_quantity < item.quantity AND NOT allow_backorder:
       │    │    └─ RAISE EXCEPTION 'Insufficient stock for {product_name}'
       │    └─ UPDATE products SET stock_quantity = stock_quantity - item.quantity
       └─ COMMIT (order + stock deduction are atomic)
```

### Cancellation: Restock

```
Merchant cancels order (status → cancelled)
  └─→ cancel_order() trigger or RPC
       └─ FOR EACH order_item WHERE product.track_inventory = true:
            └─ UPDATE products SET stock_quantity = stock_quantity + item.quantity
```

### Refund: Restock (same as cancel)

```
Future: If refund status added
  └─→ Same restock logic as cancellation
```

### State Transitions & Stock Effects

| Transition | Stock Effect |
|-----------|-------------|
| (new) → pending | **Deduct stock** (reserve on order creation) |
| pending → confirmed | No change (already deducted) |
| confirmed → completed | No change |
| pending → cancelled | **Restock** (return items) |
| confirmed → cancelled | **Restock** (return items) |

**Design decision**: Deduct on order creation (not on confirmation). This prevents overselling when multiple customers checkout simultaneously. If merchant cancels, stock returns automatically.

---

## 4. Concurrency Protection

### Race Condition: Two Customers Buy Last Item Simultaneously

**Solution: Row-level locking with `FOR UPDATE`**

```sql
-- Inside place_order() RPC (SECURITY DEFINER)
-- For each cart item:
SELECT stock_quantity
FROM products
WHERE id = p_product_id
FOR UPDATE;  -- Locks this row until transaction commits

-- Check stock
IF current_stock < requested_quantity AND NOT product_allow_backorder THEN
  RAISE EXCEPTION 'Insufficient stock for %', product_name;
END IF;

-- Deduct
UPDATE products
SET stock_quantity = stock_quantity - requested_quantity,
    updated_at = now()
WHERE id = p_product_id;
```

**Why FOR UPDATE works:**
1. Customer A's transaction locks the product row
2. Customer B's transaction waits (blocked on the lock)
3. Customer A commits → stock deducted
4. Customer B's lock releases → sees updated stock → insufficient → error returned
5. Customer B sees "Out of Stock" message

**No application-level locks needed.** PostgreSQL handles it.

---

## 5. Manual Stock Adjustments

### Use Cases
- Physical stock count correction
- Received new shipment
- Damaged goods write-off
- Theft/shrinkage adjustment

### Implementation

**Dashboard UI**: Product edit page gets "Adjust Stock" section:
- Current stock display
- "Set stock to" input (absolute)
- "Add/Remove" quick buttons (+1, +5, +10, -1, -5, -10)
- Reason dropdown: Recount, New shipment, Damaged, Returned, Other

**Audit Trail** (optional but recommended):
```sql
CREATE TABLE stock_adjustments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid REFERENCES products(id) ON DELETE CASCADE,
  merchant_id uuid REFERENCES merchants(id),
  previous_quantity integer NOT NULL,
  new_quantity integer NOT NULL,
  change integer NOT NULL, -- positive = added, negative = removed
  reason text, -- 'recount', 'shipment', 'damaged', 'returned', 'order', 'cancel', 'other'
  order_id uuid REFERENCES orders(id), -- if change was from an order
  created_at timestamptz DEFAULT now()
);
```

### Bulk Stock Update

**Dashboard UI**: Products list page gets "Bulk Update Stock" mode:
- Toggle into edit mode
- Inline stock quantity input per product
- "Save All" button
- Useful for daily stock counts

---

## 6. Real-Time Updates

### Customer-Facing (Storefront)

**Approach**: Server-side rendering (SSR) already fetches fresh data on each page load. No WebSocket needed for V1.

- `/s/[slug]` — product list shows stock badges (SSR, fresh on each visit)
- `/s/[slug]/[productId]` — product detail shows stock status + quantity hint
- Cart validation at checkout — re-check stock before `place_order()` RPC
- If stock changed between page load and checkout, show error: "Sorry, {product} is now out of stock"

**V2 enhancement**: Supabase Realtime subscription for live stock updates on product pages (nice-to-have, not needed for 3G Namibian use case).

### Merchant-Facing (Dashboard)

- Products page shows current stock column
- Orders page: after confirm/cancel, product stock updates immediately (next page load)
- Low stock alert: dashboard home shows warning cards for products at/below threshold
- **V2**: Push notification or WhatsApp alert when stock hits low threshold

---

## 7. Edge Cases

| Edge Case | Handling |
|-----------|---------|
| Product deleted while in someone's cart | `place_order()` checks product exists; returns error if not |
| Product stock set to 0 while in someone's cart | Checkout fails with "out of stock" message; cart preserved so customer can remove item |
| Merchant disables tracking on product with orders | Stock fields preserved but ignored; product shows "In Stock" |
| Merchant enables tracking on existing product | Must set initial stock_quantity (prompt on toggle) |
| Negative stock (bug) | DB CHECK constraint: `stock_quantity >= 0` (unless allow_backorder, then allow negative) |
| Cart quantity exceeds stock | Checkout validation: cap at available stock or reject |
| Two items in cart, only one in stock | Reject entire order (atomic) — customer adjusts cart |
| Merchant updates stock while order is being placed | FOR UPDATE lock prevents stale reads |
| Order cancelled after product deleted | Skip restock for deleted products (ON DELETE CASCADE handles cleanup) |

---

## 8. Stock Quantity Constraints

```sql
-- For products that don't allow backorder: stock >= 0
-- For products that allow backorder: stock can go negative
ALTER TABLE products ADD CONSTRAINT stock_quantity_check
  CHECK (allow_backorder = true OR stock_quantity >= 0);
```

---

## 9. Migration Path

### Phase 1 (Day 1-3): Schema + Backend
1. Add columns to products table
2. Update `place_order()` RPC with stock deduction + FOR UPDATE
3. Add cancel restock trigger/function
4. Add stock_adjustments audit table

### Phase 2 (Day 3-5): Dashboard UI
1. Product create/edit: inventory toggle + stock fields
2. Products list: stock column + low stock indicators
3. Dashboard home: low stock warning cards
4. Bulk stock update mode

### Phase 3 (Day 5-7): Storefront + Checkout
1. Storefront badges (In Stock / Low Stock / Out of Stock)
2. Checkout stock validation (pre-submit check)
3. Error handling for insufficient stock at checkout
4. E2E tests for stock deduction + concurrency

---

## Assumptions

1. Stock deduction on order creation (not confirmation) — prevents overselling at cost of "phantom" deductions on abandoned orders. Acceptable because merchants manually confirm.
2. No variant-level stock in V1 — entire product has one stock count. Variants are a P1 feature.
3. No reserved/held stock timeout — stock deducted immediately, returned only on cancel. No "cart reservation" window.
4. Audit trail is V1 — lightweight, useful for merchant trust.
5. Bulk update is a simple inline edit, not CSV import (CSV is P2).
