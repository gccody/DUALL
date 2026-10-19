import { Alert } from 'react-native';

/** Logs a failed vault write and tells the user their change wasn't saved. */
export function reportSaveError(error: unknown): void {
  console.error('Failed to save changes:', error);
  Alert.alert('Error', 'Failed to save your changes. Please try again.');
}
