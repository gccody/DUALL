import type { OtpAuthData } from "../../types";
import type { OtpProvider } from "../types";
import { normalizeAlgorithm } from "../utils";

interface LastPassAccount {
  userName: string;
  originalUserName: string;
  issuerName: string;
  originalIssuerName: string;
  secret: string;
  algorithm: string;
  digits: number;
  timeStep: number;
  accountID: string;
  lmiUserId: string;
  isFavorite: boolean;
  creationTimestamp: number;
  folderData: {
    folderId: number;
    position: number;
  };
}

interface LastPassFolder {
  id: number;
  name: string;
  isOpened: boolean;
}

interface LastPassExport {
  accounts: LastPassAccount[];
  folders?: LastPassFolder[];
  version?: number;
  deviceName?: string;
  localDeviceId?: string | null;
}

export class LastPassParser implements OtpProvider {
  readonly name = "lastpass";
  readonly displayName = "LastPass Authenticator";
  readonly supportedExtensions = [".json"];

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
        Array.isArray(json.accounts) &&
        json.accounts.length > 0 &&
        json.accounts.some(
          (acc: any) =>
            typeof acc === "object" &&
            "secret" in acc &&
            "issuerName" in acc &&
            "timeStep" in acc &&
            "folderData" in acc
        )
      );
    }

    return false;
  }

  parse(data: string | unknown): OtpAuthData[] {
    let json: LastPassExport;

    if (typeof data === "string") {
      json = JSON.parse(data);
    } else {
      json = data as LastPassExport;
    }

    if (!Array.isArray(json.accounts)) {
      throw new Error("Invalid LastPass format: missing accounts array");
    }

    const results: OtpAuthData[] = [];

    // Build folder lookup map
    const folderMap = new Map<number, string>();
    if (json.folders && Array.isArray(json.folders)) {
      for (const folder of json.folders) {
        folderMap.set(folder.id, folder.name);
      }
    }

    for (const account of json.accounts) {
      if (!account.secret) continue;

      try {
        const otpData = this.parseAccount(account, folderMap);
        if (otpData) {
          results.push(otpData);
        }
      } catch (error) {
        console.warn("Failed to parse LastPass account:", account, error);
      }
    }

    if (results.length === 0) {
      throw new Error("No valid LastPass Authenticator entries found");
    }

    return results;
  }

  private parseAccount(
    account: LastPassAccount,
    folderMap: Map<number, string>
  ): OtpAuthData | null {
    // Build label from issuer and username
    let label = account.issuerName || account.originalIssuerName || "Unknown";

    // Add username if present
    const username = account.userName || account.originalUserName;
    if (username) {
      label = `${label}:${username}`;
    }

    // Add folder name if not in default folder
    const folderId = account.folderData?.folderId;
    if (folderId !== undefined && folderId !== 0) {
      const folderName = folderMap.get(folderId);
      if (folderName && folderName !== "Other Accounts") {
        label = `${label} [${folderName}]`;
      }
    }

    // Mark favorites
    if (account.isFavorite) {
      label = `⭐ ${label}`;
    }

    // Parse algorithm
    const algorithm = normalizeAlgorithm(account.algorithm || "SHA1");

    // LastPass Authenticator only supports TOTP
    return {
      type: "totp",
      label,
      secret: account.secret,
      issuer: account.issuerName || account.originalIssuerName,
      algorithm,
      digits: account.digits || 6,
      period: account.timeStep || 30,
    };
  }
}