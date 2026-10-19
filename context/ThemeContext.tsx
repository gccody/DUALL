import { darkTheme, lightTheme, type Theme } from '@/constants/theme';
import { useSettings } from '@/context/SettingsContext';
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

    // Keep native UI (tab bar, headers, switches, sheets) in sync with the app's theme
    useEffect(() => {
        Appearance.setColorScheme(isDark ? 'dark' : 'light');
    }, [isDark]);

    return (
        <ThemeContext value={{ theme, isDark }}>
            <StatusBar style={isDark ? 'light' : 'dark'} />
            {children}
        </ThemeContext>
    );
}

export function useTheme() {
    return use(ThemeContext);
}
