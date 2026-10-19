import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';

/**
 * Holds `<salt>:<sha256(salt + pin)>` (both hex). Salt and hash live in a
 * single entry so they can never get out of sync on a partial write.
 */
export const PIN_HASH_KEY = 'user_pin_hash';
/** Pre-hashing versions stored the PIN in plaintext under this key. */
export const LEGACY_PIN_KEY = 'user_pin';

const SALT_BYTES = 16;

function generateSalt(): string {
  return Array.from(Crypto.getRandomBytes(SALT_BYTES), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

export function hashPin(pin: string, salt: string): Promise<string> {
  return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, salt + pin);
}

/** Compares two strings without short-circuiting on the first differing character. */
function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

/** Returns true if the user has configured a PIN (hashed or legacy plaintext). */
export async function hasPin(): Promise<boolean> {
  if (await SecureStore.getItemAsync(PIN_HASH_KEY)) return true;
  return !!(await SecureStore.getItemAsync(LEGACY_PIN_KEY));
}

/** Stores a new PIN as a salted hash, replacing any existing (including legacy) PIN. */
export async function setPin(pin: string): Promise<void> {
  const salt = generateSalt();
  const hash = await hashPin(pin, salt);
  await SecureStore.setItemAsync(PIN_HASH_KEY, `${salt}:${hash}`);
  await SecureStore.deleteItemAsync(LEGACY_PIN_KEY);
}

/**
 * Checks a PIN against the stored one. Returns false if no PIN is stored.
 * A legacy plaintext PIN is transparently migrated to a salted hash on the
 * first successful verification.
 */
export async function verifyPin(pin: string): Promise<boolean> {
  const record = await SecureStore.getItemAsync(PIN_HASH_KEY);
  if (record) {
    const [salt, hash] = record.split(':');
    if (!salt || !hash) return false;
    return constantTimeEqual(await hashPin(pin, salt), hash);
  }

  const legacyPin = await SecureStore.getItemAsync(LEGACY_PIN_KEY);
  if (!legacyPin || !constantTimeEqual(pin, legacyPin)) return false;

  try {
    await setPin(pin);
  } catch (error) {
    // The PIN was correct; migration will simply be retried next time.
    console.error('Failed to migrate legacy PIN:', error);
  }
  return true;
}

/** Removes the stored PIN (hashed and legacy). */
export async function clearPin(): Promise<void> {
  await Promise.all([
    SecureStore.deleteItemAsync(PIN_HASH_KEY),
    SecureStore.deleteItemAsync(LEGACY_PIN_KEY),
  ]);
}
