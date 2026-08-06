"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  Loader2,
  Upload,
  XCircle,
} from "lucide-react";
import { card, sectionHeading, helperText, btnPrimaryGreen } from "@/lib/ui";
import { formatPrice } from "@/lib/utils";
import { buildCsvTemplate, parseCsvToObjects, parsePriceToCents } from "@/lib/csv";

interface PreviewRow {
  rowNumber: number;
  name: string;
  price_nad: number | null;
  description: string;
  category: string;
  stock: number | null;
  image_url: string;
  error: string | null;
}

interface ImportResult {
  imported: number;
  skipped: { row: number; name: string; reason: string }[];
  flaggedForReview: number;
  categoriesCreated: number;
}

export function ImportClient({
  remaining,
  planLabel,
  productLimit,
  used,
}: {
  remaining: number;
  planLabel: string;
  productLimit: number;
  used: number;
}) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [rows, setRows] = useState<PreviewRow[]>([]);
  const [parseError, setParseError] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);

  const validRows = rows.filter((r) => !r.error);
  const invalidRows = rows.filter((r) => r.error);
  const unlimited = productLimit === -1;
  const overLimit = unlimited ? 0 : Math.max(0, validRows.length - remaining);

  function downloadTemplate() {
    const blob = new Blob([buildCsvTemplate()], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "oshicart-product-template.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleFile(file: File) {
    setParseError(null);
    setResult(null);
    setFileName(file.name);

    const text = await file.text();
    const { headers, rows: parsed } = parseCsvToObjects(text);

    if (parsed.length === 0) {
      setRows([]);
      setParseError("That file has no rows. Check it has a header row and at least one product.");
      return;
    }
    if (!headers.some((h) => h.toLowerCase().replace(/[\s_-]+/g, "") === "name")) {
      setRows([]);
      setParseError(
        `Couldn't find a "name" column. Found: ${headers.join(", ") || "nothing"}. Download the template below for the right format.`
      );
      return;
    }

    const preview: PreviewRow[] = parsed.map((r, i) => {
      const name = (r["name"] ?? "").trim();
      const priceRaw = r["price"] ?? "";
      const price = parsePriceToCents(priceRaw);
      const stockRaw = (r["stock"] ?? "").trim();
      const stock = stockRaw === "" ? null : Number(stockRaw.replace(/[^\d]/g, ""));

      let error: string | null = null;
      if (!name) error = "Missing product name";
      else if (price === null) error = priceRaw.trim() ? `Price "${priceRaw}" isn't a number` : "Missing price";

      return {
        rowNumber: i + 2,
        name,
        price_nad: price,
        description: (r["description"] ?? "").trim(),
        category: (r["category"] ?? "").trim(),
        stock: stock !== null && Number.isFinite(stock) ? stock : null,
        image_url: (r["imageurl"] ?? r["image"] ?? "").trim(),
        error,
      };
    });

    setRows(preview);
  }

  async function runImport() {
    setImporting(true);
    const res = await fetch("/api/products/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        rows: validRows.map((r) => ({
          name: r.name,
          price_nad: r.price_nad,
          description: r.description || null,
          category: r.category || null,
          stock: r.stock,
          image_url: r.image_url || null,
        })),
      }),
    });
    const data = await res.json();
    setImporting(false);

    if (!res.ok) {
      setParseError(data.error || "Import failed. Please try again.");
      return;
    }
    setResult(data as ImportResult);
    setRows([]);
    setFileName(null);
    router.refresh();
  }

  // ── Result screen ────────────────────────────────────────────────────────
  if (result) {
    return (
      <div className={`${card} space-y-4`}>
        <div className="flex items-start gap-3">
          <CheckCircle2 className="mt-0.5 shrink-0 text-emerald-600" size={22} />
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              {result.imported} product{result.imported === 1 ? "" : "s"} imported
            </h2>
            <p className="mt-0.5 text-sm text-slate-600">
              {result.categoriesCreated > 0 &&
                `${result.categoriesCreated} new categor${result.categoriesCreated === 1 ? "y" : "ies"} created. `}
              They&apos;re live on your store now.
            </p>
          </div>
        </div>

        {result.flaggedForReview > 0 && (
          <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
            <AlertTriangle size={16} className="mt-0.5 shrink-0" />
            <p>
              {result.flaggedForReview} product{result.flaggedForReview === 1 ? " needs" : "s need"} a
              quick review before showing publicly. We&apos;ll check {result.flaggedForReview === 1 ? "it" : "them"} shortly.
            </p>
          </div>
        )}

        {result.skipped.length > 0 && (
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
            <p className="text-sm font-bold text-slate-800">
              {result.skipped.length} row{result.skipped.length === 1 ? "" : "s"} skipped
            </p>
            <ul className="mt-1.5 space-y-1 text-xs text-slate-600">
              {result.skipped.slice(0, 12).map((s) => (
                <li key={s.row}>
                  Row {s.row} — <b>{s.name}</b>: {s.reason}
                </li>
              ))}
              {result.skipped.length > 12 && <li>…and {result.skipped.length - 12} more</li>}
            </ul>
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          <button onClick={() => router.push("/dashboard/products")} className={btnPrimaryGreen}>
            View my products
          </button>
          <button
            onClick={() => setResult(null)}
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50"
          >
            Import another file
          </button>
        </div>
      </div>
    );
  }

  // ── Upload / preview ─────────────────────────────────────────────────────
  return (
    <div className="space-y-5">
      <section className={`${card} space-y-3`}>
        <h2 className={sectionHeading}>1. Get the template</h2>
        <p className={helperText + " !mt-0"}>
          Your file needs a <b>name</b> and <b>price</b> column. <b>description</b>,{" "}
          <b>category</b>, <b>stock</b> and <b>image_url</b> are optional. Prices are in Namibian
          dollars — write <b>35</b> or <b>35.50</b>.
        </p>
        <button
          onClick={downloadTemplate}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50"
        >
          <Download size={15} /> Download CSV template
        </button>
      </section>

      <section className={`${card} space-y-3`}>
        <h2 className={sectionHeading}>2. Upload your file</h2>
        <input
          ref={fileRef}
          type="file"
          accept=".csv,text/csv"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
          }}
        />
        <button
          onClick={() => fileRef.current?.click()}
          className="flex w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-300 py-8 text-slate-500 transition hover:border-emerald-400 hover:text-emerald-700"
        >
          <Upload size={26} />
          <span className="text-sm font-bold">
            {fileName ? `${fileName} — choose a different file` : "Choose a CSV file"}
          </span>
          <span className="text-xs">Exported from Excel, Google Sheets or Numbers</span>
        </button>

        {parseError && (
          <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            <XCircle size={16} className="mt-0.5 shrink-0" />
            <p>{parseError}</p>
          </div>
        )}

        {!unlimited && (
          <p className={helperText}>
            You&apos;re on {planLabel} — {used} of {productLimit} products used,{" "}
            <b>{remaining}</b> slot{remaining === 1 ? "" : "s"} left.
          </p>
        )}
      </section>

      {rows.length > 0 && (
        <section className={`${card} space-y-3`}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className={sectionHeading}>3. Check and import</h2>
            <span className="text-xs font-bold text-slate-500">
              {validRows.length} ready
              {invalidRows.length > 0 && ` · ${invalidRows.length} with problems`}
            </span>
          </div>

          {overLimit > 0 && (
            <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
              <AlertTriangle size={16} className="mt-0.5 shrink-0" />
              <p>
                Your file has {validRows.length} products but only <b>{remaining}</b> fit on{" "}
                {planLabel}. The first {remaining} will be imported — upgrade to add the rest.
              </p>
            </div>
          )}

          <div className="max-h-96 overflow-auto rounded-lg border border-slate-200">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-3 py-2">Row</th>
                  <th className="px-3 py-2">Product</th>
                  <th className="px-3 py-2">Price</th>
                  <th className="px-3 py-2">Category</th>
                  <th className="px-3 py-2">Stock</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((r) => (
                  <tr key={r.rowNumber} className={r.error ? "bg-red-50/60" : undefined}>
                    <td className="px-3 py-2 text-slate-400">{r.rowNumber}</td>
                    <td className="px-3 py-2">
                      <p className="font-semibold text-slate-900">{r.name || "—"}</p>
                      {r.error && <p className="text-xs font-bold text-red-600">{r.error}</p>}
                    </td>
                    <td className="px-3 py-2 text-slate-700">
                      {r.price_nad !== null ? formatPrice(r.price_nad) : "—"}
                    </td>
                    <td className="px-3 py-2 text-slate-600">{r.category || "—"}</td>
                    <td className="px-3 py-2 text-slate-600">{r.stock ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {invalidRows.length > 0 && (
            <p className={helperText}>
              Rows highlighted in red will be skipped. Fix them in your spreadsheet and upload again
              if you need them.
            </p>
          )}

          <button
            onClick={runImport}
            disabled={importing || validRows.length === 0 || remaining === 0}
            className={`${btnPrimaryGreen} inline-flex items-center gap-2 disabled:opacity-50`}
          >
            {importing ? <Loader2 size={16} className="animate-spin" /> : <FileSpreadsheet size={16} />}
            {importing
              ? "Importing…"
              : `Import ${unlimited ? validRows.length : Math.min(validRows.length, remaining)} product${
                  (unlimited ? validRows.length : Math.min(validRows.length, remaining)) === 1 ? "" : "s"
                }`}
          </button>
        </section>
      )}
    </div>
  );
}
