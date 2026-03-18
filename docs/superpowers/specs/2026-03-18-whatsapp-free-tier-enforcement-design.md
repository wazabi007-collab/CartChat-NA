# WhatsApp Number Free-Tier Enforcement — Design Spec

**Date:** 2026-03-18
**Status:** Approved

## Goal

Prevent users from creating multiple free-tier stores with the same WhatsApp number to abuse the 30-day trial. Paid merchants get a warning but can proceed.

## Data Model

- `merchants` table: has `whatsapp_number`, `id`, legacy `tier` column
- `subscriptions` table: has `merchant_id`, `tier` (oshi_start/oshi_basic/oshi_grow/oshi_pro), `status` (trial/active/grace/soft_suspended/hard_suspended), `trial_ends_at`
- New stores are created with `subscriptions.tier = 'oshi_start'` and `subscriptions.status = 'trial'`
- The check must JOIN merchants with subscriptions to determine the actual tier

## Check Logic

When a user enters a WhatsApp number on the `/dashboard/setup` form:

1. Normalize the phone number using existing `normalizeNamibianPhone()`
2. Query `merchants` JOIN `subscriptions` where `whatsapp_number` matches
3. Based on result:
   - **No match** → proceed normally
   - **Match found, subscription tier is `oshi_start`** (any status) → **block**: show error, link to pricing
   - **Match found, subscription tier is `oshi_basic`/`oshi_grow`/`oshi_pro`** → **warn**: show yellow warning, allow user to proceed
   - **Match found, no subscription record** → treat as free tier → **block**

## API Route

### `POST /api/check-whatsapp`

**Request:**
```json
{ "phone": "0812384424" }
```

**Response:**
```json
{
  "exists": true,
  "blocked": true
}
```

Logic:
- Normalize the incoming phone number with `normalizeNamibianPhone()`
- Query `merchants` where `whatsapp_number` equals the normalized number, select `id`
- If no match: `{ exists: false, blocked: false }`
- If match found, query `subscriptions` for that merchant's `tier`
- If no subscription or tier is `oshi_start`: `{ exists: true, blocked: true }`
- If tier is `oshi_basic`/`oshi_grow`/`oshi_pro`: `{ exists: true, blocked: false }`
- Uses service client (bypasses RLS) since the user may not own the matched merchant
- Requires authentication (user must be logged in) — prevents anonymous enumeration
- Add 200ms minimum delay to prevent timing-based enumeration (same pattern as `/api/check-email`)

## UI Changes

### Setup Page (`/src/app/(dashboard)/dashboard/setup/page.tsx`)

**On blur of WhatsApp field:**
- Call `/api/check-whatsapp` with the entered number
- Show result inline below the field:
  - **Blocked (free/oshi_start)**: Red text: "This WhatsApp number is already linked to a store. Please subscribe to continue." + "View Plans" link to `/pricing`
  - **Warning (paid tier)**: Yellow text: "This number is already linked to another store."
  - **Clear**: No message
- Disable the submit button while the check is in progress
- Clear the message when user changes the field value

**On form submit:**
- Before inserting the merchant, call `/api/check-whatsapp` again server-side
- If `blocked: true`, show the same error and prevent submission
- This is a safety net in case the blur check was bypassed

## Files Changed

| File | Change |
|------|--------|
| `src/app/api/check-whatsapp/route.ts` | **New** — WhatsApp number duplicate check API |
| `src/app/(dashboard)/dashboard/setup/page.tsx` | **Modify** — Add blur validation + submit check |

## Edge Cases

- **Same user, same number**: If the authenticated user IS the owner of the matched merchant, they already have a store and shouldn't be on the setup page. The middleware redirects them to `/dashboard`. No special handling needed.
- **Phone normalization**: All comparisons use `normalizeNamibianPhone()` to handle `081...`, `+264 81...`, `26481...` formats consistently
- **Race condition**: Two users submitting the same number simultaneously — the server-side check on submit handles this. First insert wins, second gets blocked on re-check.
- **Google OAuth users**: They land on `/dashboard/setup` without a merchant record. The blur check fires when they type their WhatsApp number, same as OTP users.
- **Suspended merchants**: A merchant with `oshi_start` and `hard_suspended` status still blocks the number — the number is "taken" regardless of suspension state.
- **No subscription record**: Old merchants without a subscription row are treated as free tier (blocked).

## Testing

- Enter a WhatsApp number belonging to an existing oshi_start merchant → blocked with error + pricing link
- Enter a WhatsApp number belonging to an oshi_basic/grow/pro merchant → yellow warning, can still submit
- Enter a fresh WhatsApp number → no message, submit works
- Submit form with a blocked number via devtools (bypass blur) → server-side check catches it
