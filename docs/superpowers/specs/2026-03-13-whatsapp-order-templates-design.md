# WhatsApp Order Templates

## Problem

When merchants update order status (confirm, complete, cancel), the DB updates silently. The only WhatsApp option is a generic "regarding your order..." button that provides no context. A takeaway restaurant confirming a food order needs a very different message than a salon confirming an appointment or a hardware store confirming a pickup.

## Solution

Industry-specific WhatsApp message templates that appear as an inline prompt after each status change, giving merchants a one-tap way to notify customers with a contextual, pre-filled message.

## Design

### Industry Archetype Mapping

New file `src/lib/industry.ts` maps the 28 existing `INDUSTRIES_NAMIBIA` values to 6 archetypes:

| Archetype | Industries |
|---|---|
| food_prepared | restaurant, takeaway, cafe, bakery, catering |
| food_fresh | grocery, butchery, liquor, agriculture |
| retail | fashion, electronics, hardware, auto_parts, furniture, stationery, sports, toys, general_dealer, crafts, other |
| beauty | salon, cosmetics, pharmacy |
| services | cleaning, printing, services, gas_water |
| gifting | flowers, pet |

Fallback: `other` and any unrecognized value maps to `retail` (most generic).

### Message Templates

Each archetype defines templates for 3 status transitions: `confirmed`, `completed`, `cancelled`.

Templates use placeholders: `{customerName}`, `{orderNumber}`, `{storeName}`, `{total}`.

**food_prepared:**
- confirmed: `"Hi {customerName}! Your order #{orderNumber} from {storeName} is confirmed and being prepared. We'll let you know when it's ready!"`
- completed: `"Hi {customerName}! Your order #{orderNumber} from {storeName} is ready! Total: {total}. Thank you for your order!"`
- cancelled: `"Hi {customerName}, your order #{orderNumber} from {storeName} has been cancelled. Please contact us if you have any questions."`

**food_fresh:**
- confirmed: `"Hi {customerName}! Your order #{orderNumber} from {storeName} is confirmed and being packed. We'll notify you when it's ready for collection!"`
- completed: `"Hi {customerName}! Your order #{orderNumber} from {storeName} is packed and ready! Total: {total}. Thank you!"`
- cancelled: `"Hi {customerName}, your order #{orderNumber} from {storeName} has been cancelled. Please contact us if you have any questions."`

**retail:**
- confirmed: `"Hi {customerName}! Your order #{orderNumber} from {storeName} has been confirmed. We're getting it ready for you!"`
- completed: `"Hi {customerName}! Your order #{orderNumber} from {storeName} is ready for pickup. Total: {total}. Thank you for shopping with us!"`
- cancelled: `"Hi {customerName}, your order #{orderNumber} from {storeName} has been cancelled. Please contact us if you have any questions."`

**beauty:**
- confirmed: `"Hi {customerName}! Your order #{orderNumber} from {storeName} is confirmed. We look forward to serving you!"`
- completed: `"Hi {customerName}! Your order #{orderNumber} from {storeName} is ready. Total: {total}. Thank you for choosing us!"`
- cancelled: `"Hi {customerName}, your order #{orderNumber} from {storeName} has been cancelled. Please contact us if you have any questions."`

**services:**
- confirmed: `"Hi {customerName}! Your order #{orderNumber} from {storeName} is confirmed and scheduled. We'll be in touch with details!"`
- completed: `"Hi {customerName}! Your order #{orderNumber} from {storeName} is complete. Total: {total}. Thank you for your business!"`
- cancelled: `"Hi {customerName}, your order #{orderNumber} from {storeName} has been cancelled. Please contact us if you have any questions."`

**gifting:**
- confirmed: `"Hi {customerName}! Your order #{orderNumber} from {storeName} is confirmed and being prepared with care!"`
- completed: `"Hi {customerName}! Your order #{orderNumber} from {storeName} is ready! Total: {total}. We hope it brings joy!"`
- cancelled: `"Hi {customerName}, your order #{orderNumber} from {storeName} has been cancelled. Please contact us if you have any questions."`

All archetypes share the same cancelled template. The confirmed and completed templates are archetype-specific.

### Handling Missing Total

When `total` is empty/undefined, `getOrderMessage` omits the `Total: {total}. ` segment from completed messages. For example, `"...is ready! Thank you for your order!"` instead of `"...is ready! Total: N$350.00. Thank you for your order!"`.

### Exported API

```typescript
// src/lib/industry.ts

type IndustryArchetype = "food_prepared" | "food_fresh" | "retail" | "beauty" | "services" | "gifting";

// Subset of OrderStatus — only statuses that trigger notifications
type NotifiableStatus = "confirmed" | "completed" | "cancelled";

interface OrderMessageData {
  customerName: string;
  orderNumber: number; // DB type is number; toString() applied inside getOrderMessage
  storeName: string;
  total?: string; // pre-formatted e.g. "N$350.00", omitted from message if undefined
}

function getArchetype(industry: string): IndustryArchetype;
function getOrderMessage(industry: string, status: NotifiableStatus, data: OrderMessageData): string;
```

### UI Flow: Inline WhatsApp Prompt

**In `OrderActions` component:**

1. Merchant clicks "Confirm", "Mark Completed", or "Cancel"
2. DB status updates (existing behavior)
3. Instead of `router.refresh()` immediately, component enters `notifyState` showing:
   - Green WhatsApp icon + "Notify customer?" text
   - Clicking opens `wa.me` link with the industry-specific pre-filled message
   - Small "x" dismiss button
4. After clicking WhatsApp or dismissing, `router.refresh()` runs

**Updated `OrderActions` props:**

```typescript
interface OrderActionsProps {
  orderId: string;
  currentStatus: string;
  // New props:
  merchantIndustry: string;
  merchantStoreName: string;
  customerName: string;
  customerWhatsapp: string;
  orderNumber: number;
  orderTotal: string; // pre-formatted via formatPrice() in page.tsx
}
```

### Data Flow Changes

**`src/app/(dashboard)/dashboard/orders/page.tsx`:**

1. Merchant query: change select to `id, tier, industry, store_name`
2. Compute order total before JSX: `formatPrice(order.subtotal_nad - (order.discount_nad || 0) + (order.delivery_fee_nad || 0))`
3. Pass new props to `<OrderActions>` from order + merchant data

### Existing WhatsApp Button

The existing generic "WhatsApp customer" button stays as-is for free-form messaging. The new inline prompt is specifically tied to status transitions.

## Files Changed

| File | Change |
|---|---|
| `src/lib/industry.ts` | **New** - archetype mapping + template definitions + `getOrderMessage()` |
| `src/app/(dashboard)/dashboard/orders/order-actions.tsx` | Add notify prompt state, new props, WhatsApp link generation |
| `src/app/(dashboard)/dashboard/orders/page.tsx` | Fetch merchant `industry`/`store_name`, compute total, pass new props to OrderActions |
| `src/types/database.ts` | Add `industry` field to merchant Row/Insert/Update types (column exists in DB but missing from TS types) |

## No Migration Needed

The `industry` column already exists on the `merchants` table (added in migration 005). Only the TypeScript type definition needs updating.

## Edge Cases

- **Merchant has no industry set:** Fall back to `retail` archetype (most generic messages)
- **Customer has no WhatsApp number:** Don't show the notify prompt
- **Order has no/zero total:** `getOrderMessage` omits the "Total: ..." segment from the message
- **`order_number` is a DB `number`:** `getOrderMessage` calls `.toString()` internally for the template
