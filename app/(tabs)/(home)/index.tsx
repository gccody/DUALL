import { useSettings } from "@/context/SettingsContext";
import { useTheme } from "@/context/ThemeContext";
import { useVault } from "@/context/VaultContext";
import { FlashList, FlashListRef } from '@shopify/flash-list';
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useEffectEvent, useRef, useState } from "react";
import { Alert } from "react-native";

import AccountCard from "@/components/accounts/AccountCard";
import ErrorView from "@/components/ErrorView";
import LoadingView from "@/components/LoadingView";

import { useSearch } from "@/hooks/useSearch";
import { useTimestamp } from "@/hooks/useTimestamp";

import { Service } from '@/types';
import { warmIconCache } from '@/utils/customIconMatcher';
import { reportSaveError } from '@/utils/reportSaveError';

export default function HomeScreen() {
  const { theme } = useTheme();
  const { settings } = useSettings();
  const { services: allServices, status, error, addFromUri } = useVault();

  // Pre-warm icon domain cache when services load so first-scroll lookups are O(1)
  useEffect(() => {
    if (allServices.length > 0) {
      warmIconCache(allServices);
    }
  }, [allServices]);

  // Search functionality
  const { services, handleSearch } = useSearch(allServices);

  // Real-time clock update
  const timestamp = useTimestamp();

  // A just scanned account, highlighted until the list is touched
  const [highlightedUid, setHighlightedUid] = useState<string | null>(null);

  const addCode = useCallback(async (url: string) => {
    try {
      const outcome = await addFromUri(url);
      if (outcome.result === 'invalid') {
        Alert.alert("Error", "Unable to add code!");
      } else if (outcome.result === 'unsupported') {
        Alert.alert("Error", "HOTP is not supported yet");
      } else {
        // New code, or the existing one for a duplicate
        setHighlightedUid(outcome.uid);
      }
    } catch (err) {
      reportSaveError(err);
    }
  }, [addFromUri]);

  const { otpurl, scanId } = useLocalSearchParams<{ otpurl?: string; scanId?: string }>();
  const router = useRouter();
  const handledScanRef = useRef<string | null>(null);

  // Handle URL parameter for adding new code. Consume it exactly once per scan
  // so a re-render never re-adds it. addFromUri waits for the stored codes to
  // load, so the new code is never saved over them.
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
  }, [otpurl, scanId, addCode, router]);

  // Reference for auto-scrolling
  const flashListRef = useRef<FlashListRef<Service>>(null);

  // Scroll to the highlighted account within the list as shown (it may be filtered by a search)
  const scrollToAccount = useEffectEvent((uid: string) => {
    const index = services.findIndex((service) => service.uid === uid);
    if (index !== -1) {
      flashListRef.current?.scrollToIndex({ index, animated: true });
    }
  });
  useEffect(() => {
    if (highlightedUid !== null) scrollToAccount(highlightedUid);
  }, [highlightedUid]);

  const openEditor = (uid: string) => router.push({ pathname: '/account/[uid]', params: { uid } });
  const openIconPicker = (uid: string) => router.push({ pathname: '/account/[uid]/icon', params: { uid } });

  if (status === 'error') {
    return <ErrorView message={error ?? 'Failed to load your codes'} />;
  }

  if (status === 'loading') {
    return <LoadingView />;
  }

  // Display list of codes
  return (
    <>
      <Stack.SearchBar
        placeholder="Search accounts"
        onChangeText={(event) => handleSearch(event.nativeEvent.text)}
        onCancelButtonPress={() => handleSearch('')}
        autoFocus={settings.searchOnStartup}
        hideWhenScrolling={false}
        autoCapitalize="none"
        tintColor={theme.accent}
        textColor={theme.text}
        hintTextColor={theme.subText}
        headerIconColor={theme.subText}
      />

      <FlashList
        ref={flashListRef}
        style={{ backgroundColor: theme.background }}
        contentContainerStyle={{ paddingTop: 16 }}
        contentInsetAdjustmentBehavior="automatic"
        onTouchStart={() => setHighlightedUid(null)}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        data={services}
        renderItem={({ item }) => (
          <AccountCard
            service={item}
            now={timestamp}
            highlighted={item.uid === highlightedUid}
            onLongPress={() => openEditor(item.uid)}
            onIconPress={() => openIconPicker(item.uid)}
          />
        )}
        keyExtractor={(item) => item.uid}
        drawDistance={500}
        extraData={[timestamp, highlightedUid]}
      />
    </>
  );
}
