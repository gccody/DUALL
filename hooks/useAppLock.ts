import { hasPin, resetFailures } from '@/utils/pin';
import * as LocalAuthentication from 'expo-local-authentication';
import { useEffect, useEffectEvent, useRef, useState } from 'react';
import { AppState } from 'react-native';

/** How long the app may stay in the background before it has to be unlocked again. */
export const RELOCK_GRACE_PERIOD_MS = 30 * 1000;

/**
 * - `checking`: deciding how to authenticate (or showing the biometric prompt)
 * - `pin`: waiting for the user to enter (or set up) their PIN
 * - `unlocked`: the app content is accessible
 */
export type AppLockStatus = 'checking' | 'pin' | 'unlocked';

/** Whether returning to the foreground at `now` after backgrounding at `backgroundedAt` requires unlocking. */
export function shouldRelock(backgroundedAt: number, now: number): boolean {
  const elapsed = now - backgroundedAt;
  // A negative value means the clock was moved backwards; lock to be safe.
  return elapsed > RELOCK_GRACE_PERIOD_MS || elapsed < 0;
}

interface UseAppLockOptions {
  /** False until settings have loaded; authentication starts once it is true. */
  ready: boolean;
  useBiometrics: boolean;
}

export function useAppLock({ ready, useBiometrics }: UseAppLockOptions) {
  const [status, setStatus] = useState<AppLockStatus>('checking');
  // Once true, the app's navigation tree stays mounted and re-locking only covers it.
  const [hasUnlockedOnce, setHasUnlockedOnce] = useState(false);

  // Mirrors `status` synchronously for the AppState listener.
  const statusRef = useRef<AppLockStatus>('checking');
  const backgroundedAt = useRef<number | null>(null);
  const hasStarted = useRef(false);

  const updateStatus = (next: AppLockStatus) => {
    statusRef.current = next;
    setStatus(next);
  };

  const unlock = () => {
    updateStatus('unlocked');
    setHasUnlockedOnce(true);
  };

  // An effect event: always sees the latest `useBiometrics` without
  // re-running the effects that call it.
  const authenticate = useEffectEvent(async () => {
    updateStatus('checking');
    try {
      // Without a PIN, the PIN view runs its setup flow instead.
      if (useBiometrics && (await hasPin())) {
        const result = await LocalAuthentication.authenticateAsync({
          promptMessage: 'Authenticate with biometrics'
        });
        if (result.success) {
          await resetFailures();
          unlock();
          return;
        }
      }
    } catch (error) {
      console.error('Biometric authentication error:', error);
    }
    updateStatus('pin');
  });

  // Authenticate once on launch. Later settings changes (e.g. toggling
  // biometrics while unlocked) must not lock the app again.
  useEffect(() => {
    if (!ready || hasStarted.current) return;
    hasStarted.current = true;
    authenticate();
  }, [ready]);

  // Re-lock when returning after more than the grace period in the background.
  // `inactive` is ignored on purpose: the biometric prompt, permission dialogs
  // and share sheets all briefly make the app inactive on iOS.
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'background') {
        if (statusRef.current === 'unlocked') {
          backgroundedAt.current = Date.now();
        }
      } else if (nextState === 'active') {
        const since = backgroundedAt.current;
        backgroundedAt.current = null;
        if (since !== null && statusRef.current === 'unlocked' && shouldRelock(since, Date.now())) {
          authenticate();
        }
      }
    });
    return () => subscription.remove();
  }, []);

  /** Unmounts the app content (after its data was erased) until the next unlock. */
  const resetSession = () => setHasUnlockedOnce(false);

  return { status, hasUnlockedOnce, unlock, resetSession };
}
