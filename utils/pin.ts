import * as SecureStore from 'expo-secure-store';

export const LEGACY_PIN_KEY = 'user_pin';

/** Returns true if the user has configured a PIN. */
export async function hasPin(): Promise<boolean> {
  return !!(await SecureStore.getItemAsync(LEGACY_PIN_KEY));
}

/** Stores a new PIN, replacing any existing one. */
export async function setPin(pin: string): Promise<void> {
  await SecureStore.setItemAsync(LEGACY_PIN_KEY, pin);
}

/** Checks a PIN against the stored one. Returns false if no PIN is stored. */
export async function verifyPin(pin: string): Promise<boolean> {
  const storedPin = await SecureStore.getItemAsync(LEGACY_PIN_KEY);
  return !!storedPin && storedPin === pin;
}

/** Removes the stored PIN. */
export async function clearPin(): Promise<void> {
  await SecureStore.deleteItemAsync(LEGACY_PIN_KEY);
}
