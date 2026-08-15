-- Rentals phase 2: deposits, turnaround buffers, and nightly pricing.
-- Applied to production 15 Aug 2026 via MCP apply_migration.
--
-- rental_unit: 'day' charges every calendar day inclusive (tools, tents,
-- dresses); 'night' treats the second date as CHECK-OUT — 15th→18th is 3
-- nights and the room is free again on the 18th, so touching stays never
-- clash. rental_buffer_days blocks turnaround days (cleaning, checks) on
-- both sides of every hire. deposit_nad is per unit hired, refundable:
-- collected with the order but outside the taxable base, so it never
-- appears in subtotal_nad and VAT is never charged on it.

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS rental_unit text NOT NULL DEFAULT 'day'
    CHECK (rental_unit IN ('day', 'night')),
  ADD COLUMN IF NOT EXISTS rental_buffer_days integer NOT NULL DEFAULT 0
    CHECK (rental_buffer_days >= 0),
  ADD COLUMN IF NOT EXISTS deposit_nad integer NOT NULL DEFAULT 0
    CHECK (deposit_nad >= 0);

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS deposit_nad integer NOT NULL DEFAULT 0
    CHECK (deposit_nad >= 0);
