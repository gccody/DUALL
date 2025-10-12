import { useSettings } from "@/context/SettingsContext";
import { useTheme } from "@/context/ThemeContext";
import { FlashList } from '@shopify/flash-list';
import { useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import CodeItem from "@/components/CodeItem";
import EditCodeModal from "@/components/EditCodeModal";
import ErrorView from "@/components/ErrorView";
import LoadingView from "@/components/LoadingView";
import { SearchBar } from "@/components/SearchBar";
import SearchButton from "@/components/SearchButton";

import { useCodeManager } from "@/hooks/useCodeManager";
import { useOtpData } from "@/hooks/useOtpData";
import { useSearch } from "@/hooks/useSearch";
import { useTimestamp } from "@/hooks/useTimestamp";

import { Service } from '@/types';

export default function HomeScreen() {
  const { theme } = useTheme();
  const { settings } = useSettings();

  // Get OTP data from context
  const { data, loading, error, updateServices, fetchData } = useOtpData();

  // Search functionality
  const [searchBarVisible, setSearchBarVisible] = useState<boolean>(settings.searchOnStartup);
  const { services, search, setSearch, handleSearch } = useSearch(data?.services || []);

  // Modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedService, setSelectedService] = useState<Service | null>(null);

  // Real-time clock update
  const timestamp = useTimestamp();

  // Handle adding new codes via URL
  const { otpurl } = useLocalSearchParams<{ otpurl: string }>();
  const { recentCodeIndex, addCode, resetRecentCodeIndex } = useCodeManager(services, updateServices);

  // Reference for auto-scrolling
  const flashListRef = useRef<FlashList<Service>>(null);

  // Update searchBarVisible when searchOnStartup setting changes
  useEffect(() => {
    setSearchBarVisible(settings.searchOnStartup);
  }, [settings.searchOnStartup]);

  // Handle URL parameter for adding new code
  useEffect(() => {
    if (otpurl) {
      addCode(otpurl);
    }
  }, [otpurl]);

  // Scroll to recently added code
  useEffect(() => {
    if (recentCodeIndex !== null) {
      flashListRef.current?.scrollToIndex({ index: recentCodeIndex, animated: true });
    }
  }, [recentCodeIndex]);

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [fetchData])
  );

  // Handle search toggle
  const toggleSearch = () => setSearchBarVisible(!searchBarVisible);

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
    updateServices(updatedServices);
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
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background, paddingTop: searchBarVisible ? 60 : 0 }]} edges={['top', 'left', 'right']}>
      <SearchBar
        text={search}
        isVisible={searchBarVisible}
        onSearch={handleSearch}
      />

      <FlashList
        ref={flashListRef}
        onTouchStart={handleListTouch}
        keyboardShouldPersistTaps="handled"
        data={searchBarVisible ? services : data.services}
        renderItem={({ item, index }) => (
          <CodeItem
            service={item}
            globalTimestamp={timestamp}
            isHighlighted={recentCodeIndex === index}
            isFirstItem={index === 0}
            onLongPress={() => handleLongPress(item)}
          />
        )}
        estimatedItemSize={150}
        keyExtractor={(item) => item.uid}
        extraData={[timestamp, recentCodeIndex]}
      />
      <SearchButton onPress={toggleSearch} />
      <EditCodeModal
        visible={modalVisible}
        service={selectedService}
        onClose={() => setModalVisible(false)}
        onSave={handleSaveService}
        onDelete={handleDeleteService}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative'
  },
  headerContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  headerText: {
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.5,
  }
});