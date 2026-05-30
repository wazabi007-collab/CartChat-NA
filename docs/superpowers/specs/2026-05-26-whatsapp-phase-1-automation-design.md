# WhatsApp Phase 1 Automation

Date: 2026-05-26
Status: Approved for implementation

## Goal

Use the existing Meta WhatsApp Cloud API integration to improve merchant retention, payment recovery, platform communication, and operational response time.

## Scope

Phase 1 adds:

- Subscription lifecycle WhatsApp messages to merchants.
- Merchant operational alerts for proof uploads, stale pending orders, and low stock.
- Platform/admin WhatsApp alerts for important business events.
- Admin-created merchant announcements for platform updates.

Phase 1 does not add:

- Shared WhatsApp inbox.
- Merchant-owned WhatsApp number onboarding.
- AI chatbot.
- Customer marketing broadcasts.
- WhatsApp Catalog sync.

## Architecture

OshiCart keeps using the existing `/api/whatsapp/send` route and `whatsapp_messages` table, but adds event idempotency and a typed template registry. Automation callers do not send arbitrary templates directly; they call a small helper that validates the template name, variable count, and recipient before logging and sending.

The `whatsapp_messages` table gains `event_key`, `recipient_type`, and `category` columns. `event_key` prevents duplicate sends for lifecycle events such as `subscription_expiring_soon:merchantId:7`.

## Templates

All templates must be submitted in Meta WhatsApp Manager before enabling `WHATSAPP_ENABLED=true` in production.

### Merchant Lifecycle

- `subscription_activated`: merchant payment/subscription activation receipt.
- `trial_ending_soon`: trial expiry warning.
- `subscription_expiring_soon`: paid subscription expiry warning.
- `subscription_grace_started`: grace period started after expiry.
- `subscription_suspended`: store suspended because payment was not made.

### Merchant Operations

- `proof_uploaded_merchant`: customer uploaded proof of payment.
- `pending_order_reminder_merchant`: order has remained pending too long.
- `low_stock_alert`: tracked product is near/out of stock.

### Platform/Admin

- `admin_new_merchant_signup`: internal alert to OshiCart admins.
- `admin_subscription_payment_received`: internal alert after subscription payment.
- `admin_safety_review_alert`: internal alert when a store/product needs safety review.

### Merchant Announcements

- `merchant_platform_update`: Utility template for account/platform updates.
- `merchant_maintenance_notice`: Utility template for service notices.

Marketing-style merchant broadcasts are deferred until explicit communication preferences and opt-out handling are implemented.

## Cron Behavior

`/api/cron/check-subscriptions` runs daily and sends:

- Trial ending reminders at 7, 3, and 1 day before `trial_ends_at`.
- Paid subscription ending reminders at 7, 3, and 1 day before `current_period_end`.
- Grace-started notices after subscription status moves to `grace`.
- Suspension notices after status moves to `soft_suspended` or `hard_suspended`.

`/api/cron/payment-reminders` continues customer payment reminders and also sends:

- Merchant pending-order reminders for pending orders older than 2 hours.
- Low-stock alerts for tracked products with stock quantity at or below 3.

## Admin Announcements

Admin users get a new API route:

- `POST /api/admin/merchant-announcements/preview`
- `POST /api/admin/merchant-announcements/send`

Audience filters:

- `all`
- `active`
- `trial`
- `paid`
- `expiring_soon`

The send route logs one WhatsApp message per merchant and uses event keys in the format `announcement:{announcementId}:{merchantId}`.

## Error Handling

The WhatsApp sender stores the full Meta error payload when available. Automation routes use fire-and-forget sends only where the primary user action should not fail because WhatsApp is unavailable.

## Testing

- Unit-like checks for template validation.
- TypeScript build/lint.
- Manual dry-run with `WHATSAPP_ENABLED=false` to confirm routes do not throw.
- Real Meta template tests after templates are approved.
