// Helpers for the QR flow. The QR code a guest scans encodes an absolute URL
// to the table's menu; this is the single source of truth for that path so the
// generator and the router never drift.

/** Route path for a given table's menu, e.g. "/m/7". */
export function tableMenuPath(table: string | number): string {
  return `/m/${encodeURIComponent(String(table))}`;
}

/**
 * Absolute URL a QR code should encode. `origin` should be the deployment's
 * public origin (in the browser, `window.location.origin`) so a scanned code
 * resolves to a reachable host — including a LAN IP during local testing.
 */
export function tableMenuUrl(origin: string, table: string | number): string {
  const trimmed = origin.replace(/\/+$/, "");
  return `${trimmed}${tableMenuPath(table)}`;
}
