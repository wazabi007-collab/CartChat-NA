import { createServiceClient } from "@/lib/supabase/service";

/**
 * Authenticate a merchant by API key.
 * Returns merchant record or null.
 */
export async function authenticateByApiKey(apiKey: string | null) {
  if (!apiKey) return null;

  const service = createServiceClient();
  const { data } = await service
    .from("merchants")
    .select("id, store_name, user_id")
    .eq("api_key", apiKey)
    .single();

  return data;
}
