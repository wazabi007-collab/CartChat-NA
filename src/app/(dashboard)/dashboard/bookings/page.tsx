"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { CalendarDays, ChevronLeft, ChevronRight, Lock, Unlock } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { getThemeConfig } from "@/lib/industry";

interface BookingRow {
  id: string;
  order_number: number;
  customer_name: string;
  delivery_date: string;
  delivery_time: string | null;
  status: string;
}

interface BlockRow {
  id: string;
  block_date: string;
  block_time: string | null;
}

interface Slots {
  enabled?: boolean;
  days?: number[];
  times?: string[];
}

const WEEKDAYS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

function monthKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function addMonths(key: string, n: number): string {
  const [y, m] = key.split("-").map(Number);
  return monthKey(new Date(y, m - 1 + n, 1));
}

/**
 * The merchant's booking calendar.
 *
 * A month grid of scheduled orders — appointments and dated deliveries alike —
 * with block-outs: a whole day off, or a single slot held back. Blocks are
 * enforced by place_order, so a customer with a stale checkout page still
 * cannot book a blocked time; this page is where the merchant manages them.
 */
export default function BookingsPage() {
  const supabase = useMemo(() => createClient(), []);
  const [merchantId, setMerchantId] = useState<string | null>(null);
  const [slots, setSlots] = useState<Slots | null>(null);
  const [industry, setIndustry] = useState<string | null>(null);
  const [month, setMonth] = useState(monthKey(new Date()));
  const [orders, setOrders] = useState<BookingRow[]>([]);
  const [blocks, setBlocks] = useState<BlockRow[]>([]);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    async function loadMerchant() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      const { data: merchant } = await supabase
        .from("merchants")
        .select("id, delivery_slots, industry")
        .eq("user_id", user.id)
        .single();
      if (!merchant) return;
      setMerchantId(merchant.id);
      setSlots((merchant.delivery_slots as Slots | null) ?? null);
      setIndustry(merchant.industry ?? null);
    }
    loadMerchant();
  }, [supabase]);

  const loadMonth = useCallback(async () => {
    if (!merchantId) return;
    setLoading(true);
    const [y, m] = month.split("-").map(Number);
    const last = new Date(y, m, 0).getDate();
    const first = `${month}-01`;
    const lastKey = `${month}-${String(last).padStart(2, "0")}`;

    const [ordersRes, blocksRes] = await Promise.all([
      supabase
        .from("orders")
        .select("id, order_number, customer_name, delivery_date, delivery_time, status")
        .eq("merchant_id", merchantId)
        .gte("delivery_date", first)
        .lte("delivery_date", lastKey)
        .neq("status", "cancelled")
        .order("delivery_time"),
      supabase
        .from("booking_blocks")
        .select("id, block_date, block_time")
        .eq("merchant_id", merchantId)
        .gte("block_date", first)
        .lte("block_date", lastKey),
    ]);

    setOrders((ordersRes.data as BookingRow[]) ?? []);
    setBlocks((blocksRes.data as BlockRow[]) ?? []);
    setLoading(false);
  }, [supabase, merchantId, month]);

  // loadMonth commits the month's orders and blocks when they arrive; that
  // state write is the whole point of the effect, not a cascade.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    loadMonth();
  }, [loadMonth]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const ordersByDay = useMemo(() => {
    const map = new Map<string, BookingRow[]>();
    for (const o of orders) {
      if (!o.delivery_date) continue;
      map.set(o.delivery_date, [...(map.get(o.delivery_date) ?? []), o]);
    }
    return map;
  }, [orders]);

  const dayBlocks = useMemo(
    () => new Set(blocks.filter((b) => b.block_time === null).map((b) => b.block_date)),
    [blocks]
  );
  const timeBlocks = useMemo(() => {
    const map = new Map<string, BlockRow[]>();
    for (const b of blocks) {
      if (b.block_time === null) continue;
      map.set(b.block_date, [...(map.get(b.block_date) ?? []), b]);
    }
    return map;
  }, [blocks]);

  async function toggleDayBlock(day: string) {
    if (!merchantId || busy) return;
    setBusy(true);
    const existing = blocks.find((b) => b.block_date === day && b.block_time === null);
    if (existing) {
      await supabase.from("booking_blocks").delete().eq("id", existing.id);
    } else {
      await supabase
        .from("booking_blocks")
        .insert({ merchant_id: merchantId, block_date: day, block_time: null });
    }
    await loadMonth();
    setBusy(false);
  }

  async function toggleTimeBlock(day: string, time: string) {
    if (!merchantId || busy) return;
    setBusy(true);
    const existing = blocks.find((b) => b.block_date === day && b.block_time === time);
    if (existing) {
      await supabase.from("booking_blocks").delete().eq("id", existing.id);
    } else {
      await supabase
        .from("booking_blocks")
        .insert({ merchant_id: merchantId, block_date: day, block_time: time });
    }
    await loadMonth();
    setBusy(false);
  }

  const [year, monthNum] = month.split("-").map(Number);
  const daysInMonth = new Date(year, monthNum, 0).getDate();
  const firstWeekday = (new Date(year, monthNum - 1, 1).getDay() + 6) % 7;
  const monthLabel = new Date(year, monthNum - 1, 1).toLocaleDateString("en-NA", {
    month: "long",
    year: "numeric",
  });
  const cells: (number | null)[] = [
    ...Array.from({ length: firstWeekday }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  const selectedOrders = selectedDay ? ordersByDay.get(selectedDay) ?? [] : [];
  // Must match the heading the settings page actually renders for this
  // merchant, or the instruction points at something they cannot find.
  const isServiceMerchant = getThemeConfig(industry)?.isService ?? false;
  const settingsSectionLabel = isServiceMerchant
    ? "Availability"
    : "Delivery Scheduling";

  // Every visible string in one place. A salon has appointments and clients
  // arriving; a shop has deliveries going out. Same calendar underneath —
  // only the words a merchant would actually use differ.
  const words = isServiceMerchant
    ? {
        blockDay: "Close this day",
        unblockDay: "Open this day",
        empty: "No appointments this day.",
        holdBack: "Hold back individual times",
        taken: " · booked",
        held: " · held",
        takenHint: "Already booked — cancel the order to free this time",
      }
    : {
        blockDay: "No deliveries this day",
        unblockDay: "Allow deliveries again",
        empty: "Nothing going out this day.",
        holdBack: "Close individual time slots",
        taken: " · taken",
        held: " · closed",
        takenHint: "A customer already chose this slot — cancel the order to free it",
      };
  const configuredTimes = slots?.times ?? [];

  return (
    <div className="md:ml-56 space-y-6">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-acacia">Schedule</p>
        <h1 className="mt-2 text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">
          {isServiceMerchant ? "Bookings" : "Delivery schedule"}
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
          {isServiceMerchant
            ? "Every appointment in one calendar. Tap a day to see who is coming, block the whole day off, or hold back individual times."
            : "Every scheduled delivery and collection in one calendar. Tap a day to see what goes out, block a day you are closed, or hold back individual times."}
        </p>
      </div>

      {!slots?.enabled && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
          {isServiceMerchant ? (
            <>
              You haven&apos;t set your availability yet, so customers cannot
              pick a time. Set your working days and times under{" "}
              <Link href="/dashboard/settings" className="font-black underline">
                Settings → {settingsSectionLabel}
              </Link>
              .
            </>
          ) : (
            <>
              This calendar fills up once you let customers choose{" "}
              <strong>when</strong> they want their order — a delivery day or a
              collection time. Turn on{" "}
              <Link href="/dashboard/settings" className="font-black underline">
                Settings → {settingsSectionLabel}
              </Link>{" "}
              to offer day and time slots at checkout. Useful if you deliver on
              set days, or want to stop orders landing on a day you are closed.
              If you would rather customers just order any time, you can ignore
              this page.
            </>
          )}
        </div>
      )}

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm shadow-slate-900/5 sm:p-5">
        <div className="mb-3 flex items-center justify-between">
          <button
            onClick={() => setMonth(addMonths(month, -1))}
            aria-label="Previous month"
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-50"
          >
            <ChevronLeft size={18} />
          </button>
          <p className="flex items-center gap-2 text-sm font-black text-slate-950">
            <CalendarDays size={16} className="text-acacia" />
            {monthLabel}
          </p>
          <button
            onClick={() => setMonth(addMonths(month, 1))}
            aria-label="Next month"
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-50"
          >
            <ChevronRight size={18} />
          </button>
        </div>

        <div className="grid grid-cols-7 gap-1 text-center">
          {WEEKDAYS.map((w) => (
            <span key={w} className="py-1 text-[11px] font-bold uppercase text-slate-400">
              {w}
            </span>
          ))}
          {cells.map((day, i) => {
            if (day === null) return <span key={`pad-${i}`} />;
            const key = `${month}-${String(day).padStart(2, "0")}`;
            const count = ordersByDay.get(key)?.length ?? 0;
            const blockedDay = dayBlocks.has(key);
            const selected = selectedDay === key;
            return (
              <button
                key={key}
                onClick={() => setSelectedDay(selected ? null : key)}
                className={`flex min-h-12 flex-col items-center justify-center rounded-lg text-sm font-semibold transition-colors ${
                  selected
                    ? "bg-acacia text-white"
                    : blockedDay
                    ? "bg-slate-100 text-slate-400 line-through"
                    : count > 0
                    ? "bg-emerald-50 text-slate-900"
                    : "text-slate-700 hover:bg-slate-50"
                }`}
              >
                {day}
                {count > 0 && (
                  <span
                    className={`text-[10px] font-black ${
                      selected ? "text-white/90" : "text-acacia"
                    }`}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
        {loading && <p className="mt-2 text-xs text-slate-400">Loading…</p>}
      </div>

      {selectedDay && (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm shadow-slate-900/5 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-sm font-black text-slate-950">
              {new Date(`${selectedDay}T12:00:00`).toLocaleDateString("en-NA", {
                weekday: "long",
                day: "numeric",
                month: "long",
              })}
            </h2>
            <button
              onClick={() => toggleDayBlock(selectedDay)}
              disabled={busy}
              className={`inline-flex min-h-10 items-center gap-2 rounded-lg px-3 text-xs font-black transition-colors disabled:opacity-50 ${
                dayBlocks.has(selectedDay)
                  ? "bg-slate-100 text-slate-700 hover:bg-slate-200"
                  : "bg-red-50 text-red-700 hover:bg-red-100"
              }`}
            >
              {dayBlocks.has(selectedDay) ? <Unlock size={14} /> : <Lock size={14} />}
              {dayBlocks.has(selectedDay) ? words.unblockDay : words.blockDay}
            </button>
          </div>

          {selectedOrders.length === 0 ? (
            <p className="mt-3 text-sm text-slate-400">{words.empty}</p>
          ) : (
            <ul className="mt-3 divide-y divide-slate-100">
              {selectedOrders.map((o) => (
                <li key={o.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                  <div>
                    <span className="font-bold tabular-nums text-slate-900">
                      {o.delivery_time ?? "—"}
                    </span>{" "}
                    <span className="text-slate-700">{o.customer_name}</span>
                  </div>
                  <Link
                    href={`/dashboard/orders?status=${o.status}`}
                    className="text-xs font-bold text-acacia hover:underline"
                  >
                    #{o.order_number} · {o.status}
                  </Link>
                </li>
              ))}
            </ul>
          )}

          {configuredTimes.length > 0 && (
            <div className="mt-4 border-t border-slate-100 pt-3">
              <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
                {words.holdBack}
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {configuredTimes.map((time) => {
                  const blocked = (timeBlocks.get(selectedDay) ?? []).some(
                    (b) => b.block_time === time
                  );
                  const booked = selectedOrders.some((o) => o.delivery_time === time);
                  return (
                    <button
                      key={time}
                      onClick={() => toggleTimeBlock(selectedDay, time)}
                      disabled={busy || booked}
                      title={booked ? words.takenHint : undefined}
                      className={`min-h-10 rounded-lg border px-3 text-xs font-bold transition-colors disabled:cursor-not-allowed ${
                        booked
                          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                          : blocked
                          ? "border-slate-300 bg-slate-100 text-slate-500 line-through"
                          : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      {time}
                      {booked ? words.taken : blocked ? words.held : ""}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
