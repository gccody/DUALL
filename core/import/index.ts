import type { ParsedOtpAuth } from "../otp/uri";
import { bitwarden } from "./providers/bitwarden";
import { ente } from "./providers/ente";
import { googleAuthenticator } from "./providers/google";
import { lastPass } from "./providers/lastPass";
import { twoFas } from "./providers/twoFas";
import type { ImportProvider } from "./types";

export type { ImportProvider } from "./types";

/** Supported import sources, in the order they are offered to the user. */
export const importProviders: readonly ImportProvider[] = [googleAuthenticator, twoFas, bitwarden, ente, lastPass];

export interface ImportResult {
  /** TOTP entries ready for createService() */
  services: ParsedOtpAuth[];
  /** HOTP entries that were dropped because the app can't generate HOTP codes */
  skippedHotp: number;
}

/**
 * Parses an export file with the given provider. HOTP entries are filtered
 * out and counted. Throws a descriptive Error for unknown providers, unusable
 * files or files without any importable TOTP entry.
 */
export function parseImport(providerId: string, content: string): ImportResult {
  const provider = importProviders.find((p) => p.id === providerId);
  if (!provider) throw new Error(`Unknown import provider: ${providerId}`);

  const entries = provider.parse(content);
  const services = entries.filter((entry) => entry.type === "totp");
  const skippedHotp = entries.length - services.length;

  if (services.length === 0) {
    throw new Error(
      skippedHotp > 0
        ? `The ${provider.displayName} file only contains counter-based (HOTP) codes, which aren't supported.`
        : `No valid ${provider.displayName} codes found. Make sure you selected the right app and export file.`
    );
  }

  return { services, skippedHotp };
}
