import type { ParsedOtpAuth } from "../../otp/uri";
import { isRecord, parseJson, totpEntry } from "../shared";
import type { ImportProvider } from "../types";

const DISPLAY_NAME = "LastPass Authenticator";
const DEFAULT_FOLDER = "Other Accounts";

const text = (value: unknown) => (typeof value === "string" ? value.trim() : "");

/**
 * LastPass Authenticator JSON export:
 * { accounts: [{ issuerName, userName, secret, algorithm, digits, timeStep, isFavorite, folderData: { folderId } }], folders: [{ id, name }] }
 * Folder names (except the default folder) are appended to the account and favorites get a star.
 */
function parseLastPass(content: string): ParsedOtpAuth[] {
  const json = parseJson(content, DISPLAY_NAME);
  if (!isRecord(json) || !Array.isArray(json.accounts)) {
    throw new Error("Invalid LastPass export: missing accounts array.");
  }

  const folders = new Map<unknown, string>();
  for (const folder of Array.isArray(json.folders) ? json.folders : []) {
    if (isRecord(folder)) folders.set(folder.id, text(folder.name));
  }

  const results: ParsedOtpAuth[] = [];
  for (const account of json.accounts) {
    if (!isRecord(account)) continue;

    const folderId = isRecord(account.folderData) ? account.folderData.folderId : undefined;
    const folder = folderId !== undefined && folderId !== 0 ? folders.get(folderId) : undefined;
    const name = [
      account.isFavorite ? "⭐" : "",
      text(account.userName) || text(account.originalUserName),
      folder && folder !== DEFAULT_FOLDER ? `[${folder}]` : "",
    ]
      .filter(Boolean)
      .join(" ");

    const entry = totpEntry({
      secret: account.secret,
      account: name,
      issuer: text(account.issuerName) || text(account.originalIssuerName),
      algorithm: account.algorithm,
      digits: account.digits,
      period: account.timeStep,
    });
    if (entry) results.push(entry);
  }
  return results;
}

export const lastPass: ImportProvider = {
  id: "lastpass",
  displayName: DISPLAY_NAME,
  parse: parseLastPass,
};
