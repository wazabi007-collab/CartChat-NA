# WhatsApp Business API Integration — Design Spec

**Date:** 2026-03-17
**Status:** Approved, pending phone number acquisition
**Author:** Claude + Elton

---

## Overview

Integrate the Meta WhatsApp Cloud API into OshiCart to send automated messages to customers and merchants. Uses a single OshiCart platform number owned by Octovia Nexus Investment CC. All merchants' notifications send from this one number.

## Goals

1. Auto-notify customers on order status changes (confirmed, ready, completed, cancelled)
2. Alert merchants via WhatsApp when new orders arrive
3. Recover abandoned payments with timed reminders (2hr, 24hr, 3 days)
4. Auto-cancel unpaid orders after 3 days and restock inventory
5. Welcome merchants when they complete store setup
6. Log all messages for auditing and future per-message billing

## Non-Goals (for v1)

- Per-merchant WhatsApp numbers (future premium feature)
- WhatsApp chatbot / auto-reply
- WhatsApp broadcast to customer lists
- WhatsApp catalog sync
- Incoming message handling (only outbound in v1)

---

## Architecture

### Flow

```
Trigger event (order status change, new order, signup, cron)
  → Next.js API route /api/whatsapp/send
  → Constructs template message with variables
  → POST to Meta WhatsApp Cloud API
  → Log to whatsapp_messages table
  → Meta delivers to recipient
  → Meta sends delivery webhook to /api/whatsapp/webhook
  → Update message status (sent → delivered → read)
```

### Approach: Single Platform Number

- One WhatsApp Business number registered under Octovia Nexus Investment CC
- All messages include the merchant's store name in the template so customers know who it's from
- Merchants don't need to do any Meta verification
- Can add per-merchant numbers later as a premium tier feature

---

## Database Schema

### New Table: `whatsapp_messages`

```sql
CREATE TABLE whatsapp_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id UUID REFERENCES merchants(id),
  order_id UUID REFERENCES orders(id),
  template_name TEXT NOT NULL,
  recipient_phone TEXT NOT NULL,
  variables JSONB NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'queued',
  -- status: queued, sent, delivered, read, failed
  meta_message_id TEXT,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ
);

CREATE INDEX idx_wa_messages_merchant ON whatsapp_messages(merchant_id);
CREATE INDEX idx_wa_messages_order ON whatsapp_messages(order_id);
CREATE INDEX idx_wa_messages_status ON whatsapp_messages(status);
CREATE INDEX idx_wa_messages_template ON whatsapp_messages(template_name);
```

### New Column on `orders` Table

```sql
ALTER TABLE orders ADD COLUMN reminder_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE orders ADD COLUMN last_reminder_at TIMESTAMPTZ;
```

### New Table: `whatsapp_config` (platform-level config)

