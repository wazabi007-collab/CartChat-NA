import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { namibianDateString } from "@/lib/date";

type DayState = "open" | "closed" | "blocked" | "full" | "past";

/**
 * Day-by-day availability for one month, powering the customer's calendar.
 *
 *   open    — bookable
 *   closed  — the merchant does not work this weekday
 *   blocked — the merchant blocked the whole day
 *   full    — every configured time is booked or blocked
 *   past    — before today (Namibian time)
 *
 * PII-free: states only, never who booked. Cosmetic like the taken API —
 * place_order remains the enforcement.
 */
export async function GET(request: NextRequest) {
  const merchantId = request.nextUrl.searchParams.get("merchant");
  const month = request.nextUrl.searchParams.get("month");

  if (!merchantId || !month || !/^\d{4}-\d{2}$/.test(month)) {
    return NextResponse.json({ days: {} });
  }

  const service = createServiceClient();

  const { data: merchant } = await service
    .from("merchants")
    .select("delivery_slots")
    .eq("id", merchantId)
    .single();

  const slots = merchant?.delivery_slots as
    | { enabled?: boolean; days?: number[]; times?: string[] }
    | null;

  if (!slots?.enabled) return NextResponse.json({ days: {} });

  const workDays = slots.days ?? [];
  const times = slots.times ?? [];

  const [year, monthNum] = month.split("-").map(Number);
  const daysInMonth = new Date(Date.UTC(year, monthNum, 0)).getUTCDate();
  const first = `${month}-01`;
  const last = `${month}-${String(daysInMonth).padStart(2, "0")}`;

  const [{ data: bookings }, { data: blocks }] = await Promise.all([
    service
      .from("orders")
      .select("delivery_date, delivery_time, order_items!inner(products!inner(item_type))")
      .eq("merchant_id", merchantId)
      .gte("delivery_date", first)
      .lte("delivery_date", last)
      .neq("status", "cancelled")
      .eq("order_items.products.item_type", "service")
      .not("delivery_time", "is", null),
    service
      .from("booking_blocks")
      .select("block_date, block_time")
      .eq("merchant_id", merchantId)
      .gte("block_date", first)
      .lte("block_date", last),
  ]);

  const takenByDay = new Map<string, Set<string>>();
  for (const row of bookings ?? []) {
    if (!row.delivery_date || !row.delivery_time) continue;
    const set = takenByDay.get(row.delivery_date) ?? new Set<string>();
    set.add(row.delivery_time);
    takenByDay.set(row.delivery_date, set);
  }

  const dayBlocked = new Set<string>();
  for (const b of blocks ?? []) {
    if (b.block_time === null) dayBlocked.add(b.block_date);
    else {
      const set = takenByDay.get(b.block_date) ?? new Set<string>();
      set.add(b.block_time);
      takenByDay.set(b.block_date, set);
    }
  }

  const today = namibianDateString();
  const days: Record<string, DayState> = {};

  for (let d = 1; d <= daysInMonth; d++) {
    const key = `${month}-${String(d).padStart(2, "0")}`;
    const weekday = new Date(`${key}T12:00:00Z`).getUTCDay();

    // Bookings start tomorrow, matching the previous date list.
    if (key <= today) days[key] = "past";
    else if (!workDays.includes(weekday)) days[key] = "closed";
    else if (dayBlocked.has(key)) days[key] = "blocked";
    else if (times.length > 0 && (takenByDay.get(key)?.size ?? 0) >= times.length)
      days[key] = "full";
    else days[key] = "open";
  }

  return NextResponse.json({ days }, { headers: { "Cache-Control": "no-store" } });
}
