-- A product may not carry a service mode.
--
-- Checkout reads service_mode on its own to decide whether to demand an
-- address and charge a call-out, so a stale mode left on an item switched back
-- from service to product would ask a buyer where to deliver a bag of bread.
-- The edit form clears it, but the guarantee belongs in the database rather
-- than in whichever form happens to write the row.
--
-- No existing row violates this: checked before applying.
ALTER TABLE public.products
  ADD CONSTRAINT products_service_mode_requires_service
  CHECK (service_mode IS NULL OR item_type = 'service');