```sql
CREATE TABLE whatsapp_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_number_id TEXT NOT NULL,
  waba_id TEXT NOT NULL,
  display_name TEXT NOT NULL DEFAULT 'OshiCart',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

---

## Message Templates

All templates must be submitted to Meta for approval before use. Templates use `{{1}}`, `{{2}}` etc. as variable placeholders.

### 1. order_confirmed
- **Trigger:** Merchant confirms order (status: pending → confirmed)
- **Recipient:** Customer
- **Language:** en
- **Body:**
  ```
  Hi {{1}}! ✅ Your order #{{2}} from {{3}} is confirmed and being prepared.
  We'll let you know when it's ready!
  ```
- **Variables:** customer_name, order_number, store_name

### 2. order_ready
- **Trigger:** Merchant marks order ready (status: confirmed → ready)
- **Recipient:** Customer
- **Body:**
  ```
  Hi {{1}}! 📦 Your order #{{2}} from {{3}} is ready for {{4}}.
  {{5}}
  ```
- **Variables:** customer_name, order_number, store_name, "pickup"/"delivery", pickup_address or delivery note

### 3. order_completed
- **Trigger:** Merchant marks order completed (status → completed)
- **Recipient:** Customer
- **Body:**
  ```
  Hi {{1}}! 🎉 Your order #{{2}} from {{3}} is complete. Total: {{4}}.
  Thank you for your order!
  ```
- **Variables:** customer_name, order_number, store_name, formatted_total

### 4. order_cancelled
- **Trigger:** Merchant cancels order (status → cancelled)
- **Recipient:** Customer
- **Body:**
  ```
  Hi {{1}}, your order #{{2}} from {{3}} has been cancelled.
  Please contact the store if you have any questions.
  ```
- **Variables:** customer_name, order_number, store_name

### 5. new_order_merchant
- **Trigger:** Customer places a new order (checkout success)
- **Recipient:** Merchant
- **Body:**
  ```
  🛒 New order #{{1}}!
  Customer: {{2}}
  Items: {{3}}
  Total: {{4}}
  Payment: {{5}}

  View order: {{6}}
  ```
- **Variables:** order_number, customer_name, item_count + summary, formatted_total, payment_method, dashboard_orders_url

### 6. payment_reminder
- **Trigger:** Cron job — unpaid order at 2hr, 24hr, 3-day marks
- **Recipient:** Customer
- **Body:**
  ```
  Hi {{1}}, your order #{{2}} from {{3}} is awaiting payment ({{4}}).
  Pay now to confirm your order: {{5}}
  ```
- **Variables:** customer_name, order_number, store_name, formatted_total, invoice_url

### 7. welcome_merchant
- **Trigger:** Merchant completes store setup (after merchant + subscription insert)
- **Recipient:** Merchant
- **Body:**
  ```
  Welcome to OshiCart! 🎉 Your store {{1}} is live!
  Share your store link: {{2}}
  Start adding products and selling today.
  ```
- **Variables:** store_name, store_url (oshicart.com/s/{slug})

---

## API Routes

### POST /api/whatsapp/send (Internal)

Sends a WhatsApp template message via Meta Cloud API. Not publicly accessible — called by other server-side code only.

**Request body:**
```typescript
{
  merchant_id: string;       // for logging
  order_id?: string;         // optional, for logging
  template_name: string;     // e.g. "order_confirmed"
  recipient_phone: string;   // e.g. "+264811234567"
  variables: string[];       // template variable values in order
}
```

**Logic:**
1. Validate inputs
2. Normalize phone number via `normalizeNamibianPhone()` (or leave foreign numbers as-is)
3. Insert row into `whatsapp_messages` with status `queued`
4. POST to `https://graph.facebook.com/v21.0/{PHONE_NUMBER_ID}/messages`
5. On success: update status to `sent`, store `meta_message_id`
6. On failure: update status to `failed`, store `error_message`
7. Return success/failure

**Meta API payload:**
```json
{
  "messaging_product": "whatsapp",
  "to": "264811234567",
  "type": "template",
  "template": {
    "name": "order_confirmed",
    "language": { "code": "en" },
    "components": [
      {
        "type": "body",
        "parameters": [
          { "type": "text", "text": "John" },
          { "type": "text", "text": "1042" },
          { "type": "text", "text": "Mama's Kitchen" }
        ]
      }
    ]
  }
}
```

### POST /api/whatsapp/webhook (Public)

Receives delivery status updates from Meta.

**Logic:**
1. Verify request signature using `X-Hub-Signature-256` header against app secret
2. Parse webhook payload for message status updates
3. Update `whatsapp_messages` row: `sent_at`, `delivered_at`, `read_at` based on status
4. Return 200 immediately (Meta requires fast response)

### GET /api/whatsapp/webhook (Public)

Meta webhook verification endpoint. Returns the `hub.challenge` value when `hub.verify_token` matches.

### GET /api/cron/payment-reminders

Protected by CRON_SECRET. Runs every 15 minutes.

**Logic:**
```
1. Find orders WHERE:
   - status = 'pending'
   - payment_method != 'cod'
   - created_at > 3 days ago (not yet expired)

2. For each order:
   a. If created_at + 2hr passed AND reminder_count = 0:
      → Send payment_reminder, set reminder_count = 1
   b. If created_at + 24hr passed AND reminder_count = 1:
      → Send payment_reminder, set reminder_count = 2
   c. If created_at + 3 days passed AND reminder_count = 2:
      → Send payment_reminder (final warning), set reminder_count = 3

3. Find orders WHERE:
   - status = 'pending'
   - payment_method != 'cod'
   - created_at + 3 days + 1 hour has passed
   - reminder_count >= 3

4. For each expired order:
   → Update status to 'cancelled'
   → Restock inventory (increment stock_quantity for each order_item)
   → Log cancellation reason: 'auto_cancelled_unpaid'
```

---

## Integration Points (Existing Code Changes)

### 1. order-actions.tsx — Status Change Notifications

After `updateStatus()` successfully updates the DB, fire-and-forget call to `/api/whatsapp/send`:

```typescript
// After DB update succeeds
fetch("/api/whatsapp/send", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    merchant_id: merchantId,
    order_id: orderId,
    template_name: `order_${newStatus}`,  // order_confirmed, order_ready, etc.
    recipient_phone: customerWhatsapp,
    variables: [customerName, String(orderNumber), merchantStoreName, ...],
  }),
}).catch(() => {});
```

The existing "Notify customer" WhatsApp button stays as a fallback for custom messages.

### 2. checkout-form.tsx — New Order Merchant Alert

