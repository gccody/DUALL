import type { OtpProvider } from "@/parsers/types";
import { parseOtpAuthUri } from "@/parsers/utils";
import type { OtpAuthData } from "@/types";

interface BitwardenItem {
  name?: string;
  login?: {
    totp?: string;
    username?: string;
  };
}

interface BitwardenExport {
  items?: BitwardenItem[];
}

export class BitwardenParser implements OtpProvider {
  readonly name = "bitwarden";
  readonly displayName = "Bitwarden";
  readonly supportedExtensions = [".json", ".csv"];

  canParse(data: unknown): boolean {
    if (typeof data === "string") {
      // Check for CSV format
      if (data.includes("folder,favorite,type,name,notes,fields,") || 
          data.includes("name,uri,username,password,totp")) {
        return true;
      }

      try {
        data = JSON.parse(data);
      } catch {
        return false;
      }
    }

    if (typeof data === "object" && data !== null) {
      const json = data as any;
      return Array.isArray(json.items) && json.items.some((item: any) => 
        item.login?.totp
      );
    }

    return false;
  }

  parse(data: string | unknown): OtpAuthData[] {
    if (typeof data === "string") {
      // Try CSV format first
      if (data.includes(",")) {
        return this.parseCSV(data);
      }
      // Try JSON
      return this.parseJSON(JSON.parse(data));
    } else {
      return this.parseJSON(data as BitwardenExport);
    }
  }

  private parseJSON(json: BitwardenExport): OtpAuthData[] {
    if (!Array.isArray(json.items)) {
      throw new Error("Invalid Bitwarden format: missing items array");
    }

    const results: OtpAuthData[] = [];

    for (const item of json.items) {
      if (!item.login?.totp) continue;

      const totpString = item.login.totp;
      
      // Try parsing as otpauth URI
      if (totpString.startsWith("otpauth://")) {
        const parsed = parseOtpAuthUri(totpString);
        if (parsed && parsed.type === "totp") {
          results.push({
            type: "totp",
            label: item.name || parsed.label,
            secret: parsed.secret,
            issuer: parsed.issuer,
            algorithm: parsed.algorithm,
            digits: parsed.digits,
            period: parsed.period || 30,
          });
        }
      } else {
        // Plain secret
        results.push({
          type: "totp",
          label: item.name || "Unknown",
          secret: totpString,
          issuer: undefined,
          algorithm: "SHA-1",
          digits: 6,
          period: 30,
        });
      }
    }

    if (results.length === 0) {
      throw new Error("No valid Bitwarden TOTP entries found");
    }

    return results;
  }

  private parseCSV(csv: string): OtpAuthData[] {
    const lines = csv.split("\n").filter((line) => line.trim());
    if (lines.length < 2) {
      throw new Error("Invalid CSV format");
    }

    const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());
    const nameIndex = headers.indexOf("name");
    const totpIndex = headers.indexOf("totp");

    if (totpIndex === -1) {
      throw new Error("CSV does not contain TOTP column");
    }

    const results: OtpAuthData[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(",");
      const totp = values[totpIndex]?.trim();

      if (!totp) continue;

      const name = nameIndex >= 0 ? values[nameIndex]?.trim() : "Unknown";

      if (totp.startsWith("otpauth://")) {
        const parsed = parseOtpAuthUri(totp);
        if (parsed && parsed.type === "totp") {
          results.push({
            type: "totp",
            label: name || parsed.label,
            secret: parsed.secret,
            issuer: parsed.issuer,
            algorithm: parsed.algorithm,
            digits: parsed.digits,
            period: parsed.period || 30,
          });
        }
      } else {
        results.push({
          type: "totp",
          label: name,
          secret: totp,
          algorithm: "SHA-1",
          digits: 6,
          period: 30,
        });
      }
    }

    if (results.length === 0) {
      throw new Error("No valid TOTP entries found in CSV");
    }

    return results;
  }
}