# ChatCart NA — Project Brief

## Vision
The default WhatsApp commerce platform for Namibian SMEs — turning every WhatsApp seller into a professional online store in under 5 minutes.

## Problem Statement
Thousands of Namibian SMEs sell products via WhatsApp using a painful manual loop: post product photos → receive messages → negotiate price → share bank details → receive EFT proof-of-payment screenshot → manually verify → arrange delivery. This process is slow, error-prone, unscalable, and leaves no data trail for the seller.

No existing tool solves this for Namibia. TakeApp, Shopify, and WooCommerce are built for markets with mature payment APIs. Namibia's payment rails (FNB eWallet, PayToday, NamPay, MTC Maris, manual EFT) are unsupported. The result: SMEs stay manual, lose orders, and can't grow.

## Ideal Customer Profile (ICP)
- **Primary**: Solo or micro-business (1-5 people) selling physical goods via WhatsApp in Namibia
- **Examples**: Fashion resellers, home bakers, cosmetics sellers, phone accessory shops, farm produce sellers
- **Revenue range**: NAD 5,000 – 100,000/month
- **Tech profile**: Owns smartphone, uses WhatsApp daily, may not be comfortable with web dashboards
- **Pain**: Spends 2-4 hours/day on manual order management
- **Channel**: Already has WhatsApp Business App or personal WhatsApp with product photos

## Namibia-First Wedge
1. **Payment rail integration**: FNB eWallet, PayToday, manual EFT proof-of-payment verification — no other platform does this
2. **Data-light design**: Compressed catalogs, text-first UX, minimal image transfer — built for NAD 1.20/GB reality
3. **WhatsApp-native**: Customers never leave WhatsApp. No app download, no website visit required
4. **NAD pricing**: Affordable plans in local currency, not USD/ZAR

## SA Expansion Wedge (V2, Month 4+)
1. Integrate PayFast, Ozow, Yoco payment gateways
2. ZAR pricing tier
3. Same WhatsApp-native UX, proven in Namibia
4. Target SA conversational commerce market (projected $2.9B by 2028)

## Success Metrics

### 30 Days
- [ ] MVP live: merchant can create catalog + share WhatsApp store link
- [ ] 5 pilot merchants onboarded and transacting
- [ ] < 5 min median onboarding time
- [ ] Manual EFT proof-of-payment flow working end-to-end

### 60 Days
- [ ] 25 active merchants
- [ ] 3 paying merchants (converted from free tier)
- [ ] Automated EFT proof matching (OCR) in beta
- [ ] FNB eWallet integration live

### 90 Days
- [ ] 50 active merchants, 10 paying
- [ ] NAD 5,000+ MRR
- [ ] PayToday integration live
- [ ] Merchant retention > 70% month-over-month

## Constraints
- **Budget**: Bootstrap. No paid infrastructure until revenue covers it
- **Team**: Solo founder + AI tools (Claude, Ralph)
- **Timeline**: MVP in 6 weeks, revenue in 8 weeks
- **Infra**: Vercel free tier, Supabase free tier initially
- **WhatsApp API**: Start with WhatsApp Business App link-based flow (no API cost). Add Cloud API when unit economics justify it

## Non-Goals (V1)
- Native mobile app
- Inventory management beyond simple stock counts
- Delivery/logistics integration
- Multi-language UI (English only for V1; Oshiwambo/Afrikaans in V2)
- AI chatbot (banned by Meta for general-purpose; structured commerce bot only)
- B2B/wholesale features
- SA market

## Risk Register

| # | Risk | Severity | Likelihood | Mitigation |
|---|------|----------|------------|------------|
| R1 | Meta further restricts WhatsApp Business API | High | Low | Build as structured commerce tool (explicitly allowed). Maintain WhatsApp Business App fallback |
| R2 | SMEs unwilling to pay | High | Medium | Freemium model. Price at NAD 49-149/mo. Demonstrate time savings (2-4 hrs/day reclaimed) |
| R3 | Namibian banks lack APIs for payment verification | Medium | High | Start with manual EFT proof-of-payment OCR. Add bank integrations incrementally. Use DPO Group as initial gateway |
| R4 | Data costs deter customer engagement | Medium | Medium | Text-first catalogs, image compression, minimal data transfer. WhatsApp itself is the app |
| R5 | TakeApp or global player enters Namibia | Medium | Low | Local payment integration is defensive moat. Global players won't prioritize NAD 199B card market |
| R6 | Slow Meta business verification for Namibian merchants | Low | Medium | Guided verification support. Pre-validate documents. Start with Business App (no verification needed) |
| R7 | Supabase/Vercel free tier limits hit before revenue | Low | Medium | Architecture designed for easy migration. Keep infra lean |

## Decision Log

| Date | Decision | Rationale | Status |
|------|----------|-----------|--------|
| 2026-03-10 | Next.js + Supabase + Vercel stack | Free tiers, fast iteration, good DX. Supabase handles auth + DB + realtime | Approved |
| 2026-03-10 | WhatsApp Business App link flow for V1 (no API) | Zero cost. No Meta verification needed. Merchants share catalog link via WhatsApp | Approved |
| 2026-03-10 | Manual EFT proof-of-payment as primary payment method | Matches how 90%+ of Namibian WhatsApp sellers already transact | Approved |
| 2026-03-10 | Freemium pricing in NAD | Reduces adoption friction. Aligns with local purchasing power | Approved |
| 2026-03-10 | English-only V1 | Fastest to ship. 80%+ of target ICP literate in English | Approved |
