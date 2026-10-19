import type { Settings } from "@/types";
import AsyncStorage from "@react-native-async-storage/async-storage";

export const SETTINGS_KEY = "settings.v1";

export const DEFAULT_SETTINGS: Readonly<Settings> = Object.freeze({
  darkMode: true,
  searchOnStartup: false,
  hideTokens: false,
  showNextToken: false,
  notifyWhenTokenCopied: true,
  useBiometrics: true,
});

/**
 * Overlays the known settings found in `stored` onto the defaults, so keys
 * added in later versions get their default and unknown/mistyped values are
 * ignored.
 */
export function withDefaults(stored: unknown): Settings {
  const settings: Settings = { ...DEFAULT_SETTINGS };
  if (!stored || typeof stored !== "object") return settings;
  const values = stored as Record<string, unknown>;
  for (const key of Object.keys(DEFAULT_SETTINGS) as (keyof Settings)[]) {
    if (typeof values[key] === typeof DEFAULT_SETTINGS[key]) {
      settings[key] = values[key] as Settings[typeof key];
    }
  }
  return settings;
}

/** Stored settings merged over the defaults. Unreadable data yields the defaults. */
export async function loadSettings(): Promise<Settings> {
  const raw = await AsyncStorage.getItem(SETTINGS_KEY);
  if (raw === null) return { ...DEFAULT_SETTINGS };
  try {
    return withDefaults(JSON.parse(raw));
  } catch {
    console.error("Ignoring unreadable settings");
    return { ...DEFAULT_SETTINGS };
  }
}

export async function saveSettings(settings: Settings): Promise<void> {
  await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

/** True when settings have been stored under the current key. */
export async function hasStoredSettings(): Promise<boolean> {
  return (await AsyncStorage.getItem(SETTINGS_KEY)) !== null;
}
