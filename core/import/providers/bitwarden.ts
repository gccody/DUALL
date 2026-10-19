import { isOtpAuthUri, parseOtpAuthUri, type ParsedOtpAuth } from "../../otp/uri";
import { parseCsv } from "../csv";
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

/**
 * Bitwarden CSV header (personal vault):
 * folder,favorite,type,name,notes,fields,reprompt,login_uri,login_username,login_password,login_totp
 * Organization exports start with `collections` instead of `folder`.
 */
function parseCsvExport(content: string): ParsedOtpAuth[] {
  const [header = [], ...rows] = parseCsv(content);
  const columns = header.map((column) => column.trim().toLowerCase());
  const column = (...names: string[]) => columns.findIndex((name) => names.includes(name));

  const totpIndex = column("login_totp", "totp");
  if (totpIndex === -1) {
    throw new Error("Invalid Bitwarden CSV export: no login_totp column found.");
  }
  const nameIndex = column("name");
  const usernameIndex = column("login_username", "username");
  const cell = (row: string[], index: number) => (index === -1 ? "" : row[index] ?? "");

  const results: ParsedOtpAuth[] = [];
  for (const row of rows) {
    const totp = cell(row, totpIndex).trim();
    if (!totp) continue;
    const entry = parseTotpField(totp, cell(row, nameIndex), cell(row, usernameIndex));
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
