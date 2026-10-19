import type { TOTPAlgorithm } from "@/types";
import CryptoES from "crypto-es";
import base32 from "hi-base32";

export type { TOTPAlgorithm };

export interface TotpParams {
  algorithm: TOTPAlgorithm;
  digits: number;
  period: number;
}

export interface TotpCode {
  otp: string;
  /** Epoch milliseconds at which this code stops being valid */
  expires: number;
}

export const DEFAULT_TOTP_PARAMS: TotpParams = {
  algorithm: "SHA-1",
  digits: 6,
  period: 30,
};

/**
 * Maps any spelling of a supported algorithm ("SHA1", "sha-256", ...) to a
 * TOTPAlgorithm. Unknown or missing values fall back to SHA-1, the default
 * of the Key URI format.
 */
export function normalizeAlgorithm(algorithm?: unknown): TOTPAlgorithm {
  if (typeof algorithm !== "string") return "SHA-1";

  switch (algorithm.toUpperCase().replace(/[^A-Z0-9]/g, "")) {
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

function decodeBase32Secret(secret: string): CryptoES.lib.WordArray {
  const bytes = base32.decode.asBytes(secret.replace(/[\s=]/g, "").toUpperCase());
  const hex = bytes.map((b) => b.toString(16).padStart(2, "0")).join("");
  return CryptoES.enc.Hex.parse(hex);
}

function hmac(
  algorithm: TOTPAlgorithm,
  key: CryptoES.lib.WordArray,
  message: CryptoES.lib.WordArray
): CryptoES.lib.WordArray {
  switch (algorithm) {
    case "SHA-1":
      return CryptoES.HmacSHA1(message, key);
    case "SHA-256":
      return CryptoES.HmacSHA256(message, key);
    case "SHA-384":
      return CryptoES.HmacSHA384(message, key);
    case "SHA-512":
      return CryptoES.HmacSHA512(message, key);
    default:
      throw new Error(`Unsupported algorithm: ${algorithm}`);
  }
}

/** RFC 4226 dynamic truncation */
function truncate(mac: CryptoES.lib.WordArray, digits: number): string {
  const hex = mac.toString(CryptoES.enc.Hex);
  const offset = parseInt(hex.slice(-1), 16);
  const code = parseInt(hex.slice(offset * 2, offset * 2 + 8), 16) & 0x7fffffff;
  return code.toString().slice(-digits).padStart(digits, "0");
}

/**
 * Generates the RFC 6238 code for a base32 secret at `now` (epoch ms).
 * Throws if the secret is not valid base32.
 */
export function generateTotp(secret: string, params: TotpParams, now: number = Date.now()): TotpCode {
  const { algorithm, digits, period } = params;
  const counter = Math.floor(Math.floor(now / 1000) / period);
  const message = CryptoES.enc.Hex.parse(counter.toString(16).padStart(16, "0"));

  const otp = truncate(hmac(algorithm, decodeBase32Secret(secret), message), digits);

  const periodMs = period * 1000;
  const expires = Math.ceil((now + 1) / periodMs) * periodMs;

  return { otp, expires };
}
