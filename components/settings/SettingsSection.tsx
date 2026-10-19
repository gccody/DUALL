import { useTheme } from '@/context/ThemeContext';
import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

interface SettingsSectionProps {
  title: string;
  children?: ReactNode;
}

/** A titled group of settings rows. */
export default function SettingsSection({ title, children }: SettingsSectionProps) {
  const { theme } = useTheme();

  return (
    <View style={styles.section}>
      <Text style={[styles.title, { color: theme.text }]}>{title}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginTop: 24,
    marginBottom: 8,
    paddingHorizontal: 16,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});
