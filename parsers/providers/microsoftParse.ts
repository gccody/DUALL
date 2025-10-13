// TODO

import type { OtpProvider } from "@/parsers/types";
import type { OtpAuthData } from "@/types";

export class MicrosoftParser implements OtpProvider {
  readonly name = "microsoft";
  readonly displayName = "Microsoft";
  readonly supportedExtensions = [".json"];

  canParse(data: unknown): boolean {
    // TODO: Implement Microsoft detection logic
    return false;
  }

  parse(data: string | unknown): OtpAuthData[] {
    // TODO: Implement Microsoft parsing logic
    throw new Error("Microsoft parser not yet implemented");
  }
}