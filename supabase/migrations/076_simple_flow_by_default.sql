-- The simple two-step flow becomes the default: confirmed -> completed.
--
-- The ordinary order should cost the customer three messages (placed,
-- confirmed, completed) rather than four. "Ready for collection" is a real
-- moment for a takeaway and meaningless for a same-day delivery, so it stays
-- available -- it just stops being the assumption.
ALTER TABLE public.merchants
  ALTER COLUMN uses_ready_step SET DEFAULT false;

-- Existing merchants are NOT switched wholesale. Anyone who has actually moved
-- an order through 'ready' has shown they want that step, so they keep it;
-- everyone else moves to the simpler flow they were never using.
--
-- When applied: 4 merchants kept the full flow (Octovia Nexus Home & Lifestyle,
-- DieKapey takeaways, Design Today, Good Corner), 30 moved to the simple one.
UPDATE public.merchants m
SET uses_ready_step = false
WHERE NOT EXISTS (
  SELECT 1 FROM public.orders o
  WHERE o.merchant_id = m.id
    AND o.status_history::text LIKE '%"ready"%'
);
