import { NextResponse } from "next/server";

/**
 * POST /api/analytics/event
 * Receives funnel tracking events from the client.
 * Currently logs to stdout for Vercel log drain ingestion.
 * Replace with DB insert or external analytics service when ready.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Validate required fields
    if (!body.event || typeof body.event !== "string") {
      return NextResponse.json({ error: "Missing event name" }, { status: 400 });
    }

    // Structured log line — picked up by Vercel log drains / runtime logs
    console.log(
      JSON.stringify({
        type: "funnel_event",
        event: body.event,
        session_id: body.session_id || null,
        pathname: body.pathname || null,
        timestamp: body.timestamp || new Date().toISOString(),
        // Spread extra payload fields
        ...Object.fromEntries(
          Object.entries(body).filter(
            ([k]) => !["event", "session_id", "pathname", "timestamp"].includes(k)
          )
        ),
      })
    );

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: true }); // Never fail client
  }
}
