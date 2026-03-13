# WhatsApp Order Templates Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add industry-specific WhatsApp message templates that appear as an inline prompt after merchants update order status.

**Architecture:** New `src/lib/industry.ts` module holds archetype mapping and template logic. `OrderActions` component gains a post-status-update notify state. Server page passes merchant industry and order data down as props.

**Tech Stack:** Next.js 14, React, TypeScript, Supabase, Tailwind CSS

**Spec:** `docs/superpowers/specs/2026-03-13-whatsapp-order-templates-design.md`

**Note:** No test framework is configured in this project. Verification is done via TypeScript compilation and manual browser testing.

---

## File Structure

| File | Role | Action |
|---|---|---|
| `src/lib/industry.ts` | Archetype mapping + message templates + `getOrderMessage()` | Create |
| `src/types/database.ts` | Add `industry` field to merchant types | Modify |
| `src/app/(dashboard)/dashboard/orders/order-actions.tsx` | Inline WhatsApp notify prompt after status change | Modify |
| `src/app/(dashboard)/dashboard/orders/page.tsx` | Pass merchant industry/store_name + order data to OrderActions | Modify |

---

## Chunk 1: Industry module + type fix

### Task 1: Add `industry` field to merchant TypeScript types

**Files:**
- Modify: `src/types/database.ts:22-40` (Row), `:42-59` (Insert), `:60-78` (Update)

- [ ] **Step 1: Add `industry` to merchant Row type**

In `src/types/database.ts`, add after `store_slug: string;` (line 26):

```typescript
industry: string | null;
```

- [ ] **Step 2: Add `industry` to merchant Insert type**

After `store_slug: string;` in Insert (around line 45):

```typescript
industry?: string | null;
```

- [ ] **Step 3: Add `industry` to merchant Update type**

After `store_slug?: string;` in Update (around line 64):

```typescript
industry?: string | null;
```

- [ ] **Step 4: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No new errors (there may be pre-existing ones, but no new ones from this change)

- [ ] **Step 5: Commit**

```bash
git add src/types/database.ts
git commit -m "fix: add industry field to merchant TypeScript types"
```

---

### Task 2: Create industry archetype mapping and message templates

**Files:**
- Create: `src/lib/industry.ts`

- [ ] **Step 1: Create the industry module**

Create `src/lib/industry.ts` with the full implementation:

