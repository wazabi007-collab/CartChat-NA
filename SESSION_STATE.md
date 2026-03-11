# Session State — Active Working Memory

## 2026-03-11 — All Bugs Fixed, Deployed, Verified

### Test Results: 24/24 PASS
All E2E tests green against production `https://oshicart.octovianexus.com`.

### All Systems In Sync
| Location | Commit | Status |
|----------|--------|--------|
| Local | `d06b0d3` | In sync |
| GitHub | `d06b0d3` | In sync |
| Server | `d06b0d3` | In sync |

### Bugs Fixed & Deployed This Session

| Bug | Root Cause | Fix | Status |
|-----|-----------|-----|--------|
| BUG-001: Checkout fails | `JSON.stringify()` on p_items | Removed stringify | Deployed |
| BUG-002: Auth cookie name | Wrong cookie name `supabase.auth.token` | Compute `sb-oshicart-auth-token` dynamically | Deployed |
| BUG-003: Kong key mismatch | Stale JWT keys in kong.prod.yml | Synced with server .env | Deployed |
| BUG-004: Images 401 | Kong required apikey for public storage | Added open route for `/storage/v1/object/public/` | Deployed |
| BUG-005: OTP expires too fast | Default 60s expiry | Set `GOTRUE_MAILER_OTP_EXP=300` + `GOTRUE_SMS_OTP_EXP=300` | Deployed |
| Deploy script wrong compose | Used dev compose instead of prod | Fixed `deploy.sh` to use `-f docker-compose.prod.yml` | Fixed on server |
| Login page missing OTP timer | No countdown or resend button | Added 5-min countdown + resend button | Deployed |
| GitHub Actions deploy failing | Missing SSH key secret | Removed workflow — manual deploys only | Done |

### Test Env Vars for Production
```
PLAYWRIGHT_BASE_URL=https://oshicart.octovianexus.com
SUPABASE_URL=https://oshicart.octovianexus.com/supabase
NEXT_PUBLIC_SUPABASE_URL=https://oshicart.octovianexus.com/supabase
SUPABASE_SERVICE_ROLE_KEY=eyJ...service_role...F3q5
TEST_MERCHANT_EMAIL=playwright-e2e@oshicart.test
TEST_STORE_SLUG=playwright-test-store
```

### No Pending Tasks
All bugs fixed, deployed, and verified. Session complete.
