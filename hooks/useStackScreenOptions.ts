import { useTheme } from '@/context/ThemeContext';
import type { NativeStackNavigationOptions } from 'expo-router';
import { Platform } from 'react-native';

// Native large-title header shared by the stacks nested inside each tab
export function useStackScreenOptions(): NativeStackNavigationOptions {
    const { theme } = useTheme();

    return {
        headerLargeTitle: true,
        headerLargeTitleShadowVisible: false,
        headerShadowVisible: false,
        // On iOS let the system draw the translucent / glass header; Android needs a solid color
        headerTransparent: Platform.OS === 'ios',
        headerStyle: Platform.OS === 'android' ? { backgroundColor: theme.background } : undefined,
        headerTintColor: theme.accent,
        headerTitleStyle: { color: theme.text },
        headerLargeTitleStyle: { color: theme.text },
        contentStyle: { backgroundColor: theme.background },
    };
}
