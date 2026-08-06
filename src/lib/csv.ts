/**
 * Minimal RFC 4180 CSV parsing, written in-repo rather than adding a dependency.
 *
 * Handles the things real merchant spreadsheets actually contain: quoted fields,
 * commas and newlines inside quotes, escaped double-quotes (""), CRLF endings,
 * and a UTF-8 BOM from Excel.
 */

export type CsvRow = Record<string, string>;

/** Split raw CSV text into rows of cells. */
export function parseCsv(text: string): string[][] {
  // Excel prepends a BOM; left in place it corrupts the first header name.
  const input = text.replace(/^﻿/, "");
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;

  for (let i = 0; i < input.length; i++) {
    const char = input[i];

    if (inQuotes) {
      if (char === '"') {
        if (input[i + 1] === '"') {
          cell += '"'; // escaped quote
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cell += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
    } else if (char === ",") {
      row.push(cell);
      cell = "";
    } else if (char === "\n" || char === "\r") {
      // Swallow the \n of a \r\n pair.
      if (char === "\r" && input[i + 1] === "\n") i++;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += char;
    }
  }

  // Trailing cell/row when the file doesn't end in a newline.
  if (cell.length > 0 || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }

  // Drop rows that are entirely empty (trailing blank lines).
  return rows.filter((r) => r.some((c) => c.trim() !== ""));
}

/**
 * Parse CSV into objects keyed by header. Headers are lower-cased and
 * space/underscore-insensitive, so "Product Name", "product_name" and
 * "productname" all resolve to the same key.
 */
export function parseCsvToObjects(text: string): { headers: string[]; rows: CsvRow[] } {
  const table = parseCsv(text);
  if (table.length === 0) return { headers: [], rows: [] };

  const rawHeaders = table[0].map((h) => h.trim());
  const keys = rawHeaders.map(normaliseHeader);

  const rows = table.slice(1).map((cells) => {
    const obj: CsvRow = {};
    keys.forEach((key, idx) => {
      if (key) obj[key] = (cells[idx] ?? "").trim();
    });
    return obj;
  });

  return { headers: rawHeaders, rows };
}

export function normaliseHeader(header: string): string {
  return header.toLowerCase().replace(/[\s_-]+/g, "");
}

/**
 * Money in a spreadsheet arrives as "149", "149.99", "N$149,99", "1 499.00".
 * Returns cents, or null when it isn't a usable number.
 */
export function parsePriceToCents(raw: string): number | null {
  if (!raw) return null;
  let s = raw.replace(/[^\d.,-]/g, "").trim();
  if (!s) return null;

  const lastComma = s.lastIndexOf(",");
  const lastDot = s.lastIndexOf(".");

  if (lastComma > -1 && lastDot > -1) {
    // Whichever separator is last is the decimal one.
    if (lastComma > lastDot) s = s.replace(/\./g, "").replace(",", ".");
    else s = s.replace(/,/g, "");
  } else if (lastComma > -1) {
    // A lone comma is a decimal separator only when it looks like one (1,50).
    s = /,\d{1,2}$/.test(s) ? s.replace(",", ".") : s.replace(/,/g, "");
  }

  const value = Number(s);
  if (!Number.isFinite(value) || value < 0) return null;
  return Math.round(value * 100);
}

/** The template merchants download to fill in. */
export const CSV_TEMPLATE_HEADERS = [
  "name",
  "price",
  "description",
  "category",
  "stock",
  "image_url",
] as const;

export function buildCsvTemplate(): string {
  const example = [
    ["Vetkoek with mince", "35.00", "Freshly fried, served warm", "Food", "20", ""],
    ["Cotton T-Shirt (Black)", "180", "100% cotton, sizes S-XL", "Clothing", "", ""],
    ["Phone charger cable", "89.99", "", "Accessories", "50", ""],
  ];
  return [CSV_TEMPLATE_HEADERS.join(","), ...example.map((r) => r.map(escapeCsvCell).join(","))].join("\r\n");
}

export function escapeCsvCell(value: string): string {
  return /[",\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}
