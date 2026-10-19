import { useSettings } from "@/context/SettingsContext";
import { useTheme } from "@/context/ThemeContext";
import { useVault } from "@/context/VaultContext";
import { FlashList, FlashListRef } from '@shopify/flash-list';
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { Alert } from "react-native";

import CodeItem from "@/components/CodeItem";
import EditCodeModal from "@/components/EditCodeModal";
import ErrorView from "@/components/ErrorView";
import LoadingView from "@/components/LoadingView";

import { useSearch } from "@/hooks/useSearch";
import { useTimestamp } from "@/hooks/useTimestamp";

import { Service } from '@/types';
import { warmIconCache } from '@/utils/customIconMatcher';

const reportSaveError = (error: unknown) => {
  console.error('Failed to save changes:', error);
  Alert.alert("Error", "Failed to save your changes. Please try again.");
};

export default function HomeScreen() {
  const { theme } = useTheme();
  const { settings } = useSettings();
  const { services: allServices, status, error, addFromUri, updateService, deleteService } = useVault();

  // Pre-warm icon domain cache when services load so first-scroll lookups are O(1)
  useEffect(() => {
    if (allServices.length > 0) {
      warmIconCache(allServices);
    }
  }, [allServices]);

  // Search functionality
  const { services, handleSearch } = useSearch(allServices);

  // Edit modal: track the uid so the modal always shows the latest stored service
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedUid, setSelectedUid] = useState<string | null>(null);
  const selectedService = allServices.find((s) => s.uid === selectedUid) ?? null;

  // Real-time clock update
  const timestamp = useTimestamp();

  // Index of a just scanned code, highlighted until the list is touched
  const [recentCodeIndex, setRecentCodeIndex] = useState<number | null>(null);

  const addCode = useCallback(async (url: string) => {
    try {
      const outcome = await addFromUri(url);
      if (outcome.result === 'invalid') {
        Alert.alert("Error", "Unable to add code!");
      } else if (outcome.result === 'unsupported') {
        Alert.alert("Error", "HOTP is not supported yet");
      } else {
        // New code, or the existing one for a duplicate
        setRecentCodeIndex(outcome.index);
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

  // Scroll to recently added code
  useEffect(() => {
    if (recentCodeIndex !== null) {
      flashListRef.current?.scrollToIndex({ index: recentCodeIndex, animated: true });
    }
  }, [recentCodeIndex]);

  // Handle touch on the list to reset recent code index
  const handleListTouch = () => {
    setRecentCodeIndex(null);
  };

  // Handle long press to open edit modal
  const handleLongPress = (service: Service) => {
    setSelectedUid(service.uid);
    setModalVisible(true);
  };

  // Handle save from modal
  const handleSaveService = (updatedService: Service) => {
    updateService(updatedService.uid, {
      name: updatedService.name,
      otp: { issuer: updatedService.otp.issuer },
    }).catch(reportSaveError);
  };

  // Handle delete from modal
  const handleDeleteService = (serviceUid: string) => {
    deleteService(serviceUid).catch(reportSaveError);
  };

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
        contentInsetAdjustmentBehavior="automatic"
        onTouchStart={handleListTouch}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        data={services}
        renderItem={({ item, index }) => (
          <CodeItem
            service={item}
            globalTimestamp={timestamp}
            isHighlighted={recentCodeIndex === index}
            isFirstItem={index === 0}
            onLongPress={() => handleLongPress(item)}
          />
        )}
        keyExtractor={(item) => item.uid}
        drawDistance={500}
        extraData={[timestamp, recentCodeIndex]}
      />
      <EditCodeModal
        visible={modalVisible}
        service={selectedService}
        onClose={() => setModalVisible(false)}
        onSave={handleSaveService}
        onDelete={handleDeleteService}
      />
    </>
  );
}
