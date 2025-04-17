import { FlashList } from '@shopify/flash-list';
import { useLocalSearchParams } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { SafeAreaView, StyleSheet } from "react-native";

import CodeItem from "@/components/CodeItem";
import ErrorView from "@/components/ErrorView";
import LoadingView from "@/components/LoadingView";
import { SearchBar } from "@/components/SearchBar";
import SearchButton from "@/components/SearchButton";

import { useCodeManager } from "@/hooks/useCodeManager";
import { useOtpData } from "@/hooks/useOtpData";
import { useSearch } from "@/hooks/useSearch";
import { useTimestamp } from "@/hooks/useTimestamp";

import { colors } from "@/global";
import { Service } from '@/types';

export default function HomeScreen() {
  // Get OTP data from context
  const { data, loading, error, updateServices } = useOtpData();

  // Search functionality
  const [searchBarVisible, setSearchBarVisible] = useState<boolean>(false);
  const { services, search, setSearch, handleSearch } = useSearch(data?.services || []);

  // Real-time clock update
  const timestamp = useTimestamp();

  // Handle adding new codes via URL
  const { otpurl } = useLocalSearchParams<{ otpurl: string }>();
  const { recentCodeIndex, addCode, resetRecentCodeIndex } = useCodeManager(services, updateServices);

  // Reference for auto-scrolling
  const flashListRef = useRef<FlashList<Service>>(null);

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

  // Handle search toggle
  const toggleSearch = () => setSearchBarVisible(!searchBarVisible);

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
    <SafeAreaView style={styles.container}>
      <SearchBar
        text={search}
        isVisible={searchBarVisible}
        onSearch={handleSearch}
      />
      <FlashList
        ref={flashListRef}
        onTouchStart={() => resetRecentCodeIndex()}
        data={searchBarVisible ? services : data.services}
        renderItem={({ item, index }) => (
          <CodeItem
            service={item}
            globalTimestamp={timestamp}
            isHighlighted={recentCodeIndex === index}
            isFirstItem={index === 0}
          />
        )}
        estimatedItemSize={150}
        keyExtractor={(item) => item.uid}
        extraData={[timestamp, recentCodeIndex]}
      />
      <SearchButton onPress={toggleSearch} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.black,
    position: 'relative'
  }
});