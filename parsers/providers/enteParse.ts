// TODO

import type { OtpProvider } from "@/parsers/types";
import type { OtpAuthData } from "@/types";

export class EnteParser implements OtpProvider {
  readonly name = "ente";
  readonly displayName = "Ente";
  readonly supportedExtensions = [".json"];

  canParse(data: unknown): boolean {
    // TODO: Implement Ente detection logic
    return false;
  }

  parse(data: string | unknown): OtpAuthData[] {
    // TODO: Implement Ente parsing logic
    throw new Error("Ente parser not yet implemented");
  }
}