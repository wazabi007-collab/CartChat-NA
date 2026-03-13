# OshiCart — Architecture Document

## Stack

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| **Frontend** | Next.js 15 (App Router) | SSR for fast storefronts, API routes for backend |
| **Backend** | Next.js API Routes + Supabase | No separate server needed. Supabase handles auth, DB, storage, realtime |
| **Database** | Supabase Pro (PostgreSQL) | Managed, EU West region, RLS for multi-tenant security |
| **Auth** | Supabase Auth (magic link) | Email-based sign-in codes |
| **File Storage** | Supabase Storage | Product images (merchant-assets, public), proof-of-payment (order-proofs, private) |
| **Hosting** | Vercel | Auto-deploy from GitHub, edge network |
| **DNS** | Cloudflare (DNS only) | oshicart.com → Vercel |
| **Styling** | Tailwind CSS | Fast, utility-first, small bundle size |
| **Image Processing** | Sharp (server-side) | Compress product images on upload to < 100KB |
| **Analytics** | Supabase + custom tables | No third-party analytics cost |
| **Payments** | EFT, COD, MoMo, eWallet | Manual payment proof + multiple methods |

## Data Model

```
┌──────────────────────┐
│      merchants       │
├──────────────────────┤
│ id (uuid, PK)        │
│ user_id (FK → auth)  │
│ store_name           │
│ store_slug (unique)  │
│ description          │
│ whatsapp_number      │
│ bank_name            │
│ bank_account_number  │
│ bank_account_holder  │
│ bank_branch_code     │
│ logo_url             │
│ tier (free/pro/biz)  │
│ is_active            │
│ store_status         │  ← pending/active/suspended/banned
│ tos_accepted_at      │
│ created_at           │
│ updated_at           │
└──────────┬───────────┘
           │ 1:N
           ▼
┌──────────────────────┐
│      categories      │
├──────────────────────┤
│ id (uuid, PK)        │
│ merchant_id (FK)     │
│ name                 │
│ sort_order           │
│ created_at           │
└──────────┬───────────┘
           │ 1:N
           ▼
┌──────────────────────┐
│      products        │
├──────────────────────┤
│ id (uuid, PK)        │
│ merchant_id (FK)     │
│ category_id (FK)     │
│ name                 │
│ description          │
│ price_nad (integer)  │  ← Store in cents
│ images (text[])      │  ← Array of Storage URLs
│ is_available         │
│ sort_order           │
│ created_at           │
│ updated_at           │
└──────────────────────┘

┌──────────────────────┐
│       orders         │
├──────────────────────┤
│ id (uuid, PK)        │
│ merchant_id (FK)     │
│ order_number (serial)│  ← Per-merchant sequential
│ customer_name        │
│ customer_whatsapp    │
│ delivery_method      │  ← pickup / delivery
│ delivery_address     │
│ status               │  ← pending/confirmed/completed/cancelled
│ subtotal_nad (int)   │
│ proof_of_payment_url │
│ payment_reference    │  ← OSHI-XXXXXXXX
│ notes                │
│ created_at           │
│ updated_at           │
└──────────┬───────────┘
           │ 1:N
           ▼
┌──────────────────────┐
│     order_items      │
├──────────────────────┤
│ id (uuid, PK)        │
│ order_id (FK)        │
│ product_id (FK)      │
│ product_name         │  ← Snapshot at order time
│ product_price (int)  │  ← Snapshot at order time
│ quantity             │
│ line_total (int)     │
│ created_at           │
└──────────────────────┘

┌──────────────────────┐
│    store_analytics   │
├──────────────────────┤
│ id (uuid, PK)        │
│ merchant_id (FK)     │
│ date                 │
│ page_views           │
│ orders_placed        │
│ orders_confirmed     │
│ revenue_nad (int)    │
│ created_at           │
└──────────────────────┘

┌──────────────────────┐
│       reports        │
├──────────────────────┤
│ id (uuid, PK)        │
│ merchant_id (FK)     │
│ reason               │
│ details              │
│ reporter_name        │
│ reporter_contact     │
│ status               │  ← open/reviewed/dismissed
│ admin_notes          │
│ created_at           │
│ updated_at           │
└──────────────────────┘
```

## Multi-Tenant Approach

### Strategy: Row-Level Security (RLS) on Supabase

Every table has a `merchant_id` column. RLS policies ensure:

1. **Merchants** can only read/write their own data
2. **Public storefront** can read products/categories for active merchants only (`is_active = true AND store_status = 'active'`)
3. **Customers** can create orders for any active merchant (insert-only, no read of other orders)
4. **Proof-of-payment uploads** scoped to order-specific storage paths
5. **Admin** uses service role client (bypasses RLS) — protected by `ADMIN_EMAILS` env var
6. **Reports** — anyone can submit (INSERT), only admin can read/update

