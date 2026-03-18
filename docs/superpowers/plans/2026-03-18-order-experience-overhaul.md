# Order Experience Overhaul Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a public order tracking page, enhance WhatsApp notifications with CTA buttons, add `ready` order status, and optimize payment reminder timing.

**Architecture:** Database migration adds `ready` enum value, `tracking_token`, and `status_history` columns. A new public `/track/[token]` page renders a visual stepper. WhatsApp template builder gains button support. All status changes append to `status_history` and include tracking token in WhatsApp calls.

**Tech Stack:** Next.js App Router, Supabase (Postgres), Meta WhatsApp Cloud API v22.0, Tailwind CSS

**Spec:** `docs/superpowers/specs/2026-03-18-order-experience-overhaul-design.md`

---

### Task 1: Database Migration

**Files:**
- Create: `supabase/migrations/022_order_tracking.sql`

- [ ] **Step 1: Write the migration SQL**

```sql
-- 1. Add 'ready' to order_status enum
ALTER TYPE order_status ADD VALUE IF NOT EXISTS 'ready' BEFORE 'completed';

-- 2. Add tracking_token column
ALTER TABLE orders ADD COLUMN IF NOT EXISTS tracking_token TEXT UNIQUE;
CREATE INDEX IF NOT EXISTS idx_orders_tracking_token ON orders(tracking_token);

-- 3. Add status_history column
ALTER TABLE orders ADD COLUMN IF NOT EXISTS status_history JSONB NOT NULL DEFAULT '[]';

-- 4. Backfill tracking_tokens for existing orders
UPDATE orders SET tracking_token = substr(md5(id::text || random()::text), 1, 8)
WHERE tracking_token IS NULL;

-- 5. Backfill status_history for existing orders
UPDATE orders SET status_history = json_build_array(
  json_build_object('status', status::text, 'at', created_at)
)::jsonb
WHERE status_history = '[]'::jsonb;
```

- [ ] **Step 2: Apply migration to Supabase**

Run via Supabase MCP `apply_migration` tool with project ID `pcseqiaqeiiaiqxqtfmw`.

- [ ] **Step 3: Update place_order RPC to generate tracking_token and status_history**

Create migration `023_place_order_v5.sql` that drops and recreates `place_order` to:
- Generate `tracking_token`: `substr(md5(random()::text), 1, 8)` with uniqueness loop
- Initialize `status_history`: `'[{"status":"pending","at":"' || now()::text || '"}]'::jsonb`
- Add `tracking_token` to INSERT and RETURNING clause
- New return type: `TABLE(order_id uuid, order_number integer, payment_reference text, tracking_token text)`

The full RPC body should be based on the current `012_payment_ref_store_name.sql` version with these additions.

- [ ] **Step 4: Apply place_order migration**

Run via Supabase MCP.

- [ ] **Step 5: Verify in Supabase**

```sql
SELECT column_name, data_type FROM information_schema.columns
WHERE table_name = 'orders' AND column_name IN ('tracking_token', 'status_history');
```

And verify enum:
```sql
SELECT enumlabel FROM pg_enum WHERE enumtypid = 'order_status'::regtype ORDER BY enumsortorder;
```

- [ ] **Step 6: Commit**

```bash
git add supabase/migrations/022_order_tracking.sql supabase/migrations/023_place_order_v5.sql
git commit -m "feat: add tracking_token, status_history, ready status to orders"
```

---

### Task 2: WhatsApp Button Support

**Files:**
- Modify: `src/lib/whatsapp.ts`

- [ ] **Step 1: Update TemplateMessage interface to support button components**

Add button component type to the existing `TemplateMessage` interface. The `components` array should support both `body` and `button` types.

```typescript
interface TemplateMessage {
  messaging_product: "whatsapp";
  to: string;
  type: "template";
  template: {
    name: string;
    language: { code: string };
    components?: Array<
      | { type: "body"; parameters: Array<{ type: "text"; text: string }> }
      | { type: "button"; sub_type: "url"; index: string; parameters: Array<{ type: "text"; text: string }> }
    >;
  };
}
```

- [ ] **Step 2: Update buildTemplateMessage to accept buttonParams**

