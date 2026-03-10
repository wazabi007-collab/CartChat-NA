# ChatCart NA — Product Requirements Document

## MVP Scope (6 Weeks)

### Core Value Proposition
A merchant creates a WhatsApp-optimized product catalog in < 5 minutes, shares the link via WhatsApp, customers browse and order, merchant receives orders with payment proof — all without leaving WhatsApp.

### In Scope (V1)
1. Merchant onboarding (sign up, create store, add products)
2. WhatsApp-optimized storefront (mobile-first, lightweight, shareable link)
3. Product catalog management (CRUD, categories, images, pricing in NAD)
4. Order placement by customers (no account required)
5. Manual EFT proof-of-payment upload by customer
6. Order management dashboard for merchant (view, confirm, reject)
7. WhatsApp notification triggers (order placed, confirmed, ready)
8. Basic store analytics (views, orders, revenue)
9. Freemium billing (free tier + paid tier)

### Out of Scope (V1)
- WhatsApp Business API integration (use link-based flow)
- Automated payment verification (OCR)
- FNB eWallet / PayToday integration
- Delivery tracking / logistics
- Inventory management beyond simple stock toggle (in stock / out of stock)
- Multi-language support
- Customer accounts / order history
- Reviews / ratings
- Discount codes / promotions
- Multi-store per merchant
- SA payment gateways

---

## User Journeys

### Journey 1: Merchant Onboarding (< 5 minutes)
```
1. Merchant clicks "Create Store" on chatcartna.com
2. Signs up with WhatsApp number + OTP verification
3. Enters store name, description, WhatsApp number
4. Adds first product (name, price NAD, photo, description)
5. Gets shareable store link: chatcartna.com/s/storename
6. Shares link in WhatsApp status / groups / direct messages
```

### Journey 2: Customer Places Order
```
1. Customer taps store link in WhatsApp
2. Lightweight storefront loads (< 3s on 3G)
3. Browses products, taps "Add to Cart"
4. Enters name + WhatsApp number
5. Sees order summary with merchant's bank details
6. Makes EFT payment
7. Uploads proof-of-payment screenshot
8. Receives WhatsApp message: "Order received! Merchant will confirm shortly."
```

### Journey 3: Merchant Processes Order
```
1. Merchant receives WhatsApp notification: "New order from [Customer]"
2. Opens dashboard → sees order with proof-of-payment image
3. Verifies payment manually (checks bank app)
4. Clicks "Confirm" → customer gets WhatsApp message
5. Prepares order → clicks "Ready for pickup/delivery"
6. Customer gets final WhatsApp notification
```

---

## Functional Requirements

### F1: Authentication & Onboarding
- **F1.1**: Sign up with WhatsApp number + OTP (via Supabase Auth + Twilio/WhatsApp OTP)
- **F1.2**: Store creation wizard (name, description, logo, WhatsApp number, bank details)
- **F1.3**: Store URL auto-generated from store name (slugified)
- **F1.4**: Merchant can update store details anytime

### F2: Product Catalog
- **F2.1**: Add product (name, price NAD, description, up to 3 images, category)
- **F2.2**: Edit / delete product
- **F2.3**: Toggle product visibility (in stock / out of stock)
- **F2.4**: Categories (merchant-defined, simple text labels)
- **F2.5**: Image compression on upload (target < 100KB per image)
- **F2.6**: Free tier: max 20 products. Paid tier: unlimited

### F3: Storefront
- **F3.1**: Public URL: `chatcartna.com/s/{slug}`
- **F3.2**: Mobile-first responsive design (90%+ users on mobile)
- **F3.3**: Page load < 3 seconds on 3G connection
- **F3.4**: Product grid with image, name, price
- **F3.5**: Product detail view
- **F3.6**: Add to cart (client-side, no account needed)
- **F3.7**: Cart summary with total
- **F3.8**: Checkout: name, WhatsApp number, delivery/pickup choice
- **F3.9**: Display merchant bank details for EFT
- **F3.10**: Proof-of-payment image upload
- **F3.11**: Order confirmation page with WhatsApp deep link to merchant

