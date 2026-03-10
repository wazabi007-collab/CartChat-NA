import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createClient() {
  const cookieStore = await cookies();

  const publicUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serverUrl = process.env.SUPABASE_URL || publicUrl;

  return createServerClient(
    publicUrl,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing sessions.
          }
        },
      },
      global: {
        fetch: (input, init) => {
          const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
          const rewritten = url.replace(publicUrl, serverUrl);
          return fetch(rewritten, init);
        },
      },
    }
  );
}
