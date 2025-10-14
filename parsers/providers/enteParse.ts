import type { OtpProvider } from "@/parsers/types";
import { parseOtpAuthUri } from "@/parsers/utils";
import type { OtpAuthData } from "@/types";

interface EnteCodeDisplay {
  pinned?: boolean;
  trashed?: boolean;
  lastUsedAt?: number;
  tapCount?: number;
  tags?: string[];
  note?: string;
  position?: number;
  iconSrc?: string;
  iconID?: string;
}

// interface EnteEncryptedExport {
//   version?: number;
//   kdfParams?: {
//     memLimit: number;
//     opsLimit: number;
//     salt: string;
//   };
//   encryptedData: string;
//   encryptionNonce: string;
// }

export class EnteParser implements OtpProvider {
  readonly name = "ente";
  readonly displayName = "Ente Auth";
  readonly supportedExtensions = [".txt", ".json"];

  canParse(data: unknown): boolean {
    if (typeof data === "string") {
      // Check for plain text format with codeDisplay parameter
      if (
        data.includes("otpauth://") &&
        data.includes("codeDisplay=")
      ) {
        return true;
      }

      // Try parsing as JSON for encrypted format
      try {
        const json = JSON.parse(data);
        return this.isEnteEncryptedFormat(json);
      } catch {
        return false;
      }
    }

    if (typeof data === "object" && data !== null) {
      return this.isEnteEncryptedFormat(data);
    }

    return false;
  }

  parse(data: string | unknown): OtpAuthData[] {
    if (typeof data === "string") {
      // Try encrypted format first
      try {
        const json = JSON.parse(data);
        if (this.isEnteEncryptedFormat(json)) {
          throw new Error(
            "Ente encrypted exports are not supported. " +
              "Please export without encryption or decrypt the file first. " +
              "In Ente Auth, go to Settings > Data > Export > " +
              "Use 'Export (Plain Text)' instead of 'Export (Encrypted)'"
          );
        }
      } catch (e) {
        // If it's not valid JSON, continue to plain text parsing
        if (e instanceof Error && e.message.includes("encrypted")) {
          throw e;
        }
      }

      // Parse plain text format
      return this.parsePlainText(data);
    } else if (typeof data === "object" && data !== null) {
      if (this.isEnteEncryptedFormat(data)) {
        throw new Error(
          "Ente encrypted exports are not supported. " +
            "Please use the plain text export option instead."
        );
      }
    }

    throw new Error("Invalid Ente format");
  }

  private isEnteEncryptedFormat(data: any): boolean {
    return (
      typeof data === "object" &&
      data !== null &&
      "encryptedData" in data &&
      "encryptionNonce" in data &&
      typeof data.encryptedData === "string" &&
      typeof data.encryptionNonce === "string"
    );
  }

  private parsePlainText(data: string): OtpAuthData[] {
    const results: OtpAuthData[] = [];
    const lines = data.split("\n").filter((line) => line.trim());

    for (const line of lines) {
      const trimmedLine = line.trim();
      if (!trimmedLine.startsWith("otpauth://")) {
        continue;
      }

      try {
        // Extract codeDisplay metadata if present
        let metadata: EnteCodeDisplay | undefined;
        let cleanUri = trimmedLine;

        const codeDisplayMatch = trimmedLine.match(
          /&codeDisplay=([^&]+)(?:&|$)/
        );
        if (codeDisplayMatch) {
          try {
            const decoded = decodeURIComponent(codeDisplayMatch[1]);
            metadata = JSON.parse(decoded) as EnteCodeDisplay;

            // Remove codeDisplay from URI for standard parsing
            cleanUri = trimmedLine.replace(/&codeDisplay=[^&]+/, "");
          } catch (_) {
            // If parsing metadata fails, continue without it
          }
        }

        // Parse the standard otpauth URI
        const parsed = parseOtpAuthUri(cleanUri);
        if (!parsed) continue;

        // Skip trashed items
        if (metadata?.trashed) {
          continue;
        }

        // Build the result
        const baseData = {
          label: parsed.label,
          secret: parsed.secret,
          issuer: parsed.issuer,
          algorithm: parsed.algorithm,
          digits: parsed.digits,
        };

        // Add tags to label if present
        let enhancedLabel = baseData.label;
        if (metadata?.tags && metadata.tags.length > 0) {
          enhancedLabel = `${baseData.label} [${metadata.tags.join(", ")}]`;
        }

        if (parsed.type === "totp") {
          results.push({
            type: "totp",
            ...baseData,
            label: enhancedLabel,
            period: parsed.period || 30,
          });
        } else {
          results.push({
            type: "hotp",
            ...baseData,
            label: enhancedLabel,
            counter: parsed.counter || 0,
          });
        }
      } catch (_) {
        continue;
      }
    }

    if (results.length === 0) {
      throw new Error("No valid Ente entries found");
    }

    // Sort by position if available (requires storing metadata)
    return results;
  }
}