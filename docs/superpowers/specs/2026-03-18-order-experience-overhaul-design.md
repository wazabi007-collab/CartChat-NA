# Order Experience Overhaul — Design Spec

**Date:** 2026-03-18
**Status:** Approved
**Author:** Claude + Elton

---

## Overview

Overhaul the order experience across three areas: a public order tracking page, enhanced WhatsApp notifications with CTA buttons, and a new `ready` order status. The goal is to give customers real-time visibility into their order status while reducing "where's my order?" messages to merchants.

## Goals

1. Customers get a WhatsApp receipt immediately at checkout with a tracking link
2. Every status change sends a WhatsApp notification with a one-tap tracking link
3. Public tracking page shows a visual timeline — no login required
4. Add `ready` status between confirmed and completed
5. Payment reminders link directly to tracking page for POP upload
6. Optimize payment reminder timing for better conversion

---

## Database Changes

### Migration: `022_order_tracking.sql`

**1. Add `ready` to order status flow:**

Update `VALID_TRANSITIONS` in application code (not an enum change — current status is stored as TEXT):
- `pending → [confirmed, cancelled]`
- `confirmed → [ready, completed, cancelled]`
- `ready → [completed, cancelled]`
- `completed → []`
- `cancelled → []`

Note: Check if status is stored as an enum or text. If enum, add `ready` value via `ALTER TYPE`.

**2. Add `tracking_token` column:**
```sql
ALTER TABLE orders ADD COLUMN tracking_token TEXT UNIQUE;
CREATE INDEX idx_orders_tracking_token ON orders(tracking_token);
```
- 8-character alphanumeric string (e.g., `A3kF9mNx`)
- Generated inside `place_order` RPC: `substr(md5(random()::text), 1, 8)`
- Uniqueness enforced by the UNIQUE constraint; on collision, regenerate
- 62^8 = 218 trillion combinations — practically unguessable

**3. Add `status_history` column:**
```sql
ALTER TABLE orders ADD COLUMN status_history JSONB NOT NULL DEFAULT '[]';
```
Format:
```json
[
  {"status": "pending", "at": "2026-03-18T14:00:00Z"},
  {"status": "confirmed", "at": "2026-03-18T14:30:00Z"},
  {"status": "ready", "at": "2026-03-18T15:00:00Z"},
  {"status": "completed", "at": "2026-03-18T15:20:00Z"}
]
```
- Initial entry `{"status": "pending", "at": now()}` created by `place_order` RPC
- Subsequent entries appended by `order-actions.tsx` on status change
- Cancelled entries appended normally — tracking page shows completed steps + red cancellation banner

**4. Update `place_order` RPC:**
- Generate `tracking_token` and include in INSERT
- Initialize `status_history` with `[{"status": "pending", "at": now()}]`
- Return `tracking_token` in the result set alongside `order_id`, `order_number`, `payment_reference`

**5. RLS for tracking:**
- The tracking page API route uses the service client (bypasses RLS)
- No new RLS policies needed

---

## Tracking Page

### Route: `/track/[token]`

Public page, no authentication required. Server-rendered with a client component for auto-polling.

### Data Fetching

Server component queries `orders` by `tracking_token` using service client. Joins:
- `merchants` — store_name, store_slug, whatsapp_number
- `order_items` + `products` — item names, quantities, prices

### Page Layout (mobile-first, top to bottom)

