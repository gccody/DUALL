import { useTheme } from '@/context/ThemeContext';
import { useVault } from '@/context/VaultContext';
import { useAccountRoute } from '@/hooks/useAccountRoute';
import type { Icon } from '@/types';
import { searchCustomIcons } from '@/utils/customIconMatcher';
import { FontAwesome } from '@expo/vector-icons';
import { Stack } from 'expo-router';
import { useState } from 'react';
import { Alert, FlatList, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type IconOption = ReturnType<typeof searchCustomIcons>[number];

/** Lets the user pick a bundled icon for an account; the choice is saved immediately. */
export default function IconPickerScreen() {
  const { theme } = useTheme();
  const { updateService } = useVault();
  const { service, close } = useAccountRoute();
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState('');
  const [saving, setSaving] = useState(false);

  if (!service) return null;

  // An empty search suggests icons for the account's issuer.
  const icons = searchCustomIcons(query || service.otp.issuer || 'OTP');

  const saveIcon = async (icon: Icon) => {
    setSaving(true);
    try {
      await updateService(service.uid, { icon });
      close();
    } catch (error) {
      console.error('Error saving icon:', error);
      Alert.alert('Error', 'Failed to save the icon. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const renderIcon = ({ item }: { item: IconOption }) => (
    <TouchableOpacity
      style={[styles.iconItem, { backgroundColor: theme.cardBackground }]}
      onPress={() => saveIcon({ label: item.domain })}
      disabled={saving}
    >
      <View style={[styles.iconContainer, { backgroundColor: theme.iconBackground }]}>
        <Image source={item.icon} style={styles.iconImage} resizeMode="contain" />
      </View>
      <Text style={[styles.iconName, { color: theme.text }]} numberOfLines={1}>
        {item.name}
      </Text>
      <Text style={[styles.iconDomain, { color: theme.subText }]} numberOfLines={1}>
        {item.domain}
      </Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          headerRight: () => (
            <TouchableOpacity onPress={close} hitSlop={10} accessibilityLabel="Close">
              <FontAwesome name="times" size={20} color={theme.text} />
            </TouchableOpacity>
          ),
        }}
      />
      <Stack.SearchBar
        placeholder="Search for service name or domain"
        onChangeText={(event) => setQuery(event.nativeEvent.text)}
        onCancelButtonPress={() => setQuery('')}
        hideWhenScrolling={false}
        autoCapitalize="none"
        tintColor={theme.accent}
        textColor={theme.text}
        hintTextColor={theme.subText}
        headerIconColor={theme.subText}
      />

      <FlatList
        data={icons}
        renderItem={renderIcon}
        keyExtractor={(item) => item.domain}
        numColumns={2}
        contentInsetAdjustmentBehavior="automatic"
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.iconsList}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <FontAwesome name="search" size={48} color={theme.subText} style={styles.emptyIcon} />
            <Text style={[styles.emptyTitle, { color: theme.text }]}>No icons found</Text>
            <Text style={[styles.emptyDescription, { color: theme.subText }]}>
              Try searching for a different service name or domain
            </Text>
          </View>
        }
      />

      <View style={[styles.footer, { borderTopColor: theme.border, paddingBottom: insets.bottom + 16 }]}>
        <TouchableOpacity
          style={[styles.removeButton, { backgroundColor: theme.danger }]}
          onPress={() => saveIcon({ label: 'none' })}
          disabled={saving}
        >
          <Text style={styles.removeButtonText}>Remove Icon</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  iconsList: {
    padding: 12,
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
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingTop: 64,
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
