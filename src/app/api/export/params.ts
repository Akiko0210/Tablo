// Shared bits for the CSV export routes.

/**
 * Parse a `?from=` / `?to=` query value. Returns:
 * - `null` when the param is absent (no bound),
 * - a `Date` when it's a valid YYYY-MM-DD (end-of-day for the "end" edge),
 * - `undefined` when it's present but malformed (caller responds 400).
 */
export function parseDateParam(
  raw: string | null,
  edge: "start" | "end",
): Date | null | undefined {
  if (!raw) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return undefined;
  const date = new Date(`${raw}T00:00:00`);
  if (Number.isNaN(date.getTime())) return undefined;
  if (edge === "end") date.setHours(23, 59, 59, 999);
  return date;
}

export function csvHeaders(filename: string): HeadersInit {
  return {
    "Content-Type": "text/csv; charset=utf-8",
    "Content-Disposition": `attachment; filename="${filename}"`,
    "Cache-Control": "no-store",
  };
}