1. **Store header** — merchant store name
2. **Order summary bar** — `Order #1042 • Mar 18, 2026` with status badge
3. **Visual stepper** — vertical, 4 nodes:
   - Placed (pending) — timestamp from status_history
   - Confirmed — timestamp or hollow circle
   - Ready — timestamp or hollow circle
   - Completed — timestamp or hollow circle
   - Current step: pulsing brand blue (#2B5EA7)
   - Completed steps: green (#4A9B3E) with checkmark
   - Upcoming steps: gray hollow circles
   - Cancelled: red banner at top, prior completed steps still shown
4. **Payment section** — only for unpaid non-COD orders
   - Amber background with "Upload Proof of Payment" button + file input
   - COD orders: "Pay on delivery — N$X due" (info only)
   - Already paid/POP uploaded: green "Payment proof received"
5. **Items list** — collapsible if 4+ items. Name, quantity, line total per item.
6. **Order totals** — subtotal, delivery fee, discount, total
7. **Delivery/pickup info** — method, address, date/time, notes
8. **Action bar (sticky bottom):**
   - "Chat with Seller" — WhatsApp green (#25D366), opens `wa.me/{merchantWhatsapp}?text=Hi, I'm checking on my order #{orderNumber}`
   - "Re-order" — link to `/s/{storeSlug}` (only on completed orders)
   - "Upload Payment Proof" — (only if unpaid, duplicates section 4 for thumb access)

### Auto-Refresh

- Client component polls `GET /api/orders/track/[token]` every 60 seconds
- Stops polling when `document.hidden` (tab not active)
- Resumes on `visibilitychange` event
- Updates stepper and status without full page reload
- WhatsApp notifications are the primary real-time channel; polling is fallback

### API Route: `GET /api/orders/track/[token]`

- Returns order data as JSON (status, status_history, items, totals, merchant info)
- Uses service client (bypasses RLS)
- Simple rate limiting: reject if same token queried more than 60 times per minute
- Invalid token → 404

### Error States

- Invalid/missing token → "Order not found" page with link to browse stores
- Network error on poll → silent retry, no error shown

### Design

- Brand blue (#2B5EA7) for stepper progress
- Green (#4A9B3E) for completed steps
- WhatsApp green (#25D366) for Chat with Seller button
- Amber/yellow for payment-needed sections
- Red for cancelled status
- Page weight target: under 200KB
- Minimum 16px body text, 44px touch targets

---

## WhatsApp Message Changes

### New Template: `order_placed`

- **Trigger:** Immediately after `place_order` RPC succeeds in checkout
- **Recipient:** Customer
- **Category:** Utility
- **Body:** `Hi {{1}}! 🛒 Your order #{{2}} from {{3}} has been received successfully. Your total is {{4}}. The seller will confirm your order shortly. Tap below to track your order status anytime.`
- **Button:** `[Track Order]` → `https://oshicart.com/track/{{5}}`
- **Variables:** customer_name, order_number, store_name, formatted_total, tracking_token
- **Sample values:** John, 1042, Mama's Kitchen, N$150.00, A3kF9mNx

### Updated Template: `welcome_merchant`

- **Body:** `Congratulations! 🎉 Your store {{1}} is officially open for business on OshiCart! Your personal store link: {{2}} Share it on your WhatsApp Status, post it on Facebook, and send it to your customers. Time to secure the bag! 💰`
- **Button:** `[Open Dashboard]` → `https://oshicart.com/dashboard`
- **Variables:** store_name, store_url
- **Sample values:** Mama's Kitchen, https://oshicart.com/s/mamas-kitchen

### Updated Template: `order_confirmed`

- **Body:** (unchanged) `Hi {{1}}! ✅ Your order #{{2}} from {{3}} is confirmed and being prepared. We'll let you know when it's ready!`
- **Button:** `[Track Order]` → `https://oshicart.com/track/{{4}}`
- **Variables:** customer_name, order_number, store_name, tracking_token
- **Sample values:** John, 1042, Mama's Kitchen, A3kF9mNx

### Updated Template: `order_ready`

- **Body:** `Hi {{1}}! Your order #{{2}} from {{3}} is {{4}}. Tap below to track your order.`
- **Button:** `[Track Order]` → `https://oshicart.com/track/{{5}}`
- **Variables:** customer_name, order_number, store_name, fulfillment_text, tracking_token
- **fulfillment_text values:**
  - Pickup orders: `"ready for pickup. Please collect at your earliest convenience"`
  - Delivery orders: `"out for delivery"`
- **Sample values:** John, 1042, Mama's Kitchen, ready for pickup. Please collect at your earliest convenience, A3kF9mNx

### Updated Template: `order_completed`

- **Body:** (unchanged) `Hi {{1}}! 🎉 Your order #{{2}} from {{3}} is complete. Total: {{4}}. Thank you for your order!`
- **Button:** `[Shop Again]` → `https://oshicart.com/s/{{5}}`
- **Variables:** customer_name, order_number, store_name, formatted_total, store_slug
- **Sample values:** John, 1042, Mama's Kitchen, N$150.00, mamas-kitchen

### Updated Template: `order_cancelled`

- **Body:** (unchanged) `Hi {{1}}, your order #{{2}} from {{3}} has been cancelled. Please contact the store if you have any questions.`
- **No button** — cancelled orders don't need a CTA
- **Variables:** customer_name, order_number, store_name (unchanged)

### Updated Template: `new_order_merchant`

- **Body:** (unchanged — the longer version already approved by Meta)
- **Button:** `[View Orders]` → `https://oshicart.com/dashboard/orders`
- **Variables:** (unchanged) + no additional variable needed since button URL is static

### Updated Template: `payment_reminder`

- **Body:** (unchanged — already approved by Meta)
- **Button:** `[Pay Now]` → `https://oshicart.com/track/{{6}}`
- **Variables:** (existing 5) + tracking_token as {{6}}
- **Sample values:** John, 1042, Mama's Kitchen, N$150.00, https://oshicart.com/s/mamas-kitchen, A3kF9mNx

### Payment Reminder Timing Change

- Reminder 1: **1 hour** after order (was 2 hours)
- Reminder 2: **12 hours** after order (was 24 hours)
- Reminder 3: **48 hours** after order (was 72 hours)
- Auto-cancel: **49 hours** after order (was 73 hours)

### Code Changes to `src/lib/whatsapp.ts`

Update `buildTemplateMessage()` to support button components:

```typescript
// Button component in Meta API payload
{
  type: "button",
  sub_type: "url",
  index: "0",
  parameters: [{ type: "text", text: "A3kF9mNx" }]
}
```

The template defines the button label and base URL (e.g., `https://oshicart.com/track/{{1}}`). The API call provides the dynamic suffix (the tracking token).

Update `sendWhatsAppTemplate()` signature to accept an optional `buttonParams` array.

---

## Integration Points

### Checkout (`checkout-form.tsx`)

After `place_order` succeeds:
1. Extract `tracking_token` from RPC result
2. Fire WhatsApp `order_placed` to customer with tracking token for button URL
3. Existing WhatsApp `new_order_merchant` to merchant (unchanged)
4. Existing analytics sync + email notification (unchanged)
5. Customer still gets the WhatsApp deep link to merchant (existing behavior preserved)

### Order Actions (`order-actions.tsx`)

- Add "Mark Ready" button (indigo color) between Confirm and Mark Completed
- Update `VALID_TRANSITIONS` to include `ready`
- On every status change:
  1. Update `status` column
  2. Append to `status_history` JSONB array
  3. Fire WhatsApp with tracking token for button URL
- `order_ready` passes delivery method context: `"ready for pickup..."` or `"out for delivery"`

### Dashboard Orders Page

- Pass `tracking_token` to `OrderActions` component
- Show `ready` status badge in indigo color
- Ready badge text: "Ready" (pickup) or "Out for Delivery" (delivery)

### Payment Reminders Cron

- Change timing constants: 1hr / 12hr / 48hr / 49hr
- Include tracking token in WhatsApp call for Pay Now button URL
- Auto-cancel at 49 hours (was 73)

### Place Order RPC (SQL)

- Generate `tracking_token`: `substr(md5(random()::text), 1, 8)`
- Handle collision: loop until unique (extremely rare)
- Initialize `status_history`: `'[{"status":"pending","at":"' || now()::text || '"}]'::jsonb`
- Return `tracking_token` in result set

---

## File Structure

### New Files
- `src/app/track/[token]/page.tsx` — server component, fetches order by token
- `src/app/track/[token]/tracker-client.tsx` — client component, stepper UI + polling + POP upload
- `src/app/api/orders/track/[token]/route.ts` — GET endpoint for polling

### Modified Files
- `supabase/migrations/022_order_tracking.sql` — DB changes
- `src/lib/whatsapp.ts` — button support in template builder
- `src/app/(dashboard)/dashboard/orders/order-actions.tsx` — ready button, status_history, tracking token
- `src/app/(dashboard)/dashboard/orders/page.tsx` — pass tracking_token
- `src/app/checkout/[slug]/checkout-form.tsx` — send order_placed, use tracking token
- `src/app/api/cron/payment-reminders/route.ts` — timing + tracking token

### Unchanged Files
- `src/app/api/whatsapp/send/route.ts` — already generic
- `src/app/api/whatsapp/webhook/route.ts` — unchanged
- `src/app/s/[slug]` order tracker tab — kept as fallback

### Meta Template Work (Manual)
- Delete and resubmit 7 existing templates with CTA buttons
- Submit 1 new template (`order_placed`)
- Update `order_ready` body to include delivery context variable
- Update `welcome_merchant` body to Namibian personality version
- Total: 8 templates to submit

---

## Testing Plan

1. **DB migration** — verify tracking_token generation, status_history initialization
2. **Tracking page** — load with valid token, invalid token, cancelled order, each status
3. **Auto-poll** — verify 60s polling, stops on hidden tab, resumes on visible
4. **POP upload** — upload on tracking page, verify it links to order
5. **WhatsApp flow** — place order → verify order_placed received → confirm → verify order_confirmed → ready → verify order_ready → complete → verify order_completed
6. **Payment reminders** — verify 1hr/12hr/48hr timing, auto-cancel at 49hr
7. **Button URLs** — verify all CTA buttons link to correct tracking page / store / dashboard
8. **Mobile** — test on 3G connection, verify under 200KB, touch targets 44px+

---

## Rollout Plan

1. Deploy DB migration (tracking_token, status_history, ready status)
2. Deploy code changes (tracking page, WhatsApp buttons, order actions)
3. Backfill tracking_tokens for any existing pending/confirmed orders
4. Delete old Meta templates, submit new ones with buttons (manual step)
5. Wait for template approval
6. Test end-to-end with a real order
7. Live for all merchants
