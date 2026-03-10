# ChatCart NA — Architecture Document

## Stack Decision

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| **Frontend** | Next.js 14 (App Router) | SSR for fast storefronts, API routes for backend, free Vercel hosting |
| **Backend** | Next.js API Routes + Supabase | No separate server needed. Supabase handles auth, DB, storage, realtime |
| **Database** | Supabase PostgreSQL | Free tier: 500MB, 2 projects. RLS for multi-tenant security |
| **Auth** | Supabase Auth (phone OTP) | WhatsApp number as identity. OTP via Twilio or Supabase built-in |
| **File Storage** | Supabase Storage | Product images, proof-of-payment uploads. Free tier: 1GB |
| **Hosting** | Vercel (free tier) | Auto-deploy, edge functions, 100GB bandwidth/month |
| **Styling** | Tailwind CSS | Fast, utility-first, small bundle size |
| **Image Processing** | Sharp (server-side) | Compress product images on upload to < 100KB |
| **Analytics** | Supabase + custom tables | No third-party analytics cost |
| **Payments** | Manual EFT (V1) | No integration cost. Match how merchants already work |

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
```

## Multi-Tenant Approach

### Strategy: Row-Level Security (RLS) on Supabase

Every table has a `merchant_id` column. RLS policies ensure:

1. **Merchants** can only read/write their own data
2. **Public storefront** can read products/categories for any merchant (via store slug lookup)
3. **Customers** can create orders for any merchant (insert-only, no read of other orders)
4. **Proof-of-payment uploads** scoped to order-specific storage paths

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
| **Authentication** | Phone OTP via Supabase Auth. No passwords |
| **Authorization** | RLS on every table. No server-side auth bypass |
| **Data isolation** | merchant_id on all rows. RLS enforced at DB level |
| **File uploads** | Validate file type (image/*), max 5MB, virus scan in V2 |
| **Input sanitization** | Zod validation on all API inputs. HTML entity encoding on output |
| **HTTPS** | Enforced by Vercel |
| **Secrets** | Environment variables only. No client-side secrets |
| **CORS** | Restricted to chatcartna.com domain |
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

## Scalability Notes

### Free Tier Capacity
| Resource | Limit | Supports |
|----------|-------|----------|
| Supabase DB | 500MB | ~50,000 products, ~100,000 orders |
| Supabase Storage | 1GB | ~10,000 product images at 100KB |
| Supabase Auth | 50,000 MAU | 50,000 merchants |
| Vercel bandwidth | 100GB/month | ~500,000 storefront visits |
| Vercel serverless | 100 hrs/month | ~360,000 API calls |

### Cost Estimates

| Merchants | Monthly Cost | Revenue (if 20% paying Pro) |
|-----------|-------------|---------------------------|
| 10 | $0 (free tiers) | NAD 198 (~$11) |
| 100 | ~$25 (Supabase Pro) | NAD 1,980 (~$110) |
| 1,000 | ~$100 (Supabase Pro + Vercel Pro) | NAD 19,800 (~$1,100) |

Break-even at ~25 paying merchants.

## Directory Structure (Planned)

```
chatcart-na/
├── src/
│   ├── app/
│   │   ├── (auth)/
│   │   │   ├── login/page.tsx
│   │   │   └── signup/page.tsx
│   │   ├── (dashboard)/
│   │   │   ├── layout.tsx
│   │   │   ├── dashboard/page.tsx
│   │   │   ├── products/page.tsx
│   │   │   ├── orders/page.tsx
│   │   │   ├── analytics/page.tsx
│   │   │   └── settings/page.tsx
│   │   ├── s/[slug]/
│   │   │   ├── page.tsx          ← Public storefront
│   │   │   └── [productId]/page.tsx
│   │   ├── checkout/[slug]/page.tsx
│   │   ├── api/
│   │   │   ├── products/route.ts
│   │   │   ├── orders/route.ts
│   │   │   ├── upload/route.ts
│   │   │   └── analytics/route.ts
│   │   ├── layout.tsx
│   │   └── page.tsx              ← Landing page
│   ├── components/
│   │   ├── ui/                   ← Shared UI components
│   │   ├── storefront/           ← Customer-facing components
│   │   └── dashboard/            ← Merchant dashboard components
│   ├── lib/
│   │   ├── supabase/
│   │   │   ├── client.ts
│   │   │   ├── server.ts
│   │   │   └── middleware.ts
│   │   ├── utils.ts
│   │   ├── constants.ts
│   │   └── validations.ts       ← Zod schemas
│   └── types/
│       └── index.ts
├── supabase/
│   └── migrations/
│       └── 001_initial_schema.sql
├── public/
│   └── images/
├── .env.local
├── next.config.js
├── tailwind.config.ts
├── tsconfig.json
├── package.json
├── PROJECT.md
├── PRD.md
├── ARCHITECTURE.md
├── TASKS.md
└── GO_TO_MARKET.md
```
