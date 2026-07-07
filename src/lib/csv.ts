// Minimal CSV building helpers, RFC 4180 flavored. Pure — unit tested.
//
// Fields are quoted only when needed (comma, quote, newline). Text that could
// be interpreted as a spreadsheet formula (=, +, -, @ leading) is prefixed
// with a single quote — menu item names and notes are guest/owner input, and
// a dish named `=HYPERLINK(...)` must not execute when the export is opened
// in Excel or Sheets.

export type CsvValue = string | number | boolean | null | undefined;

/** Neutralize spreadsheet formula injection on untrusted text. */
function defuseFormula(text: string): string {
  return /^[=+\-@\t\r]/.test(text) ? `'${text}` : text;
}

export function csvEscape(value: CsvValue): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "number") {
    return Number.isFinite(value) ? String(value) : "";
  }
  if (typeof value === "boolean") return value ? "true" : "false";
  const text = defuseFormula(value);
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/** One CSV row, CRLF-terminated (RFC 4180 line ending). */
export function csvRow(values: CsvValue[]): string {
  return values.map(csvEscape).join(",") + "\r\n";
}

/** A complete CSV document from a header + rows. */
export function buildCsv(header: string[], rows: CsvValue[][]): string {
  return csvRow(header) + rows.map(csvRow).join("");
}
