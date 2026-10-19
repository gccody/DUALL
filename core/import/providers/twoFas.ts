import { normalizeAlgorithm } from "../../otp/totp";
import { MAX_DIGITS, normalizeSecret, parseBoundedInt, type ParsedOtpAuth } from "../../otp/uri";
import { isRecord, parseJson, parseOtpAuthLines, totpEntry } from "../shared";
import type { ImportProvider } from "../types";

const DISPLAY_NAME = "2FAS";

const text = (value: unknown) => (typeof value === "string" ? value.trim() : "");

function position(service: Record<string, unknown>): number {
  const order = isRecord(service.order) ? service.order.position : undefined;
  return typeof order === "number" ? order : Number.MAX_SAFE_INTEGER;
}

function parseService(service: Record<string, unknown>): ParsedOtpAuth | null {
  const otp = isRecord(service.otp) ? service.otp : {};
  const tokenType = text(otp.tokenType).toUpperCase() || "TOTP";
  const issuer = text(otp.issuer) || text(service.name);
  const account = text(otp.account);

  if (tokenType === "HOTP") {
    const secret = normalizeSecret(text(service.secret));
    if (!secret) return null;
    return {
      type: "hotp",
      account,
      issuer,
      secret,
      algorithm: normalizeAlgorithm(otp.algorithm),
      digits: parseBoundedInt(otp.digits, 6, 1, MAX_DIGITS),
      counter: parseBoundedInt(otp.counter, 0, 0),
    };
  }
  // Steam Guard codes use a different alphabet; the app can't generate them.
  if (tokenType !== "TOTP") return null;

  return totpEntry({
    secret: service.secret,
    account,
    issuer,
    algorithm: otp.algorithm,
    digits: otp.digits,
    period: otp.period,
  });
}

/**
 * 2FAS backup (`.2fas` JSON):
 * { services: [{ name, secret, otp: { account, issuer, digits, period, algorithm, tokenType, counter }, order: { position } }], servicesEncrypted? }
 */
function parseBackup(content: string): ParsedOtpAuth[] {
  const json = parseJson(content, DISPLAY_NAME);
  if (!isRecord(json) || !Array.isArray(json.services)) {
    throw new Error("Invalid 2FAS backup: missing services array.");
  }
  if (json.services.length === 0 && typeof json.servicesEncrypted === "string") {
    throw new Error("Encrypted 2FAS backups aren't supported. In 2FAS, export the backup without a password.");
  }

  return json.services
    .filter(isRecord)
    .sort((a, b) => position(a) - position(b))
    .map(parseService)
    .filter((entry): entry is ParsedOtpAuth => entry !== null);
}

/** 2FAS: `.2fas` JSON backups, or plain text with one otpauth:// URI per line. */
export const twoFas: ImportProvider = {
  id: "2fas",
  displayName: DISPLAY_NAME,
  parse: (content) => (content.trimStart().startsWith("{") ? parseBackup(content) : parseOtpAuthLines(content)),
};
