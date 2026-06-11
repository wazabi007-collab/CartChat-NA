# Server-Side POP Enforcement — Design

**Date:** 2026-06-11
**Scope:** chatcart-na (Supabase Postgres + Next.js). Small hardening follow-up
to the POP confirmation workflow.

## Problem

The "require proof of payment for EFT" rule (`merchants.pop_required`, shipped
earlier) is enforced **only in the checkout client** — it blocks submission
without a file. But `place_order` is a `SECURITY DEFINER` RPC callable by the
`anon` role with the browser's anon key, so a crafted direct call can create an
EFT order with no proof, bypassing the rule. The merchant-facing guarantee is
therefore soft.

## Decision (made with user)

Enforce it server-side with a **`BEFORE INSERT` trigger on `orders`**, not by
editing `place_order`. `place_order` is overloaded (a `p_delivery_provider`
variant added in migration 037 is the one checkout calls); a trigger is small,
reviewable, **independent of which overload runs**, and guards every insert
path (defense-in-depth). Existing `orders` triggers (`set_order_number` BEFORE
INSERT, etc.) are compatible.

## Design

### 1. Migration `043_pop_server_enforcement.sql`

```sql
-- Enforce merchants.pop_required for EFT orders at the DB layer, independent of
-- the checkout client and of which place_order overload runs.
CREATE OR REPLACE FUNCTION public.enforce_pop_required()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.payment_method = 'eft'
     AND NEW.proof_of_payment_url IS NULL
     AND (SELECT pop_required FROM public.merchants WHERE id = NEW.merchant_id) THEN
    RAISE EXCEPTION 'Proof of payment is required for EFT orders';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_pop_required ON public.orders;
CREATE TRIGGER enforce_pop_required
  BEFORE INSERT ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.enforce_pop_required();
```

- Blocks only when **all** hold: `payment_method = 'eft'`, no
  `proof_of_payment_url`, and the merchant has `pop_required = true`. Matches the
  client rule exactly (EFT-only).
- The merchant subquery returns `NULL` if the merchant is missing, which is
  falsy in the `IF`, so it never blocks spuriously.
- `RAISE EXCEPTION` aborts the transaction; inside `place_order` it surfaces as
  the RPC error. The message string `Proof of payment is required for EFT orders`
  is the contract the client maps (below).

### 2. Client error mapping — `src/app/checkout/[slug]/checkout-form.tsx`

In the `place_order` error block (after the existing "coupon" case, ~line 499),
add:

```ts
      if (msg.includes("Proof of payment")) {
        throw new Error(
          "Proof of payment is required for EFT orders. Please upload your payment confirmation."
        );
      }
```

In normal use this never fires — the client already requires the file before
submit — but it makes a server rejection (e.g. a race or a stale tab) friendly
rather than a raw Postgres string.

## Non-goals

- No change to `place_order` itself, the upload-pop route, or the client's
  existing pre-submit requirement.
- No change for non-EFT methods or non-`pop_required` stores (unaffected).
- Does not retroactively touch existing orders.

## Verification

- Migration applied to prod (project pcseqiaqeiiaiqxqtfmw); trigger exists.
- Direct-insert tests (in a rolled-back transaction on a `pop_required` QA
  merchant):
  - EFT + no proof → raises "Proof of payment is required for EFT orders".
  - EFT + proof path set → succeeds.
  - COD (or eWallet/Pay2Cell/MoMo) + no proof → succeeds.
  - `pop_required = false` merchant, EFT + no proof → succeeds.
- `npx tsc --noEmit` + `npm run build` clean (client one-liner).
- Sanity: a normal checkout on a `pop_required` store still completes (proof is
  uploaded and passed, so the trigger passes).