```typescript
function buildTemplateMessage(
  recipientPhone: string,
  templateName: string,
  variables: string[],
  buttonParams?: string[]  // dynamic URL suffixes for CTA buttons
): TemplateMessage {
  // ... existing phone normalization ...

  const components: TemplateMessage["template"]["components"] = [];

  if (variables.length > 0) {
    components.push({
      type: "body",
      parameters: variables.map((v) => ({ type: "text" as const, text: v })),
    });
  }

  if (buttonParams) {
    buttonParams.forEach((param, index) => {
      components.push({
        type: "button",
        sub_type: "url",
        index: String(index),
        parameters: [{ type: "text", text: param }],
      });
    });
  }

  msg.template.components = components.length > 0 ? components : undefined;

  return msg;
}
```

- [ ] **Step 3: Update sendWhatsAppTemplate signature**

```typescript
export async function sendWhatsAppTemplate(
  recipientPhone: string,
  templateName: string,
  variables: string[],
  buttonParams?: string[]  // NEW optional parameter
): Promise<SendResult> {
  // ... existing validation ...
  const message = buildTemplateMessage(recipientPhone, templateName, variables, buttonParams);
  // ... rest unchanged ...
}
```

- [ ] **Step 4: Update /api/whatsapp/send route to accept buttonParams**

In `src/app/api/whatsapp/send/route.ts`, add `button_params` to the request body type and pass it through:

```typescript
const { merchant_id, order_id, template_name, recipient_phone, variables, button_params } = body as {
  // ... existing fields ...
  button_params?: string[];
};

const result = await sendWhatsAppTemplate(recipient_phone, template_name, variables, button_params);
```

- [ ] **Step 5: TypeScript check**

Run: `npx tsc --noEmit`

- [ ] **Step 6: Commit**

```bash
git add src/lib/whatsapp.ts src/app/api/whatsapp/send/route.ts
git commit -m "feat: add CTA button support to WhatsApp template builder"
```

---

### Task 3: Order Actions — Status History + Tracking Token

**Files:**
- Modify: `src/app/(dashboard)/dashboard/orders/order-actions.tsx`
- Modify: `src/app/(dashboard)/dashboard/orders/page.tsx`

- [ ] **Step 1: Add trackingToken and deliveryMethod to OrderActionsProps**

```typescript
interface OrderActionsProps {
  orderId: string;
  currentStatus: string;
  merchantId: string;
  merchantIndustry: string;
  merchantStoreName: string;
  merchantStoreSlug: string;      // NEW
  customerName: string;
  customerWhatsapp: string;
  orderNumber: number;
  orderTotal: string;
  trackingToken: string;          // NEW
  deliveryMethod: string;         // NEW
}
```

- [ ] **Step 2: Update updateStatus to append status_history and include button params**

After the status update succeeds, also update `status_history`:

```typescript
// After successful status update, append to status_history
await supabase.rpc("append_status_history", {
  p_order_id: orderId,
  p_status: newStatus,
});
```

Or simpler — use a raw update:
```typescript
const { error } = await supabase
  .from("orders")
  .update({
    status: newStatus,
    status_history: supabase.rpc(...) // Can't do this client-side easily
  })
  .eq("id", orderId);
```

**Better approach:** Create a small SQL function `append_status_history(p_order_id uuid, p_status text)` that appends to the JSONB array. Call it after the status update. Or just handle it in one update using raw SQL via a new API route.

**Simplest approach:** Update the `.update()` call to use Postgres JSONB concat:

```typescript
const { error } = await supabase
  .from("orders")
  .update({
    status: newStatus,
    status_history: undefined, // Can't do jsonb_concat client-side
  })
  .eq("id", orderId);
```

Since Supabase JS client can't do `jsonb || jsonb` operations, create a small RPC:

```sql
CREATE OR REPLACE FUNCTION append_order_status(p_order_id uuid, p_status text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE orders
  SET status = p_status::order_status,
      status_history = status_history || jsonb_build_array(
        jsonb_build_object('status', p_status, 'at', now())
      )
  WHERE id = p_order_id;
END;
$$;
```

Then in `order-actions.tsx`:
```typescript
const { error } = await supabase.rpc("append_order_status", {
  p_order_id: orderId,
  p_status: newStatus,
});
```

This replaces the current `.from("orders").update({ status: newStatus })` call.

- [ ] **Step 3: Update WhatsApp calls to include button_params and delivery context**

