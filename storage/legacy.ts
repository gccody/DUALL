import AsyncStorage from "@react-native-async-storage/async-storage";

/**
 * The pre-v2 format: a single AsyncStorage entry holding settings, groups and
 * service metadata. Metadata written by older versions can include `otp.link`,
 * which embeds the secret, so this entry must not outlive the migration.
 */
export const LEGACY_CONFIG_KEY = "otpConfig";

export interface LegacyConfig {
  settings?: unknown;
  /** uids in display order */
  uids: string[];
}

interface LegacyMetadata {
  uid?: unknown;
  order?: unknown;
}

/**
 * Reads the legacy config, or null when there is none. Throws if the entry
 * exists but isn't valid JSON.
 */
export async function readLegacyConfig(): Promise<LegacyConfig | null> {
  const raw = await AsyncStorage.getItem(LEGACY_CONFIG_KEY);
  if (raw === null) return null;
  const config = JSON.parse(raw) ?? {};
  const metadata: LegacyMetadata[] = Array.isArray(config.serviceMetadata) ? config.serviceMetadata : [];

  // Sort by the stored `order`, falling back to array position (stable).
  const sortKey = (meta: LegacyMetadata, i: number) => (typeof meta?.order === "number" && Number.isFinite(meta.order) ? meta.order : i);
  const uids = metadata
    .map((meta, i) => ({ uid: meta?.uid, key: sortKey(meta, i), i }))
    .filter((entry): entry is { uid: string; key: number; i: number } => typeof entry.uid === "string" && entry.uid !== "")
    .sort((a, b) => a.key - b.key || a.i - b.i)
    .map((entry) => entry.uid);

  return { settings: config.settings, uids: [...new Set(uids)] };
}

export function removeLegacyConfig(): Promise<void> {
  return AsyncStorage.removeItem(LEGACY_CONFIG_KEY);
}
