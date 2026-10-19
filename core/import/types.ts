import type { ParsedOtpAuth } from "../otp/uri";

export interface ImportProvider {
  /** Stable identifier, e.g. "bitwarden" */
  id: string;
  /** Name shown to the user, e.g. "Bitwarden" */
  displayName: string;
  /**
   * Parses the raw export file. Returns every usable entry (TOTP and HOTP);
   * throws a descriptive Error when the file is structurally unusable.
   */
  parse(content: string): ParsedOtpAuth[];
}
