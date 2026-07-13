import { Service, TOTPAlgorithm } from "@/types";

export function isTOTPAlgorithm (keyInput: string): keyInput is TOTPAlgorithm {
  return ["SHA-1", "SHA-256", "SHA-384", "SHA-512"].includes(keyInput);
}

export function generateTOTPUrl(service: Service) {
  return `otpauth://${service.otp.tokenType}/${service.name}?secret=${service.secret}&issuer=${service.otp.issuer}&algorithm=${service.otp.algorithm}&digits=${service.otp.digits}&period=${service.otp.period}`
}