After `place_order` RPC succeeds, in addition to the existing email notification:

```typescript
fetch("/api/whatsapp/send", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    merchant_id: merchantId,
    template_name: "new_order_merchant",
    recipient_phone: merchantWhatsappNumber,
    variables: [orderNumber, customerName, itemSummary, total, paymentMethod, dashboardUrl],
  }),
}).catch(() => {});
```

### 3. setup/page.tsx — Welcome Message

After merchant insert + subscription insert succeeds:

```typescript
fetch("/api/whatsapp/send", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    merchant_id: newMerchant.id,
    template_name: "welcome_merchant",
    recipient_phone: form.whatsapp_number,
    variables: [form.store_name, `https://oshicart.com/s/${finalSlug}`],
  }),
}).catch(() => {});
```

### 4. vercel.json — Cron Schedule

```json
{
  "crons": [
    {
      "path": "/api/cron/payment-reminders",
      "schedule": "*/15 * * * *"
    },
    {
      "path": "/api/cron/check-subscriptions",
      "schedule": "0 2 * * *"
    }
  ]
}
```

---

## Environment Variables

```env
# WhatsApp Cloud API
WHATSAPP_PHONE_NUMBER_ID=     # Phone Number ID from Meta dashboard
WHATSAPP_ACCESS_TOKEN=        # System user permanent token
WHATSAPP_VERIFY_TOKEN=        # Random string for webhook verification (you create this)
WHATSAPP_WABA_ID=             # WhatsApp Business Account ID
WHATSAPP_APP_SECRET=          # App secret for webhook signature verification
```

All must be added to Vercel environment variables before going live.

---

## Meta Business Setup Checklist

1. [ ] Acquire dedicated phone number (new SIM)
2. [ ] Create Meta Business Account at business.facebook.com
3. [ ] Submit business verification (Octovia Nexus CC docs, Namibian ID)
4. [ ] Create Meta Developer App (type: Business)
5. [ ] Add WhatsApp product to app
6. [ ] Register phone number in Meta dashboard
7. [ ] Create system user + permanent access token
8. [ ] Submit all 7 message templates for approval
9. [ ] Configure webhook URL: `https://oshicart.com/api/whatsapp/webhook`
10. [ ] Set webhook subscriptions: messages, message_deliveries, message_reads
11. [ ] Add all env vars to Vercel
12. [ ] Test with personal number before going live

---

## Cost Projections

| Tier | Avg Orders/mo | WhatsApp Messages/mo | Est. Cost/mo |
|---|---|---|---|
| Oshi-Start merchant | 20 | ~60 (3 per order avg) | ~N$20-55 |
| Oshi-Basic merchant | 100 | ~300 | ~N$100-270 |
| Oshi-Grow merchant | 300 | ~900 | ~N$300-800 |
| Platform (10 merchants) | 500 | ~1,500 | ~N$500-1,350 |
| Platform (50 merchants) | 2,000 | ~6,000 | ~N$2,000-5,400 |

**First 1,000 service conversations/month are free** (customer-initiated replies).

### Future Monetization Options
- Include message quota per tier (e.g., 100 msgs on Start, 500 on Basic, 2000 on Grow)
- Charge overage at N$0.15 per message
- Or absorb cost as platform value-add (marketing cost)

---

## File Structure

```
src/
  app/
    api/
      whatsapp/
        send/route.ts           # Internal: send template message
        webhook/route.ts        # Public: Meta webhook receiver + verification
      cron/
        payment-reminders/route.ts  # Cron: unpaid order reminders + auto-cancel
  lib/
    whatsapp.ts                 # WhatsApp API client wrapper + template builder

supabase/
  migrations/
    013_whatsapp_messages.sql   # New tables + order columns
```

---

## Testing Plan

1. **Unit test** `whatsapp.ts` — template variable building, phone normalization
2. **Integration test** `/api/whatsapp/send` — mock Meta API, verify DB logging
3. **Integration test** `/api/whatsapp/webhook` — verify signature validation, status updates
4. **Integration test** `/api/cron/payment-reminders` — verify reminder scheduling, auto-cancel + restock
5. **E2E test** — place order, confirm, verify message logged with correct template + variables
6. **Manual test** — send real messages to personal number via Meta test mode

---

## Rollout Plan

1. Build all code with feature flag (`WHATSAPP_ENABLED=true/false`)
2. Deploy code to production (flag off)
3. Complete Meta setup checklist when phone number acquired
4. Enable flag, test with team orders
5. Go live for all merchants

---

## Dependencies

- Phone number acquisition (Elton — new SIM)
- Meta Business verification (1-5 business days)
- Template approval (minutes to hours per template)
- CRON_SECRET must be set in Vercel (existing TODO)