```sql
-- Example RLS policy for products
CREATE POLICY "Merchants manage own products"
ON products FOR ALL
USING (merchant_id = auth.uid())
WITH CHECK (merchant_id = auth.uid());

CREATE POLICY "Public can view available products"
ON products FOR SELECT
USING (is_available = true);
```

### Storage Bucket Structure
```
/merchants/{merchant_id}/logo.webp
/merchants/{merchant_id}/products/{product_id}/{image_index}.webp
/orders/{order_id}/proof-of-payment.{ext}
```

## Security & Privacy Baseline

| Concern | Approach |
|---------|----------|
| **Authentication** | Magic link email via Supabase Auth. No passwords |
| **Authorization** | RLS on every table. No server-side auth bypass |
| **Data isolation** | merchant_id on all rows. RLS enforced at DB level |
| **File uploads** | Validate file type (image/*), max 5MB |
| **Input sanitization** | Zod validation on all API inputs. HTML entity encoding on output |
| **HTTPS** | Enforced by Vercel |
| **Secrets** | Environment variables only (Vercel dashboard). No client-side secrets |
| **CORS** | Restricted to oshicart.com domain |
| **Rate limiting** | Vercel edge middleware: 100 req/min per IP for API routes |
| **PII** | Customer WhatsApp numbers stored only in orders table. No analytics tracking of customers |

## Key Architecture Decisions

### 1. No Separate Backend Server
Next.js API routes + Supabase eliminate the need for Express/NestJS. Reduces infra cost to $0 on free tiers.

### 2. Price Storage in Integer Cents
`price_nad` stored as integer (cents) to avoid floating-point issues. NAD 49.99 → stored as 4999. Frontend formats for display.

### 3. Image Compression Pipeline
```
Upload → Sharp resize (max 800px wide) → WebP conversion → Target < 100KB → Supabase Storage
```

### 4. Order Number Generation
Per-merchant sequential order numbers (not global UUIDs). Merchant's first order is #1. Stored via Supabase function with row-level locking.

### 5. WhatsApp Notification Strategy (V1)
No WhatsApp API. Instead:
- Checkout confirmation page includes pre-filled WhatsApp deep link: `wa.me/{merchant_number}?text=New order #{number} from {customer}`
- Dashboard "Notify Customer" button generates deep link: `wa.me/{customer_number}?text=Your order #{number} is confirmed!`
- This is free, requires no Meta verification, and works immediately.

### 6. Storefront as SSR Pages
`/s/[slug]` routes are server-side rendered for:
- Fast initial load (critical for 3G)
- SEO / social sharing (OG tags with store info)
- No client-side data fetching for initial product list

## Infrastructure (Current)

| Service | Plan | Cost |
|---------|------|------|
| Supabase Pro | EU West (Ireland) | $25/mo |
| Vercel | Pro | $20/mo |
| Cloudflare | Free (DNS only) | $0 |
| Domain (oshicart.com) | Cloudflare Registrar | ~$10/yr |

**Total**: ~$46/mo

### Capacity (Supabase Pro + Vercel)
| Resource | Limit | Supports |
|----------|-------|----------|
| Supabase DB | 8GB | ~500,000 products, ~1M orders |
| Supabase Storage | 100GB | ~1M product images |
| Supabase Auth | 100,000 MAU | 100,000 merchants |
| Vercel bandwidth | 1TB/month | ~5M storefront visits |

## Directory Structure

```
chatcart-na/
├── src/
│   ├── app/
│   │   ├── (auth)/            ← login, signup
│   │   ├── (admin)/admin/     ← admin panel (stores, reports)
│   │   ├── (dashboard)/       ← merchant dashboard (orders, products, coupons, settings)
│   │   ├── s/[slug]/          ← public store pages + product detail
│   │   ├── checkout/[slug]/   ← customer checkout
│   │   ├── invoice/[orderId]/ ← order invoice
│   │   ├── stores/            ← store directory
│   │   ├── api/               ← API routes (products, orders, upload, analytics, admin, reports)
│   │   └── page.tsx           ← landing page
│   ├── components/
│   │   ├── admin/             ← admin panel components
│   │   ├── storefront/        ← customer-facing components (cart, product card, report button)
│   │   └── dashboard/         ← merchant dashboard components
│   ├── lib/
│   │   ├── supabase/          ← client.ts, server.ts, service.ts, middleware.ts
│   │   ├── utils.ts
│   │   └── constants.ts       ← Namibian industry list, etc.
│   └── types/
├── supabase/
│   └── migrations/            ← 001-011 + combined migration for fresh setup
├── public/                    ← logo.svg, icon.svg, hero images, payment icons
├── .env.local                 ← local dev (gitignored)
├── .env.production.example    ← template for Vercel env vars
└── next.config.ts
```
