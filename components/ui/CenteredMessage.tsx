import { useTheme } from '@/context/ThemeContext';
import { ActivityIndicator, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface CenteredMessageProps {
  title?: string;
  message?: string;
  /** Shows an activity indicator above the text. */
  spinner?: boolean;
}

/** Full-screen message centered on the themed background (loading, errors, unavailable features). */
export default function CenteredMessage({ title, message, spinner = false }: CenteredMessageProps) {
  const { theme } = useTheme();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top', 'left', 'right']}>
      {spinner && <ActivityIndicator size="large" color={theme.accent} />}
      {title ? <Text style={[styles.title, { color: theme.text }]}>{title}</Text> : null}
      {message ? (
        <Text style={[styles.message, { color: title ? theme.subText : theme.text }]}>{message}</Text>
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
});
