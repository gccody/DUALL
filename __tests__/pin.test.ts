/// <reference types="node" />
// Prefixed with `mock` so the hoisted jest.mock factories may reference them.
import { createHash as mockCreateHash, pbkdf2Sync as mockPbkdf2Sync } from 'crypto';
import * as SecureStore from 'expo-secure-store';

import {
  attemptPin,
  attemptsBeforeLockout,
  BASE_LOCKOUT_MS,
  clearPin,
  computeLockout,
  getLockout,
  getPinLength,
  hasPin,
  isValidPin,
  LEGACY_PIN_KEY,
  lockoutDurationMs,
  MAX_ATTEMPTS_BEFORE_LOCKOUT,
  MAX_LOCKOUT_MS,
  PBKDF2_ITERATIONS,
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

// crypto-es's PBKDF2 is far too slow under jest's Babel transform to run for
// every PIN here, so it is swapped for node's. pinHash.test.ts checks the real
// one gives the same result.
jest.mock('crypto-es', () => {
  const actual: typeof import('crypto-es').default = jest.requireActual('crypto-es').default;
  return {
    __esModule: true,
    default: {
      ...actual,
      PBKDF2: (
        password: string,
        salt: Parameters<typeof actual.enc.Hex.stringify>[0],
        cfg: { keySize: number; iterations: number; hasher: unknown },
      ) => {
        if (cfg.hasher !== actual.algo.SHA256) throw new Error('Expected PBKDF2 with SHA-256');
        const key = mockPbkdf2Sync(password, Buffer.from(actual.enc.Hex.stringify(salt), 'hex'), cfg.iterations, cfg.keySize * 4, 'sha256');
        return actual.enc.Hex.parse(key.toString('hex'));
      },
    },
  };
});

const sha256 = (data: string) => mockCreateHash('sha256').update(data).digest('hex');
const pbkdf2 = (pin: string, salt: string, iterations: number) =>
  mockPbkdf2Sync(pin, Buffer.from(salt, 'hex'), iterations, 32, 'sha256').toString('hex');

const RECORD = /^pbkdf2-sha256\$(\d+)\$(\d+)\$([0-9a-f]{32})\$([0-9a-f]{64})$/;

/** Splits the stored record, failing the test if it isn't in the current format. */
function storedRecord() {
  const match = RECORD.exec(mockStore.get(PIN_HASH_KEY) ?? '');
  if (!match) throw new Error(`Unexpected PIN record: ${mockStore.get(PIN_HASH_KEY)}`);
  const [, iterations, pinLength, salt, hash] = match;
  return { iterations: Number(iterations), pinLength: Number(pinLength), salt, hash };
}

beforeEach(() => {
  mockStore.clear();
  jest.clearAllMocks();
});

describe('PIN hashing', () => {
  test('setPin stores a PBKDF2-SHA256 record, never the plaintext PIN', async () => {
    await setPin('123456');

    const { iterations, pinLength, salt, hash } = storedRecord();
    expect(iterations).toBe(PBKDF2_ITERATIONS);
    expect(pinLength).toBe(6);
    expect(hash).toBe(pbkdf2('123456', salt, PBKDF2_ITERATIONS));
    expect([...mockStore.values()]).not.toContain('123456');
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
    await expect(verifyPin('432100')).resolves.toBe(false);
    await expect(verifyPin('')).resolves.toBe(false);
  });

  test('a verified current record is not rewritten', async () => {
    await setPin('4321');
    const record = mockStore.get(PIN_HASH_KEY);
    jest.mocked(SecureStore.setItemAsync).mockClear();

    await expect(verifyPin('4321')).resolves.toBe(true);
    expect(mockStore.get(PIN_HASH_KEY)).toBe(record);
    expect(SecureStore.setItemAsync).not.toHaveBeenCalledWith(PIN_HASH_KEY, expect.anything());
  });

  test('verifyPin returns false when no PIN is stored', async () => {
    await expect(hasPin()).resolves.toBe(false);
    await expect(verifyPin('0000')).resolves.toBe(false);
  });

  test.each([
    'garbage',
    'pbkdf2-sha256$abc$4$00$00',
    'pbkdf2-sha256$0$4$00$00',
    'pbkdf2-sha256$10000$4$00',
    'pbkdf2-sha256$10000$4$zz$00',
  ])('verifyPin rejects the malformed record %s', async (record) => {
    mockStore.set(PIN_HASH_KEY, record);
    await expect(verifyPin('garbage')).resolves.toBe(false);
    await expect(verifyPin('0000')).resolves.toBe(false);
  });

  test('setPin rejects anything but 4 or 6 digits, keeping the old PIN', async () => {
    await setPin('1234');
    const record = mockStore.get(PIN_HASH_KEY);

    for (const pin of ['', '123', '12345', '1234567', 'abcd', '12a4']) {
      await expect(setPin(pin)).rejects.toThrow();
    }
    expect(mockStore.get(PIN_HASH_KEY)).toBe(record);
    expect(isValidPin('1234')).toBe(true);
    expect(isValidPin('123456')).toBe(true);
  });

  test('clearPin removes hashed and legacy PINs', async () => {
    await setPin('1234');
    mockStore.set(LEGACY_PIN_KEY, '1234');
    await clearPin();
    await expect(hasPin()).resolves.toBe(false);
  });
});

describe('replacing a PIN', () => {
  test('setPin overwrites the record in one write and never deletes it first', async () => {
    await setPin('1234');
    jest.clearAllMocks();

    await setPin('567890');

    expect(SecureStore.deleteItemAsync).not.toHaveBeenCalledWith(PIN_HASH_KEY);
    expect(jest.mocked(SecureStore.setItemAsync).mock.calls.filter(([key]) => key === PIN_HASH_KEY)).toHaveLength(1);
    await expect(verifyPin('567890')).resolves.toBe(true);
    await expect(verifyPin('1234')).resolves.toBe(false);
  });

  test('if saving the new PIN fails, the old PIN still works', async () => {
    await setPin('1234');
    jest.mocked(SecureStore.setItemAsync).mockRejectedValueOnce(new Error('disk full'));

    await expect(setPin('567890')).rejects.toThrow('disk full');
    await expect(hasPin()).resolves.toBe(true);
    await expect(getPinLength()).resolves.toBe(4);
    await expect(verifyPin('1234')).resolves.toBe(true);
  });
});

describe('PIN length', () => {
  test('is null without a PIN', async () => {
    await expect(getPinLength()).resolves.toBeNull();
  });

  test('is stored with the PIN', async () => {
    await setPin('123456');
    await expect(getPinLength()).resolves.toBe(6);
    await setPin('1234');
    await expect(getPinLength()).resolves.toBe(4);
  });

  test('defaults to 4 for PINs stored before the length was recorded', async () => {
    mockStore.set(PIN_HASH_KEY, `abcd:${sha256('abcd1234')}`);
    await expect(getPinLength()).resolves.toBe(4);

    mockStore.clear();
    mockStore.set(LEGACY_PIN_KEY, '2580');
    await expect(getPinLength()).resolves.toBe(4);
  });
});

describe('salted SHA-256 PIN upgrade', () => {
  const salt = '0123456789abcdef0123456789abcdef';
  const oldRecord = `${salt}:${sha256(salt + '2580')}`;

  beforeEach(() => {
    mockStore.set(PIN_HASH_KEY, oldRecord);
  });

  test('a wrong PIN does not touch the old record', async () => {
    await expect(verifyPin('0000')).resolves.toBe(false);
    expect(mockStore.get(PIN_HASH_KEY)).toBe(oldRecord);
  });

  test('the correct PIN verifies and upgrades the record to PBKDF2', async () => {
    await expect(verifyPin('2580')).resolves.toBe(true);

    const { iterations, pinLength, salt: newSalt, hash } = storedRecord();
    expect(iterations).toBe(PBKDF2_ITERATIONS);
    expect(pinLength).toBe(4);
    expect(newSalt).not.toBe(salt);
    expect(hash).toBe(pbkdf2('2580', newSalt, PBKDF2_ITERATIONS));

    await expect(verifyPin('2580')).resolves.toBe(true);
    await expect(verifyPin('0000')).resolves.toBe(false);
  });

  test('a failed upgrade still unlocks and keeps the old record', async () => {
    jest.mocked(SecureStore.setItemAsync).mockRejectedValueOnce(new Error('disk full'));
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});

    await expect(verifyPin('2580')).resolves.toBe(true);
    expect(consoleError).toHaveBeenCalled();
    consoleError.mockRestore();
    expect(mockStore.get(PIN_HASH_KEY)).toBe(oldRecord);

    // Retried on the next unlock.
    await expect(verifyPin('2580')).resolves.toBe(true);
    storedRecord();
  });
});

describe('weaker PBKDF2 record upgrade', () => {
  test('a record with fewer iterations is rehashed on the next successful unlock', async () => {
    const salt = '0123456789abcdef0123456789abcdef';
    const weak = `pbkdf2-sha256$1000$6$${salt}$${pbkdf2('135790', salt, 1000)}`;
    mockStore.set(PIN_HASH_KEY, weak);

    await expect(verifyPin('000000')).resolves.toBe(false);
    expect(mockStore.get(PIN_HASH_KEY)).toBe(weak);

    await expect(verifyPin('135790')).resolves.toBe(true);
    expect(storedRecord()).toMatchObject({ iterations: PBKDF2_ITERATIONS, pinLength: 6 });
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

  test('the correct PIN migrates to a PBKDF2 record and deletes the plaintext', async () => {
    await expect(verifyPin('2580')).resolves.toBe(true);

    expect(mockStore.has(LEGACY_PIN_KEY)).toBe(false);
    const { pinLength, salt, hash } = storedRecord();
    expect(pinLength).toBe(4);
    expect(hash).toBe(pbkdf2('2580', salt, PBKDF2_ITERATIONS));

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
