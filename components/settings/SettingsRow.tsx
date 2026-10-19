import { useTheme } from '@/context/ThemeContext';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import type { ComponentProps, ReactNode } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export type SettingsIconName = ComponentProps<typeof FontAwesome>['name'];

interface SettingsRowProps {
  icon: SettingsIconName;
  label: string;
  /** Icon and label color; defaults to the theme's text color. */
  color?: string;
  /** Secondary text shown on the right. */
  value?: string;
  /** Makes the row tappable. */
  onPress?: () => void;
  /** Control shown on the right (e.g. a Switch). */
  children?: ReactNode;
}

/** A settings row: icon and label on the left, a value or control on the right. */
export default function SettingsRow({ icon, label, color, value, onPress, children }: SettingsRowProps) {
  const { theme } = useTheme();
  const tint = color ?? theme.text;

  const row = (
    <View style={[styles.row, { backgroundColor: theme.cardBackground }]}>
      <View style={styles.content}>
        <FontAwesome name={icon} size={22} color={tint} style={styles.icon} />
        <Text style={[styles.label, { color: tint }]}>{label}</Text>
      </View>
      {value !== undefined && <Text style={[styles.value, { color: theme.subText }]}>{value}</Text>}
      {children}
    </View>
  );

  if (!onPress) return row;
  return (
    <TouchableOpacity onPress={onPress} accessibilityRole="button">
      {row}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    marginBottom: 8,
    borderRadius: 12,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  icon: {
    marginRight: 12,
  },
  label: {
    fontSize: 16,
  },
  value: {
    fontSize: 16,
  },
});