```typescript
if (customerWhatsapp && ["confirmed", "ready", "completed", "cancelled"].includes(newStatus)) {
  const templateMap: Record<string, string> = {
    confirmed: "order_confirmed",
    ready: "order_ready",
    completed: "order_completed",
    cancelled: "order_cancelled",
  };

  let variables: string[];
  let buttonParams: string[] | undefined;

  switch (newStatus) {
    case "confirmed":
      variables = [customerName || "Customer", String(orderNumber), merchantStoreName];
      buttonParams = [trackingToken]; // Track Order button
      break;
    case "ready":
      const fulfillmentText = deliveryMethod === "delivery"
        ? "out for delivery"
        : "ready for pickup. Please collect at your earliest convenience";
      variables = [customerName || "Customer", String(orderNumber), merchantStoreName, fulfillmentText];
      buttonParams = [trackingToken]; // Track Order button
      break;
    case "completed":
      variables = [customerName || "Customer", String(orderNumber), merchantStoreName, orderTotal || "N$0.00"];
      buttonParams = [merchantStoreSlug]; // Shop Again button
      break;
    case "cancelled":
      variables = [customerName || "Customer", String(orderNumber), merchantStoreName];
      buttonParams = undefined; // No button
      break;
    default:
      variables = [];
  }

  fetch("/api/whatsapp/send", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      merchant_id: merchantId,
      order_id: orderId,
      template_name: templateMap[newStatus],
      recipient_phone: customerWhatsapp,
      variables,
      button_params: buttonParams,
    }),
  }).catch(() => {});
}
```

- [ ] **Step 4: Update orders page to pass new props**

In `src/app/(dashboard)/dashboard/orders/page.tsx`, update the `<OrderActions>` component to pass `trackingToken`, `deliveryMethod`, and `merchantStoreSlug`:

```tsx
<OrderActions
  orderId={order.id}
  currentStatus={order.status}
  merchantId={merchant.id}
  merchantIndustry={merchant.industry || "other"}
  merchantStoreName={merchant.store_name}
  merchantStoreSlug={merchant.store_slug}
  customerName={order.customer_name}
  customerWhatsapp={order.customer_whatsapp}
  orderNumber={order.order_number}
  orderTotal={formatPrice(order.subtotal_nad - (order.discount_nad || 0) + (order.delivery_fee_nad || 0))}
  trackingToken={order.tracking_token}
  deliveryMethod={order.delivery_method}
/>
```

Update the select query to include `tracking_token` and `delivery_method`.

- [ ] **Step 5: Add `ready` status badge color in orders page**

Add indigo badge for ready status in the status badge section:
```tsx
status === "ready" ? "bg-indigo-100 text-indigo-800" : ...
```

- [ ] **Step 6: TypeScript check**

Run: `npx tsc --noEmit`

- [ ] **Step 7: Commit**

```bash
git add src/app/(dashboard)/dashboard/orders/order-actions.tsx src/app/(dashboard)/dashboard/orders/page.tsx
git commit -m "feat: status history tracking, ready status, WhatsApp CTA buttons in order actions"
```

---

### Task 4: Tracking API Route

**Files:**
- Create: `src/app/api/orders/track/[token]/route.ts`

- [ ] **Step 1: Create the GET endpoint**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  if (!token || token.length !== 8) {
    return NextResponse.json({ error: "Invalid token" }, { status: 404 });
  }

  const supabase = createServiceClient();

  const { data: order, error } = await supabase
    .from("orders")
    .select(`
      id, order_number, status, status_history, created_at,
      customer_name, customer_whatsapp, delivery_method,
      delivery_address, delivery_date, delivery_time, notes,
      subtotal_nad, delivery_fee_nad, discount_nad, total_nad,
      payment_method, payment_reference, proof_of_payment_url,
      tracking_token,
      merchants!inner(store_name, store_slug, whatsapp_number),
      order_items(id, product_name, quantity, unit_price_nad)
    `)
    .eq("tracking_token", token)
    .single();

  if (error || !order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  return NextResponse.json({ order });
}
```

Note: Check exact column names — `product_name` might be stored differently in `order_items`. Check the schema.

- [ ] **Step 2: TypeScript check**

Run: `npx tsc --noEmit`

- [ ] **Step 3: Commit**

```bash
git add src/app/api/orders/track/[token]/route.ts
git commit -m "feat: add order tracking API endpoint"
```

---

### Task 5: Tracking Page — Server Component

**Files:**
- Create: `src/app/track/[token]/page.tsx`

- [ ] **Step 1: Create the server component**

This page fetches order data by tracking token using the service client, then renders the `TrackerClient` component. Shows "Order not found" for invalid tokens.

```typescript
import { createServiceClient } from "@/lib/supabase/service";
import { TrackerClient } from "./tracker-client";
import Link from "next/link";

