import { useTheme } from '@/context/ThemeContext';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

interface SettingItemProps {
  iconName: React.ComponentProps<typeof FontAwesome>['name'],
  text: string,
  children?: React.ReactNode
}

const SettingItem: React.FC<SettingItemProps> = ({ iconName, text, children }) => {
  const { theme } = useTheme();

  return (
    <View style={[styles.settingItem, { backgroundColor: theme.cardBackground }]}>
      <View style={styles.settingContent}>
        <FontAwesome name={iconName} size={22} color={theme.text} style={styles.icon} />
        <Text style={[styles.settingText, { color: theme.text }]}>{text}</Text>
      </View>
      {children}
    </View>
  )
}

const styles = StyleSheet.create({
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    marginBottom: 8,
    borderRadius: 12,
  },
  settingContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  icon: {
    marginRight: 12,
  },
  settingText: {
    fontSize: 16,
  },
});

export default SettingItem;