# WhatsApp Phase 1 Automation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build high-impact WhatsApp automation for merchant retention, operations, admin alerts, and platform announcements.

**Architecture:** Add a typed WhatsApp template/event layer on top of the existing Meta Cloud API client. Use `whatsapp_messages.event_key` for idempotency and wire events into existing cron/payment/order routes.

**Tech Stack:** Next.js App Router, TypeScript, Supabase, Meta WhatsApp Cloud API, Vercel Cron.

---

## File Structure

- `supabase/migrations/032_whatsapp_phase1_automation.sql`: WhatsApp message metadata and merchant announcement tables.
- `src/lib/whatsapp-templates.ts`: approved template definitions, variable counts, and event helper types.
- `src/lib/whatsapp-events.ts`: idempotent send helpers and recipient formatting.
- `src/lib/admin-notifications.ts`: OshiCart admin WhatsApp alert helper.
- `src/app/api/cron/check-subscriptions/route.ts`: lifecycle reminder sends.
- `src/app/api/cron/payment-reminders/route.ts`: merchant pending order and low stock sends.
- `src/app/api/payments/dpo/callback/route.ts`: subscription activation WhatsApp.
- `src/app/api/admin/billing/route.ts`: admin-recorded payment WhatsApp.
- `src/app/api/admin/subscriptions/route.ts`: admin activation/status WhatsApp.
- `src/app/api/orders/upload-pop/route.ts`: merchant POP upload WhatsApp.
- `src/app/api/admin/merchant-announcements/preview/route.ts`: audience preview.
- `src/app/api/admin/merchant-announcements/send/route.ts`: announcement send.

## Tasks

- [ ] Add database migration for event keys and announcements.
- [ ] Add template registry and idempotent event sender.
- [ ] Wire subscription lifecycle cron messages.
- [ ] Wire payment activation and admin billing messages.
- [ ] Wire proof upload, pending order, and low stock alerts.
- [ ] Add merchant announcement preview/send API.
- [ ] Update env examples with WhatsApp variables.
- [ ] Run lint/type checks and document Meta templates to create.