export default async function TrackPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const supabase = createServiceClient();

  const { data: order } = await supabase
    .from("orders")
    .select(`
      id, order_number, status, status_history, created_at,
      customer_name, customer_whatsapp, delivery_method,
      delivery_address, delivery_date, delivery_time, notes,
      subtotal_nad, delivery_fee_nad, discount_nad,
      payment_method, payment_reference, proof_of_payment_url,
      tracking_token,
      merchants!inner(store_name, store_slug, whatsapp_number),
      order_items(id, product_name, quantity, unit_price_nad)
    `)
    .eq("tracking_token", token)
    .single();

  if (!order) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Order not found</h1>
          <p className="text-gray-500 mb-4">This tracking link may be invalid or expired.</p>
          <Link href="/stores" className="text-blue-600 hover:underline">Browse stores</Link>
        </div>
      </div>
    );
  }

  return <TrackerClient order={order} token={token} />;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/track/[token]/page.tsx
git commit -m "feat: add tracking page server component"
```

---

### Task 6: Tracking Page — Client Component

**Files:**
- Create: `src/app/track/[token]/tracker-client.tsx`

- [ ] **Step 1: Create the tracker client component**

This is the main UI. It renders:
1. Store header
2. Order number + status badge
3. Visual stepper (vertical timeline)
4. Payment section (POP upload if needed)
5. Items list (collapsible if 4+)
6. Order totals
7. Delivery/pickup info
8. Sticky action bar (Chat with Seller, Re-order)

It also handles:
- Auto-polling every 60 seconds
- POP file upload
- Visibility change detection (pause polling when tab hidden)

The component should be approximately 200-300 lines. Build it section by section following the spec's layout order.

Key design tokens:
- Brand blue: `#2B5EA7` → `text-[#2B5EA7]`, `bg-[#2B5EA7]`
- Brand green: `#4A9B3E` → completed steps
- WhatsApp green: `#25D366` → Chat with Seller button
- Amber: payment-needed sections
- Red: cancelled status

The stepper should use a vertical layout with:
- Filled green circle + checkmark for completed steps
- Pulsing blue circle for current step
- Gray hollow circle for upcoming steps
- Connecting lines between circles (green for completed, gray for upcoming)

- [ ] **Step 2: Test locally**

Run: `npm run dev`
Navigate to `/track/[any-valid-token]` and verify the page renders correctly.

- [ ] **Step 3: TypeScript check**

Run: `npx tsc --noEmit`

- [ ] **Step 4: Commit**

```bash
git add src/app/track/[token]/tracker-client.tsx
git commit -m "feat: add tracking page client component with stepper, polling, POP upload"
```

---

### Task 7: Checkout Integration — order_placed WhatsApp

**Files:**
- Modify: `src/app/checkout/[slug]/checkout-form.tsx`

- [ ] **Step 1: Extract tracking_token from place_order result**

Update the type cast after `place_order` RPC:
```typescript
const order = orderData[0] as {
  order_id: string;
  order_number: number;
  payment_reference: string;
  tracking_token: string;  // NEW
};
```

- [ ] **Step 2: Add order_placed WhatsApp call to customer**

After the existing merchant WhatsApp notification, add:

```typescript
// WhatsApp Business API: notify customer order is placed
fetch("/api/whatsapp/send", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    merchant_id: merchantId,
    order_id: order.order_id,
    template_name: "order_placed",
    recipient_phone: customerWhatsapp.trim(),
    variables: [
      customerName.trim(),
      String(order.order_number),
      storeName,
      formatPrice(total),
    ],
    button_params: [order.tracking_token],
  }),
}).catch(() => {});
```

- [ ] **Step 3: Update merchant notification to include button_params**

Update the existing `new_order_merchant` call to include:
```typescript
button_params: [], // Static URL button — no dynamic params needed
```

- [ ] **Step 4: TypeScript check**

Run: `npx tsc --noEmit`

- [ ] **Step 5: Commit**

