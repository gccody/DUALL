import type { Service } from "@/types";
import { serviceToUri } from "./service";

/** Contents of an export file: one otpauth:// URI per line, in display order. */
export function buildExportText(services: readonly Service[]): string {
  return services.map(serviceToUri).join("\n");
}

/** Name of the export file created at `date`. */
export function exportFileName(date: Date): string {
  return `duall-${date.toISOString()}.txt`;
}
