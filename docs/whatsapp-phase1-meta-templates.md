# WhatsApp Phase 1 Meta Templates

Create these in Meta WhatsApp Manager before enabling Phase 1 automations in production.

Use language `English`, code `en`. Use category `Utility` unless noted.

For the v2 templates below, add the listed website button in Meta. These buttons use fixed URLs, so the app does not send button parameters.

## Merchant Lifecycle

### `subscription_activated`

Body:
`✅ Hi {{1}}, your OshiCart {{2}} subscription is active. Payment received: {{3}}. Your plan runs until {{4}}. Reference: {{5}}. Tap below to manage your store.`

Button:
Open Dashboard - `https://oshicart.com/dashboard`

Variables:
1. Store name
2. Plan
3. Amount
4. End date
5. Reference

### `trial_ending_soon`

Body:
`⏳ Hi {{1}}, your OshiCart trial ends in {{2}} day(s), on {{3}}. Renew now to keep your store active and continue accepting orders. Tap below to choose a plan.`

Button:
Renew Plan - `https://oshicart.com/pricing`

Variables:
1. Store name
2. Days remaining
3. End date

### `subscription_expiring_soon`

Body:
`⏳ Hi {{1}}, your {{2}} subscription expires in {{3}} day(s). Renew now to keep your OshiCart store active. Tap below to choose a plan.`

Button:
Renew Plan - `https://oshicart.com/pricing`

Variables:
1. Store name
2. Plan
3. Days remaining

### `subscription_grace_started`

Body:
`⚠️ Hi {{1}}, your {{2}} subscription has expired. Your store is in grace period until {{3}}. Tap below to renew before suspension.`

Button:
Renew Plan - `https://oshicart.com/pricing`

Variables:
1. Store name
2. Plan
3. Grace end date

### `subscription_suspended`

Body:
`🚫 Hi {{1}}, your OshiCart {{2}} subscription is suspended because payment is overdue. Tap below to renew. We will reactivate after payment.`

Button:
Renew Plan - `https://oshicart.com/pricing`

Variables:
1. Store name
2. Plan

## Merchant Operations

### `proof_uploaded_merchant`

Body:
`💳 Hi {{1}}, proof of payment was uploaded for order #{{2}} from {{3}}. Order total: {{4}}. Tap below to verify and confirm the order.`

Button:
View Orders - `https://oshicart.com/dashboard/orders`

Variables:
1. Store name
2. Order number
3. Customer name
4. Total

### `pending_order_reminder_merchant`

Body:
`🛒 Hi {{1}}, order #{{2}} from {{3}} is still pending. Total: {{4}}. Tap below to confirm, mark ready, or cancel.`

Button:
View Orders - `https://oshicart.com/dashboard/orders`

Variables:
1. Store name
2. Order number
3. Customer name
4. Total

### `low_stock_alert`

Body:
`📦 Hi {{1}}, stock is low for {{2}}. Current quantity: {{3}}. Tap below to update your products.`

Button:
Update Products - `https://oshicart.com/dashboard/products`

Variables:
1. Store name
2. Product name
3. Quantity

## Admin Alerts

### `admin_new_merchant_signup`

Body:
`🆕 New OshiCart merchant signup: {{1}}. WhatsApp: {{2}}. Industry: {{3}}. Tap below to review the merchant.`

Button:
Open Admin - `https://oshicart.com/admin/merchants`

Variables:
1. Store name
2. WhatsApp number
3. Industry

### `admin_subscription_payment_received`

Body:
`💰 OshiCart subscription payment received. Store: {{1}}. Plan: {{2}}. Amount: {{3}}. Months: {{4}}. Reference: {{5}}. Tap below to verify in admin.`

Button:
Open Billing - `https://oshicart.com/admin/billing`

Variables:
1. Store name
2. Plan
3. Amount
4. Months
5. Reference

### `admin_safety_review_alert`

Body:
`🚨 OshiCart safety alert for {{1}}. Type: {{2}}. Reason: {{3}}. Tap below to review urgently.`

Button:
Open Reports - `https://oshicart.com/admin/reports`

Variables:
1. Store name
2. Alert type
3. Reason

## Merchant Announcements

### `merchant_platform_update`

Body:
`📣 Hi {{1}}, OshiCart update: {{2}}. {{3}}. Tap below to open your dashboard.`

Button:
Open Dashboard - `https://oshicart.com/dashboard`

Variables:
1. Store name
2. Update title
3. Message

### `merchant_maintenance_notice`

Body:
`🔧 Hi {{1}}, OshiCart service notice: {{2}}. {{3}}. Tap below to open your dashboard.`

Button:
Open Dashboard - `https://oshicart.com/dashboard`

Variables:
1. Store name
2. Notice title
3. Message
