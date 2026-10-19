import { useVault } from '@/context/VaultContext';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useEffectEvent, useRef } from 'react';

/**
 * The account an `/account/[uid]/...` route is about, plus `close()` to leave
 * the screen. Once the vault has loaded, a missing account (e.g. one that was
 * just deleted) closes the screen automatically.
 */
export function useAccountRoute() {
  const { uid } = useLocalSearchParams<{ uid: string }>();
  const { services, status } = useVault();
  const router = useRouter();
  const service = services.find((item) => item.uid === uid);
  const closing = useRef(false);

  // Idempotent, so a screen that closes itself and then makes its account
  // disappear (delete) only navigates back once.
  const close = () => {
    if (closing.current) return;
    closing.current = true;
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/');
    }
  };

  const closeWhenMissing = useEffectEvent(close);
  const isMissing = status === 'ready' && !service;
  useEffect(() => {
    if (isMissing) closeWhenMissing();
  }, [isMissing]);

  return { service, close };
}
