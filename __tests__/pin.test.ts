/// <reference types="jest" />
/// <reference types="node" />
// Prefixed with `mock` so the hoisted jest.mock factories may reference it.
import { createHash as mockCreateHash } from 'crypto';

import {
  clearPin,
  hasPin,
  LEGACY_PIN_KEY,
  PIN_HASH_KEY,
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
