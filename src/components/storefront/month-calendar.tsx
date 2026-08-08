"use client";

import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

type DayState = "open" | "closed" | "blocked" | "full" | "past";

interface Props {
  merchantId: string;
  /** Selected date as YYYY-MM-DD, or "". */
  value: string;
  onChange: (date: string) => void;
}

const WEEKDAYS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

function monthKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function addMonths(key: string, n: number): string {
  const [y, m] = key.split("-").map(Number);
  const d = new Date(y, m - 1 + n, 1);
  return monthKey(d);
}

/**
 * A month-grid appointment picker.
 *
 * Replaces the one-by-one date dropdown for service baskets. Day states come
 * from /api/bookings/month — closed weekdays, merchant block-outs and fully
 * booked days are all shown but not selectable, so the customer sees a real
 * calendar rather than a filtered list. Display only: place_order still
 * rejects a slot that gets taken or blocked after this rendered.
 */
export function MonthCalendar({ merchantId, value, onChange }: Props) {
  const thisMonth = monthKey(new Date());
  const maxMonth = addMonths(thisMonth, 2);
  const [month, setMonth] = useState(thisMonth);
  const [days, setDays] = useState<Record<string, DayState>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch(`/api/bookings/month?merchant=${merchantId}&month=${month}`)
      .then((res) => res.json())
      .then((json) => {
        if (!cancelled) {
          setDays(json.days ?? {});
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setDays({});
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [merchantId, month]);

  const [year, monthNum] = month.split("-").map(Number);
  const daysInMonth = new Date(year, monthNum, 0).getDate();
  // Monday-first offset: JS getDay() has Sunday as 0.
  const firstWeekday = (new Date(year, monthNum - 1, 1).getDay() + 6) % 7;
  const monthLabel = new Date(year, monthNum - 1, 1).toLocaleDateString("en-NA", {
    month: "long",
    year: "numeric",
  });

  const cells: (number | null)[] = [
    ...Array.from({ length: firstWeekday }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  return (
    <div className="rounded-xl border border-gray-200 p-3">
      <div className="mb-2 flex items-center justify-between">
        <button
          type="button"
          onClick={() => setMonth(addMonths(month, -1))}
          disabled={month <= thisMonth}
          aria-label="Previous month"
          className="rounded-lg p-2 text-gray-500 hover:bg-gray-50 disabled:opacity-30"
        >
          <ChevronLeft size={18} />
        </button>
        <p className="text-sm font-bold text-gray-900">{monthLabel}</p>
        <button
          type="button"
          onClick={() => setMonth(addMonths(month, 1))}
          disabled={month >= maxMonth}
          aria-label="Next month"
          className="rounded-lg p-2 text-gray-500 hover:bg-gray-50 disabled:opacity-30"
        >
          <ChevronRight size={18} />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center">
        {WEEKDAYS.map((w) => (
          <span key={w} className="py-1 text-[11px] font-bold uppercase text-gray-400">
            {w}
          </span>
        ))}
        {cells.map((day, i) => {
          if (day === null) return <span key={`pad-${i}`} />;
          const key = `${month}-${String(day).padStart(2, "0")}`;
          const state = days[key] ?? (loading ? "past" : "closed");
          const selectable = state === "open";
          const selected = value === key;
          return (
            <button
              key={key}
              type="button"
              disabled={!selectable}
              onClick={() => onChange(key)}
              title={
                state === "blocked" || state === "full"
                  ? "Fully booked"
                  : state === "closed"
                  ? "Closed"
                  : undefined
              }
              className={`min-h-10 rounded-lg text-sm font-semibold transition-colors ${
                selected
                  ? "bg-green-600 text-white"
                  : state === "open"
                  ? "text-gray-900 hover:bg-green-50"
                  : state === "full" || state === "blocked"
                  ? "text-gray-300 line-through"
                  : "text-gray-300"
              }`}
            >
              {day}
            </button>
          );
        })}
      </div>

      <p className="mt-2 text-[11px] text-gray-400">
        Struck-through days are fully booked. Greyed days the store is closed.
      </p>
    </div>
  );
}
