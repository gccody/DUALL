import CryptoES from 'crypto-es';
import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';

/**
 * Holds the PIN record, in one entry so its parts can never get out of sync
 * on a partial write:
 * - current: `pbkdf2-sha256$<iterations>$<pinLength>$<saltHex>$<hashHex>`
 * - older versions: `<saltHex>:<sha256(salt + pin)>` (always a 4-digit PIN)
 *
 * The PIN length isn't secret (the lock screen shows one dot per digit); it
 * is stored so the lock screen knows when the PIN is complete.
 */
export const PIN_HASH_KEY = 'user_pin_hash';
/** Pre-hashing versions stored the PIN in plaintext under this key. */
export const LEGACY_PIN_KEY = 'user_pin';
export const PIN_FAILURES_KEY = 'user_pin_failures';
export const PIN_LOCKED_UNTIL_KEY = 'user_pin_locked_until';

/** PIN lengths the user can choose from when setting a PIN. */
export const PIN_LENGTHS = [4, 6] as const;
export const DEFAULT_PIN_LENGTH = 6;
/** Length of PINs stored before the length was recorded. */
export const LEGACY_PIN_LENGTH = 4;

/**
 * PBKDF2 runs in JS on the JS thread, and Hermes has no JIT. On a desktop,
 * crypto-es needs ~3.6ms per 1,000 iterations in node with its JIT but ~90ms
 * with `--jitless` (an interpreter, like Hermes), so a mid-range phone should
 * take very roughly 0.5–1s for 5,000. With only 10^4–10^6 possible PINs no
 * iteration count stops an offline brute force; the hash is a speed bump
 * behind the Keychain/Keystore, so stay at a delay users tolerate on every
 * unlock. Raising this rehashes older records on their next successful unlock.
 */
export const PBKDF2_ITERATIONS = 5_000;
const PBKDF2_PREFIX = 'pbkdf2-sha256';
/** Derived key size, in 32-bit words (256 bits). */
const PBKDF2_KEY_WORDS = 8;

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

/** Hash used by `<salt>:<hash>` records, kept to verify (and then upgrade) them. */
export function hashPinSha256(pin: string, salt: string): Promise<string> {
  return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, salt + pin);
}

/** PBKDF2-HMAC-SHA256 of the PIN, as hex. Blocks the JS thread while it runs. */
export function hashPin(pin: string, saltHex: string, iterations: number = PBKDF2_ITERATIONS): string {
  return CryptoES.PBKDF2(pin, CryptoES.enc.Hex.parse(saltHex), {
    keySize: PBKDF2_KEY_WORDS,
    iterations,
    hasher: CryptoES.algo.SHA256,
  }).toString(CryptoES.enc.Hex);
}

export function isValidPin(pin: string): boolean {
  return /^\d+$/.test(pin) && (PIN_LENGTHS as readonly number[]).includes(pin.length);
}

type PinRecord =
  | { kind: 'pbkdf2'; iterations: number; pinLength: number; salt: string; hash: string }
  | { kind: 'sha256'; salt: string; hash: string };

const HEX = /^[0-9a-f]+$/;

function parsePinRecord(record: string): PinRecord | null {
  const parts = record.split('$');
  if (parts[0] === PBKDF2_PREFIX) {
    if (parts.length !== 5) return null;
    const [, iterations, pinLength, salt, hash] = parts;
    const parsedIterations = parseStoredInt(iterations);
    const parsedLength = parseStoredInt(pinLength);
    if (!parsedIterations || !parsedLength || !HEX.test(salt) || !HEX.test(hash)) return null;
    return { kind: 'pbkdf2', iterations: parsedIterations, pinLength: parsedLength, salt, hash };
  }

  const [salt, hash] = record.split(':');
  if (!salt || !hash) return null;
  return { kind: 'sha256', salt, hash };
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

/** The stored PIN's length, or null if no PIN is set. */
export async function getPinLength(): Promise<number | null> {
  const record = await SecureStore.getItemAsync(PIN_HASH_KEY);
  if (record) {
    const parsed = parsePinRecord(record);
    return parsed?.kind === 'pbkdf2' ? parsed.pinLength : LEGACY_PIN_LENGTH;
  }
  return (await SecureStore.getItemAsync(LEGACY_PIN_KEY)) ? LEGACY_PIN_LENGTH : null;
}

/**
 * Stores a new PIN as a salted PBKDF2 hash, replacing any existing (including
 * legacy) PIN in a single write, so the old PIN stays valid until the new one
 * is saved.
 */
export async function setPin(pin: string): Promise<void> {
  if (!isValidPin(pin)) throw new Error(`A PIN must be ${PIN_LENGTHS.join(' or ')} digits`);
  const salt = generateSalt();
  const hash = hashPin(pin, salt);
  await SecureStore.setItemAsync(PIN_HASH_KEY, [PBKDF2_PREFIX, PBKDF2_ITERATIONS, pin.length, salt, hash].join('$'));
  await SecureStore.deleteItemAsync(LEGACY_PIN_KEY);
  await resetFailures();
}

/** Re-stores a correct PIN in the current format; failures are retried next time. */
async function upgradePin(pin: string, from: string): Promise<void> {
  try {
    await setPin(pin);
  } catch (error) {
    console.error(`Failed to migrate ${from} PIN:`, error);
  }
}

/**
 * Checks a PIN against the stored one. Returns false if no PIN is stored.
 * A legacy plaintext PIN, a `<salt>:<sha256>` record, or a PBKDF2 record with
 * fewer than `PBKDF2_ITERATIONS` iterations is transparently upgraded to the
 * current format on the first successful verification.
 */
export async function verifyPin(pin: string): Promise<boolean> {
  const record = await SecureStore.getItemAsync(PIN_HASH_KEY);
  if (record) {
    const parsed = parsePinRecord(record);
    if (!parsed) return false;

    if (parsed.kind === 'sha256') {
      if (!constantTimeEqual(await hashPinSha256(pin, parsed.salt), parsed.hash)) return false;
      await upgradePin(pin, 'SHA-256');
      return true;
    }

    if (!constantTimeEqual(hashPin(pin, parsed.salt, parsed.iterations), parsed.hash)) return false;
    if (parsed.iterations < PBKDF2_ITERATIONS) await upgradePin(pin, 'PBKDF2');
    return true;
  }

  const legacyPin = await SecureStore.getItemAsync(LEGACY_PIN_KEY);
  if (!legacyPin || !constantTimeEqual(pin, legacyPin)) return false;

  await upgradePin(pin, 'legacy');
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
