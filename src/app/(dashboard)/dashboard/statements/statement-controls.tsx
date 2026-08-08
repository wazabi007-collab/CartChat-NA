"use client";

import { useRouter } from "next/navigation";
import { Download, Printer } from "lucide-react";
import {
  statementToCsv,
  type StatementOrder,
  type OrderPayment,
} from "@/lib/statements";

interface Props {
  months: string[];
  selected: string;
  storeName: string;
  orders: StatementOrder[];
  payments: OrderPayment[];
}

function monthLabel(key: string): string {
  return new Date(`${key}-01T00:00:00+02:00`).toLocaleDateString("en-GB", {
    month: "long",
    year: "numeric",
    timeZone: "Africa/Windhoek",
  });
}

/** Period picker, print, and spreadsheet download. Hidden when printing. */
export function StatementControls({ months, selected, storeName, orders, payments }: Props) {
  const router = useRouter();

  function downloadCsv() {
    // Built in the browser from the same data the page rendered, so the
    // spreadsheet can never disagree with the statement on screen.
    const csv = statementToCsv(orders, payments);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${storeName.replace(/\s+/g, "-").toLowerCase()}-statement-${selected}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  return (
    <div className="flex flex-wrap items-center gap-3 print:hidden">
      <label className="sr-only" htmlFor="statement-period">
        Statement month
      </label>
      <select
        id="statement-period"
        value={selected}
        onChange={(event) =>
          router.push(`/dashboard/statements?period=${event.target.value}`)
        }
        className="min-h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-900"
      >
        {months.map((month) => (
          <option key={month} value={month}>
            {monthLabel(month)}
          </option>
        ))}
      </select>

      <button
        onClick={() => window.print()}
        className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-acacia px-4 text-sm font-bold text-white transition-colors hover:bg-green-700"
      >
        <Printer size={16} />
        Print or save as PDF
      </button>

      <button
        onClick={downloadCsv}
        disabled={orders.length === 0}
        className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-900 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <Download size={16} />
        Download spreadsheet
      </button>
    </div>
  );
}
