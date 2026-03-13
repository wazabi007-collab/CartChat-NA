# Session State — Active Working Memory

## 2026-03-14 — SMD Sync + Category Folders + Search/Sort + Analytics

### CURRENT STATUS: Full Platform Live — 3,043 products synced

---

### What Was Built & Deployed (2026-03-14)

**SMD Technologies Product Sync**
- Full sync: 3,033 created + 10 updated = 3,043 products
- 3,033 images downloaded, compressed via Sharp, uploaded to Supabase Storage
- 22 categories auto-created from SMD Category field
- Category images auto-assigned from first product in each category
- Pricing: 46% markup under N$500, 36% markup N$500+
- Stock levels synced from SOH field
- SKU column added to products table for matching
- Sync script: `scripts/smd-sync.js`
- API endpoint: `POST /api/sync/smd` (admin-only)

**Category Folder View on Storefront**
- Stores with 3+ categories and 20+ products show category grid
- Cards with image, name, product count
- Click category -> filtered products with breadcrumb navigation
- Pagination preserves category filter

**Storefront Pagination**
- 100 products per page
- Previous/Next + numbered page links
- Theme accent color on active page
- Total product count display

**Product Search + Sort**
- Dashboard: search by name/SKU/category + sort (name, price, stock, newest)
- Storefront: search by name/description + sort (name, price)
- Client-side instant filtering

**Marketplace Category Filters**
- 10 industry categories as filter pills on /stores
- Stores show industry label on cards
- Filter preserves search query

**Soft Delete + Bulk Delete Products**
- Products soft-deleted (deleted_at timestamp) instead of hard-deleted
- Deleted products still count toward tier product limit for billing
- Select mode with Select All + bulk delete

**Vercel Speed Insights + Analytics**
- Core Web Vitals tracking (LCP, FID, CLS, TTFB, INP)
- Page views, visitors, referrers, countries, devices

---

### What Was Built (2026-03-13)
- Admin Dashboard (full panel with merchants, billing, analytics, team, audit)
- 4-tier subscription system (Oshi-Start/Basic/Grow/Pro)
- Industry-themed storefronts (6 layouts)
- Modern invoices with VAT support
- Subscription checkout with Nedbank payment details
- Store logo upload
- Signup-to-checkout flow for paid plans
- Admin WhatsApp notify buttons
- Pricing cards redesign
- Various post-deploy fixes

### Pending Manual Steps
- Add `CRON_SECRET` in Vercel Dashboard (value: c9f94e874701a3e9beda02390fda2725)
- Add `SMD_BEARER_TOKEN` + `SMD_CLIENT_ACCESS_KEY` in Vercel for automated re-sync

### Current Infrastructure
- **Domain**: oshicart.com — LIVE on Vercel
- **Hosting**: Vercel (auto-deploys from GitHub `master`)
- **Database**: Supabase Pro — EU West (Ireland)
- **Admin**: wazabi007@gmail.com as super_admin
