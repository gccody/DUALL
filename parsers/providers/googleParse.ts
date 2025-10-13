import type { OtpProvider } from "@/parsers/types";
import { parseOtpAuthUri } from "@/parsers/utils";
import type { OtpAuthData } from "@/types";

export class GoogleAuthParser implements OtpProvider {
  readonly name = "google-auth";
  readonly displayName = "Google Authenticator";
  readonly supportedExtensions = [".txt", ".json"];

  canParse(data: unknown): boolean {
    if (typeof data === "string") {
      return data.trim().startsWith("otpauth://");
    }
    // Google Authenticator exports can be JSON with a specific structure
    if (typeof data === "object" && data !== null) {
      return "accounts" in data || "otpauth" in data;
    }
    return false;
  }

  parse(data: string | unknown): OtpAuthData[] {
    const results: OtpAuthData[] = [];

    if (typeof data === "string") {
      // Handle plain text with otpauth URIs (one per line)
      const lines = data.split("\n").filter((line) => line.trim());

      for (const line of lines) {
        const parsed = parseOtpAuthUri(line.trim());
        if (parsed) {
          results.push(this.convertToOtpAuthData(parsed));
        }
      }
    } else if (typeof data === "object" && data !== null) {
      // Handle JSON export format
      const json = data as any;

      if (Array.isArray(json.accounts)) {
        for (const account of json.accounts) {
          if (account.otpauth) {
            const parsed = parseOtpAuthUri(account.otpauth);
            if (parsed) {
              results.push(this.convertToOtpAuthData(parsed));
            }
          }
        }
      }
    }

    if (results.length === 0) {
      throw new Error("No valid Google Authenticator entries found");
    }

    return results;
  }

  private convertToOtpAuthData(parsed: ReturnType<typeof parseOtpAuthUri>): OtpAuthData {
    if (!parsed) throw new Error("Invalid parsed data");

    if (parsed.type === "totp") {
      return {
        type: "totp",
        label: parsed.label,
        secret: parsed.secret,
        issuer: parsed.issuer,
        algorithm: parsed.algorithm,
        digits: parsed.digits,
        period: parsed.period || 30,
      };
    } else {
      return {
        type: "hotp",
        label: parsed.label,
        secret: parsed.secret,
        issuer: parsed.issuer,
        algorithm: parsed.algorithm,
        digits: parsed.digits,
        counter: parsed.counter || 0,
      };
    }
  }
}