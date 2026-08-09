import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";

/**
 * A referral-agent application from the public /agents page.
 *
 * Inserts a referrers row with status='pending' and is_active=false — the
 * code cannot credit signups until an admin approves it in the console.
 * Terms acceptance is required and timestamped; the application is invalid
 * without it, which is the point of having rules at all.
 */
export async function POST(req: NextRequest) {
  let body: {
    name?: string;
    whatsapp?: string;
    email?: string;
    payoutNumber?: string;
    preferredCode?: string;
    acceptedTerms?: boolean;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const name = (body.name || "").trim();
  const whatsapp = (body.whatsapp || "").trim();
  if (name.length < 3 || name.length > 80) {
    return NextResponse.json({ error: "Please give your full name." }, { status: 400 });
  }
  if (!/^\+?[0-9\s-]{9,15}$/.test(whatsapp)) {
    return NextResponse.json(
      { error: "Please give a valid WhatsApp number (e.g. +264 81 234 5678)." },
      { status: 400 }
    );
  }
  if (body.acceptedTerms !== true) {
    return NextResponse.json(
      { error: "You must read and accept the agent rules to apply." },
      { status: 400 }
    );
  }

  const service = createServiceClient();

  // One application per WhatsApp number — resubmitting just reports status.
  const { data: existing } = await service
    .from("referrers")
    .select("code, status")
    .eq("whatsapp", whatsapp)
    .maybeSingle();
  if (existing) {
    return NextResponse.json({
      already: true,
      status: existing.status,
      code: existing.code,
    });
  }

  // Code: their preference, else derived from the name. Lowercase letters and
  // digits only, like every existing code.
  const base = (body.preferredCode || name.split(/\s+/)[0] || "agent")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .slice(0, 20);
  // A 2-letter first name (or preference) gets padded rather than rejected —
  // but an explicitly chosen short code still gets the honest error.
  let stem = base;
  if (stem.length < 3) {
    if (body.preferredCode) {
      return NextResponse.json(
        { error: "Your code needs at least 3 letters or numbers." },
        { status: 400 }
      );
    }
    stem = `${stem}agent`.slice(0, 20);
  }

  // Find a free code: base, then base2, base3...
  let code = stem;
  for (let i = 2; i < 50; i++) {
    const { data: taken } = await service
      .from("referrers")
      .select("id")
      .eq("code", code)
      .maybeSingle();
    if (!taken) break;
    code = `${stem}${i}`;
  }

  const { error } = await service.from("referrers").insert({
    code,
    name,
    whatsapp,
    email: (body.email || "").trim() || null,
    payout_number: (body.payoutNumber || "").trim() || null,
    is_active: false,
    status: "pending",
    accepted_terms_at: new Date().toISOString(),
    notes: "Applied via /agents",
  });

  if (error) {
    return NextResponse.json(
      { error: "Something went wrong — please try again." },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, code });
}