```typescript
export type IndustryArchetype =
  | "food_prepared"
  | "food_fresh"
  | "retail"
  | "beauty"
  | "services"
  | "gifting";

export type NotifiableStatus = "confirmed" | "completed" | "cancelled";

export interface OrderMessageData {
  customerName: string;
  orderNumber: number;
  storeName: string;
  total?: string;
}

const ARCHETYPE_MAP: Record<string, IndustryArchetype> = {
  // food_prepared
  restaurant: "food_prepared",
  takeaway: "food_prepared",
  cafe: "food_prepared",
  bakery: "food_prepared",
  catering: "food_prepared",
  // food_fresh
  grocery: "food_fresh",
  butchery: "food_fresh",
  liquor: "food_fresh",
  agriculture: "food_fresh",
  // retail
  fashion: "retail",
  electronics: "retail",
  hardware: "retail",
  auto_parts: "retail",
  furniture: "retail",
  stationery: "retail",
  sports: "retail",
  toys: "retail",
  general_dealer: "retail",
  crafts: "retail",
  other: "retail",
  // beauty
  salon: "beauty",
  cosmetics: "beauty",
  pharmacy: "beauty",
  // services
  cleaning: "services",
  printing: "services",
  services: "services",
  gas_water: "services",
  // gifting
  flowers: "gifting",
  pet: "gifting",
};

const TEMPLATES: Record<
  IndustryArchetype,
  Record<NotifiableStatus, { withTotal: string; withoutTotal: string }>
> = {
  food_prepared: {
    confirmed: {
      withTotal:
        "Hi {customerName}! Your order #{orderNumber} from {storeName} is confirmed and being prepared. We'll let you know when it's ready!",
      withoutTotal:
        "Hi {customerName}! Your order #{orderNumber} from {storeName} is confirmed and being prepared. We'll let you know when it's ready!",
    },
    completed: {
      withTotal:
        "Hi {customerName}! Your order #{orderNumber} from {storeName} is ready! Total: {total}. Thank you for your order!",
      withoutTotal:
        "Hi {customerName}! Your order #{orderNumber} from {storeName} is ready! Thank you for your order!",
    },
    cancelled: {
      withTotal:
        "Hi {customerName}, your order #{orderNumber} from {storeName} has been cancelled. Please contact us if you have any questions.",
      withoutTotal:
        "Hi {customerName}, your order #{orderNumber} from {storeName} has been cancelled. Please contact us if you have any questions.",
    },
  },
  food_fresh: {
    confirmed: {
      withTotal:
        "Hi {customerName}! Your order #{orderNumber} from {storeName} is confirmed and being packed. We'll notify you when it's ready for collection!",
      withoutTotal:
        "Hi {customerName}! Your order #{orderNumber} from {storeName} is confirmed and being packed. We'll notify you when it's ready for collection!",
    },
    completed: {
      withTotal:
        "Hi {customerName}! Your order #{orderNumber} from {storeName} is packed and ready! Total: {total}. Thank you!",
      withoutTotal:
        "Hi {customerName}! Your order #{orderNumber} from {storeName} is packed and ready! Thank you!",
    },
    cancelled: {
      withTotal:
        "Hi {customerName}, your order #{orderNumber} from {storeName} has been cancelled. Please contact us if you have any questions.",
      withoutTotal:
        "Hi {customerName}, your order #{orderNumber} from {storeName} has been cancelled. Please contact us if you have any questions.",
    },
  },
  retail: {
    confirmed: {
      withTotal:
        "Hi {customerName}! Your order #{orderNumber} from {storeName} has been confirmed. We're getting it ready for you!",
      withoutTotal:
        "Hi {customerName}! Your order #{orderNumber} from {storeName} has been confirmed. We're getting it ready for you!",
    },
    completed: {
      withTotal:
        "Hi {customerName}! Your order #{orderNumber} from {storeName} is ready for pickup. Total: {total}. Thank you for shopping with us!",
      withoutTotal:
        "Hi {customerName}! Your order #{orderNumber} from {storeName} is ready for pickup. Thank you for shopping with us!",
    },
    cancelled: {
      withTotal:
        "Hi {customerName}, your order #{orderNumber} from {storeName} has been cancelled. Please contact us if you have any questions.",
      withoutTotal:
        "Hi {customerName}, your order #{orderNumber} from {storeName} has been cancelled. Please contact us if you have any questions.",
    },
  },
  beauty: {
    confirmed: {
      withTotal:
        "Hi {customerName}! Your order #{orderNumber} from {storeName} is confirmed. We look forward to serving you!",
      withoutTotal:
        "Hi {customerName}! Your order #{orderNumber} from {storeName} is confirmed. We look forward to serving you!",
    },
    completed: {
      withTotal:
        "Hi {customerName}! Your order #{orderNumber} from {storeName} is ready. Total: {total}. Thank you for choosing us!",
      withoutTotal:
        "Hi {customerName}! Your order #{orderNumber} from {storeName} is ready. Thank you for choosing us!",
    },
    cancelled: {
      withTotal:
        "Hi {customerName}, your order #{orderNumber} from {storeName} has been cancelled. Please contact us if you have any questions.",
      withoutTotal:
        "Hi {customerName}, your order #{orderNumber} from {storeName} has been cancelled. Please contact us if you have any questions.",
    },
  },
  services: {
    confirmed: {
      withTotal:
        "Hi {customerName}! Your order #{orderNumber} from {storeName} is confirmed and scheduled. We'll be in touch with details!",
      withoutTotal:
        "Hi {customerName}! Your order #{orderNumber} from {storeName} is confirmed and scheduled. We'll be in touch with details!",
    },
    completed: {
      withTotal:
        "Hi {customerName}! Your order #{orderNumber} from {storeName} is complete. Total: {total}. Thank you for your business!",
      withoutTotal:
        "Hi {customerName}! Your order #{orderNumber} from {storeName} is complete. Thank you for your business!",
    },
    cancelled: {
      withTotal:
        "Hi {customerName}, your order #{orderNumber} from {storeName} has been cancelled. Please contact us if you have any questions.",
      withoutTotal:
        "Hi {customerName}, your order #{orderNumber} from {storeName} has been cancelled. Please contact us if you have any questions.",
    },
  },
  gifting: {
    confirmed: {
      withTotal:
        "Hi {customerName}! Your order #{orderNumber} from {storeName} is confirmed and being prepared with care!",
      withoutTotal:
        "Hi {customerName}! Your order #{orderNumber} from {storeName} is confirmed and being prepared with care!",
    },
    completed: {
      withTotal:
        "Hi {customerName}! Your order #{orderNumber} from {storeName} is ready! Total: {total}. We hope it brings joy!",
      withoutTotal:
        "Hi {customerName}! Your order #{orderNumber} from {storeName} is ready! We hope it brings joy!",
    },
    cancelled: {
      withTotal:
        "Hi {customerName}, your order #{orderNumber} from {storeName} has been cancelled. Please contact us if you have any questions.",
      withoutTotal:
        "Hi {customerName}, your order #{orderNumber} from {storeName} has been cancelled. Please contact us if you have any questions.",
    },
  },
};

export function getArchetype(industry: string | null | undefined): IndustryArchetype {
  if (!industry) return "retail";
  return ARCHETYPE_MAP[industry] ?? "retail";
}

export function getOrderMessage(
  industry: string | null | undefined,
  status: NotifiableStatus,
  data: OrderMessageData
): string {
  const archetype = getArchetype(industry);
  const variant = data.total ? "withTotal" : "withoutTotal";
  const template = TEMPLATES[archetype][status][variant];

  return template
    .replace("{customerName}", data.customerName)
    .replace("{orderNumber}", data.orderNumber.toString())
    .replace("{storeName}", data.storeName)
    .replace("{total}", data.total ?? "");
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No new errors

- [ ] **Step 3: Commit**

```bash
git add src/lib/industry.ts
git commit -m "feat: add industry archetype mapping and WhatsApp order templates"
```

---

## Chunk 2: Wire up OrderActions and orders page

### Task 3: Update OrderActions with inline WhatsApp notify prompt

**Files:**
- Modify: `src/app/(dashboard)/dashboard/orders/order-actions.tsx`

- [ ] **Step 1: Rewrite OrderActions with notify state**

Replace the entire contents of `order-actions.tsx` with:

```typescript
"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { getOrderMessage, type NotifiableStatus } from "@/lib/industry";
import { whatsappLink } from "@/lib/utils";

