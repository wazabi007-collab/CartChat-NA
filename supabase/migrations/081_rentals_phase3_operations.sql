-- Rentals phase 3: operations — asset assignment, returns, late fees,
-- required documents. Applied to production 15 Aug 2026 via MCP (as
-- rentals_phase3_operations + rentals_phase3_tighten_item_update_grant
-- + rentals_phase3_revoke_item_dml).
--
-- Deliberately record-keeping only: place_order is untouched, and money
-- still moves through order_payments/order_refunds (a deposit held back
-- for a late return is simply a smaller refund, and the credit note
-- reflects it automatically).
--
--   products.late_fee_nad         suggested fee per day late, 0 = none
--   products.required_documents   free text shown at checkout ("Driver's
--                                 licence and proof of address")
--   order_items.assigned_unit     which physical unit went out
--                                 (registration number, asset tag)
--   order_items.returned_at       date the item came back
--   order_items.return_notes      condition on return

alter table products
  add column if not exists late_fee_nad integer not null default 0
    check (late_fee_nad >= 0),
  add column if not exists required_documents text null;

alter table order_items
  add column if not exists assigned_unit text null,
  add column if not exists returned_at date null,
  add column if not exists return_notes text null;

-- The table carried legacy table-wide INSERT/UPDATE grants that were inert
-- while order_items had no write policies — but the UPDATE policy below
-- would have armed them, letting a merchant edit line_total or the rental
-- range on their own orders. order_items is written ONLY by place_order
-- (SECURITY DEFINER): revoke all client DML, then grant back exactly the
-- three return-tracking columns.
revoke insert, update, delete on order_items from anon;
revoke insert, update, delete on order_items from authenticated;
grant update (assigned_unit, returned_at, return_notes)
  on order_items to authenticated;

drop policy if exists "Order Items: owner update returns" on order_items;
create policy "Order Items: owner update returns" on order_items
  for update
  using (order_id in (
    select orders.id from orders
    where orders.merchant_id in (
      select merchants.id from merchants
      where merchants.user_id = (select auth.uid())
    )
  ))
  with check (order_id in (
    select orders.id from orders
    where orders.merchant_id in (
      select merchants.id from merchants
      where merchants.user_id = (select auth.uid())
    )
  ));
