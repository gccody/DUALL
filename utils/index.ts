import { TOTPAlgorithm } from "@/types";

export { buildOtpAuthUri, isOtpAuthUri, type OtpAuthUriParams } from "@/core/otp/uri";
export { serviceToUri as generateTOTPUrl } from "@/core/service";

export function isTOTPAlgorithm (keyInput: string): keyInput is TOTPAlgorithm {
  return ["SHA-1", "SHA-256", "SHA-384", "SHA-512"].includes(keyInput);
}
