import { normalizeAlgorithm } from "../otp/totp";
import { isOtpAuthUri, MAX_DIGITS, normalizeSecret, parseBoundedInt, parseOtpAuthUri, type ParsedOtpAuth } from "../otp/uri";

/** Ente Auth appends a JSON `codeDisplay` query parameter to each exported URI. */
interface EnteCodeDisplay {
  trashed?: boolean;
  tags?: string[];
}

export interface OtpAuthLinesOptions {
  /** Read and remove Ente's `codeDisplay` metadata: skip trashed entries, append tags to the account. */
  stripEnteMetadata?: boolean;
}

const CODE_DISPLAY_RE = /([?&])codeDisplay=([^&]*)/;

function extractEnteMetadata(line: string): { uri: string; metadata?: EnteCodeDisplay } {
  const match = CODE_DISPLAY_RE.exec(line);
  if (!match) return { uri: line };

  const before = line.slice(0, match.index);
  const after = line.slice(match.index + match[0].length);
  const uri = match[1] === "?" ? `${before}?${after.replace(/^&/, "")}` : before + after;

  try {
    const metadata = JSON.parse(decodeURIComponent(match[2]));
    return { uri, metadata: typeof metadata === "object" && metadata !== null ? metadata : undefined };
  } catch {
    return { uri };
  }
}

/**
 * Parses text containing one otpauth:// URI per line (Google Authenticator,
 * 2FAS and Ente plain-text exports). Blank lines, other text and invalid URIs
 * are skipped.
 */
export function parseOtpAuthLines(content: string, options: OtpAuthLinesOptions = {}): ParsedOtpAuth[] {
  const results: ParsedOtpAuth[] = [];

  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!isOtpAuthUri(line)) continue;

    let uri = line;
    let metadata: EnteCodeDisplay | undefined;
    if (options.stripEnteMetadata) {
      ({ uri, metadata } = extractEnteMetadata(line));
      if (metadata?.trashed) continue;
    }

    const parsed = parseOtpAuthUri(uri);
    if (!parsed) continue;

    const tags = Array.isArray(metadata?.tags) ? metadata.tags.filter((tag) => typeof tag === "string" && tag) : [];
    if (tags.length > 0) {
      parsed.account = `${parsed.account} [${tags.join(", ")}]`.trim();
    }
    results.push(parsed);
  }

  return results;
}

/** Builds a TOTP entry from loose provider fields. Returns null when the secret is unusable. */
export function totpEntry(fields: {
  secret: unknown;
  account?: unknown;
  issuer?: unknown;
  algorithm?: unknown;
  digits?: unknown;
  period?: unknown;
}): ParsedOtpAuth | null {
  const secret = normalizeSecret(typeof fields.secret === "string" ? fields.secret : "");
  if (!secret) return null;
  const text = (value: unknown) => (typeof value === "string" ? value.trim() : "");
  return {
    type: "totp",
    account: text(fields.account),
    issuer: text(fields.issuer),
    secret,
    algorithm: normalizeAlgorithm(fields.algorithm),
    digits: parseBoundedInt(fields.digits, 6, 1, MAX_DIGITS),
    period: parseBoundedInt(fields.period, 30),
  };
}

/** JSON.parse with a provider-specific error message. */
export function parseJson(content: string, providerName: string): unknown {
  try {
    return JSON.parse(content);
  } catch {
    throw new Error(`This doesn't look like a ${providerName} export (expected a JSON file).`);
  }
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
