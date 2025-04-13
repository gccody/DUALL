import { TOTPAlgorithm } from "@/types";

export function isTOTPAlgorithm (keyInput: string): keyInput is TOTPAlgorithm {
  return ["SHA-1", "SHA-256", "SHA-384", "SHA-512"].includes(keyInput);
}