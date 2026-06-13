-- Migration 051: collapse the storefront category panel's N+1.
--
-- s/[slug]/page.tsx fired 2 queries PER category (a COUNT + a 4-image preview) via
-- Promise.all — e.g. 44 round-trips for a 22-category store. This RPC returns per-category
-- product_count + up to 4 preview image URLs in ONE query (GROUP BY + a windowed unnest),
-- turning 2N queries into 1.
--
-- SECURITY INVOKER (the default): the function runs as the caller, so RLS on `products`
-- still applies. For the active store being rendered the anon role sees exactly the
-- available/approved products it would otherwise; calling it with a suspended store's id
-- returns nothing (consistent with migration 046). No new exposure surface.

CREATE OR REPLACE FUNCTION public.storefront_category_meta(p_merchant_id uuid)
RETURNS TABLE(category_id uuid, product_count bigint, preview_images text[])
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  WITH avail AS (
    SELECT p.id, p.category_id, p.images, p.sort_order
    FROM products p
    WHERE p.merchant_id = p_merchant_id
      AND p.is_available = true
      AND p.deleted_at IS NULL
      AND p.category_id IS NOT NULL
  ),
  preview AS (
    SELECT f.category_id,
           (array_agg(f.img ORDER BY f.sort_order, f.id, f.img_ord))[1:4] AS preview_images
    FROM (
      SELECT a.category_id, a.sort_order, a.id, u.img, u.img_ord
      FROM avail a
      CROSS JOIN LATERAL unnest(a.images) WITH ORDINALITY AS u(img, img_ord)
      WHERE a.images IS NOT NULL AND array_length(a.images, 1) >= 1
    ) f
    WHERE f.img IS NOT NULL AND f.img <> ''
    GROUP BY f.category_id
  )
  SELECT a.category_id,
         count(*)::bigint AS product_count,
         COALESCE(pv.preview_images, ARRAY[]::text[]) AS preview_images
  FROM avail a
  LEFT JOIN preview pv ON pv.category_id = a.category_id
  GROUP BY a.category_id, pv.preview_images;
$$;

GRANT EXECUTE ON FUNCTION public.storefront_category_meta(uuid) TO anon, authenticated;
