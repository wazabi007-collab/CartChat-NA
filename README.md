# OshiCart

WhatsApp-powered e-commerce platform for Namibian businesses. Merchants create free online stores and receive orders via WhatsApp.

**Live:** [oshicart.com](https://oshicart.com)

## Tech Stack

- **Framework:** Next.js 15 (App Router)
- **Database:** Supabase (Postgres + Auth + Storage)
- **Hosting:** Vercel
- **DNS:** Cloudflare
- **Styling:** Tailwind CSS

## Features

- Merchant signup with magic-link auth
- Custom storefront per merchant (`/s/{slug}`)
- Product catalog with image uploads
- Shopping cart + checkout (EFT, MoMo, eWallet, COD)
- Coupon/discount codes
- Inventory tracking with low-stock alerts
- Delivery fee configuration
- Proof of payment upload
- WhatsApp deep links for merchant-customer communication
- Store directory with search
- Mobile-responsive design

## Getting Started

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.production.example .env.local
# Edit .env.local with your Supabase credentials

# Run dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Environment Variables

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (server-side only) |
| `NEXT_PUBLIC_SITE_URL` | Public site URL (`http://localhost:3000` for dev) |

## Database Migrations

SQL migrations are in `supabase/migrations/` (001–010). For a fresh Supabase project, run `FULL_MIGRATION_FOR_SUPABASE_PRO.sql` followed by `STORAGE_BUCKETS_FOR_SUPABASE_PRO.sql`.

## Project Structure

```
src/
  app/
    (auth)/        — login, signup
    (dashboard)/   — merchant dashboard (orders, products, settings)
    (storefront)/  — public store pages + checkout
    stores/        — store directory
  components/      — shared UI components
  lib/
    supabase/      — Supabase client (browser, server, service, middleware)
```
