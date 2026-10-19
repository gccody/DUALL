import { getTotpParams } from "@/core/service";
import type { Service } from "@/types";
import * as SecureStore from "expo-secure-store";
import { readLegacyConfig, removeLegacyConfig } from "./legacy";
import { hasStoredSettings, saveSettings, withDefaults } from "./settings";
import { readIndex, secretKey, writeIndex } from "./vault";

/**
 * Converts a service stored by an older version: drops `otp.link` (which
 * embeds the secret) and `otp.tokenType`, normalizes period/digits/algorithm
 * and sets `position` from the display order.
 */
export function normalizeLegacyService(stored: Service, uid: string, position: number): Service {
  const service: Service = {
    position,
    updatedAt: typeof stored.updatedAt === "number" ? stored.updatedAt : 0,
    name: typeof stored.name === "string" ? stored.name : "",
    uid,
    secret: stored.secret,
    otp: {
      issuer: typeof stored.otp?.issuer === "string" ? stored.otp.issuer : "",
      ...getTotpParams(stored),
    },
  };
  if (stored.icon && typeof stored.icon.label === "string") service.icon = { label: stored.icon.label };
  return service;
}

/**
 * Moves data from the legacy `otpConfig` entry to the v2 format:
 *
 * 1. settings are copied to their own key (unless already there),
 * 2. the vault index is built from the stored metadata order,
 * 3. each stored service is rewritten normalized under its existing key,
 * 4. `otpConfig` is removed, scrubbing any secrets it held from AsyncStorage.
 *
 * New data is written before the legacy entry is deleted, and every step is
 * idempotent, so an interrupted run is completed by the next one. Groups are
 * dropped. Throws (leaving `otpConfig` in place) if SecureStore can't be read.
 */
export async function migrateLegacyConfig(): Promise<void> {
  let legacy;
  try {
    legacy = await readLegacyConfig();
  } catch (error) {
    // Nothing usable to migrate from; keep the entry rather than destroy it.
    console.error("Legacy config is unreadable, skipping migration:", error);
    return;
  }
  if (!legacy) return;

  if (legacy.settings && typeof legacy.settings === "object" && !(await hasStoredSettings())) {
    await saveSettings(withDefaults(legacy.settings));
  }

  const raws = await Promise.all(legacy.uids.map((uid) => SecureStore.getItemAsync(secretKey(uid))));
  const services: { uid: string; raw: string; service: Service }[] = [];
  legacy.uids.forEach((uid, i) => {
    const raw = raws[i];
    if (raw === null) return;
    try {
      const stored = JSON.parse(raw) as Service;
      if (!stored || typeof stored.secret !== "string") throw new Error("invalid");
      services.push({ uid, raw, service: normalizeLegacyService(stored, uid, services.length) });
    } catch {
      console.error(`Skipping unreadable legacy service ${uid}`);
    }
  });

  // An index left by an interrupted run may track entries this run won't order; keep them tracked.
  let previouslyWritten: string[] = [];
  try {
    previouslyWritten = (await readIndex()).written;
  } catch {
    // Unreadable index: it is replaced below.
  }
  const order = services.map(({ uid }) => uid);
  await writeIndex(order, [...order, ...legacy.uids, ...previouslyWritten]);

  await Promise.all(
    services
      .filter(({ raw, service }) => raw !== JSON.stringify(service))
      .map(({ uid, service }) => SecureStore.setItemAsync(secretKey(uid), JSON.stringify(service)))
  );

  await removeLegacyConfig();
}

let migration: Promise<void> | null = null;

/**
 * Runs pending migrations once per app launch; every caller shares the same
 * promise. A failed run is retried by the next call.
 */
export function ensureMigrated(): Promise<void> {
  migration ??= migrateLegacyConfig().catch((error) => {
    migration = null;
    throw error;
  });
  return migration;
}
