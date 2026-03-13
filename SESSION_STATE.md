# Session State — Active Working Memory

## 2026-03-13 — Industry-Themed Storefronts In Progress

### CURRENT STATUS: Admin Dashboard DEPLOYED, Themed Storefronts Partially Done

---

### Admin Dashboard — DEPLOYED & LIVE
- Migration 012 applied to production Supabase
- Super admin seeded: `wazabi007@gmail.com`
- All admin pages verified working in browser
- Post-deploy fixes applied: middleware auth, merchants column name, subscription action buttons, cleanup

### Industry-Themed Storefronts — IN PROGRESS

**Spec:** `docs/superpowers/specs/2026-03-13-industry-themed-storefronts-design.md`
**Plan:** `docs/superpowers/plans/2026-03-13-industry-themed-storefronts.md`

| Task | Status | Description |
|------|--------|-------------|
| 1 | DONE | ThemeConfig + THEME_CONFIGS + getThemeConfig() in `industry.ts` |
| 2 | DONE | Theme props (accentColor, accentHover, ctaText) on ProductCard |
| 3 | TODO | `layouts/types.ts` — shared LayoutProduct + LayoutProps types |
| 4 | TODO | `layouts/menu-list.tsx` — Food Prepared layout (row-based) |
| 5 | TODO | `layouts/compact-grid.tsx` — Food Fresh layout (dense grid) |
| 6 | TODO | `layouts/horizontal-card.tsx` — Beauty layout (horizontal cards) |
| 7 | TODO | `layouts/service-list.tsx` — Services layout (text list) |
| 8 | TODO | `layouts/visual-gallery.tsx` — Gifting layout (large-image grid) |
| 9 | DONE | `product-section.tsx` — variant-aware wrapper (imports layouts) |
| 10 | DONE | Storefront page wired with theme + ProductSection |
| 11 | TODO | Manual QA testing |

**Blocker:** Tasks 3-8 must be created — ProductSection imports them but files don't exist yet.

### Resume Instructions
1. Create `src/components/storefront/layouts/` directory
2. Create files for Tasks 3-8 (types.ts + 5 layout components)
3. Run `npx tsc --noEmit` to verify
4. Commit and push
5. Test storefronts by setting merchant industry values in Supabase

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

| Tier | Price | Products | Orders/mo | Key Differentiator |
|------|-------|----------|-----------|-------------------|
| Oshi-Start | N$0 (30-day trial) | 10 | 20 | Full experience, OshiCart branding |
| Oshi-Basic | N$199/mo | 30 | 200 | No branding |
| Oshi-Grow | N$499/mo | 200 | 500 | + Inventory, coupons |
| Oshi-Pro | N$1,200/mo | Unlimited | Unlimited | + Priority support |

### Subscription Lifecycle
```
Trial (30 days) → Grace (7 days) → Soft Suspend → Hard Suspend (after 30 days)
Payment at any point → Active
```
