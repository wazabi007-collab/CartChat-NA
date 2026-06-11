import { cookies } from "next/headers";
import type { SupabaseClient } from "@supabase/supabase-js";

export const PREVIEW_COOKIE = "oshicart_preview";

/**
 * Reads the preview cookie and the current user. Routes activate preview only
 * when previewCookie is set AND merchant.user_id === userId (checked per
 * render), so a forged cookie reveals nothing.
 */
export async function readPreviewState(
  supabase: SupabaseClient
): Promise<{ previewCookie: boolean; userId: string | null }> {
  const cookieStore = await cookies();
  const previewCookie = cookieStore.get(PREVIEW_COOKIE)?.value === "1";
  if (!previewCookie) return { previewCookie: false, userId: null };
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { previewCookie: true, userId: user?.id ?? null };
}
