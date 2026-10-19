import { useOtpData } from "@/context/OtpDataContext";
import { useSettings } from "@/context/SettingsContext";
import { useTheme } from "@/context/ThemeContext";
import { FlashList, FlashListRef } from '@shopify/flash-list';
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";

import CodeItem from "@/components/CodeItem";
import EditCodeModal from "@/components/EditCodeModal";
import ErrorView from "@/components/ErrorView";
import LoadingView from "@/components/LoadingView";

import { useCodeManager } from "@/hooks/useCodeManager";
import { useSearch } from "@/hooks/useSearch";
import { useTimestamp } from "@/hooks/useTimestamp";

import { Service } from '@/types';
import { warmIconCache } from '@/utils/customIconMatcher';

export default function HomeScreen() {
  const { theme } = useTheme();
  const { settings } = useSettings();

  // Get OTP data from context
  const { data, loading, error, updateServices } = useOtpData();

  // Memoize services array to prevent unnecessary re-renders
  const servicesData = useMemo(() => data?.services || [], [data?.services]);

  // Pre-warm icon domain cache when services load so first-scroll lookups are O(1)
  useEffect(() => {
    if (servicesData.length > 0) {
      warmIconCache(servicesData);
    }
  }, [servicesData]);

  // Search functionality
  const { services, handleSearch } = useSearch(servicesData);

  // Modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedService, setSelectedService] = useState<Service | null>(null);

  // Real-time clock update
  const timestamp = useTimestamp();

  // Handle adding new codes via URL - use full servicesData, not filtered results
  const { otpurl, scanId } = useLocalSearchParams<{ otpurl?: string; scanId?: string }>();
  const router = useRouter();
  const handledScanRef = useRef<string | null>(null);
  const { recentCodeIndex, addCode, resetRecentCodeIndex } = useCodeManager(servicesData, updateServices);

  // Reference for auto-scrolling
  const flashListRef = useRef<FlashListRef<Service>>(null);

  // Handle URL parameter for adding new code. Consume it exactly once per scan:
  // addCode changes whenever services change, so without this guard deleting or
  // editing a code would re-run the effect and re-add the scanned code.
  useEffect(() => {
    if (!otpurl) {
      handledScanRef.current = null;
      return;
    }
    const scanKey = scanId ?? otpurl;
    // Wait for stored codes to load so the new code isn't saved over them
    if (!data || handledScanRef.current === scanKey) return;
    handledScanRef.current = scanKey;
    router.setParams({ otpurl: undefined, scanId: undefined });
    addCode(otpurl);
  }, [otpurl, scanId, data, addCode, router]);

  // Scroll to recently added code
  useEffect(() => {
    if (recentCodeIndex !== null) {
      flashListRef.current?.scrollToIndex({ index: recentCodeIndex, animated: true });
    }
  }, [recentCodeIndex]);

  // Handle touch on the list to reset recent code index
  const handleListTouch = () => {
    resetRecentCodeIndex();
  };

  // Handle long press to open edit modal
  const handleLongPress = (service: Service) => {
    setSelectedService(service);
    setModalVisible(true);
  };

  // Handle save from modal
  const handleSaveService = (updatedService: Service) => {
    if (!data) return;

    const updatedServices = data.services.map(s =>
      s.uid === updatedService.uid ? updatedService : s
    );
    updateServices(updatedServices, true);
  };

  // Handle icon change from ServiceIcon
  const handleIconChange = async (serviceUid: string, updatedService: Service) => {
    if (!data) return;

    const updatedServices = data.services.map(s =>
      s.uid === serviceUid ? updatedService : s
    );
    // Wait for save to complete to prevent race conditions with icon storage
    await updateServices(updatedServices, true);
  };

  // Handle delete from modal
  const handleDeleteService = (serviceUid: string) => {
    if (!data) return;

    const updatedServices = data.services.filter(s => s.uid !== serviceUid);
    updateServices(updatedServices);
  };

  // Show error state
  if (error) {
    return <ErrorView message={error} />;
  }

  // Show loading state
  if (loading || !data) {
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
            onIconChange={handleIconChange}
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
