import type { Service } from "@/types";
import { serviceToUri } from "./service";

/** Contents of an export file: one otpauth:// URI per line, in display order. */
export function buildExportText(services: readonly Service[]): string {
  return services.map(serviceToUri).join("\n");
}

/**
 * Name of the export file created at `date`: the UTC timestamp to the second,
 * without colons since some share targets reject them in file names.
 */
export function exportFileName(date: Date): string {
  const timestamp = date.toISOString().replace(/\.\d{3}Z$/, "Z").replace(/:/g, "-");
  return `duall-${timestamp}.txt`;
}

/** Whether `name` looks like a file created by exportFileName (any version). */
export function isExportFileName(name: string): boolean {
  return /^duall-.+\.txt$/.test(name);
}
