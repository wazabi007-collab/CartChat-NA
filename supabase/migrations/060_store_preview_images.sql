-- Per-merchant preview images for the store browse cards.
--
-- The browse page fetched previews for every listed store in ONE flat query
-- with no LIMIT. PostgREST caps that at 1000 rows ordered newest-first, and a
-- single large catalogue consumed 991 of those slots with products that have
-- no images at all -- so the two largest stores (one with 1,976 fully
-- photographed products) rendered no thumbnails, while a 4-product store
-- rendered four.
--
-- Ranking per merchant, and filtering to products that actually have an image
-- BEFORE ranking, guarantees every store gets its own top 4 no matter how big
-- any other catalogue is.
--
-- SECURITY INVOKER (the default) so the caller's RLS on products still applies.
CREATE OR REPLACE FUNCTION public.get_store_preview_images(p_merchant_ids uuid[])
RETURNS TABLE (merchant_id uuid, image text)
LANGUAGE sql
STABLE
SET search_path = public, pg_temp
AS $$
  SELECT ranked.merchant_id, ranked.image
  FROM (
    SELECT p.merchant_id,
           p.images[1] AS image,
           ROW_NUMBER() OVER (
             PARTITION BY p.merchant_id ORDER BY p.created_at DESC
           ) AS rn
    FROM products p
    WHERE p.merchant_id = ANY(p_merchant_ids)
      AND p.is_available
      AND p.deleted_at IS NULL
      AND COALESCE(array_length(p.images, 1), 0) > 0
      AND COALESCE(p.images[1], '') <> ''
  ) ranked
  WHERE ranked.rn <= 4
  ORDER BY ranked.merchant_id, ranked.rn;
$$;

GRANT EXECUTE ON FUNCTION public.get_store_preview_images(uuid[]) TO anon, authenticated;