### F4: Order Management
- **F4.1**: Dashboard showing all orders (pending, confirmed, completed, cancelled)
- **F4.2**: Order detail view (items, customer info, proof-of-payment image)
- **F4.3**: Confirm / reject / complete order actions
- **F4.4**: Filter/search orders by status, date, customer name
- **F4.5**: Free tier: max 50 orders/month. Paid tier: unlimited

### F5: Notifications
- **F5.1**: WhatsApp deep links for notifications (wa.me/{number}?text={encoded})
- **F5.2**: New order notification to merchant (via WhatsApp link on checkout confirmation page)
- **F5.3**: Order status change notification to customer (via WhatsApp link on dashboard action)
- **F5.4**: Note: V1 uses WhatsApp deep links, not API-sent messages

### F6: Analytics
- **F6.1**: Store views (daily/weekly)
- **F6.2**: Orders placed / confirmed / completed
- **F6.3**: Revenue (NAD) — daily/weekly/monthly
- **F6.4**: Top-selling products

### F7: Billing
- **F7.1**: Free tier: 20 products, 50 orders/month, basic analytics
- **F7.2**: Pro tier: NAD 99/month — unlimited products, unlimited orders, full analytics
- **F7.3**: Business tier: NAD 249/month — Pro + multiple staff accounts, priority support
- **F7.4**: Billing managed manually for V1 (EFT payment for subscription, tracked in admin panel)
- **F7.5**: Usage enforcement (soft limits with upgrade prompts)

---

## Non-Functional Requirements

| Requirement | Target | Rationale |
|-------------|--------|-----------|
| **Page load time** | < 3s on 3G | Namibian mobile network reality |
| **Image size** | < 100KB per product image | Data cost sensitivity |
| **Uptime** | 99.5% | Vercel + Supabase SLA |
| **Mobile responsiveness** | 100% of pages | 65% of ecommerce is mobile in Namibia |
| **SEO** | Basic meta tags, OG tags | Store links shared on social |
| **Security** | HTTPS, RLS on all tables, input sanitization | Baseline |
| **Data privacy** | No customer data shared between merchants | Multi-tenant isolation |
| **Concurrent users** | 100 simultaneous | Sufficient for 50 merchants |
| **Accessibility** | WCAG 2.1 AA for core flows | Good practice |

---

## Acceptance Criteria (MVP)

1. A new merchant can create a store and add 5 products in under 5 minutes
2. A customer can browse, add to cart, and submit an order in under 2 minutes
3. Proof-of-payment image uploads successfully and displays in merchant dashboard
4. Merchant can confirm an order and customer sees updated status
5. Storefront loads in < 3 seconds on throttled 3G connection
6. Product images are compressed to < 100KB automatically
7. Free tier limits are enforced (20 products, 50 orders/month)
8. Store URLs are unique and properly slugified
9. All pages are mobile-responsive
10. WhatsApp deep links open correctly on mobile devices

---

## Roadmap: V1 → V2

### V1 (Weeks 1-6) — Foundation
- Core catalog + storefront + orders + manual payment proof

### V1.5 (Weeks 7-10) — Payment Automation
- EFT proof-of-payment OCR (auto-match amount to order)
- FNB eWallet integration
- PayToday integration
- Automated WhatsApp notifications via Cloud API

### V2 (Weeks 11-16) — Growth
- Multi-language (Oshiwambo, Afrikaans)
- SA expansion (PayFast, Ozow, Yoco)
- Inventory management
- Delivery tracking integration
- Discount codes / promotions
- Customer accounts + order history
- Merchant mobile app (PWA)

### V3 (Month 5+) — Scale
- B2B/wholesale ordering
- Multi-store management
- Advanced analytics + AI insights
- Referral/affiliate program
- WhatsApp catalog sync (Meta native catalogs)
