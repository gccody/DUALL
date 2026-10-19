import { Service, TOTPAlgorithm } from "@/types";

export function isTOTPAlgorithm (keyInput: string): keyInput is TOTPAlgorithm {
  return ["SHA-1", "SHA-256", "SHA-384", "SHA-512"].includes(keyInput);
}

export interface OtpAuthUriParams {
  type: "totp" | "hotp" | "TOTP" | "HOTP";
  secret: string;
  account: string;
  issuer?: string;
  algorithm?: TOTPAlgorithm;
  digits?: number;
  period?: number;
  counter?: number;
}

/**
 * Builds an otpauth:// URI following the Google Authenticator Key URI format:
 * otpauth://totp/Issuer:Account?secret=...&issuer=Issuer&algorithm=SHA1&digits=6&period=30
 *
 * The query string is built manually (no URLSearchParams) for React Native compatibility.
 */
export function buildOtpAuthUri({ type, secret, account, issuer, algorithm, digits, period, counter }: OtpAuthUriParams): string {
  const trimmedIssuer = issuer?.trim() ?? "";
  let trimmedAccount = account.trim();
  // Avoid "Issuer:Issuer:Account" when the account name already carries the issuer prefix
  if (trimmedIssuer && trimmedAccount.startsWith(`${trimmedIssuer}:`)) {
    trimmedAccount = trimmedAccount.slice(trimmedIssuer.length + 1).trim();
  }

  const label = trimmedIssuer
    ? `${encodeURIComponent(trimmedIssuer)}:${encodeURIComponent(trimmedAccount)}`
    : encodeURIComponent(trimmedAccount);

  const params: [string, string | number | undefined][] = [
    ["secret", secret],
    ["issuer", trimmedIssuer || undefined],
    ["algorithm", algorithm?.replace("-", "")],
    ["digits", digits],
    ["period", period],
    ["counter", counter],
  ];
  const query = params
    .filter((entry): entry is [string, string | number] =>
      entry[1] !== undefined && entry[1] !== null && !Number.isNaN(entry[1]))
    .map(([key, value]) => `${key}=${encodeURIComponent(String(value))}`)
    .join("&");

  return `otpauth://${type.toLowerCase()}/${label}?${query}`;
}

export function generateTOTPUrl(service: Service) {
  return buildOtpAuthUri({
    type: service.otp.tokenType,
    secret: service.secret,
    account: service.name,
    issuer: service.otp.issuer,
    algorithm: service.otp.algorithm,
    digits: service.otp.digits,
    period: service.otp.period,
  });
}

