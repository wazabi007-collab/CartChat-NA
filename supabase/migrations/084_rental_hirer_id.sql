-- Capture the hirer's ID number against the HIRE. Applied 15 Aug 2026.
--
-- products.required_documents already tells a customer what to BRING. This is
-- different: the merchant handing over a car or a marquee wants the number
-- recorded against that specific hire.
--
-- Deliberately NOT on `customers`: there it would accumulate across every
-- future order, outlive the hire that justified it, and surface in the
-- customer list and broadcasts. On the hire line it dies with the order, and
-- the Record return panel offers to delete it the moment the item is back —
-- ticked by default, so keeping it is the deliberate choice.
--
-- Opt-in per product, because most hires do not need it and asking a stranger
-- for an ID number on a public storefront is a real ask.

alter table products
  add column if not exists requires_id_number boolean not null default false;

alter table order_items
  add column if not exists hirer_id_number text;

-- order_items still carried Supabase's table-wide SELECT grant, which would
-- have covered this new column automatically. RLS here is owner-only so no
-- customer could read it, but a PII column should not rest on a single
-- policy: name the readable columns instead, the way merchants does.
revoke select on order_items from anon, authenticated;
grant select (
  id, order_id, product_id, product_variant_id, product_name, product_price,
  quantity, line_total, variant_sku, variant_attributes,
  rental_start, rental_end_exclusive, rental_days,
  assigned_unit, returned_at, return_notes, hirer_id_number, created_at
) on order_items to authenticated;

-- Needed for the delete-on-return checkbox; without it that box fails 42501
-- and the data quietly stays. Money and range columns remain unwritable.
grant update (hirer_id_number) on order_items to authenticated;

comment on column order_items.hirer_id_number is
  'ID/passport number of the person taking this hire, captured at checkout when products.requires_id_number. Merchant-only: anon has no grant, RLS is owner-scoped, and no customer-facing surface selects it. Offered for deletion when the return is recorded.';

-- place_order carries the value inside the existing p_items array
-- ("hirerIdNumber" per line), so no new parameter and no third overload. It
-- validates presence server-side — the form is the customer's copy of the
-- rules, not the rules — trims whitespace, and caps the length at 40.
-- Full body: docs/db/place_order.sql (kept byte-identical to production;
-- core overload md5 b673d7154a223cab1dc9e17ee318f64c at this migration).
--
-- Verified on production before this file was written:
--   * required + omitted        -> 'An ID number is required to hire "..."'
--   * required + whitespace only-> same refusal (BTRIM then NULLIF)
--   * 41 characters             -> 'That ID number looks too long'
--   * valid, padded with spaces -> stored trimmed
--   * merchant may clear it on their own order; line_total still 42501
