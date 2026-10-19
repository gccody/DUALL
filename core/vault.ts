import type { Service, ServiceOtp } from "@/types";
import type { ParsedOtpAuth } from "./otp/uri";
import { createService, isSameService } from "./service";

/**
 * Pure operations on the ordered list of services. Every function returns a
 * new list and never mutates its input; list order is display order and
 * `position` mirrors the index.
 */

/** Fields of a service the user can change. `otp` is merged shallowly. */
export interface ServicePatch {
  name?: string;
  icon?: Service["icon"];
  otp?: Partial<ServiceOtp>;
}

export interface AddServiceResult {
  list: Service[];
  /** Index of the new service, or of the existing one when it's a duplicate */
  index: number;
  duplicate: boolean;
}

/** Appends a service built from `parsed`, unless the same account is already present. */
export function addService(list: readonly Service[], parsed: ParsedOtpAuth): AddServiceResult {
  const service = createService(parsed, list.length);
  const existing = list.findIndex((item) => isSameService(item, service));
  if (existing !== -1) return { list: [...list], index: existing, duplicate: true };
  return { list: [...list, service], index: list.length, duplicate: false };
}

export interface MergeImportedResult {
  list: Service[];
  added: number;
  duplicates: number;
}

/**
 * Appends imported TOTP entries, skipping accounts that already exist or that
 * appear earlier in the same batch. HOTP entries are ignored (not counted).
 */
export function mergeImported(list: readonly Service[], parsedList: readonly ParsedOtpAuth[]): MergeImportedResult {
  const result = [...list];
  let added = 0;
  let duplicates = 0;
  for (const parsed of parsedList) {
    if (parsed.type !== "totp") continue;
    const service = createService(parsed, result.length);
    if (result.some((item) => isSameService(item, service))) {
      duplicates++;
    } else {
      result.push(service);
      added++;
    }
  }
  return { list: result, added, duplicates };
}

/** Applies `patch` to the service with `uid` and bumps its updatedAt. Unknown uids are a no-op. */
export function updateService(list: readonly Service[], uid: string, patch: ServicePatch, now: number = Date.now()): Service[] {
  return list.map((service) => {
    if (service.uid !== uid) return service;
    const updated: Service = { ...service, updatedAt: now };
    if (patch.name !== undefined) updated.name = patch.name;
    if (patch.icon !== undefined) updated.icon = patch.icon;
    if (patch.otp !== undefined) updated.otp = { ...service.otp, ...patch.otp };
    return updated;
  });
}

/** Removes the service with `uid` and renumbers the remaining positions. */
export function removeService(list: readonly Service[], uid: string): Service[] {
  return reindex(list.filter((service) => service.uid !== uid));
}

/** Sets each service's `position` to its index. Services already in place keep their identity. */
export function reindex(list: readonly Service[]): Service[] {
  return list.map((service, index) => (service.position === index ? service : { ...service, position: index }));
}
