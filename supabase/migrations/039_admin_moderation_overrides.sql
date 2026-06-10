-- Allow admin-reviewed listings to stay approved after a manual moderation
-- decision, while still re-scanning if the merchant later changes the title or
-- description.

CREATE OR REPLACE FUNCTION public.apply_product_safety_scan()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_scan record;
BEGIN
  IF TG_OP = 'UPDATE'
     AND NEW.moderation_source = 'admin_approved'
     AND NEW.moderation_status = 'approved'
     AND OLD.name IS NOT DISTINCT FROM NEW.name
     AND OLD.description IS NOT DISTINCT FROM NEW.description THEN
    NEW.moderation_checked_at := coalesce(NEW.moderation_checked_at, now());
    NEW.moderation_categories := coalesce(NEW.moderation_categories, '{}');
    NEW.moderation_reasons := coalesce(NEW.moderation_reasons, '{}');
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE'
     AND NEW.moderation_source = 'admin_blocked'
     AND NEW.moderation_status = 'blocked'
     AND OLD.name IS NOT DISTINCT FROM NEW.name
     AND OLD.description IS NOT DISTINCT FROM NEW.description THEN
    NEW.is_available := false;
    NEW.moderation_checked_at := coalesce(NEW.moderation_checked_at, now());
    NEW.moderation_categories := coalesce(NEW.moderation_categories, '{}');
    NEW.moderation_reasons := coalesce(NEW.moderation_reasons, '{}');
    RETURN NEW;
  END IF;

  SELECT * INTO v_scan
  FROM public.safety_scan_values(ARRAY[NEW.name, NEW.description]);

  NEW.moderation_checked_at := now();
  NEW.moderation_source := 'rules_v1';

  IF v_scan.severity = 'blocked' THEN
    NEW.moderation_status := 'blocked';
    NEW.is_available := false;
  ELSIF v_scan.severity = 'review_required' THEN
    NEW.moderation_status := 'review_required';
    NEW.is_available := false;
  ELSE
    NEW.moderation_status := 'approved';
  END IF;

  NEW.moderation_categories := v_scan.categories;
  NEW.moderation_reasons := v_scan.reasons;
  RETURN NEW;
END;
$$;
