-- Drop the overly permissive policy
DROP POLICY "Anyone can submit reports" ON public.reports;

-- Replace with a policy that ensures reporters can only set safe defaults
-- They cannot set status to anything other than 'open' or inject admin_notes
CREATE POLICY "Anyone can submit reports" ON public.reports
  FOR INSERT TO anon, authenticated
  WITH CHECK (
    status = 'open'
    AND admin_notes IS NULL
  );
