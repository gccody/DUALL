import { isRecord, parseOtpAuthLines } from "../shared";
import type { ImportProvider } from "../types";

function isEncryptedExport(content: string): boolean {
  if (!content.trim().startsWith("{")) return false;
  try {
    const json: unknown = JSON.parse(content);
    return isRecord(json) && typeof json.encryptedData === "string" && typeof json.encryptionNonce === "string";
  } catch {
    return false;
  }
}

/**
 * Ente Auth plain-text export: one otpauth:// URI per line with a JSON
 * `codeDisplay` parameter (trashed entries are skipped, tags are kept).
 */
export const ente: ImportProvider = {
  id: "ente",
  displayName: "Ente Auth",
  parse(content) {
    if (isEncryptedExport(content)) {
      throw new Error(
        "Ente encrypted exports are not supported. " +
          "In Ente Auth, export your codes as plain text instead."
      );
    }
    return parseOtpAuthLines(content, { stripEnteMetadata: true });
  },
};
