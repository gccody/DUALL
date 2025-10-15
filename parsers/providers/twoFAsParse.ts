import type { OtpProvider } from "@/parsers/types";
import { parseOtpAuthUri } from "@/parsers/utils";
import type { OtpAuthData } from "@/types";

export class TwoFASParser implements OtpProvider {
  readonly name = "2fas";
  readonly displayName = "2FAS";
  readonly supportedExtensions = [".txt", ".2fas"];

  canParse(data: unknown): boolean {
    if (typeof data !== "string") {
      return false;
    }

    // Split by lines and check if at least one line contains an otpauth:// URI
    const lines = data.trim().split('\n');
    return lines.some(line => line.trim().startsWith('otpauth://'));
  }

  parse(data: string | unknown): OtpAuthData[] {
    if (typeof data !== "string") {
      throw new Error("Invalid 2FAS format: expected string data");
    }

    const results: OtpAuthData[] = [];
    const lines = data.trim().split('\n');

    for (const line of lines) {
      const trimmedLine = line.trim();
      if (!trimmedLine || !trimmedLine.startsWith('otpauth://')) {
        continue;
      }

      const parsedUri = parseOtpAuthUri(trimmedLine);
      if (!parsedUri) {
        continue; // Skip invalid URIs
      }

      if (parsedUri.type === "totp") {
        results.push({
          type: "totp",
          label: parsedUri.label,
          secret: parsedUri.secret,
          issuer: parsedUri.issuer,
          algorithm: parsedUri.algorithm,
          digits: parsedUri.digits,
          period: parsedUri.period || 30,
        });
      } else if (parsedUri.type === "hotp") {
        results.push({
          type: "hotp",
          label: parsedUri.label,
          secret: parsedUri.secret,
          issuer: parsedUri.issuer,
          algorithm: parsedUri.algorithm,
          digits: parsedUri.digits,
          counter: parsedUri.counter || 0,
        });
      }
    }

    if (results.length === 0) {
      throw new Error("No valid 2FAS entries found");
    }

    return results;
  }
}