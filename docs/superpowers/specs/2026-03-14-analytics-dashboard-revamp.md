# Analytics Dashboard Revamp

**Date:** 2026-03-14
**Status:** Deployed

## Summary

Complete overhaul of the merchant analytics dashboard from a static 30-day table view to an interactive, chart-driven analytics experience with auto-tracking.

## What Changed

### 1. Auto Order/Revenue Tracking (CRITICAL FIX)
- **Problem:** `store_analytics` table had `orders_placed`, `orders_confirmed`, and `revenue_nad` columns but nothing ever updated them — they were always 0.
- **Solution:** New API endpoint `POST /api/analytics/sync` that recalculates today's order counts and revenue from the `orders` table and upserts into `store_analytics`.
- **Triggers:** Called automatically when:
  - A customer places an order (checkout-form.tsx)
  - A merchant changes order status — confirm, complete, cancel (order-actions.tsx)

### 2. Date Range Picker
- Quick filter buttons: **7 Days**, **30 Days**, **90 Days**
- **Custom** range with date inputs (from/to)
- All data is fetched server-side (180 days) and filtered client-side for instant switching

### 3. Recharts Visualizations
- **Daily Views & Orders** — Line chart (purple for views, green for orders)
- **Daily Revenue** — Bar chart in NAD
- **Product Revenue** — Horizontal bar chart showing top 8 products by revenue

### 4. Conversion Metrics (NEW)
- **Conversion Rate** — Page views to orders percentage
- **Average Order Value** — Total revenue / total orders

### 5. Period-over-Period Comparison
- Every stat card shows `% vs prev` (green up arrow / red down arrow)
- Compares selected period to the equivalent previous period
- Example: "30 Days" compares last 30d vs the 30d before that

### 6. Product-Level Stats (ENHANCED)
- Now shows **revenue per product** alongside quantity sold
- Expanded from top 5 to **top 10** products
- Includes horizontal bar chart visualization

### 7. CSV Export
- Download button exports filtered analytics data as CSV
- Columns: Date, Page Views, Orders Placed, Orders Confirmed, Revenue (NAD)

## Files Modified

| File | Change |
|------|--------|
| `src/app/(dashboard)/dashboard/analytics/page.tsx` | Rewrote as server data fetcher (180 days + top products with revenue) |
| `src/components/dashboard/analytics-client.tsx` | **NEW** — Full client-side analytics UI with charts, filters, export |
| `src/app/api/analytics/sync/route.ts` | **NEW** — Syncs order/revenue data into store_analytics |
| `src/app/(dashboard)/dashboard/orders/order-actions.tsx` | Added `merchantId` prop, calls sync after status change |
| `src/app/(dashboard)/dashboard/orders/page.tsx` | Passes `merchantId` to OrderActions |
| `src/app/checkout/[slug]/checkout-form.tsx` | Calls sync after successful order placement |

## Stat Cards (6 total)

| Card | Source | Comparison |
|------|--------|------------|
| Page Views | store_analytics.page_views | vs prev period |
| Orders Placed | store_analytics.orders_placed | vs prev period |
| Orders Confirmed | store_analytics.orders_confirmed | vs prev period |
| Revenue | store_analytics.revenue_nad | vs prev period |
| Conversion Rate | orders / views * 100 | vs prev period |
| Avg Order Value | revenue / orders | vs prev period |

## Architecture

```
Server (page.tsx)
  └─ Fetches 180 days of store_analytics + top products
  └─ Passes as props to AnalyticsClient

Client (analytics-client.tsx)
  ├─ Date range filtering (client-side, instant)
  ├─ Period comparison calculation
  ├─ Recharts rendering (Line, Bar)
  ├─ Product table + chart
  └─ CSV export (Blob download)

Sync API (/api/analytics/sync)
  └─ Called from checkout + order-actions
  └─ Counts today's orders + revenue from orders table
  └─ Upserts into store_analytics (preserves page_views)
```
