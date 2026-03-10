import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * Service-role Supabase client — bypasses RLS.
 * Only use in server-side code (API routes, server components).
 */
export function createServiceClient() {
  const publicUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serverUrl = process.env.SUPABASE_URL || publicUrl;

  return createSupabaseClient(publicUrl, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false },
    global: {
      fetch: (input, init) => {
        const url =
          typeof input === "string"
            ? input
            : input instanceof URL
            ? input.toString()
            : (input as Request).url;
        return fetch(url.replace(publicUrl, serverUrl), init);
      },
    },
  });
}