interface OrderActionsProps {
  orderId: string;
  currentStatus: string;
  merchantIndustry: string;
  merchantStoreName: string;
  customerName: string;
  customerWhatsapp: string;
  orderNumber: number;
  orderTotal: string;
}

export function OrderActions({
  orderId,
  currentStatus,
  merchantIndustry,
  merchantStoreName,
  customerName,
  customerWhatsapp,
  orderNumber,
  orderTotal,
}: OrderActionsProps) {
  const [loading, setLoading] = useState(false);
  const [notifyStatus, setNotifyStatus] = useState<NotifiableStatus | null>(null);
  const router = useRouter();
  const supabase = createClient();

  async function updateStatus(newStatus: string) {
    setLoading(true);
    await supabase
      .from("orders")
      .update({ status: newStatus })
      .eq("id", orderId);
    setLoading(false);

    if (newStatus === "confirmed" || newStatus === "completed" || newStatus === "cancelled") {
      if (customerWhatsapp) {
        setNotifyStatus(newStatus as NotifiableStatus);
        return;
      }
    }
    router.refresh();
  }

  function dismiss() {
    setNotifyStatus(null);
    router.refresh();
  }

  if (loading) {
    return <span className="text-sm text-gray-400">Updating...</span>;
  }

  if (notifyStatus) {
    const message = getOrderMessage(merchantIndustry, notifyStatus, {
      customerName,
      orderNumber,
      storeName: merchantStoreName,
      total: orderTotal || undefined,
    });
    const href = whatsappLink(customerWhatsapp, message);

    return (
      <div className="flex items-center gap-2">
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-green-600 text-white rounded-md hover:bg-green-700"
          onClick={() => {
            setTimeout(() => {
              setNotifyStatus(null);
              router.refresh();
            }, 500);
          }}
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
            <path d="M12 0C5.373 0 0 5.373 0 12c0 2.625.846 5.059 2.284 7.034L.789 23.492a.5.5 0 00.61.609l4.458-1.495A11.952 11.952 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-2.331 0-4.512-.637-6.39-1.747l-.446-.27-2.633.883.883-2.633-.27-.446A9.96 9.96 0 012 12C2 6.486 6.486 2 12 2s10 4.486 10 10-4.486 10-10 10z" />
          </svg>
          Notify customer
        </a>
        <button
          onClick={dismiss}
          className="p-1 text-gray-400 hover:text-gray-600 rounded"
          aria-label="Dismiss"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    );
  }

  return (
    <>
      {currentStatus === "pending" && (
        <>
          <button
            onClick={() => updateStatus("confirmed")}
            className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Confirm
          </button>
          <button
            onClick={() => updateStatus("cancelled")}
            className="px-3 py-1.5 text-sm bg-red-50 text-red-600 rounded-md hover:bg-red-100"
          >
            Cancel
          </button>
        </>
      )}
      {currentStatus === "confirmed" && (
        <button
          onClick={() => updateStatus("completed")}
          className="px-3 py-1.5 text-sm bg-green-600 text-white rounded-md hover:bg-green-700"
        >
          Mark Completed
        </button>
      )}
      {currentStatus === "cancelled" && (
        <span className="text-xs text-gray-400">Order cancelled</span>
      )}
      {currentStatus === "completed" && (
        <span className="text-xs text-green-600">Order complete</span>
      )}
    </>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: Errors in `page.tsx` because OrderActions now requires new props (expected, fixed in next task)

- [ ] **Step 3: Commit**

```bash
git add src/app/\(dashboard\)/dashboard/orders/order-actions.tsx
git commit -m "feat: add inline WhatsApp notify prompt to OrderActions"
```

---

### Task 4: Update orders page to pass new props

**Files:**
- Modify: `src/app/(dashboard)/dashboard/orders/page.tsx`

- [ ] **Step 1: Update merchant query to include `industry` and `store_name`**

In `page.tsx`, change the merchant select on line 21 from:

```typescript
.select("id, tier")
```

to:

```typescript
.select("id, tier, industry, store_name")
```

- [ ] **Step 2: Update the OrderActions invocation**

Replace the `<OrderActions>` call on line 171 from:

```tsx
<OrderActions orderId={order.id} currentStatus={order.status} />
```

to:

```tsx
<OrderActions
  orderId={order.id}
  currentStatus={order.status}
  merchantIndustry={merchant.industry ?? ""}
  merchantStoreName={merchant.store_name}
  customerName={order.customer_name}
  customerWhatsapp={order.customer_whatsapp}
  orderNumber={order.order_number}
  orderTotal={formatPrice(order.subtotal_nad - (order.discount_nad || 0) + (order.delivery_fee_nad || 0))}
/>
```

- [ ] **Step 3: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No new errors

- [ ] **Step 4: Commit**

```bash
git add src/app/\(dashboard\)/dashboard/orders/page.tsx
git commit -m "feat: pass merchant industry and order data to OrderActions"
```

---

## Chunk 3: Manual verification

### Task 5: Verify the full flow in the browser

- [ ] **Step 1: Start dev server**

Run: `npm run dev`

- [ ] **Step 2: Navigate to dashboard orders**

Go to `http://localhost:3000/dashboard/orders`
Expected: Orders page loads without errors. Order cards display as before.

- [ ] **Step 3: Test confirm flow**

Click "Confirm" on a pending order.
Expected: Status updates, then inline "Notify customer" WhatsApp button appears with a dismiss "x".

- [ ] **Step 4: Test WhatsApp link**

Click "Notify customer" button.
Expected: WhatsApp opens with an industry-specific pre-filled message containing customer name, order number, store name.

- [ ] **Step 5: Test dismiss**

On another order, click "Confirm" then dismiss the notify prompt with "x".
Expected: Prompt disappears, page refreshes showing the new status.

- [ ] **Step 6: Final commit (if any fixes needed)**

```bash
git add -A
git commit -m "feat: WhatsApp order templates — complete"
```
