/// <reference types="node" />
// Prefixed with `mock` so the hoisted jest.mock factories may reference it.
import { createHash as mockCreateHash } from 'crypto';

import {
  attemptPin,
  attemptsBeforeLockout,
  BASE_LOCKOUT_MS,
  clearPin,
  computeLockout,
  getLockout,
  hasPin,
  LEGACY_PIN_KEY,
  lockoutDurationMs,
  MAX_ATTEMPTS_BEFORE_LOCKOUT,
  MAX_LOCKOUT_MS,
  PIN_FAILURES_KEY,
  PIN_HASH_KEY,
  PIN_LOCKED_UNTIL_KEY,
  recordFailure,
  resetFailures,
  setPin,
  verifyPin,
} from '@/utils/pin';

const mockStore = new Map<string, string>();

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(async (key: string) => mockStore.get(key) ?? null),
  setItemAsync: jest.fn(async (key: string, value: string) => {
    mockStore.set(key, value);
  }),
  deleteItemAsync: jest.fn(async (key: string) => {
    mockStore.delete(key);
  }),
}));

let mockSaltSeed = 0;

jest.mock('expo-crypto', () => ({
  CryptoDigestAlgorithm: { SHA256: 'SHA-256' },
  getRandomBytes: jest.fn((count: number) => {
    mockSaltSeed++;
    return Uint8Array.from({ length: count }, (_, i) => (mockSaltSeed * 31 + i) % 256);
  }),
  digestStringAsync: jest.fn(async (_algorithm: string, data: string) =>
    mockCreateHash('sha256').update(data).digest('hex'),
  ),
}));

const sha256 = (data: string) => mockCreateHash('sha256').update(data).digest('hex');

beforeEach(() => {
  mockStore.clear();
});

describe('PIN hashing', () => {
  test('setPin stores a salted hash, never the plaintext PIN', async () => {
    await setPin('1234');

    const record = mockStore.get(PIN_HASH_KEY)!;
    const [salt, hash] = record.split(':');
    expect(salt).toMatch(/^[0-9a-f]{32}$/);
    expect(hash).toBe(sha256(salt + '1234'));
    expect(mockStore.has(LEGACY_PIN_KEY)).toBe(false);
  });

  test('each setPin uses a fresh salt', async () => {
    await setPin('1234');
    const first = mockStore.get(PIN_HASH_KEY);
    await setPin('1234');
    expect(mockStore.get(PIN_HASH_KEY)).not.toBe(first);
  });

  test('verifyPin accepts the right PIN and rejects others', async () => {
    await setPin('4321');
    await expect(verifyPin('4321')).resolves.toBe(true);
    await expect(verifyPin('1234')).resolves.toBe(false);
    await expect(verifyPin('')).resolves.toBe(false);
  });

  test('verifyPin returns false when no PIN is stored', async () => {
    await expect(hasPin()).resolves.toBe(false);
    await expect(verifyPin('0000')).resolves.toBe(false);
  });

  test('verifyPin rejects a malformed record', async () => {
    mockStore.set(PIN_HASH_KEY, 'garbage');
    await expect(verifyPin('garbage')).resolves.toBe(false);
  });

  test('clearPin removes hashed and legacy PINs', async () => {
    await setPin('1234');
    mockStore.set(LEGACY_PIN_KEY, '1234');
    await clearPin();
    await expect(hasPin()).resolves.toBe(false);
  });
});

describe('legacy plaintext PIN migration', () => {
  beforeEach(() => {
    mockStore.set(LEGACY_PIN_KEY, '2580');
  });

  test('hasPin recognises a legacy PIN', async () => {
    await expect(hasPin()).resolves.toBe(true);
  });

  test('a wrong PIN does not migrate the legacy PIN', async () => {
    await expect(verifyPin('0000')).resolves.toBe(false);
    expect(mockStore.get(LEGACY_PIN_KEY)).toBe('2580');
    expect(mockStore.has(PIN_HASH_KEY)).toBe(false);
  });

  test('the correct PIN migrates to a salted hash and deletes the plaintext', async () => {
    await expect(verifyPin('2580')).resolves.toBe(true);

    expect(mockStore.has(LEGACY_PIN_KEY)).toBe(false);
    const [salt, hash] = mockStore.get(PIN_HASH_KEY)!.split(':');
    expect(hash).toBe(sha256(salt + '2580'));

    await expect(verifyPin('2580')).resolves.toBe(true);
    await expect(verifyPin('0000')).resolves.toBe(false);
  });
});

