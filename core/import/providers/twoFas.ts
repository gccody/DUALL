import { parseOtpAuthLines } from "../shared";
import type { ImportProvider } from "../types";

/** 2FAS plain-text export: one otpauth:// URI per line. */
export const twoFas: ImportProvider = {
  id: "2fas",
  displayName: "2FAS",
  parse: (content) => parseOtpAuthLines(content),
};
