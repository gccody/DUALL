import { useTheme } from '@/context/ThemeContext';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface ErrorViewProps {
  message: string;
}

export default function ErrorView({ message }: ErrorViewProps) {
  const { theme } = useTheme();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top', 'left', 'right']}>
      <View style={styles.content}>
        <Text style={[styles.errorText, { color: theme.text }]}>Error</Text>
        <Text style={[styles.messageText, { color: theme.subText }]}>{message}</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  messageText: {
    fontSize: 16,
    textAlign: 'center',
  },
});