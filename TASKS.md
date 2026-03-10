# ChatCart NA — Task Breakdown (Ralph-Ready)

## Phase 0: Project Setup [P0]
- [ ] **T0.1** Initialize Next.js 14 project with App Router, TypeScript, Tailwind — **DoD**: `npm run dev` starts without errors
- [ ] **T0.2** Set up Supabase project, get connection strings — **DoD**: `.env.local` has `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- [ ] **T0.3** Configure Supabase client (browser + server) — **DoD**: `createClient()` returns authenticated client in both contexts
- [ ] **T0.4** Set up Vercel project, connect repo, configure env vars — **DoD**: `main` branch auto-deploys to Vercel
- [ ] **T0.5** Install core dependencies (sharp, zod, lucide-react) — **DoD**: All packages in `package.json`, no version conflicts

**Dependencies**: None. All tasks independent.

---

## Phase 1: Database & Auth [P0]
- [ ] **T1.1** Create Supabase migration: `merchants` table with RLS — **DoD**: Table exists, RLS policies enforce merchant isolation
- [ ] **T1.2** Create Supabase migration: `categories` table with RLS — **DoD**: Table exists, FK to merchants, public read policy
- [ ] **T1.3** Create Supabase migration: `products` table with RLS — **DoD**: Table exists, FK to merchants + categories, public read for available products
- [ ] **T1.4** Create Supabase migration: `orders` + `order_items` tables with RLS — **DoD**: Tables exist, customers can insert, merchants can read/update own
- [ ] **T1.5** Create Supabase migration: `store_analytics` table with RLS — **DoD**: Table exists, merchant-only access
- [ ] **T1.6** Create Supabase storage buckets (merchant-assets, order-proofs) with policies — **DoD**: Buckets exist, upload/read policies enforced
- [ ] **T1.7** Implement phone OTP auth flow (signup + login pages) — **DoD**: User can sign up with phone, receive OTP, verify, and be redirected to dashboard
- [ ] **T1.8** Create auth middleware for dashboard routes — **DoD**: Unauthenticated users redirected to login. Authenticated users can access `/dashboard`

**Dependencies**: T1.1 → T1.2, T1.3, T1.4, T1.5 (merchants table must exist first). T1.7 depends on T0.3.

---

## Phase 2: Merchant Dashboard - Store Setup [P0]
- [ ] **T2.1** Create store setup wizard (store name, description, WhatsApp number, bank details) — **DoD**: Merchant can complete setup, data saved to `merchants` table, slug auto-generated
- [ ] **T2.2** Create store settings page (edit store details, logo upload) — **DoD**: Merchant can update all store fields. Logo compressed and uploaded to Supabase Storage
- [ ] **T2.3** Create dashboard layout (sidebar nav, header, responsive) — **DoD**: Layout renders on mobile and desktop. Nav links to all dashboard sections

**Dependencies**: T2.1 depends on T1.1, T1.7. T2.3 is independent.

---

## Phase 3: Product Management [P0]
- [ ] **T3.1** Create "Add Product" form (name, price, description, category, images) — **DoD**: Product saved to DB. Images compressed via Sharp to < 100KB, uploaded to Storage
- [ ] **T3.2** Create product list view (grid/list toggle, edit/delete actions) — **DoD**: All merchant products displayed. Edit opens form. Delete removes with confirmation
- [ ] **T3.3** Create product edit form (pre-populated, image management) — **DoD**: Merchant can update any product field. Existing images shown with remove option
- [ ] **T3.4** Implement product availability toggle (in stock / out of stock) — **DoD**: Toggle updates `is_available`. Out-of-stock products hidden from storefront
- [ ] **T3.5** Create category management (add/edit/delete/reorder) — **DoD**: Merchant can CRUD categories. Products filterable by category
- [ ] **T3.6** Enforce free tier product limit (20 products) — **DoD**: Free tier merchants see upgrade prompt when adding 21st product

**Dependencies**: T3.1 depends on T1.3, T1.6, T2.1. T3.5 depends on T1.2.

---

## Phase 4: Public Storefront [P0]
- [ ] **T4.1** Create storefront page `/s/[slug]` with SSR — **DoD**: Page loads with store info + product grid. SSR verified (view source shows content). < 3s on throttled 3G
- [ ] **T4.2** Create product detail view `/s/[slug]/[productId]` — **DoD**: Shows product images (carousel), name, price, description, "Add to Cart" button
- [ ] **T4.3** Implement client-side cart (localStorage) — **DoD**: Add/remove/update quantity. Cart persists across pages. Cart badge shows count
- [ ] **T4.4** Create cart drawer/page with order summary — **DoD**: Shows all items, quantities, line totals, subtotal. Edit quantity or remove items
- [ ] **T4.5** Create checkout flow (customer info, delivery method, bank details display) — **DoD**: Customer enters name + WhatsApp number. Sees merchant bank details for EFT
- [ ] **T4.6** Implement proof-of-payment upload on checkout — **DoD**: Customer uploads image (< 5MB, image/* only). File stored in Supabase Storage. Order created in DB
- [ ] **T4.7** Create order confirmation page with WhatsApp deep link — **DoD**: Shows order number, "Message Merchant on WhatsApp" button with pre-filled text
- [ ] **T4.8** Add OG meta tags for social sharing — **DoD**: Shared store link shows store name, description, logo in WhatsApp/social preview
- [ ] **T4.9** Track page views for analytics — **DoD**: Each storefront visit increments `page_views` in `store_analytics` (debounced, no duplicate counting per session)

**Dependencies**: T4.1 depends on T1.1, T1.3. T4.5 depends on T4.3. T4.6 depends on T1.4, T1.6.

---

## Phase 5: Order Management [P0]
- [ ] **T5.1** Create orders list page (filterable by status) — **DoD**: Merchant sees all orders. Filter by pending/confirmed/completed/cancelled. Sorted by newest first
- [ ] **T5.2** Create order detail view (items, customer info, proof-of-payment) — **DoD**: Shows all order data. Proof-of-payment image viewable (click to enlarge)
- [ ] **T5.3** Implement order status actions (confirm, complete, cancel) — **DoD**: Status updates in DB. UI reflects new status immediately
- [ ] **T5.4** Add "Notify Customer" WhatsApp deep link buttons — **DoD**: Each status action shows WhatsApp button with pre-filled message to customer
- [ ] **T5.5** Enforce free tier order limit (50/month) — **DoD**: Free tier merchants see upgrade prompt. Customers see "Store temporarily unavailable" when limit hit

**Dependencies**: T5.1 depends on T1.4, T2.3.

---

## Phase 6: Analytics & Polish [P1]
- [ ] **T6.1** Create analytics dashboard page — **DoD**: Shows views, orders, revenue charts for last 7/30 days. Top-selling products list
- [ ] **T6.2** Implement daily analytics aggregation — **DoD**: Supabase function or cron aggregates daily stats into `store_analytics`
- [ ] **T6.3** Add landing page (chatcartna.com) — **DoD**: Hero section, features, pricing, CTA. Mobile responsive. < 2s load
- [ ] **T6.4** Add pricing page with tier comparison — **DoD**: Free vs Pro vs Business comparison table. CTA to sign up
- [ ] **T6.5** Create admin panel (view all merchants, usage stats) — **DoD**: Founder can see merchant count, total orders, revenue across platform
- [ ] **T6.6** Performance audit and optimization — **DoD**: Lighthouse mobile score > 90. All images lazy-loaded. Bundle < 200KB first load

**Dependencies**: T6.1 depends on T1.5, T6.2. T6.3 is independent.

---

## Phase 7: Launch Prep [P1]
- [ ] **T7.1** Set up custom domain (chatcartna.com or similar) — **DoD**: Domain resolves, HTTPS active, Vercel configured
- [ ] **T7.2** Create merchant onboarding guide (in-app + PDF) — **DoD**: Step-by-step guide accessible from dashboard. PDF downloadable for WhatsApp sharing
- [ ] **T7.3** Set up error monitoring (Sentry free tier or Vercel Analytics) — **DoD**: Runtime errors captured with stack trace and user context
- [ ] **T7.4** Create terms of service and privacy policy pages — **DoD**: Pages live at `/terms` and `/privacy`. Cover data handling, payment disclaimer
- [ ] **T7.5** Seed 3 demo stores with realistic products — **DoD**: 3 stores with 10+ products each, viewable at public URLs. Used for demo and testing

**Dependencies**: T7.1 is independent. T7.5 depends on Phase 4.

---

## Phase 8: Post-MVP [P2]
- [ ] **T8.1** EFT proof-of-payment OCR (auto-extract amount, match to order)
- [ ] **T8.2** FNB eWallet payment integration
- [ ] **T8.3** PayToday integration
- [ ] **T8.4** WhatsApp Cloud API integration (automated notifications)
- [ ] **T8.5** Multi-language support (Oshiwambo, Afrikaans)
- [ ] **T8.6** SA payment gateway integration (PayFast, Ozow)
- [ ] **T8.7** Inventory management
- [ ] **T8.8** Customer accounts + order history
- [ ] **T8.9** PWA for merchant dashboard

**Dependencies**: All depend on MVP completion.

---

## Summary

| Phase | Tasks | Priority | Est. Effort |
|-------|-------|----------|-------------|
| 0: Setup | 5 | P0 | Day 1 |
| 1: DB & Auth | 8 | P0 | Days 2-4 |
| 2: Store Setup | 3 | P0 | Days 5-6 |
| 3: Products | 6 | P0 | Days 7-10 |
| 4: Storefront | 9 | P0 | Days 11-16 |
| 5: Orders | 5 | P0 | Days 17-20 |
| 6: Analytics & Polish | 6 | P1 | Days 21-25 |
| 7: Launch Prep | 5 | P1 | Days 26-30 |
| 8: Post-MVP | 9 | P2 | Post-launch |
