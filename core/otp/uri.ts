import { normalizeAlgorithm, type TOTPAlgorithm } from "./totp";

export type OtpType = "totp" | "hotp";

/** The normalized content of an otpauth:// URI (or an equivalent import entry). */
export interface ParsedOtpAuth {
  type: OtpType;
  /** Account name, without the "Issuer:" label prefix */
  account: string;
  /** Issuer; empty string when unknown */
  issuer: string;
  /** Base32 secret: uppercase, no whitespace or padding */
  secret: string;
  algorithm: TOTPAlgorithm;
  digits: number;
  /** TOTP only */
  period?: number;
  /** HOTP only */
  counter?: number;
}

const OTPAUTH_RE = /^otpauth:\/\/([^/?#]*)\/?([^?#]*)(?:\?([^#]*))?/i;
const BASE32_RE = /^[A-Z2-7]+$/;

export const MAX_DIGITS = 10; // a 31-bit truncated HMAC has at most 10 decimal digits

export function isOtpAuthUri(value: string): boolean {
  return /^otpauth:\/\//i.test(value.trim());
}

/** Uppercases and strips whitespace/padding. Returns "" when the result is not valid base32. */
export function normalizeSecret(secret: string | null | undefined): string {
  const normalized = (secret ?? "").replace(/[\s=]/g, "").toUpperCase();
  return BASE32_RE.test(normalized) ? normalized : "";
}

/** Parses a strictly positive integer within [min, max], returning the fallback otherwise. */
export function parseBoundedInt(value: unknown, fallback: number, min = 1, max = Number.MAX_SAFE_INTEGER): number {
  const text = typeof value === "number" ? String(value) : typeof value === "string" ? value.trim() : "";
  if (!/^\d+$/.test(text)) return fallback;
  const parsed = parseInt(text, 10);
  return parsed >= min && parsed <= max ? parsed : fallback;
}

function decode(value: string, plusIsSpace = false): string {
  const text = plusIsSpace ? value.replace(/\+/g, " ") : value;
  try {
    return decodeURIComponent(text);
  } catch {
    return text;
  }
}

/** Query parameters with lowercase keys; the first occurrence of a key wins. */
function parseQuery(query: string): Map<string, string> {
  const params = new Map<string, string>();
  for (const pair of query.split("&")) {
    if (!pair) continue;
    const eq = pair.indexOf("=");
    const key = decode(eq === -1 ? pair : pair.slice(0, eq), true).toLowerCase();
    const value = eq === -1 ? "" : decode(pair.slice(eq + 1), true);
    if (!params.has(key)) params.set(key, value);
  }
  return params;
}

/**
 * Splits an encoded "Issuer:account" label. A literal colon is preferred as
 * the separator so an encoded colon (%3A) inside the issuer stays intact; an
 * encoded separator is accepted as a fallback.
 */
function parseLabel(rawLabel: string): { issuer: string; account: string } {
  const literal = rawLabel.indexOf(":");
  if (literal !== -1) {
    return {
      issuer: decode(rawLabel.slice(0, literal)).trim(),
      account: decode(rawLabel.slice(literal + 1)).trim(),
    };
  }
  const label = decode(rawLabel);
  const colon = label.indexOf(":");
  if (colon === -1) return { issuer: "", account: label.trim() };
  return { issuer: label.slice(0, colon).trim(), account: label.slice(colon + 1).trim() };
}

/**
 * Parses an otpauth:// URI (Key URI format). Lenient about casing, whitespace
 * and invalid optional parameters; returns null when the URI is unusable
 * (wrong scheme/type or missing/invalid secret). Never throws.
 */
export function parseOtpAuthUri(uri: string): ParsedOtpAuth | null {
  if (typeof uri !== "string") return null;
  const match = OTPAUTH_RE.exec(uri.trim());
  if (!match) return null;

  const type = match[1].toLowerCase();
  if (type !== "totp" && type !== "hotp") return null;

  const params = parseQuery(match[3] ?? "");
  const secret = normalizeSecret(params.get("secret"));
  if (!secret) return null;

  const label = parseLabel(match[2]);
  const issuerParam = params.get("issuer")?.trim();

  const parsed: ParsedOtpAuth = {
    type,
    account: label.account,
    issuer: issuerParam || label.issuer,
    secret,
    algorithm: normalizeAlgorithm(params.get("algorithm")),
    digits: parseBoundedInt(params.get("digits"), 6, 1, MAX_DIGITS),
  };
  if (type === "totp") {
    parsed.period = parseBoundedInt(params.get("period"), 30);
  } else {
    parsed.counter = parseBoundedInt(params.get("counter"), 0, 0);
  }
  return parsed;
}

export interface OtpAuthUriParams {
  type: OtpType;
  secret: string;
  account: string;
  issuer?: string;
  algorithm?: TOTPAlgorithm;
  digits?: number;
  period?: number;
  counter?: number;
}

/**
 * Builds an otpauth:// URI following the Google Authenticator Key URI format:
 * otpauth://totp/Issuer:Account?secret=...&issuer=Issuer&algorithm=SHA1&digits=6&period=30
 *
 * Undefined/NaN parameters are omitted. The query string is built manually
 * (no URLSearchParams) so the output is identical on every JS runtime.
 */
export function buildOtpAuthUri({ type, secret, account, issuer, algorithm, digits, period, counter }: OtpAuthUriParams): string {
  const trimmedIssuer = issuer?.trim() ?? "";
  let trimmedAccount = account.trim();
  // Avoid "Issuer:Issuer:Account" when the account name already carries the issuer prefix
  if (trimmedIssuer && trimmedAccount.startsWith(`${trimmedIssuer}:`)) {
    trimmedAccount = trimmedAccount.slice(trimmedIssuer.length + 1).trim();
  }

  const label = trimmedIssuer
    ? `${encodeURIComponent(trimmedIssuer)}:${encodeURIComponent(trimmedAccount)}`
    : encodeURIComponent(trimmedAccount);

  const params: [string, string | number | undefined][] = [
    ["secret", secret],
    ["issuer", trimmedIssuer || undefined],
    ["algorithm", algorithm?.replace("-", "")],
    ["digits", digits],
    ["period", period],
    ["counter", counter],
  ];
  const query = params
    .filter((entry): entry is [string, string | number] =>
      entry[1] !== undefined && entry[1] !== null && !Number.isNaN(entry[1]))
    .map(([key, value]) => `${key}=${encodeURIComponent(String(value))}`)
    .join("&");

  return `otpauth://${type}/${label}?${query}`;
}
