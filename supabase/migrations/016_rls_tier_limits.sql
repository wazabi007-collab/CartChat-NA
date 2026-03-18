-- Enable RLS on tier_limits
ALTER TABLE public.tier_limits ENABLE ROW LEVEL SECURITY;

-- Allow everyone to read tier_limits (it's a public lookup table)
CREATE POLICY "tier_limits_select_all" ON public.tier_limits
  FOR SELECT USING (true);

-- Only service_role can modify tier_limits (admin operations via server-side code)
CREATE POLICY "tier_limits_modify_service_role" ON public.tier_limits
  FOR ALL USING (auth.role() = 'service_role');
