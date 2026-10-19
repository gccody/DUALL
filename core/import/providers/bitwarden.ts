import { isOtpAuthUri, parseOtpAuthUri, type ParsedOtpAuth } from "../../otp/uri";
import { isRecord, parseJson, totpEntry } from "../shared";
import type { ImportProvider } from "../types";

const DISPLAY_NAME = "Bitwarden";

/**
 * A Bitwarden `totp` field holds either an otpauth:// URI or a bare base32
 * secret. Other schemes (e.g. steam://) are not supported and skipped.
 */
function parseTotpField(totp: string, name: string, username: string): ParsedOtpAuth | null {
  const value = totp.trim();
  if (isOtpAuthUri(value)) {
    const parsed = parseOtpAuthUri(value);
    if (!parsed) return null;
    return { ...parsed, issuer: parsed.issuer || name.trim(), account: parsed.account || username.trim() };
  }
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(value)) return null;
  return totpEntry({ secret: value, issuer: name, account: username });
}

function parseJsonExport(content: string): ParsedOtpAuth[] {
  const json = parseJson(content, DISPLAY_NAME);
  if (isRecord(json) && json.encrypted === true) {
    throw new Error("Encrypted Bitwarden exports are not supported. Export your vault as unencrypted JSON or CSV.");
  }
  if (!isRecord(json) || !Array.isArray(json.items)) {
    throw new Error("Invalid Bitwarden export: missing items array.");
  }

  const results: ParsedOtpAuth[] = [];
  for (const item of json.items) {
    if (!isRecord(item) || !isRecord(item.login) || typeof item.login.totp !== "string") continue;
    const name = typeof item.name === "string" ? item.name : "";
    const username = typeof item.login.username === "string" ? item.login.username : "";
    const entry = parseTotpField(item.login.totp, name, username);
    if (entry) results.push(entry);
  }
  return results;
}

function parseCsvExport(content: string): ParsedOtpAuth[] {
  const lines = content.split("\n").filter((line) => line.trim());
  if (lines.length < 2) return [];

  const headers = lines[0].split(",").map((header) => header.trim().toLowerCase());
  const nameIndex = headers.indexOf("name");
  const totpIndex = headers.indexOf("totp");
  if (totpIndex === -1) {
    throw new Error("Invalid Bitwarden CSV export: no TOTP column found.");
  }

  const results: ParsedOtpAuth[] = [];
  for (const line of lines.slice(1)) {
    const values = line.split(",");
    const totp = values[totpIndex]?.trim();
    if (!totp) continue;
    const entry = parseTotpField(totp, nameIndex >= 0 ? values[nameIndex] ?? "" : "", "");
    if (entry) results.push(entry);
  }
  return results;
}

/** Bitwarden unencrypted JSON or CSV vault export. */
export const bitwarden: ImportProvider = {
  id: "bitwarden",
  displayName: DISPLAY_NAME,
  parse(content) {
    return content.trim().startsWith("{") ? parseJsonExport(content) : parseCsvExport(content);
  },
};
