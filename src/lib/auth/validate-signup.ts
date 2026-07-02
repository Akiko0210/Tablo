// Defensive parsing of the untrusted signup/profile payloads. Pure — unit
// tested. Mirrors the parse-or-null pattern in src/lib/orders/validate.ts.

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

export interface SignupInput {
  restaurantName: string;
  name: string;
  email: string;
  password: string;
}

interface ParseResult<T> {
  data?: T;
  error?: string;
}

export function parseSignupInput(body: unknown): ParseResult<SignupInput> {
  if (!isRecord(body)) return { error: "Invalid request" };
  const { restaurantName, name, email, password } = body;

  if (typeof restaurantName !== "string" || !restaurantName.trim())
    return { error: "Restaurant name is required" };
  if (restaurantName.trim().length > 80)
    return { error: "Restaurant name is too long" };

  if (typeof name !== "string" || !name.trim())
    return { error: "Your name is required" };
  if (name.trim().length > 80) return { error: "Name is too long" };

  if (typeof email !== "string" || !EMAIL_RE.test(email.trim()))
    return { error: "Enter a valid email address" };

  if (typeof password !== "string" || password.length < 8)
    return { error: "Password must be at least 8 characters" };

  return {
    data: {
      restaurantName: restaurantName.trim(),
      name: name.trim(),
      email: email.trim().toLowerCase(),
      password,
    },
  };
}

export interface ProfileInput {
  cuisine?: string;
  tagline?: string;
  address?: string;
  phone?: string;
  tableCount?: number;
  description?: string;
}

type ProfileStringField = Exclude<keyof ProfileInput, "tableCount">;

const STRING_FIELDS: Array<[ProfileStringField, number]> = [
  ["cuisine", 60],
  ["tagline", 140],
  ["address", 200],
  ["phone", 40],
  ["description", 1000],
];

export function parseProfileInput(body: unknown): ParseResult<ProfileInput> {
  if (!isRecord(body)) return { error: "Invalid request" };

  const data: ProfileInput = {};

  for (const [field, maxLen] of STRING_FIELDS) {
    const raw = body[field];
    if (raw === undefined || raw === null || raw === "") continue;
    if (typeof raw !== "string") return { error: `Invalid ${field}` };
    const trimmed = raw.trim();
    if (trimmed.length > maxLen) return { error: `${field} is too long` };
    if (trimmed) data[field] = trimmed;
  }

  const { tableCount } = body;
  if (tableCount !== undefined && tableCount !== null && tableCount !== "") {
    if (
      typeof tableCount !== "number" ||
      !Number.isFinite(tableCount) ||
      !Number.isInteger(tableCount) ||
      tableCount < 1 ||
      tableCount > 500
    ) {
      return { error: "Number of tables must be between 1 and 500" };
    }
    data.tableCount = tableCount;
  }

  return { data };
}
