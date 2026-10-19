import { RELOCK_GRACE_PERIOD_MS, shouldRelock } from '@/hooks/useAppLock';

jest.mock('expo-local-authentication', () => ({ authenticateAsync: jest.fn() }));
jest.mock('expo-secure-store', () => ({}));
jest.mock('expo-crypto', () => ({}));

describe('shouldRelock', () => {
  const backgroundedAt = 1_700_000_000_000;

  test('the grace period is 30 seconds', () => {
    expect(RELOCK_GRACE_PERIOD_MS).toBe(30_000);
  });

  test('stays unlocked within the grace period', () => {
    expect(shouldRelock(backgroundedAt, backgroundedAt)).toBe(false);
    expect(shouldRelock(backgroundedAt, backgroundedAt + RELOCK_GRACE_PERIOD_MS)).toBe(false);
  });

  test('re-locks after the grace period', () => {
    expect(shouldRelock(backgroundedAt, backgroundedAt + RELOCK_GRACE_PERIOD_MS + 1)).toBe(true);
    expect(shouldRelock(backgroundedAt, backgroundedAt + 24 * 60 * 60 * 1000)).toBe(true);
  });

  test('re-locks if the clock moved backwards', () => {
    expect(shouldRelock(backgroundedAt, backgroundedAt - 1)).toBe(true);
  });
});