```bash
git add src/app/checkout/[slug]/checkout-form.tsx
git commit -m "feat: send order_placed WhatsApp to customer at checkout with tracking link"
```

---

### Task 8: Payment Reminders — Timing + Tracking Token

**Files:**
- Modify: `src/app/api/cron/payment-reminders/route.ts`

- [ ] **Step 1: Update timing constants**

Change:
- 2 hours → 1 hour
- 24 hours → 12 hours
- 72 hours → 48 hours
- 73 hours (auto-cancel) → 49 hours

```typescript
if (ageHours >= 1 && reminderCount === 0) shouldRemind = true;
else if (ageHours >= 12 && reminderCount === 1) shouldRemind = true;
else if (ageHours >= 48 && reminderCount === 2) shouldRemind = true;
```

Auto-cancel cutoff:
```typescript
const expiredCutoff = new Date(now.getTime() - 49 * 60 * 60 * 1000);
```

- [ ] **Step 2: Include tracking_token in WhatsApp calls**

Update the select query to include `tracking_token`:
```typescript
.select(`
  id, order_number, customer_name, customer_whatsapp,
  created_at, reminder_count, total_nad, payment_method,
  merchant_id, tracking_token,
  merchants!inner(store_name, store_slug)
`)
```

Add `button_params` to the WhatsApp call:
```typescript
button_params: [order.tracking_token],
```

- [ ] **Step 3: Include tracking_token in cancellation notification**

For auto-cancelled orders, no button needed (cancelled template has no CTA).

- [ ] **Step 4: TypeScript check**

Run: `npx tsc --noEmit`

- [ ] **Step 5: Commit**

```bash
git add src/app/api/cron/payment-reminders/route.ts
git commit -m "feat: optimize payment reminder timing (1hr/12hr/48hr) and include tracking links"
```

---

### Task 9: Full Build + Deploy

- [ ] **Step 1: Full TypeScript check**

Run: `npx tsc --noEmit`
Expected: no errors

- [ ] **Step 2: Build**

Run: `npx next build`
Expected: successful build

- [ ] **Step 3: Commit all changes**

```bash
git add -A
git commit -m "feat: order experience overhaul — tracking page, WhatsApp buttons, ready status"
```

- [ ] **Step 4: Push and deploy**

```bash
git push origin master
```

- [ ] **Step 5: Verify deployment**

Check Vercel dashboard for successful deployment.

- [ ] **Step 6: Test tracking page**

Visit `https://oshicart.com/track/{any-existing-tracking-token}` and verify:
- Page loads with order details
- Stepper shows correct status
- Auto-polling works (check network tab)
- Chat with Seller button opens WhatsApp

- [ ] **Step 7: Test WhatsApp buttons**

Send a test `order_placed` message:
```bash
curl -s -X POST https://oshicart.com/api/whatsapp/send \
  -H "Content-Type: application/json" \
  -d '{
    "merchant_id": null,
    "template_name": "order_confirmed",
    "recipient_phone": "+264812384424",
    "variables": ["Test", "9999", "Test Store"],
    "button_params": ["testtoken"]
  }'
```

Note: Button params will only work after the Meta templates are resubmitted with buttons (manual step — Task 10).

---

### Task 10: Meta Template Resubmission (Manual)

This task is done manually in the WhatsApp Manager, not in code.

- [ ] **Step 1: Delete all existing custom templates** (keep hello_world)

In WhatsApp Manager → Message Templates, delete:
- order_confirmed, order_ready, order_completed, order_cancelled
- new_order_merchant, payment_reminder, welcome_merchant

- [ ] **Step 2: Resubmit templates with CTA buttons**

Create each template as Utility category with a URL button. For each template, the button URL format in Meta is:
- `https://oshicart.com/track/{{1}}` (for Track Order buttons)
- `https://oshicart.com/s/{{1}}` (for Shop Again button)
- `https://oshicart.com/dashboard/orders` (for View Orders — static, no variable)
- `https://oshicart.com/dashboard` (for Open Dashboard — static, no variable)

Submit all 8 templates per the spec.

- [ ] **Step 3: Wait for approval**

Utility templates typically approved in minutes to hours.

- [ ] **Step 4: Test end-to-end**

Place a test order → verify order_placed received with Track Order button → confirm order → verify order_confirmed with button → complete → verify order_completed with Shop Again button.
