import { useTheme } from '@/context/ThemeContext';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface CenteredMessageProps {
  title?: string;
  message?: string;
  /** Shows an activity indicator above the text. */
  spinner?: boolean;
  /** Shows a button below the text. */
  action?: { label: string; onPress: () => void };
}

/** Full-screen message centered on the themed background (loading, errors, unavailable features). */
export default function CenteredMessage({ title, message, spinner = false, action }: CenteredMessageProps) {
  const { theme } = useTheme();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top', 'left', 'right']}>
      {spinner && <ActivityIndicator size="large" color={theme.accent} />}
      {title ? <Text style={[styles.title, { color: theme.text }]}>{title}</Text> : null}
      {message ? (
        <Text style={[styles.message, { color: title ? theme.subText : theme.text }]}>{message}</Text>
      ) : null}
      {action ? (
        <TouchableOpacity
          style={[styles.button, { backgroundColor: theme.accent }]}
          onPress={action.onPress}
          accessibilityRole="button"
        >
          <Text style={styles.buttonText}>{action.label}</Text>
        </TouchableOpacity>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    gap: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  message: {
    fontSize: 16,
    textAlign: 'center',
  },
  button: {
    marginTop: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
