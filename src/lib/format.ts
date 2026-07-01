// Money formatting helpers. Kept pure + dependency-free so they are trivial to unit test.

/**
 * Format an amount for display. Whole numbers render without cents ($14),
 * fractional amounts render with two decimals ($40.70) — matching the design.
 */
export function formatMoney(amount: number): string {
  const rounded = Math.round(amount * 100) / 100;
  if (Number.isInteger(rounded)) return `$${rounded}`;
  return `$${rounded.toFixed(2)}`;
}

/** Signed delta, e.g. "+$4" or "Included" when zero. */
export function formatDelta(amount: number): string {
  if (amount === 0) return "Included";
  const sign = amount > 0 ? "+" : "−";
  return `${sign}${formatMoney(Math.abs(amount))}`;
}
