// TODO

import type { OtpProvider } from "@/parsers/types";
import type { OtpAuthData } from "@/types";

export class LastPassParser implements OtpProvider {
  readonly name = "lastpass";
  readonly displayName = "LastPass";
  readonly supportedExtensions = [".json"];

  canParse(data: unknown): boolean {
    // TODO: Implement LastPass detection logic
    return false;
  }

  parse(data: string | unknown): OtpAuthData[] {
    // TODO: Implement LastPass parsing logic
    throw new Error("LastPass parser not yet implemented");
  }
}