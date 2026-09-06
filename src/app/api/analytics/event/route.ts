import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { isTrustedFunnelOrigin, parseFunnelEvent } from "@/lib/funnel-event";

export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  if (!isTrustedFunnelOrigin(origin, request.url, process.env.NEXT_PUBLIC_SITE_URL)) {
    return NextResponse.json({ error: "Invalid origin" }, { status: 403 });
  }
  try {
    const reader = request.body?.getReader();
    if (!reader) return NextResponse.json({ error: "Missing body" }, { status: 400 });
    const chunks: Uint8Array[] = [];
    let size = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 4096) {
        await reader.cancel();
        return NextResponse.json({ error: "Event too large" }, { status: 413 });
      }
      chunks.push(value);
    }
    const bytes = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
    const event = parseFunnelEvent(JSON.parse(new TextDecoder().decode(bytes)));
    if (!event) return NextResponse.json({ error: "Invalid event" }, { status: 400 });
    const { data, error } = await createServiceClient().rpc("record_funnel_event", {
      p_event: event.event, p_session: event.session_id, p_path: event.pathname,
    });
    if (error) {
      console.error("Funnel event storage unavailable", error.code);
      return NextResponse.json({ error: "Event storage unavailable" }, { status: 503 });
    }
    return NextResponse.json({ ok: data === true }, { status: data === true ? 200 : 429 });
  } catch {
    return NextResponse.json({ error: "Invalid event" }, { status: 400 });
  }
}
