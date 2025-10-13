// TODO

import type { OtpProvider } from "@/parsers/types";
import type { OtpAuthData } from "@/types";

export class AuthyParser implements OtpProvider {
  readonly name = "authy";
  readonly displayName = "Authy";
  readonly supportedExtensions = [".json"];

  canParse(data: unknown): boolean {
    // TODO: Implement Authy detection logic
    return false;
  }

  parse(data: string | unknown): OtpAuthData[] {
    // TODO: Implement Authy parsing logic
    throw new Error("Authy parser not yet implemented");
  }
}