describe('computeLockout', () => {
  const now = 1_700_000_000_000;

  test('no lockout before the threshold', () => {
    for (let failures = 0; failures < MAX_ATTEMPTS_BEFORE_LOCKOUT; failures++) {
      expect(computeLockout(failures, now)).toBeNull();
    }
  });

  test('locks for 30s at the threshold, doubling on each further failure', () => {
    expect(MAX_ATTEMPTS_BEFORE_LOCKOUT).toBe(5);
    expect(BASE_LOCKOUT_MS).toBe(30_000);
    expect(computeLockout(5, now)).toBe(now + 30_000);
    expect(computeLockout(6, now)).toBe(now + 60_000);
    expect(computeLockout(7, now)).toBe(now + 120_000);
    expect(computeLockout(8, now)).toBe(now + 240_000);
    expect(computeLockout(9, now)).toBe(now + 480_000);
  });

  test('caps the lockout at 15 minutes', () => {
    expect(MAX_LOCKOUT_MS).toBe(15 * 60_000);
    expect(lockoutDurationMs(10)).toBe(MAX_LOCKOUT_MS);
    expect(lockoutDurationMs(1000)).toBe(MAX_LOCKOUT_MS);
    expect(computeLockout(1000, now)).toBe(now + MAX_LOCKOUT_MS);
  });

  test('attemptsBeforeLockout counts down to zero', () => {
    expect(attemptsBeforeLockout(0)).toBe(5);
    expect(attemptsBeforeLockout(4)).toBe(1);
    expect(attemptsBeforeLockout(5)).toBe(0);
    expect(attemptsBeforeLockout(9)).toBe(0);
  });
});

describe('persisted lockout', () => {
  const start = 1_700_000_000_000;

  beforeEach(async () => {
    await setPin('1234');
  });

  async function failTimes(count: number, now: number) {
    for (let i = 0; i < count; i++) {
      await attemptPin('0000', now);
    }
  }

  test('wrong PINs below the threshold do not lock', async () => {
    await failTimes(4, start);
    await expect(getLockout(start)).resolves.toEqual({ failures: 4, lockedUntil: null });
  });

  test('the 5th wrong PIN locks for 30s and the state survives a restart', async () => {
    await failTimes(5, start);

    // Lockout is read back from storage, as it would be after killing the app.
    expect(mockStore.get(PIN_FAILURES_KEY)).toBe('5');
    expect(mockStore.get(PIN_LOCKED_UNTIL_KEY)).toBe(String(start + 30_000));
    await expect(getLockout(start + 1_000)).resolves.toEqual({ failures: 5, lockedUntil: start + 30_000 });
  });

  test('the correct PIN is rejected while locked, without counting a failure', async () => {
    await failTimes(5, start);

    const result = await attemptPin('1234', start + 10_000);
    expect(result).toEqual({ ok: false, lockout: { failures: 5, lockedUntil: start + 30_000 } });
    expect(mockStore.get(PIN_FAILURES_KEY)).toBe('5');
  });

  test('each failure after the lockout expires doubles the next lockout', async () => {
    await failTimes(5, start);
    const afterFirst = start + 30_000;

    const second = await attemptPin('0000', afterFirst);
    expect(second).toEqual({ ok: false, lockout: { failures: 6, lockedUntil: afterFirst + 60_000 } });

    const afterSecond = afterFirst + 60_000;
    const third = await attemptPin('0000', afterSecond);
    expect(third).toEqual({ ok: false, lockout: { failures: 7, lockedUntil: afterSecond + 120_000 } });
  });

  test('the correct PIN after the lockout expires unlocks and resets the counter', async () => {
    await failTimes(5, start);

    await expect(attemptPin('1234', start + 30_000)).resolves.toEqual({ ok: true });
    expect(mockStore.has(PIN_FAILURES_KEY)).toBe(false);
    expect(mockStore.has(PIN_LOCKED_UNTIL_KEY)).toBe(false);
    await expect(getLockout(start + 30_000)).resolves.toEqual({ failures: 0, lockedUntil: null });
  });

  test('a deadline pushed far into the future by a clock change is clamped', async () => {
    await failTimes(5, start);
    // The clock is moved back by a day.
    const earlier = start - 24 * 60 * 60 * 1000;

    await expect(getLockout(earlier)).resolves.toEqual({ failures: 5, lockedUntil: earlier + 30_000 });
    expect(mockStore.get(PIN_LOCKED_UNTIL_KEY)).toBe(String(earlier + 30_000));
  });

  test('recordFailure and resetFailures manage the counter directly', async () => {
    await expect(recordFailure(start)).resolves.toEqual({ failures: 1, lockedUntil: null });
    await resetFailures();
    await expect(getLockout(start)).resolves.toEqual({ failures: 0, lockedUntil: null });
  });

  test('setting a new PIN clears the lockout', async () => {
    await failTimes(5, start);
    await setPin('5678');
    await expect(getLockout(start)).resolves.toEqual({ failures: 0, lockedUntil: null });
  });
});
