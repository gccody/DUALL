/// <reference types="node" />
import { pbkdf2Sync } from 'crypto';

import { hashPin } from '@/utils/pin';

jest.mock('expo-secure-store', () => ({}));
jest.mock('expo-crypto', () => ({}));

// Uses the real crypto-es (pin.test.ts swaps in node's PBKDF2 for speed).
describe('hashPin', () => {
  const salt = '00112233445566778899aabbccddeeff';

  test.each([1, 2, 1000])('matches PBKDF2-HMAC-SHA256 with %i iterations', (iterations) => {
    const expected = pbkdf2Sync('123456', Buffer.from(salt, 'hex'), iterations, 32, 'sha256').toString('hex');
    expect(hashPin('123456', salt, iterations)).toBe(expected);
  });

  test('depends on the PIN and the salt', () => {
    const hash = hashPin('1234', salt, 10);
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
    expect(hashPin('1235', salt, 10)).not.toBe(hash);
    expect(hashPin('1234', 'ff112233445566778899aabbccddeeff', 10)).not.toBe(hash);
  });
});
