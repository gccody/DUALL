import { useVault } from '@/context/VaultContext';
import { reportSaveError } from '@/utils/reportSaveError';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useEffectEvent, useRef } from 'react';
import { Alert } from 'react-native';

/**
 * Adds the account passed to this route as `otpurl` (by the Add tab after a
 * scan) and reports its uid, also for an account that already existed. Each
 * scan is consumed exactly once, so a re-render never re-adds it; addFromUri
 * waits for stored accounts to load, so it is never saved over them.
 */
export function useScannedCode(onAdded: (uid: string) => void) {
  const { addFromUri } = useVault();
  const { otpurl, scanId } = useLocalSearchParams<{ otpurl?: string; scanId?: string }>();
  const router = useRouter();
  const handledScanRef = useRef<string | null>(null);

  const addCode = useEffectEvent(async (url: string) => {
    try {
      const outcome = await addFromUri(url);
      if (outcome.result === 'invalid') {
        Alert.alert('Error', 'Unable to add code!');
      } else if (outcome.result === 'unsupported') {
        Alert.alert('Error', 'HOTP is not supported yet');
      } else {
        onAdded(outcome.uid);
      }
    } catch (error) {
      reportSaveError(error);
    }
  });

  useEffect(() => {
    if (!otpurl) {
      handledScanRef.current = null;
      return;
    }
    const scanKey = scanId ?? otpurl;
    if (handledScanRef.current === scanKey) return;
    handledScanRef.current = scanKey;
    router.setParams({ otpurl: undefined, scanId: undefined });
    addCode(otpurl);
  }, [otpurl, scanId, router]);
}
