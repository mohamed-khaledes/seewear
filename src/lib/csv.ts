/**
 * CSV for spreadsheets, written defensively.
 *
 * Two things a naive join gets wrong. Quoting: a customer name with a comma,
 * or an address with a line break, shifts every column after it. And formula
 * injection: a cell that starts with = + - or @ is executed by Excel and
 * Google Sheets when the file is opened, so a "name" like
 * `=HYPERLINK(...)` would run on the accountant's machine. Those cells get a
 * leading apostrophe, which spreadsheets treat as "this is text".
 */
export function csvCell(value: unknown): string {
  if (value === null || value === undefined) return "";
  let text = String(value);
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function toCsv(header: string[], rows: unknown[][]): string {
  const lines = [header, ...rows].map((row) => row.map(csvCell).join(","));
  // The byte-order mark is what makes Excel read Arabic names as UTF-8.
  return "﻿" + lines.join("\r\n") + "\r\n";
}

/** Piastres to a plain decimal string, which every spreadsheet sums correctly. */
export function egp(cents: number | null | undefined): string {
  return ((cents ?? 0) / 100).toFixed(2);
}
