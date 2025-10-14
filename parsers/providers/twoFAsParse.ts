import type { OtpProvider } from "@/parsers/types";
import { normalizeAlgorithm } from "@/parsers/utils";
import type { OtpAuthData } from "@/types";

interface TwoFASService {
  name: string;
  secret: string;
  otp?: {
    tokenType?: string;
    digits?: number;
    period?: number;
    counter?: number;
    algorithm?: string;
    issuer?: string;
    account?: string;
  };
  order?: {
    position?: number;
  };
  icon?: {
    selected?: string;
    label?: {
      text?: string;
      backgroundColor?: string;
    } | string;
  };
  updatedAt?: number;
}

interface TwoFASExport {
  services: TwoFASService[];
  groups?: any[];
  updatedAt?: number;
  schemaVersion?: number;
  appVersionCode?: number;
}

export class TwoFASParser implements OtpProvider {
  readonly name = "2fas";
  readonly displayName = "2FAS";
  readonly supportedExtensions = [".json", ".2fas"];

  canParse(data: unknown): boolean {
    if (typeof data === "string") {
      try {
        data = JSON.parse(data);
      } catch {
        return false;
      }
    }

    if (typeof data === "object" && data !== null) {
      const json = data as any;
      return (
        Array.isArray(json.services) &&
        (json.schemaVersion !== undefined || json.appVersionCode !== undefined)
      );
    }

    return false;
  }

  parse(data: string | unknown): OtpAuthData[] {
    let json: TwoFASExport;

    if (typeof data === "string") {
      json = JSON.parse(data);
    } else {
      json = data as TwoFASExport;
    }

    if (!Array.isArray(json.services)) {
      throw new Error("Invalid 2FAS format: missing services array");
    }

    const results: OtpAuthData[] = [];

    for (const service of json.services) {
      if (!service.secret) continue;

      const tokenType = service.otp?.tokenType?.toLowerCase() || "totp";
      const algorithm = normalizeAlgorithm(service.otp?.algorithm || "SHA1");
      const digits = service.otp?.digits || 6;
      
      // Get issuer from otp.issuer, fallback to service name
      const issuer = service.otp?.issuer || service.name;
      // Get label from otp.account if available, otherwise use service name
      const label = service.otp?.account || service.name;

      if (tokenType === "totp") {
        results.push({
          type: "totp",
          label: label,
          secret: service.secret,
          issuer: issuer,
          algorithm,
          digits,
          period: service.otp?.period || 30,
        });
      } else if (tokenType === "hotp") {
        results.push({
          type: "hotp",
          label: label,
          secret: service.secret,
          issuer: issuer,
          algorithm,
          digits,
          counter: service.otp?.counter || 0,
        });
      }
    }

    if (results.length === 0) {
      throw new Error("No valid 2FAS entries found");
    }

    return results;
  }
}