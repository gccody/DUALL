import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';

/**
 * Holds `<salt>:<sha256(salt + pin)>` (both hex). Salt and hash live in a
 * single entry so they can never get out of sync on a partial write.
 */
export const PIN_HASH_KEY = 'user_pin_hash';
/** Pre-hashing versions stored the PIN in plaintext under this key. */
export const LEGACY_PIN_KEY = 'user_pin';
export const PIN_FAILURES_KEY = 'user_pin_failures';
export const PIN_LOCKED_UNTIL_KEY = 'user_pin_locked_until';

/** Wrong PINs allowed before the first lockout. */
export const MAX_ATTEMPTS_BEFORE_LOCKOUT = 5;
/** Length of the first lockout; each further failure doubles it. */
export const BASE_LOCKOUT_MS = 30 * 1000;
export const MAX_LOCKOUT_MS = 15 * 60 * 1000;

export interface LockoutState {
  /** Consecutive wrong PINs since the last successful unlock. */
  failures: number;
  /** Epoch ms until which PIN entry is blocked, or null if not locked right now. */
  lockedUntil: number | null;
}

export type PinAttemptResult = { ok: true } | { ok: false; lockout: LockoutState };

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
  await resetFailures();
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

/** Removes the stored PIN (hashed and legacy) and any lockout state. */
export async function clearPin(): Promise<void> {
  await Promise.all([
    SecureStore.deleteItemAsync(PIN_HASH_KEY),
    SecureStore.deleteItemAsync(LEGACY_PIN_KEY),
    resetFailures(),
  ]);
}

/** How long PIN entry is blocked after the given number of consecutive failures. */
export function lockoutDurationMs(failures: number): number {
  if (failures < MAX_ATTEMPTS_BEFORE_LOCKOUT) return 0;
  const doublings = failures - MAX_ATTEMPTS_BEFORE_LOCKOUT;
  return Math.min(BASE_LOCKOUT_MS * 2 ** doublings, MAX_LOCKOUT_MS);
}

/** Returns when a lockout triggered by `failures` consecutive failures at `now` ends, or null if none. */
export function computeLockout(failures: number, now: number): number | null {
  const duration = lockoutDurationMs(failures);
  return duration > 0 ? now + duration : null;
}

/** Attempts left before a lockout starts (the last of them triggers it if wrong). */
export function attemptsBeforeLockout(failures: number): number {
  return Math.max(0, MAX_ATTEMPTS_BEFORE_LOCKOUT - failures);
}

function parseStoredInt(value: string | null): number | null {
  const parsed = value === null ? NaN : parseInt(value, 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

/** Reads the persisted lockout state. */
export async function getLockout(now: number = Date.now()): Promise<LockoutState> {
  const [storedFailures, storedLockedUntil] = await Promise.all([
    SecureStore.getItemAsync(PIN_FAILURES_KEY),
    SecureStore.getItemAsync(PIN_LOCKED_UNTIL_KEY),
  ]);
  const failures = parseStoredInt(storedFailures) ?? 0;
  let lockedUntil = parseStoredInt(storedLockedUntil);

  if (lockedUntil !== null) {
    // If the clock was moved backwards the stored deadline could be far in the
    // future; never make the user wait longer than this lockout's duration.
    const latest = now + lockoutDurationMs(failures);
    if (lockedUntil > latest) {
      lockedUntil = latest;
      await SecureStore.setItemAsync(PIN_LOCKED_UNTIL_KEY, String(lockedUntil));
    }
  }

  return { failures, lockedUntil: lockedUntil !== null && lockedUntil > now ? lockedUntil : null };
}

/** Records a wrong PIN and starts a lockout once the threshold is reached. */
export async function recordFailure(now: number = Date.now()): Promise<LockoutState> {
  const { failures: previous } = await getLockout(now);
  const failures = previous + 1;
  const lockedUntil = computeLockout(failures, now);

  await SecureStore.setItemAsync(PIN_FAILURES_KEY, String(failures));
  if (lockedUntil !== null) {
    await SecureStore.setItemAsync(PIN_LOCKED_UNTIL_KEY, String(lockedUntil));
  } else {
    await SecureStore.deleteItemAsync(PIN_LOCKED_UNTIL_KEY);
  }
  return { failures, lockedUntil };
}

/** Clears the failure counter and any lockout (after a successful unlock). */
export async function resetFailures(): Promise<void> {
  await Promise.all([
    SecureStore.deleteItemAsync(PIN_FAILURES_KEY),
    SecureStore.deleteItemAsync(PIN_LOCKED_UNTIL_KEY),
  ]);
}

/**
 * Verifies a PIN while enforcing the lockout: no verification happens while
 * locked, failures are persisted, and success resets the counter.
 */
export async function attemptPin(pin: string, now: number = Date.now()): Promise<PinAttemptResult> {
  const lockout = await getLockout(now);
  if (lockout.lockedUntil !== null) {
    return { ok: false, lockout };
  }

  if (await verifyPin(pin)) {
    await resetFailures();
    return { ok: true };
  }
  return { ok: false, lockout: await recordFailure(now) };
}
