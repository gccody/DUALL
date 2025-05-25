import {
	HOTPOptions,
	HOTPResult,
	TOTPAlgorithm,
	TOTPEncoding,
	TOTPOptions,
	TOTPResult
} from "@/types";
import CryptoES from "crypto-es";
import base32 from "hi-base32";

/**
 * OTP type: Time-based (TOTP) or HMAC-based (HOTP)
 */
type OtpType = "totp" | "hotp";

/**
 * Structure representing parsed OTP data
 */
interface OtpData {
  /** Type of OTP (time-based or HMAC-based) */
  type: OtpType;
  /** Secret key (base32-encoded) */
  secret: string;
  /** Service provider name */
  issuer: string;
  /** User account identifier */
  account: string;
  /** Hashing algorithm */
  algorithm: TOTPAlgorithm;
  /** Number of digits in the OTP code */
  digits: number;
  /** Time period in seconds (for TOTP) */
  period?: number;
  /** Counter value (for HOTP) */
  counter?: number;
  /** Original URL string */
  originalUrl: string;
}

export class OTPUtils {
  protected static parseKey(
    key: string,
    encoding: TOTPEncoding
  ): CryptoES.lib.WordArray {
    switch (encoding) {
      case "hex":
        return CryptoES.enc.Hex.parse(key);
      case "ascii":
        return CryptoES.enc.Utf8.parse(key);
      case "base32":
        const base32Bytes = base32.decode.asBytes(
          key.replace(/=+$/, "").toUpperCase()
        );
        const hex = base32Bytes
          .map((b) => b.toString(16).padStart(2, "0"))
          .join("");
        return CryptoES.enc.Hex.parse(hex);
      default:
        throw new Error(`Unsupported encoding: ${encoding}`);
    }
  }

  protected static dec2hex(dec: number): string {
    return dec.toString(16);
  }

  protected static getHMAC(
    key: CryptoES.lib.WordArray,
    message: CryptoES.lib.WordArray,
    algorithm: TOTPAlgorithm
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

  protected static extractOtp(
    hmac: CryptoES.lib.WordArray,
    digits: number
  ): string {
    const hmacHex = hmac.toString(CryptoES.enc.Hex);
    const offset = parseInt(hmacHex.slice(-1), 16);
    const code = hmacHex.substr(offset * 2, 8);
    const masked = parseInt(code, 16) & 0x7fffffff;
    return masked.toString().slice(-digits).padStart(digits, "0");
  }

  public static parseUrl(url: string): OtpData {
    try {
      // Check if the URL starts with the required prefix
      if (!url.startsWith("otpauth://")) {
        throw new Error(
          'Invalid OTP URL format. URL must start with "otpauth://"'
        );
      }

      // Parse the URL
      const parsedUrl = new URL(url);

      // Extract OTP type (totp or hotp)
      const type = url.replace("otpauth://", "").split("/")[0] as OtpType;
      if (type !== "totp" && type !== "hotp") {
        throw new Error(
          `Invalid OTP type: ${type}. Must be 'totp' or 'hotp'`
        );
      }

      // Extract the label (may contain issuer and account name)
      const label = decodeURIComponent(parsedUrl.pathname.substring(1));

      // Parse the parameters
      const params = new URLSearchParams(parsedUrl.search);
      const secret = params.get("secret");

      if (!secret) {
        throw new Error("Missing required parameter: secret");
      }

      // Parse issuer from parameters and/or label
      let issuer = params.get("issuer") || "";
      let account = label;

      // If label contains issuer:account format, extract them
      const labelParts = label.split(":");
      if (labelParts.length > 1) {
        if (!issuer) {
          issuer = labelParts[0];
        }
        account = labelParts.slice(1).join(":");
      }

      // Parse other parameters
      const algorithm = (params.get("algorithm") || "SHA-1") as TOTPAlgorithm;
      const digits = parseInt(params.get("digits") || "6", 10);

      // Parse type-specific parameters
      let period: number | undefined;
      let counter: number | undefined;

      if (type === "totp") {
        period = parseInt(params.get("period") || "30", 10);
      } else if (type === "hotp") {
        const counterParam = params.get("counter");
        if (!counterParam) {
          throw new Error("Missing required parameter for HOTP: counter");
        }
        counter = parseInt(counterParam, 10);
      }

      return {
        type,
        secret,
        issuer,
        account,
        algorithm,
        digits,
        period,
        counter,
        originalUrl: url,
      };
    } catch (error) {
      // Rethrow with a more descriptive message if it's not our custom error
      if (error instanceof Error && !error.message.includes("Invalid OTP")) {
        throw new Error(`Failed to parse OTP URL: ${error.message}`);
      }
      throw error;
    }
  }
}

export class TOTP extends OTPUtils {
  static generate(key: string, options?: TOTPOptions): TOTPResult {
    const _options: Required<TOTPOptions> = {
      digits: 6,
      algorithm: "SHA-1",
      encoding: "base32",
      period: 30,
      timestamp: Date.now(),
      ...options,
    };

    const epochSeconds = Math.floor(_options.timestamp / 1000);
    const counter = Math.floor(epochSeconds / _options.period);
    const timeHex = this.dec2hex(counter).padStart(16, "0");
    const timeBuffer = CryptoES.enc.Hex.parse(timeHex);

    const keyBytes = this.parseKey(key, _options.encoding);

    const hmac = this.getHMAC(keyBytes, timeBuffer, _options.algorithm);
    const otp = this.extractOtp(hmac, _options.digits);

    const period = _options.period * 1000;
    const expires = Math.ceil((_options.timestamp + 1) / period) * period;

    return { otp, expires };
  }
}

export class HOTP extends OTPUtils {
  static generate(key: string, options: HOTPOptions): HOTPResult {
    // Extract only the HOTP-relevant properties from options
    const { counter, digits = 6, algorithm = "SHA-1", encoding = "base32" } = options;
    
    // Create a properly typed _options object with only HOTP properties
    const _options = {
      counter,
      digits,
      algorithm,
      encoding
    };

    // Ensure counter is provided
    if (typeof _options.counter !== "number") {
      throw new Error("HOTP options must include a 'counter'.");
    }

    const counterHex = this.dec2hex(_options.counter).padStart(16, "0");
    const counterBuffer = CryptoES.enc.Hex.parse(counterHex);

    const keyBytes = this.parseKey(key, _options.encoding);

    const hmac = this.getHMAC(keyBytes, counterBuffer, _options.algorithm);
    const otp = this.extractOtp(hmac, _options.digits);

    return { otp };
  }
}