// Pure helpers for restaurant slugs and kitchen codes. Unit tested.

/** "Luna Ramen House" -> "luna-ramen-house". */
export function slugify(name: string): string {
  const slug = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || "restaurant";
}

/** First slug from `candidateSlugs(name)` not in `taken`: base, base-2, base-3… */
export function uniqueSlug(name: string, taken: Set<string>): string {
  const base = slugify(name);
  if (!taken.has(base)) return base;
  for (let n = 2; ; n++) {
    const candidate = `${base}-${n}`;
    if (!taken.has(candidate)) return candidate;
  }
}

/**
 * Kitchen access code shown in the dashboard and typed into the kitchen app,
 * e.g. "LUNA-4821". Prefix comes from the slug; digits from the caller so the
 * demo restaurant can have a stable, documented code.
 */
export function kitchenCodeFor(slug: string, digits: string): string {
  const prefix = slug.replace(/-/g, "").slice(0, 5).toUpperCase() || "TABLO";
  return `${prefix}-${digits}`;
}

/** Normalizes user-typed kitchen codes: trims, uppercases, collapses spaces. */
export function normalizeKitchenCode(raw: string): string {
  return raw.trim().toUpperCase().replace(/\s+/g, "");
}
