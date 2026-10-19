import type { Service } from "@/types";
import { getCustomIconDomain } from "@/utils/customIconMatcher";
import { randomUUID } from "expo-crypto";
import { DEFAULT_TOTP_PARAMS, normalizeAlgorithm, type TotpParams } from "./otp/totp";
import { buildOtpAuthUri, MAX_DIGITS, parseBoundedInt, type ParsedOtpAuth } from "./otp/uri";

/**
 * The single factory for new services (QR scan, manual entry, import).
 * Assigns a fresh uid and auto-matches a bundled icon by issuer.
 */
export function createService(parsed: ParsedOtpAuth, position: number): Service {
  const service: Service = {
    position,
    updatedAt: Date.now(),
    name: parsed.account,
    uid: randomUUID(),
    secret: parsed.secret,
    otp: {
      issuer: parsed.issuer,
      algorithm: parsed.algorithm,
      digits: parsed.digits,
      period: parsed.period ?? DEFAULT_TOTP_PARAMS.period,
    },
  };

  const matchedDomain = getCustomIconDomain(service);
  return matchedDomain ? { ...service, icon: { label: matchedDomain } } : service;
}

/** Same account: case-insensitive name and issuer, identical secret. */
export function isSameService(a: Service, b: Service): boolean {
  return (
    (a.name ?? "").toLowerCase() === (b.name ?? "").toLowerCase() &&
    (a.otp?.issuer ?? "").toLowerCase() === (b.otp?.issuer ?? "").toLowerCase() &&
    a.secret === b.secret
  );
}

export function isDuplicateService(services: readonly Service[], candidate: Service): boolean {
  return services.some((service) => isSameService(service, candidate));
}

/**
 * TOTP parameters for a stored service. Normalizes legacy data: algorithm
 * spellings like "SHA1", periods that are missing/invalid and out-of-range
 * digit counts.
 */
export function getTotpParams(service: Service): TotpParams {
  const otp: Partial<Service["otp"]> = service.otp ?? {};
  return {
    algorithm: normalizeAlgorithm(otp.algorithm),
    digits: parseBoundedInt(otp.digits, DEFAULT_TOTP_PARAMS.digits, 1, MAX_DIGITS),
    period: parseBoundedInt(otp.period, DEFAULT_TOTP_PARAMS.period),
  };
}

/** otpauth:// URI for a service (export / share), generated from current data. */
export function serviceToUri(service: Service): string {
  return buildOtpAuthUri({
    type: "totp",
    secret: service.secret,
    account: service.name ?? "",
    issuer: service.otp?.issuer,
    ...getTotpParams(service),
  });
}
