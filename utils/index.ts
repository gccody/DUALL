import { TokenType, TOTPAlgorithm } from "@/types";

export function isTOTPAlgorithm (keyInput: string): keyInput is TOTPAlgorithm {
  return ["SHA-1", "SHA-256", "SHA-384", "SHA-512"].includes(keyInput);
}

export function generateTOTPUrl(tokenType: TokenType, label: string, secret: string, digits: number, period: number, algorithm: TOTPAlgorithm, issuer: string) {
  return `otpauth://${tokenType}/${label}?secret=${secret}&issuer=${issuer}&algorithm=${algorithm}&digits=${digits}&period=${period}`
}

