import { RELOCK_GRACE_PERIOD_MS, shouldCoverContent, shouldRelock } from '@/hooks/useAppLock';

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

describe('shouldCoverContent', () => {
  test('covers the unlocked app while it is inactive or in the background', () => {
    expect(shouldCoverContent('inactive', 'unlocked')).toBe(true);
    expect(shouldCoverContent('background', 'unlocked')).toBe(true);
  });

  test('uncovers the app when it becomes active again', () => {
    expect(shouldCoverContent('active', 'unlocked')).toBe(false);
  });

  test('does not cover the lock screen', () => {
    // E.g. the biometric prompt makes the app inactive while it is still checking.
    expect(shouldCoverContent('inactive', 'checking')).toBe(false);
    expect(shouldCoverContent('background', 'checking')).toBe(false);
    expect(shouldCoverContent('inactive', 'pin')).toBe(false);
    expect(shouldCoverContent('background', 'pin')).toBe(false);
  });
});
