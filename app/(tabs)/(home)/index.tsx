import AccountCard from "@/components/accounts/AccountCard";
import CenteredMessage from "@/components/ui/CenteredMessage";
import { useSettings } from "@/context/SettingsContext";
import { useTheme } from "@/context/ThemeContext";
import { useVault } from "@/context/VaultContext";
import { useScannedCode } from "@/hooks/useScannedCode";
import { useSearch } from "@/hooks/useSearch";
import { useTimestamp } from "@/hooks/useTimestamp";
import { Service } from '@/types';
import { warmIconCache } from '@/utils/customIconMatcher';
import { FlashList, FlashListRef } from '@shopify/flash-list';
import { Stack, useRouter } from "expo-router";
import { useEffect, useEffectEvent, useRef, useState } from "react";

export default function HomeScreen() {
  const { theme } = useTheme();
  const { settings } = useSettings();
  const { services: allServices, status, error, retryLoad } = useVault();
  const { results: services, setQuery } = useSearch(allServices);
  const timestamp = useTimestamp();
  const router = useRouter();
  const flashListRef = useRef<FlashListRef<Service>>(null);

  // Pre-warm icon domain cache when services load so first-scroll lookups are O(1)
  useEffect(() => {
    if (allServices.length > 0) {
      warmIconCache(allServices);
    }
  }, [allServices]);

  // A just scanned account, highlighted until the list is touched
  const [highlightedUid, setHighlightedUid] = useState<string | null>(null);
  useScannedCode(setHighlightedUid);

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
    return (
      <CenteredMessage
        title="Error"
        message={error ?? 'Failed to load your codes'}
        action={{ label: 'Try Again', onPress: retryLoad }}
      />
    );
  }

  if (status === 'loading') {
    return <CenteredMessage spinner message="Loading..." />;
  }

  return (
    <>
      <Stack.SearchBar
        placeholder="Search accounts"
        onChangeText={(event) => setQuery(event.nativeEvent.text)}
        onCancelButtonPress={() => setQuery('')}
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
