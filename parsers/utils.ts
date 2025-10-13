import type { TOTPAlgorithm } from "@/types";

/**
 * Normalizes algorithm names to match our type system
 */
export function normalizeAlgorithm(
  algorithm?: string
): TOTPAlgorithm {
  if (!algorithm) return "SHA-1";

  const normalized = algorithm.toUpperCase().replace(/[^A-Z0-9]/g, "");

  switch (normalized) {
    case "SHA1":
      return "SHA-1";
    case "SHA256":
      return "SHA-256";
    case "SHA384":
      return "SHA-384";
    case "SHA512":
      return "SHA-512";
    default:
      return "SHA-1";
  }
}

/**
 * Parses otpauth:// URI format (common across many providers)
 */
export function parseOtpAuthUri(uri: string): {
  type: "totp" | "hotp";
  label: string;
  secret: string;
  issuer?: string;
  algorithm: TOTPAlgorithm;
  digits: number;
  period?: number;
  counter?: number;
} | null {
  try {
    const url = new URL(uri);

    if (url.protocol !== "otpauth:") return null;

    const type = url.host as "totp" | "hotp";
    if (type !== "totp" && type !== "hotp") return null;

    const label = decodeURIComponent(url.pathname.slice(1));
    const params = url.searchParams;

    const secret = params.get("secret");
    if (!secret) return null;

    return {
      type,
      label,
      secret,
      issuer: params.get("issuer") || undefined,
      algorithm: normalizeAlgorithm(params.get("algorithm") || "SHA1"),
      digits: parseInt(params.get("digits") || "6", 10),
      period: type === "totp" ? parseInt(params.get("period") || "30", 10) : undefined,
      counter: type === "hotp" ? parseInt(params.get("counter") || "0", 10) : undefined,
    };
  } catch {
    return null;
  }
}

/**
 * Extracts issuer and account from a label (format: "Issuer:Account" or just "Account")
 */
export function parseLabel(label: string): { issuer?: string; account: string } {
  const colonIndex = label.indexOf(":");
  if (colonIndex > 0) {
    return {
      issuer: label.slice(0, colonIndex).trim(),
      account: label.slice(colonIndex + 1).trim(),
    };
  }
  return { account: label.trim() };
}