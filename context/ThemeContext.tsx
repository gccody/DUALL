import { darkTheme, lightTheme, type Theme } from '@/constants/theme';
import { useSettings } from '@/context/SettingsContext';
import { DarkTheme, DefaultTheme, ThemeProvider as NavigationThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ReactNode, createContext, use, useEffect } from 'react';
import { Appearance } from 'react-native';

export type { Theme } from '@/constants/theme';

type ThemeContextType = {
    theme: Theme;
    isDark: boolean;
};

const ThemeContext = createContext<ThemeContextType>({
    theme: darkTheme,
    isDark: true,
});

/** Provides the palette for the `darkMode` setting and applies it to the native UI and status bar. */
export function ThemeProvider({ children }: { children: ReactNode }) {
    const { settings } = useSettings();
    const isDark = settings.darkMode;
    const theme = isDark ? darkTheme : lightTheme;

    // Native stack headers (and their search bars) take their light/dark style from
    // the navigation theme, not the window, so it must follow the app's theme too.
    const baseNavigationTheme = isDark ? DarkTheme : DefaultTheme;
    const navigationTheme = {
        ...baseNavigationTheme,
        colors: {
            ...baseNavigationTheme.colors,
            primary: theme.accent,
            background: theme.background,
            text: theme.text,
            border: theme.border,
        },
    };

    // Keep native UI (tab bar, headers, switches, sheets) in sync with the app's theme
    useEffect(() => {
        Appearance.setColorScheme(isDark ? 'dark' : 'light');
    }, [isDark]);

    return (
        <ThemeContext value={{ theme, isDark }}>
            <NavigationThemeProvider value={navigationTheme}>
                <StatusBar style={isDark ? 'light' : 'dark'} />
                {children}
            </NavigationThemeProvider>
        </ThemeContext>
    );
}

export function useTheme() {
    return use(ThemeContext);
}
