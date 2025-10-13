import type { OtpAuthData } from "@/types";

/**
 * Base interface that all provider parsers must implement.
 */
export interface OtpProvider {
  /** Unique identifier for this provider */
  readonly name: string;

  /** Human-readable display name */
  readonly displayName: string;

  /** File extensions this provider can handle (e.g., ['.json', '.txt']) */
  readonly supportedExtensions: string[];

  /**
   * Validates if the input data is from this provider.
   * @param data - Raw file content (string or parsed object)
   * @returns true if this provider can parse the data
   */
  canParse(data: unknown): boolean;

  /**
   * Parses the provider-specific format into standardized OtpAuthData.
   * @param data - Raw file content
   * @returns Array of parsed OTP entries
   * @throws Error if parsing fails
   */
  parse(data: string | unknown): OtpAuthData[];
}

/**
 * Result type for parser detection
 */
export interface ParseResult {
  provider: string;
  data: OtpAuthData[];
}