# Session State — Active Working Memory

## 2026-03-13 — Industry-Themed Storefronts COMPLETE

### CURRENT STATUS: Admin Dashboard + Themed Storefronts DEPLOYED

---

### Admin Dashboard — DEPLOYED & LIVE
- Migration 012 applied to production Supabase
- Super admin seeded: `wazabi007@gmail.com`
- All admin pages verified working in browser
- Post-deploy fixes applied: middleware auth, merchants column name, subscription action buttons, cleanup

### Industry-Themed Storefronts — COMPLETE & DEPLOYED

| Task | Status | Description |
|------|--------|-------------|
| 1 | DONE | ThemeConfig + THEME_CONFIGS + getThemeConfig() in `industry.ts` |
| 2 | DONE | Theme props (accentColor, accentHover, ctaText) on ProductCard |
| 3 | DONE | `layouts/types.ts` — shared LayoutProduct + LayoutProps types |
| 4 | DONE | `layouts/menu-list.tsx` — Food Prepared layout (row-based, orange) |
| 5 | DONE | `layouts/compact-grid.tsx` — Food Fresh layout (dense grid, green) |
| 6 | DONE | `layouts/horizontal-card.tsx` — Beauty layout (horizontal cards, slate) |
| 7 | DONE | `layouts/service-list.tsx` — Services layout (text list, blue) |
| 8 | DONE | `layouts/visual-gallery.tsx` — Gifting layout (large-image grid, gold) |
| 9 | DONE | `product-section.tsx` — variant-aware wrapper |
| 10 | DONE | Storefront page wired with theme integration |
| 11 | TODO | Manual QA testing across all archetypes |

### UX Improvements — DEPLOYED
- Dashboard stat cards (Products, Orders, Revenue) now clickable → link to their pages
- Dashboard product cards (image + name) clickable → link to edit page
- Admin overview stat cards clickable → link to merchants, billing, reports
- Admin merchant Products tab: product names link to storefront product page
- OshiCart logo in merchant dashboard nav links back to /dashboard (desktop + mobile)
- Beauty archetype color changed from pink to slate

---

### Current Infrastructure
- **Domain**: `oshicart.com` — LIVE on Vercel
- **Hosting**: Vercel (auto-deploys from GitHub `master`)
- **Database**: Supabase Pro — EU West (Ireland)
- **DNS**: Cloudflare → Vercel (DNS only, no proxy)
- **Email**: Resend SMTP via `send.oshicart.com` (VERIFIED)
- **Admin**: `wazabi007@gmail.com` as super_admin in admin_users table

### Environment Variables (Vercel)
```
NEXT_PUBLIC_SUPABASE_URL=https://pcseqiaqeiiaiqxqtfmw.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...(anon key)
SUPABASE_SERVICE_ROLE_KEY=eyJ...(service role key)
NEXT_PUBLIC_SITE_URL=https://oshicart.com
ADMIN_EMAILS=info@octovianexus.com
```
**Still needs to be added:**
```
CRON_SECRET=c9f94e874701a3e9beda02390fda2725
```

### Pricing Tiers

| Tier | Price | Products | Orders/mo |
|------|-------|----------|-----------|
| Oshi-Start | N$0 (30-day trial) | 10 | 20 |
| Oshi-Basic | N$199/mo | 30 | 200 |
| Oshi-Grow | N$499/mo | 200 | 500 |
| Oshi-Pro | N$1,200/mo | Unlimited | Unlimited |
