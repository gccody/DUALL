import { parseOtpAuthUri, type ParsedOtpAuth } from "../../otp/uri";
import { isRecord, parseJson, parseOtpAuthLines } from "../shared";
import type { ImportProvider } from "../types";

const DISPLAY_NAME = "Google Authenticator";

/** JSON shape: { "accounts": [{ "otpauth": "otpauth://..." }] } */
function parseAccountsJson(content: string): ParsedOtpAuth[] {
  const json = parseJson(content, DISPLAY_NAME);
  const accounts = isRecord(json) && Array.isArray(json.accounts) ? json.accounts : [];
  return accounts
    .map((account) => (isRecord(account) && typeof account.otpauth === "string" ? parseOtpAuthUri(account.otpauth) : null))
    .filter((entry): entry is ParsedOtpAuth => entry !== null);
}

/** Text with one otpauth:// URI per line, or JSON with `accounts[].otpauth`. */
export const googleAuthenticator: ImportProvider = {
  id: "google-auth",
  displayName: DISPLAY_NAME,
  parse(content) {
    if (content.trim().startsWith("{")) return parseAccountsJson(content);

    const entries = parseOtpAuthLines(content);
    if (entries.length === 0 && /otpauth-migration:\/\//i.test(content)) {
      throw new Error(
        "Google Authenticator transfer codes (otpauth-migration://) aren't supported yet. " +
          "Export your accounts as otpauth:// links instead."
      );
    }
    return entries;
  },
};
