import { useTheme } from '@/context/ThemeContext';
import { useVault } from '@/context/VaultContext';
import { Service } from '@/types';
import { searchCustomIcons } from '@/utils/customIconMatcher';
import { FontAwesome } from '@expo/vector-icons';
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface CustomIconPickerProps {
  service: Service;
  isVisible: boolean;
  onClose: () => void;
}

interface CustomIconItem {
  domain: string;
  name: string;
  icon: any;
}

/** Lets the user pick a bundled icon for `service`; the choice is saved immediately. */
export default function CustomIconPicker({ service, isVisible, onClose }: CustomIconPickerProps) {
  const { theme } = useTheme();
  const { updateService } = useVault();
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredIcons, setFilteredIcons] = useState<CustomIconItem[]>([]);
  const [loading, setLoading] = useState(false);

  // Memoize the service issuer to prevent unnecessary re-renders
  const serviceIssuer = useMemo(() => service.otp.issuer, [service.otp.issuer]);

  // Load and filter icons based on search query
  useEffect(() => {
    if (!isVisible) {
      // Reset search query when modal closes
      setSearchQuery('');
      return;
    }

    setLoading(true);
    try {
      // If there's a search query, use it; otherwise, use the service issuer as initial search
      const query = searchQuery || serviceIssuer || "OTP";
      const results = searchCustomIcons(query);
      setFilteredIcons(results);
    } catch (error) {
      console.error('Error loading custom icons:', error);
      setFilteredIcons([]);
    } finally {
      setLoading(false);
    }
  }, [isVisible, searchQuery, serviceIssuer]);

  const handleIconSelect = async (item: CustomIconItem) => {
    setLoading(true);
    try {
      await updateService(service.uid, { icon: { label: item.domain } });
      onClose();
    } catch (error) {
      console.error('Error selecting icon:', error);
      Alert.alert('Error', 'Failed to save the icon. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveCustomIcon = async () => {
    setLoading(true);
    try {
      // 'none' records that the user removed the icon (no auto-match either)
      await updateService(service.uid, { icon: { label: 'none' } });
    } catch (error) {
      console.error('Error removing icon:', error);
      Alert.alert('Error', 'Failed to remove the icon. Please try again.');
    } finally {
      setLoading(false);
      onClose();
    }
  }

  const renderIconItem = ({ item }: { item: CustomIconItem }) => (
    <TouchableOpacity
      style={[styles.iconItem, { backgroundColor: theme.cardBackground }]}
      onPress={() => handleIconSelect(item)}
    >
      <View style={[styles.iconContainer, { backgroundColor: theme.iconBackground }]}>
        <Image
          source={item.icon}
          style={styles.iconImage}
          resizeMode="contain"
        />
      </View>
      <View style={styles.iconInfo}>
        <Text style={[styles.iconName, { color: theme.text }]} numberOfLines={1}>
          {item.name}
        </Text>
        <Text style={[styles.iconDomain, { color: theme.subText }]} numberOfLines={1}>
          {item.domain}
        </Text>
      </View>
    </TouchableOpacity>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <FontAwesome name="search" size={48} color={theme.subText} style={styles.emptyIcon} />
      <Text style={[styles.emptyTitle, { color: theme.text }]}>
        No icons found
      </Text>
      <Text style={[styles.emptyDescription, { color: theme.subText }]}>
        Try searching for a different service name or domain
      </Text>
    </View>
  );

  return (
    <Modal
      visible={isVisible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={[styles.modalContent, { backgroundColor: theme.cardBackground }]}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: theme.text }]}>Select Custom Icon</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <FontAwesome name="times" size={20} color={theme.text} />
          </TouchableOpacity>
        </View>

        {/* Search Input */}
        <View style={styles.searchContainer}>
          <FontAwesome name="search" size={16} color={theme.subText} style={styles.searchIcon} />
          <TextInput
            style={[styles.searchInput, { color: theme.text, borderColor: theme.border }]}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search for service name or domain..."
            placeholderTextColor={theme.subText}
            autoCorrect={false}
            autoCapitalize="none"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity
              onPress={() => setSearchQuery('')}
              style={styles.clearButton}
            >
              <FontAwesome name="times-circle" size={16} color={theme.subText} />
            </TouchableOpacity>
          )}
        </View>

        {/* Icons Grid */}
        <View style={styles.iconsContainer}>
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={theme.accent} />
              <Text style={[styles.loadingText, { color: theme.subText }]}>
                Loading icons...
              </Text>
            </View>
          ) : filteredIcons.length > 0 ? (
            <FlatList
              data={filteredIcons}
              renderItem={renderIconItem}
              keyExtractor={(item) => item.domain}
              numColumns={2}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.iconsList}
            />
          ) : (
            renderEmptyState()
          )}
        </View>

        {/* Footer info */}
        <View style={[styles.footer, { borderTopColor: theme.border }]}>
          <TouchableOpacity
            style={[styles.removeButton, { backgroundColor: theme.danger }]}
            onPress={handleRemoveCustomIcon}
            disabled={loading}
          >
            <Text style={styles.removeButtonText}>Remove Icon</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalContent: {
    flex: 1,
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  closeButton: {
    padding: 8,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 16,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 4,
  },
  clearButton: {
    padding: 4,
    marginLeft: 8,
  },
  iconsContainer: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
  },
  iconsList: {
    paddingBottom: 16,
  },
  iconItem: {
    flex: 1,
    margin: 4,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  iconImage: {
    width: 32,
    height: 32,
  },
  iconInfo: {
    alignItems: 'center',
    width: '100%',
  },
  iconName: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 2,
  },
  iconDomain: {
    fontSize: 10,
    textAlign: 'center',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyIcon: {
    marginBottom: 16,
    opacity: 0.5,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyDescription: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  footer: {
    paddingTop: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    marginTop: 16,
    alignItems: 'center',
  },
  removeButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  removeButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
});